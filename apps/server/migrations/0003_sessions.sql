-- Sessions d'authentification.
--
-- Seul le SHA-256 du jeton est stocké, jamais le jeton lui-même : une fuite de la
-- base ne permet donc pas de se faire passer pour un utilisateur connecté. Le jeton
-- en clair n'existe que dans le cookie du navigateur.
CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id),
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE INDEX sessions_by_user ON sessions (user_id);

-- Purger une session expirée est un balayage : sans index, il parcourrait la table.
CREATE INDEX sessions_by_expiry ON sessions (expires_at);
