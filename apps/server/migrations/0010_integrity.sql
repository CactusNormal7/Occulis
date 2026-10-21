-- Deux invariants que seul le code tenait, désormais tenus par le schéma.

-- Un profil de jeu appartient à un compte au plus. La clé étrangère de `users.player_id`
-- s'est perdue avec le schéma généré de Better Auth (0004), et son index n'était pas
-- unique : deux comptes auraient pu jouer sous le même profil. Si cette migration échoue,
-- c'est qu'un tel doublon existe déjà, et il faut le résoudre à la main avant de déployer.
DROP INDEX users_by_player;
CREATE UNIQUE INDEX users_by_player ON users (player_id) WHERE player_id IS NOT NULL;

-- Une seule équipe préparée par défaut par joueur. Deux premières créations simultanées
-- pouvaient en marquer deux ; on garde la plus récente avant de poser l'index.
UPDATE team_presets SET is_default = 0
 WHERE is_default = 1
   AND id NOT IN (
     SELECT (SELECT u.id FROM team_presets u
              WHERE u.player_id = t.player_id AND u.is_default = 1
              ORDER BY u.updated_at DESC, u.id DESC LIMIT 1)
       FROM team_presets t
      WHERE t.is_default = 1
   );
CREATE UNIQUE INDEX team_presets_one_default ON team_presets (player_id) WHERE is_default = 1;
