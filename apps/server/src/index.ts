import { QUEUE_SINGLETON } from "./queue-do.js";
import { startMatch } from "./match-setup.js";

export { MatchDO } from "./match-do.js";
export { QueueDO } from "./queue-do.js";

/**
 * Le Worker ne détient aucun état de partie : il route vers le Durable Object qui la
 * porte. Deux joueurs de la même partie atteignent forcément la même instance
 * (docs/architecture.md section 2).
 *
 * ATTENTION : il n'y a toujours aucune authentification (docs/setup.md section 7).
 * L'identité annoncée à la file d'attente n'est vérifiée par personne. Ce qui est
 * garanti, c'est qu'une connexion à une partie est liée à un **siège** : sans le
 * jeton tiré à la création, on n'obtient la vue d'aucun des deux camps.
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/matches" && request.method === "POST") {
      return createMatch(request, env);
    }

    if (url.pathname === "/api/queue") {
      return env.QUEUE.get(env.QUEUE.idFromName(QUEUE_SINGLETON)).fetch(request);
    }

    const matchId = url.pathname.match(/^\/match\/([\w-]+)$/)?.[1];
    if (matchId !== undefined) {
      return env.MATCH.get(env.MATCH.idFromName(matchId)).fetch(request);
    }

    // Le client statique est servi par le même Worker : client et serveur partent du
    // même commit, donc du même `core` (docs/architecture.md section 4).
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;

/** Création directe d'une partie, hors file d'attente — parties privées et tests. */
async function createMatch(request: Request, env: Env): Promise<Response> {
  const { playerA, playerB } = (await request.json()) as { playerA: string; playerB: string };
  const match = await startMatch(env, playerA, playerB);
  return Response.json(match);
}
