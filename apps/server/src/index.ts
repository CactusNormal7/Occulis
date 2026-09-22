import { QUEUE_SINGLETON } from "./queue-do.js";
import { buildAuth } from "./auth/better-auth.js";
import { currentAccount, handleAuth } from "./auth/routes.js";
import { startMatch } from "./match-setup.js";

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
    // Construite par requête : les bindings n'existent que là, et l'URL de base doit
    // être celle par laquelle on est joint, sinon les liens envoyés par courrier
    // pointeraient vers un autre environnement que celui où l'inscription a eu lieu.
    const auth = buildAuth(env, url.origin);

    const authenticated = await handleAuth(auth, request, url.pathname);
    if (authenticated !== undefined) return authenticated;

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
    ]);
  },
} satisfies ExportedHandler<Env>;

const DAY_MS = 24 * 60 * 60 * 1000;

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
