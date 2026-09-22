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
 * Le matchmaking n'en a plus besoin : l'inscription crée le profil de jeu en même
 * temps que le compte, et `/api/queue` n'accepte qu'un joueur authentifié. Reste la
 * création directe d'une partie (`POST /api/matches`), qui n'exige aucun compte pour
 * qu'une partie privée ou un test puisse démarrer sans en créer.
 *
 * Ce n'est donc pas un chemin d'inscription : les lignes créées ici n'ont ni compte,
 * ni mot de passe, ni moyen de se connecter.
 */
async function ensurePlayers(env: Env, ...ids: readonly string[]): Promise<void> {
  const statement = env.DB.prepare(
    "INSERT OR IGNORE INTO players (id, handle, created_at) VALUES (?, ?, ?)",
  );
  await env.DB.batch(ids.map((id) => statement.bind(id, id, Date.now())));
}
