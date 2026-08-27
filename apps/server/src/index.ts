import { CURRENT_RULESET_VERSION } from "./rulesets.js";
import { DEFAULT_SCENARIO } from "./scenarios.js";
import type { MatchConfig } from "./match-do.js";

export { MatchDO } from "./match-do.js";

/**
 * Le Worker ne détient aucun état de partie : il authentifie, écrit en D1, puis
 * route vers le Durable Object qui porte la partie. Deux joueurs de la même partie
 * atteignent forcément la même instance (docs/architecture.md section 2).
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/matches" && request.method === "POST") {
      return createMatch(request, env);
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

async function createMatch(request: Request, env: Env): Promise<Response> {
  const { playerA, playerB } = (await request.json()) as { playerA: string; playerB: string };
  const matchId = crypto.randomUUID();

  const config: MatchConfig = {
    matchId,
    rulesetVersion: CURRENT_RULESET_VERSION,
    scenario: DEFAULT_SCENARIO,
  };

  await env.DB.prepare(
    `INSERT INTO matches (id, player_a, player_b, ruleset_version, scenario, started_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  )
    .bind(matchId, playerA, playerB, config.rulesetVersion, config.scenario, Date.now())
    .run();

  await env.MATCH.get(env.MATCH.idFromName(matchId)).fetch(
    new Request("https://do/init", { method: "POST", body: JSON.stringify(config) }),
  );

  return Response.json({ matchId });
}
