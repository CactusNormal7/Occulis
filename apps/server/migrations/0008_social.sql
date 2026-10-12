-- Le système d'amis. Tout s'indexe sur `players.id` — le profil de jeu — et non sur le
-- compte : c'est lui que les parties référencent, et un ami se défie, se regarde jouer
-- et se rejoue par ses parties.

-- Une amitié est symétrique : une seule ligne par paire, rangée dans l'ordre, pour
-- qu'aucune paire ne puisse exister deux fois sous deux ordres différents.
CREATE TABLE friendships (
  player_low  TEXT NOT NULL REFERENCES players(id),
  player_high TEXT NOT NULL REFERENCES players(id),
  created_at  INTEGER NOT NULL,
  PRIMARY KEY (player_low, player_high),
  CHECK (player_low < player_high)
);

CREATE INDEX friendships_by_high ON friendships (player_high);

CREATE TABLE friend_requests (
  sender     TEXT NOT NULL REFERENCES players(id),
  recipient  TEXT NOT NULL REFERENCES players(id),
  created_at INTEGER NOT NULL,
  PRIMARY KEY (sender, recipient),
  CHECK (sender != recipient)
);

CREATE INDEX friend_requests_by_recipient ON friend_requests (recipient, created_at DESC);

CREATE TABLE blocks (
  blocker    TEXT NOT NULL REFERENCES players(id),
  blocked    TEXT NOT NULL REFERENCES players(id),
  created_at INTEGER NOT NULL,
  PRIMARY KEY (blocker, blocked),
  CHECK (blocker != blocked)
);

CREATE INDEX blocks_by_blocked ON blocks (blocked);

-- Messages privés entre amis. Purgés après 90 jours par le cron nocturne.
CREATE TABLE messages (
  id         TEXT PRIMARY KEY,
  sender     TEXT NOT NULL REFERENCES players(id),
  recipient  TEXT NOT NULL REFERENCES players(id),
  body       TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  read_at    INTEGER
);

CREATE INDEX messages_by_pair ON messages (sender, recipient, created_at DESC);
CREATE INDEX messages_by_recipient ON messages (recipient, read_at);
CREATE INDEX messages_by_date ON messages (created_at);

-- Un joueur peut refuser qu'un ami regarde ses parties.
ALTER TABLE players ADD COLUMN allow_spectators INTEGER NOT NULL DEFAULT 1;

-- Cache de présence, écrit par le `SocialDO` du joueur à l'ouverture de son premier
-- socket et à la fermeture du dernier. Ce sont les sockets qui font foi.
ALTER TABLE players ADD COLUMN online INTEGER NOT NULL DEFAULT 0;
