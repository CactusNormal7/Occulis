-- Schéma initial. Le log d'actions est la source de vérité ; l'état d'un Durable
-- Object n'en est qu'un cache reconstructible (docs/architecture.md section 3).

CREATE TABLE players (
  id         TEXT PRIMARY KEY,
  handle     TEXT NOT NULL UNIQUE,
  elo        INTEGER NOT NULL DEFAULT 1200,
  created_at INTEGER NOT NULL
);

-- `ruleset_version` est figée à la création : une partie démarrée sous un ruleset
-- s'y termine, y compris à travers un déploiement (docs/architecture.md section 1).
CREATE TABLE matches (
  id              TEXT PRIMARY KEY,
  player_a        TEXT NOT NULL REFERENCES players(id),
  player_b        TEXT NOT NULL REFERENCES players(id),
  ruleset_version TEXT NOT NULL,
  scenario        TEXT NOT NULL,
  started_at      INTEGER NOT NULL,
  finished_at     INTEGER,
  outcome         TEXT
);

CREATE INDEX matches_by_player_a ON matches (player_a, started_at DESC);
CREATE INDEX matches_by_player_b ON matches (player_b, started_at DESC);

-- Un enregistrement par coup. `seq` ordonne le rejeu ; `action` est l'Action de
-- @occulis/core sérialisée. Rejouer ces lignes reconstruit l'état exact, mémoire
-- fantôme comprise — d'où l'invariant de déterminisme de core.
CREATE TABLE match_actions (
  match_id TEXT NOT NULL REFERENCES matches(id),
  seq      INTEGER NOT NULL,
  action   TEXT NOT NULL,
  PRIMARY KEY (match_id, seq)
);
