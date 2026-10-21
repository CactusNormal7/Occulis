import type { MatchConfig } from "./match-do.js";
import {
  CURRENT_RULESET_VERSION,
  DEFAULT_SCENARIO,
  scenarioFor,
  snapshotScenario,
} from "@occulis/core";
import { readPlayerCard } from "./cards.js";
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
export async function startMatch(
  env: Env,
  playerA: string,
  playerB: string,
  options: { readonly rated: boolean } = { rated: false },
): Promise<StartedMatch> {
  const matchId = crypto.randomUUID();
  const seats: Seats = { A: crypto.randomUUID(), B: crypto.randomUUID() };

  const [cardA, cardB] = await Promise.all([
    readPlayerCard(env.DB, playerA),
    readPlayerCard(env.DB, playerB),
  ]);

  const config: MatchConfig = {
    matchId,
    rulesetVersion: CURRENT_RULESET_VERSION,
    scenario: DEFAULT_SCENARIO,
    map: snapshotScenario(scenarioFor(DEFAULT_SCENARIO)),
    seats,
    rated: options.rated,
    players: { A: playerA, B: playerB },
    cards: { A: cardA, B: cardB },
  };

  await env.DB.prepare(
    `INSERT INTO matches (id, player_a, player_b, ruleset_version, scenario, map, started_at, rated)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      matchId,
      playerA,
      playerB,
      config.rulesetVersion,
      config.scenario,
      JSON.stringify(config.map),
      Date.now(),
      options.rated ? 1 : 0,
    )
    .run();

  await env.MATCH.get(env.MATCH.idFromName(matchId)).fetch(
    new Request("https://do/init", { method: "POST", body: JSON.stringify(config) }),
  );

  return { matchId, seats };
}
