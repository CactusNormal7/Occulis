-- La liste de la beta : une adresse, son état, et la preuve du consentement.
-- Rien d'autre n'est conservé (docs/technical/site.md).
CREATE TABLE beta_signups (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'confirmed')),
  -- Empreinte SHA-256 du jeton de confirmation : le jeton lui-même n'est que dans le message.
  confirm_token_hash TEXT,
  -- Le texte exact que la personne a accepté en cochant la case.
  consent_text TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  confirmed_at INTEGER
);

CREATE INDEX beta_signups_confirm_token ON beta_signups (confirm_token_hash);
CREATE INDEX beta_signups_pending ON beta_signups (status, created_at);
