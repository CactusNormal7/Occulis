-- Passage de l'authentification maison à Better Auth (docs/architecture.md section 7).
--
-- Le schéma ci-dessous est **généré** par la bibliothèque, pas écrit à la main :
-- `pnpm --filter @occulis/server auth:schema` le recrache, et il doit être recopié ici
-- tel quel à chaque ajout de greffon (OAuth, 2FA). Le modifier à la main ferait diverger
-- la base des requêtes que Better Auth émet.
--
-- Ce qui reste au projet et que la bibliothèque ne connaît pas : `players`, le profil de
-- jeu (pseudo affiché, ELO), relié par `users.player_id`. Un compte possède un profil.

-- Les sessions existantes ne sont pas récupérables : elles ne stockaient que l'empreinte
-- du jeton, quand Better Auth a besoin du jeton lui-même. Les comptes, eux, survivent
-- intégralement — d'où la reprise de `users` plus bas. Chacun devra se reconnecter une fois.
DROP TABLE sessions;

ALTER TABLE users RENAME TO users_legacy;

CREATE TABLE users (
  id             TEXT NOT NULL PRIMARY KEY,
  name           TEXT NOT NULL,
  email          TEXT NOT NULL UNIQUE,
  email_verified INTEGER NOT NULL,
  image          TEXT,
  created_at     DATE NOT NULL,
  updated_at     DATE NOT NULL,
  player_id      TEXT
);

CREATE TABLE accounts (
  id                          TEXT NOT NULL PRIMARY KEY,
  account_id                  TEXT NOT NULL,
  provider_id                 TEXT NOT NULL,
  user_id                     TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  access_token                TEXT,
  refresh_token               TEXT,
  id_token                    TEXT,
  access_token_expires_at     DATE,
  refresh_token_expires_at    DATE,
  scope                       TEXT,
  password                    TEXT,
  created_at                  DATE NOT NULL,
  updated_at                  DATE NOT NULL
);

CREATE TABLE sessions (
  id         TEXT NOT NULL PRIMARY KEY,
  expires_at DATE NOT NULL,
  token      TEXT NOT NULL UNIQUE,
  created_at DATE NOT NULL,
  updated_at DATE NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  user_id    TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE verifications (
  id         TEXT NOT NULL PRIMARY KEY,
  identifier TEXT NOT NULL,
  value      TEXT NOT NULL,
  expires_at DATE NOT NULL,
  created_at DATE NOT NULL,
  updated_at DATE NOT NULL
);

-- `lastRequest` garde sa casse d'origine : c'est le nom que la bibliothèque émet dans ses
-- requêtes, et il n'est pas configurable comme le sont ceux des quatre tables ci-dessus.
CREATE TABLE rate_limits (
  id          TEXT NOT NULL PRIMARY KEY,
  key         TEXT NOT NULL UNIQUE,
  count       INTEGER NOT NULL,
  lastRequest BIGINT NOT NULL
);

-- Reprise des comptes existants. Le pseudo devient le `name` du compte (Better Auth
-- n'a pas d'autre champ pour l'afficher) mais reste porté par `players`, qui en tient
-- l'unicité. Aucune adresse n'est marquée vérifiée : personne ne l'a jamais été.
--
-- Les horodatages changent de représentation au passage : le schéma précédent comptait
-- en millisecondes, Better Auth écrit du texte ISO 8601. Recopier l'entier tel quel
-- donnerait des dates que la bibliothèque relirait de travers, sans rien signaler.
INSERT INTO users (id, name, email, email_verified, image, created_at, updated_at, player_id)
SELECT
  u.id,
  p.handle,
  u.email,
  0,
  NULL,
  strftime('%Y-%m-%dT%H:%M:%fZ', u.created_at / 1000.0, 'unixepoch'),
  strftime('%Y-%m-%dT%H:%M:%fZ', u.created_at / 1000.0, 'unixepoch'),
  u.player_id
FROM users_legacy u
JOIN players p ON p.id = u.player_id;

-- L'empreinte du mot de passe déménage dans `accounts` : Better Auth range un mot de
-- passe comme un moyen d'authentification parmi d'autres, sous le fournisseur
-- `credential`. Le format `pbkdf2-sha256$…` est conservé tel quel, et reste vérifiable
-- puisque le hasher du projet est branché dans la configuration.
INSERT INTO accounts (id, account_id, provider_id, user_id, password, created_at, updated_at)
SELECT
  lower(hex(randomblob(16))),
  u.id,
  'credential',
  u.id,
  u.password_hash,
  strftime('%Y-%m-%dT%H:%M:%fZ', u.created_at / 1000.0, 'unixepoch'),
  strftime('%Y-%m-%dT%H:%M:%fZ', u.created_at / 1000.0, 'unixepoch')
FROM users_legacy u;

DROP TABLE users_legacy;

CREATE INDEX sessions_user_id_idx ON sessions (user_id);
CREATE INDEX accounts_user_id_idx ON accounts (user_id);
CREATE INDEX verifications_identifier_idx ON verifications (identifier);
CREATE INDEX users_by_player ON users (player_id);

-- Purger une session périmée est un balayage : sans index, il parcourrait la table.
CREATE INDEX sessions_by_expiry ON sessions (expires_at);
