import { QUEUE_SINGLETON } from "./queue-do.js";
import { buildAuth } from "./auth/better-auth.js";
import { currentAccount, handleAuth } from "./auth/routes.js";
import { startMatch } from "./match-setup.js";
import { handleAdmin } from "./admin/routes.js";
import { handleMe } from "./me/routes.js";

export { MatchDO } from "./match-do.js";
export { QueueDO } from "./queue-do.js";

/**
 * Le Worker ne détient aucun état de partie : il authentifie, puis route vers le
 * Durable Object qui porte la partie. Deux joueurs de la même partie atteignent
 * forcément la même instance (docs/architecture.md section 2).
 *
 * Deux garanties distinctes, à ne pas confondre :
 * - **qui vous êtes** vient du cookie de session, résolu ici et nulle part ailleurs ;
 * - **quel camp vous jouez** vient du jeton de siège, tiré à la création de la partie.
 *
 * La seconde ne dépend pas de la première : une partie reste jouable par qui détient
 * le jeton, ce qui permet d'ouvrir une partie privée sans compte.
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // L'adresse bien connue que les gestionnaires de mots de passe ouvrent pour
    // « changer le mot de passe de ce site » (W3C, change-password-url).
    if (url.pathname === "/.well-known/change-password") {
      return Response.redirect(`${url.origin}/profil/#securite`, 302);
    }
    const page = pageFor(url.pathname);
    if (page !== undefined) return env.ASSETS.fetch(new Request(new URL(page, url.origin), request));
    // Construite par requête : les bindings n'existent que là, et l'URL de base doit
    // être celle par laquelle on est joint, sinon les liens envoyés par courrier
    // pointeraient vers un autre environnement que celui où l'inscription a eu lieu.
    //
    // Sans secret, Better Auth ne refuse **pas** de démarrer dans un Worker : il ne
    // reconnaît la production qu'à `NODE_ENV`, absent ici, et retombe sans rien dire sur
    // son secret par défaut, public — n'importe qui pourrait alors signer un cookie de
    // session. On refuse donc l'authentification plutôt que de la servir ainsi ; le
    // client statique et les parties, qui ne reposent que sur le jeton de siège, restent
    // servis.
    if (!hasAuthSecret(env)) {
      if (
        url.pathname.startsWith("/api/auth/") ||
        url.pathname.startsWith("/api/admin/") ||
        url.pathname === "/api/me" ||
        url.pathname.startsWith("/api/me/") ||
        url.pathname === "/api/queue"
      ) {
        console.error("[auth] AUTH_SECRET absent ou trop court : authentification refusée");
        return new Response("authentification indisponible", { status: 503 });
      }
    }
    const auth = buildAuth(env, url.origin);

    const authenticated = await handleAuth(auth, env, request, url.pathname);
    if (authenticated !== undefined) return authenticated;

    const administered = await handleAdmin(auth, env, request, url);
    if (administered !== undefined) return administered;

    const own = await handleMe(auth, env, request, url);
    if (own !== undefined) return own;

    if (url.pathname === "/api/matches" && request.method === "POST") {
      return createMatch(request, env);
    }

    if (url.pathname === "/api/queue") return joinQueue(request, env, auth, url);

    const matchId = url.pathname.match(/^\/match\/([\w-]+)$/)?.[1];
    if (matchId !== undefined) {
      return env.MATCH.get(env.MATCH.idFromName(matchId)).fetch(request);
    }

    // Le client statique est servi par le même Worker : client et serveur partent du
    // même commit, donc du même `core` (docs/architecture.md section 4).
    return env.ASSETS.fetch(request);
  },

  /**
   * Ménage périodique. Rien ici n'est visible du joueur : ce sont des lignes que plus
   * personne ne lit et que rien n'effacerait autrement — une session périmée reste
   * refusée à la connexion, mais elle reste aussi en base indéfiniment.
   */
  async scheduled(_controller: ScheduledController, env: Env): Promise<void> {
    // Better Auth range ses échéances en **texte ISO**, pas en millisecondes : les
    // comparer à un nombre ne supprimerait rien du tout, SQLite classant tout entier
    // avant tout texte. `lastRequest` est la seule qui soit vraiment numérique.
    const now = new Date().toISOString();
    await env.DB.batch([
      env.DB.prepare("DELETE FROM sessions WHERE expires_at < ?").bind(now),
      env.DB.prepare("DELETE FROM verifications WHERE expires_at < ?").bind(now),
      // Le compteur de débit se reconstruit seul : une fenêtre écoulée ne vaut plus
      // rien. On garde une journée de marge sur la plus longue fenêtre configurée.
      env.DB.prepare("DELETE FROM rate_limits WHERE lastRequest < ?").bind(Date.now() - DAY_MS),
      // Un profil sans compte ni partie : ce que laisse une inscription qui échoue
      // entre la création du profil et celle du compte (`databaseHooks.user.create`).
      // Les profils créés sans compte par `POST /api/matches` ont des parties, et ceux
      // des comptes supprimés aussi s'ils ont joué : seuls les orphelins inutiles partent.
      env.DB.prepare(
        `DELETE FROM players WHERE created_at < ?
           AND NOT EXISTS (SELECT 1 FROM users WHERE users.player_id = players.id)
           AND NOT EXISTS (SELECT 1 FROM matches WHERE matches.player_a = players.id OR matches.player_b = players.id)`,
      ).bind(Date.now() - DAY_MS),
    ]);
  },
} satisfies ExportedHandler<Env>;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Les parcours de compte ont chacun leur URL, pour que les gestionnaires de mots de passe
 * les distinguent (une connexion n'est pas une inscription) ; tous sont servis par la
 * page du jeu, dont l'îlot de compte lit le chemin. La liste est explicite : un repli
 * global vers `index.html` ferait d'une faute de frappe une page blanche au lieu d'un 404.
 */
export const ACCOUNT_PATHS = ["/connexion", "/inscription", "/mot-de-passe-oublie", "/reinitialiser"] as const;

function pageFor(pathname: string): string | undefined {
  if ((ACCOUNT_PATHS as readonly string[]).includes(pathname)) return "/";
  if (pathname === "/profil") return "/profil/";
  return undefined;
}

/** Le minimum que Better Auth recommande pour un secret de signature. */
const MIN_AUTH_SECRET_LENGTH = 32;

function hasAuthSecret(env: Env): boolean {
  return typeof env.AUTH_SECRET === "string" && env.AUTH_SECRET.length >= MIN_AUTH_SECRET_LENGTH;
}

/**
 * L'identité passée à la file vient du cookie, **jamais de la requête**. Le Durable
 * Object n'est pas routable de l'extérieur : ce que le Worker écrit dans l'URL est
 * donc hors de portée du client.
 */
async function joinQueue(
  request: Request,
  env: Env,
  auth: ReturnType<typeof buildAuth>,
  url: URL,
): Promise<Response> {
  const account = await currentAccount(auth, request);
  if (account === undefined) return new Response("authentification requise", { status: 401 });

  // L'adresse vérifiée est exigée ici, et non à la connexion : un compte reste
  // utilisable tant que le message n'est pas arrivé, mais le jeu apparié — celui qui
  // porte le classement et qu'un compte jetable viendrait polluer — ne s'ouvre qu'une
  // fois l'adresse prouvée.
  if (!account.emailVerified) {
    return new Response("adresse non vérifiée", { status: 403 });
  }

  const forwarded = new URL(url);
  forwarded.searchParams.set("player", account.playerId);
  return env.QUEUE.get(env.QUEUE.idFromName(QUEUE_SINGLETON)).fetch(
    new Request(forwarded, request),
  );
}

/** Création directe d'une partie, hors file d'attente — parties privées et tests. */
async function createMatch(request: Request, env: Env): Promise<Response> {
  const { playerA, playerB } = (await request.json()) as { playerA: string; playerB: string };
  const match = await startMatch(env, playerA, playerB);
  return Response.json(match);
}
