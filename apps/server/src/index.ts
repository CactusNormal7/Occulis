import { QUEUE_SINGLETON } from "./queue-do.js";
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

    const authenticated = await handleAuth(request, env, url.pathname);
    if (authenticated !== undefined) return authenticated;

    if (url.pathname === "/api/matches" && request.method === "POST") {
      return createMatch(request, env);
    }

    if (url.pathname === "/api/queue") return joinQueue(request, env, url);

    const matchId = url.pathname.match(/^\/match\/([\w-]+)$/)?.[1];
    if (matchId !== undefined) {
      return env.MATCH.get(env.MATCH.idFromName(matchId)).fetch(request);
    }

    // Le client statique est servi par le même Worker : client et serveur partent du
    // même commit, donc du même `core` (docs/architecture.md section 4).
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;

/**
 * L'identité passée à la file vient du cookie, **jamais de la requête**. Le Durable
 * Object n'est pas routable de l'extérieur : ce que le Worker écrit dans l'URL est
 * donc hors de portée du client.
 */
async function joinQueue(request: Request, env: Env, url: URL): Promise<Response> {
  const account = await currentAccount(env, request);
  if (account === undefined) return new Response("authentification requise", { status: 401 });

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
