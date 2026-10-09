-- Le pseudo devient modifiable par le joueur lui-même, depuis son profil
-- (`POST /api/me/handle`), au plus une fois par période : la date du dernier
-- changement est ce qui l'impose. `NULL` pour un pseudo jamais changé.
ALTER TABLE players ADD COLUMN handle_changed_at INTEGER;

-- L'unicité devient insensible à la casse : « Jules » et « jules » sont le même nom
-- pour qui les lit, donc un moyen d'usurpation.
--
-- Les pseudos qui ne diffèrent déjà que par la casse sont départagés d'abord, sans quoi
-- l'index ne pourrait pas être créé et la migration bloquerait le déploiement (la CI
-- applique les migrations avant de déployer). Le plus ancien garde son pseudo ; les
-- autres reçoivent un suffixe tiré de leur identifiant, donc unique, et restent libres
-- de le changer aussitôt (`handle_changed_at` reste `NULL`).
UPDATE players
SET handle = handle || '-' || substr(replace(id, '-', ''), 1, 6)
WHERE EXISTS (
  SELECT 1 FROM players AS older
  WHERE lower(older.handle) = lower(players.handle)
    AND (older.created_at < players.created_at
         OR (older.created_at = players.created_at AND older.id < players.id))
);

-- Le pseudo vit aussi dans `users.name` (Better Auth) : il suit.
UPDATE users
SET name = (SELECT handle FROM players WHERE players.id = users.player_id)
WHERE player_id IS NOT NULL
  AND name != (SELECT handle FROM players WHERE players.id = users.player_id);

-- La contrainte `UNIQUE` d'origine reste en place, cet index la complète.
CREATE UNIQUE INDEX players_handle_nocase ON players (handle COLLATE NOCASE);
