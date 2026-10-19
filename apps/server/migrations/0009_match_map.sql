-- La carte de chaque partie, figée à sa création (JSON de `ScenarioSnapshot` : cases,
-- position fixe, zones et équipes par défaut). Retoucher une carte du registre ne change
-- plus les parties en cours ni les replays des parties finies, comme le ruleset déjà
-- versionné par partie. `NULL` pour les parties d'avant : elles repartent du registre,
-- sous leur nom (`frozenScenario()`).
ALTER TABLE matches ADD COLUMN map TEXT;
