import type { MatchConfig } from "./match-do.js";
import { CURRENT_RULESET_VERSION } from "./rulesets.js";
import { DEFAULT_SCENARIO } from "./scenarios.js";
import type { Seats } from "./seating.js";

export interface StartedMatch {
  readonly matchId: string;
  readonly seats: Seats;
}

/**
 * Crée une partie : une ligne en D1, puis l'initialisation du Durable Object.
 *
 * Les jetons de siège sont tirés ici et nulle part ailleurs. `crypto.randomUUID` est
 * hors de `@occulis/core`, qui doit rester strictement déterministe (CLAUDE.md) —
 * c'est précisément pourquoi un aléa de ce genre vit dans le Worker.
 */
export async function startMatch(env: Env, playerA: string, playerB: string): Promise<StartedMatch> {
  const matchId = crypto.randomUUID();
  const seats: Seats = { A: crypto.randomUUID(), B: crypto.randomUUID() };

  const config: MatchConfig = {
    matchId,
    rulesetVersion: CURRENT_RULESET_VERSION,
    scenario: DEFAULT_SCENARIO,
    seats,
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

  return { matchId, seats };
}
