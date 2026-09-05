import type { MatchConfig } from "./match-do.js";
import { CURRENT_RULESET_VERSION } from "./rulesets.js";
import { DEFAULT_SCENARIO } from "@occulis/core";
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

  await ensurePlayers(env, playerA, playerB);
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

/**
 * Garantit l'existence des deux lignes `players` que `matches` référence.
 *
 * BOUCHON, en attendant l'authentification (docs/technical/server.md, « Non
 * implémenté ») : aucune route ne crée de compte, donc rien ne peuplerait `players`
 * et la contrainte de clé étrangère ferait échouer toute création de partie. Le jour
 * où un compte existera, la création d'un profil lui reviendra et cette fonction
 * disparaîtra — elle ne doit surtout pas devenir le chemin normal d'inscription.
 */
async function ensurePlayers(env: Env, ...ids: readonly string[]): Promise<void> {
  const statement = env.DB.prepare(
    "INSERT OR IGNORE INTO players (id, handle, created_at) VALUES (?, ?, ?)",
  );
  await env.DB.batch(ids.map((id) => statement.bind(id, id, Date.now())));
}
