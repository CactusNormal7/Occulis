-- Comptes utilisateurs : identité et authentification (docs/architecture.md
-- section 3, ligne « Comptes, sessions, pseudos »). Distinct de `players`, qui
-- porte le profil de jeu (handle affiché, ELO) : un compte possède un profil.
-- L'authentification n'est pas encore branchée (docs/setup.md section 7) — cette
-- table en pose le support.

CREATE TABLE users (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  player_id     TEXT REFERENCES players(id),
  created_at    INTEGER NOT NULL
);

CREATE INDEX users_by_player ON users (player_id);
