-- La préparation d'une partie : déploiement des équipes, Elo, faits d'armes, presets.

-- Une partie classée (file d'attente rapide) fait varier l'Elo ; une partie privée non.
-- Les parties d'avant cette migration n'en ont fait varier aucun : 0.
ALTER TABLE matches ADD COLUMN rated INTEGER NOT NULL DEFAULT 0;

-- Les pièces de départ, telles que le déploiement les a posées (JSON de `Piece[]`).
-- `NULL` pour une partie sur une carte à position fixe, qui repart de son scénario :
-- c'est avec elles, et non avec le scénario, que le log d'actions se rejoue.
ALTER TABLE matches ADD COLUMN setup TEXT;

-- La variation d'Elo de chaque camp à la clôture d'une partie classée.
ALTER TABLE matches ADD COLUMN rating_change_a INTEGER;
ALTER TABLE matches ADD COLUMN rating_change_b INTEGER;

-- Les faits d'armes que le joueur exhibe (JSON d'identifiants, trois au plus). Le
-- déblocage, lui, n'est pas stocké : il se recalcule depuis les parties.
ALTER TABLE players ADD COLUMN showcase TEXT;

-- Les équipes préparées d'avance. Une par carte et par ruleset, puisque les zones de
-- déploiement dépendent de la carte et les quotas du ruleset ; `is_default` désigne
-- celle qui se précharge au déploiement.
CREATE TABLE team_presets (
  id              TEXT PRIMARY KEY,
  player_id       TEXT NOT NULL REFERENCES players(id),
  name            TEXT NOT NULL,
  scenario        TEXT NOT NULL,
  ruleset_version TEXT NOT NULL,
  team            TEXT NOT NULL,
  is_default      INTEGER NOT NULL DEFAULT 0,
  created_at      INTEGER NOT NULL,
  updated_at      INTEGER NOT NULL
);

CREATE INDEX team_presets_by_player ON team_presets (player_id, updated_at DESC);
