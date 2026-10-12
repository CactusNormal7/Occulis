import type {
  ChatMessage,
  ChatPage,
  Friend,
  FriendProfile,
  FriendRequest,
  FriendsOverview,
  LiveMatch,
  PlayerSearchResult,
  SocialPlayer,
} from "@occulis/protocol";
import type { PlayerId } from "@occulis/core";
import { recordOf, recordStatement } from "../me/queries.js";
import { CHAT_PAGE_SIZE, MESSAGES_PER_WINDOW, MESSAGE_WINDOW_MS } from "./chat.js";
import { pairOf, relationOf, type RelationFacts } from "./relations.js";
import { SEARCH_LIMIT } from "./search.js";

/**
 * Les lectures et écritures du système d'amis sur D1.
 *
 * Comme pour le profil, **chaque requête est bornée par l'identifiant du joueur de la
 * session** (`self`) : un identifiant venu de l'URL ne désigne jamais qu'un autre joueur
 * *par rapport à* celui-là. Les routes qui ouvrent les données d'un ami vérifient
 * l'amitié avant toute lecture (`isFriend`).
 */

/** Combien de parties en cours d'un ami la liste montre, les plus récentes d'abord. */
const LIVE_MATCHES_PER_FRIEND = 3;

/** La condition « `?1` et `p.id` sont amis », réutilisée dans plusieurs requêtes. */
const FRIEND_OF = `EXISTS (SELECT 1 FROM friendships f
  WHERE (f.player_low = ?1 AND f.player_high = p.id) OR (f.player_low = p.id AND f.player_high = ?1))`;

export async function readFacts(db: D1Database, self: string, other: string): Promise<RelationFacts> {
  const row = await db
    .prepare(
      `SELECT EXISTS (SELECT 1 FROM users u WHERE u.player_id = p.id) AS has_account,
              ${FRIEND_OF} AS friend,
              EXISTS (SELECT 1 FROM friend_requests WHERE sender = ?1 AND recipient = p.id) AS outgoing,
              EXISTS (SELECT 1 FROM friend_requests WHERE sender = p.id AND recipient = ?1) AS incoming,
              EXISTS (SELECT 1 FROM blocks WHERE blocker = ?1 AND blocked = p.id) AS i_block,
              EXISTS (SELECT 1 FROM blocks WHERE blocker = p.id AND blocked = ?1) AS they_block
       FROM players p WHERE p.id = ?2`,
    )
    .bind(self, other)
    .first<Record<string, number>>();
  return {
    exists: row?.["has_account"] === 1,
    friend: row?.["friend"] === 1,
    outgoing: row?.["outgoing"] === 1,
    incoming: row?.["incoming"] === 1,
    iBlock: row?.["i_block"] === 1,
    theyBlock: row?.["they_block"] === 1,
  };
}

export async function isFriend(db: D1Database, self: string, other: string): Promise<boolean> {
  const [low, high] = pairOf(self, other);
  const row = await db
    .prepare("SELECT 1 AS yes FROM friendships WHERE player_low = ? AND player_high = ?")
    .bind(low, high)
    .first<{ yes: number }>();
  return row !== null;
}

export async function pendingRequests(db: D1Database, self: string): Promise<number> {
  const row = await db
    .prepare("SELECT COUNT(*) AS total FROM friend_requests WHERE sender = ?")
    .bind(self)
    .first<{ total: number }>();
  return row?.total ?? 0;
}

export async function handleOf(db: D1Database, playerId: string): Promise<SocialPlayer | undefined> {
  const row = await db.prepare("SELECT id, handle FROM players WHERE id = ?").bind(playerId).first<SocialPlayer>();
  return row ?? undefined;
}

/** Les identifiants des amis du joueur : à qui annoncer sa présence. */
export async function friendIds(db: D1Database, self: string): Promise<string[]> {
  const rows = await db
    .prepare(
      `SELECT CASE WHEN player_low = ?1 THEN player_high ELSE player_low END AS id
       FROM friendships WHERE player_low = ?1 OR player_high = ?1`,
    )
    .bind(self)
    .all<{ id: string }>();
  return rows.results.map((row) => row.id);
}

interface FriendRow {
  id: string;
  handle: string;
  online: number;
  allow_spectators: number;
  since: number;
  unread: number;
}

interface LiveRow {
  id: string;
  player_a: string;
  player_b: string;
  handle_a: string;
  handle_b: string;
  started_at: number;
}

interface RequestRow {
  id: string;
  handle: string;
  created_at: number;
}

export async function readOverview(db: D1Database, self: string): Promise<FriendsOverview> {
  const [friends, live, incoming, outgoing, blocked] = await db.batch([
    db
      .prepare(
        `SELECT p.id, p.handle, p.online, p.allow_spectators, f.created_at AS since,
                (SELECT COUNT(*) FROM messages m
                 WHERE m.sender = p.id AND m.recipient = ?1 AND m.read_at IS NULL) AS unread
         FROM friendships f
         JOIN players p ON p.id = CASE WHEN f.player_low = ?1 THEN f.player_high ELSE f.player_low END
         WHERE f.player_low = ?1 OR f.player_high = ?1
         ORDER BY p.online DESC, p.handle COLLATE NOCASE`,
      )
      .bind(self),
    db
      .prepare(
        `WITH mine AS (
           SELECT CASE WHEN player_low = ?1 THEN player_high ELSE player_low END AS id
           FROM friendships WHERE player_low = ?1 OR player_high = ?1
         )
         SELECT m.id, m.player_a, m.player_b, pa.handle AS handle_a, pb.handle AS handle_b, m.started_at
         FROM matches m
         JOIN players pa ON pa.id = m.player_a
         JOIN players pb ON pb.id = m.player_b
         WHERE m.finished_at IS NULL
           AND (m.player_a IN (SELECT id FROM mine) OR m.player_b IN (SELECT id FROM mine))
         ORDER BY m.started_at DESC`,
      )
      .bind(self),
    db
      .prepare(
        `SELECT p.id, p.handle, r.created_at FROM friend_requests r JOIN players p ON p.id = r.sender
         WHERE r.recipient = ? ORDER BY r.created_at DESC`,
      )
      .bind(self),
    db
      .prepare(
        `SELECT p.id, p.handle, r.created_at FROM friend_requests r JOIN players p ON p.id = r.recipient
         WHERE r.sender = ? ORDER BY r.created_at DESC`,
      )
      .bind(self),
    db
      .prepare(
        `SELECT p.id, p.handle FROM blocks b JOIN players p ON p.id = b.blocked
         WHERE b.blocker = ? ORDER BY p.handle COLLATE NOCASE`,
      )
      .bind(self),
  ]);

  const friendRows = (friends?.results ?? []) as FriendRow[];
  const liveRows = (live?.results ?? []) as LiveRow[];
  return {
    friends: friendRows.map((row): Friend => {
      const allowSpectators = row.allow_spectators === 1;
      return {
        id: row.id,
        handle: row.handle,
        online: row.online === 1,
        since: row.since,
        allowSpectators,
        unread: row.unread,
        matches: liveRows
          .filter((match) => match.player_a === row.id || match.player_b === row.id)
          .slice(0, LIVE_MATCHES_PER_FRIEND)
          .map((match) => liveMatch(match, row.id, self, allowSpectators)),
      };
    }),
    incoming: ((incoming?.results ?? []) as RequestRow[]).map(requestOf),
    outgoing: ((outgoing?.results ?? []) as RequestRow[]).map(requestOf),
    blocked: (blocked?.results ?? []) as SocialPlayer[],
  };
}

function liveMatch(row: LiveRow, friend: string, self: string, allowSpectators: boolean): LiveMatch {
  const side: PlayerId = row.player_a === friend ? "A" : "B";
  const opponentId = side === "A" ? row.player_b : row.player_a;
  return {
    id: row.id,
    side,
    opponent: side === "A" ? row.handle_b : row.handle_a,
    startedAt: row.started_at,
    // Contre moi, regarder l'ami serait voir la vue adverse de ma propre partie.
    watchable: allowSpectators && opponentId !== self,
  };
}

function requestOf(row: RequestRow): FriendRequest {
  return { id: row.id, handle: row.handle, createdAt: row.created_at };
}

/**
 * Recherche par préfixe de pseudo. Ni soi, ni les profils sans compte (anonymisés ou
 * créés par `POST /api/matches`), ni ceux qui vous ont bloqué.
 */
export async function searchPlayers(
  db: D1Database,
  self: string,
  range: { readonly from: string; readonly to: string },
): Promise<PlayerSearchResult[]> {
  const rows = await db
    .prepare(
      `SELECT p.id, p.handle,
              1 AS has_account,
              ${FRIEND_OF} AS friend,
              EXISTS (SELECT 1 FROM friend_requests WHERE sender = ?1 AND recipient = p.id) AS outgoing,
              EXISTS (SELECT 1 FROM friend_requests WHERE sender = p.id AND recipient = ?1) AS incoming,
              EXISTS (SELECT 1 FROM blocks WHERE blocker = ?1 AND blocked = p.id) AS i_block
       FROM players p
       WHERE p.handle >= ?2 COLLATE NOCASE AND p.handle < ?3 COLLATE NOCASE
         AND p.id != ?1
         AND EXISTS (SELECT 1 FROM users u WHERE u.player_id = p.id)
         AND NOT EXISTS (SELECT 1 FROM blocks WHERE blocker = p.id AND blocked = ?1)
       ORDER BY p.handle COLLATE NOCASE
       LIMIT ?4`,
    )
    .bind(self, range.from, range.to, SEARCH_LIMIT)
    .all<Record<string, number> & { id: string; handle: string }>();
  return rows.results.map((row) => ({
    id: row.id,
    handle: row.handle,
    relation: relationOf({
      exists: true,
      friend: row["friend"] === 1,
      outgoing: row["outgoing"] === 1,
      incoming: row["incoming"] === 1,
      iBlock: row["i_block"] === 1,
      theyBlock: false,
    }),
  }));
}

export async function sendRequest(db: D1Database, self: string, other: string, now: number): Promise<void> {
  await db
    .prepare("INSERT OR IGNORE INTO friend_requests (sender, recipient, created_at) VALUES (?, ?, ?)")
    .bind(self, other, now)
    .run();
}

/**
 * Accepte la demande de `sender`. L'amitié n'est écrite que si la demande existe
 * encore, dans la même transaction qui l'efface : deux acceptations simultanées ne
 * peuvent pas rendre deux succès pour une seule demande.
 */
export async function acceptRequest(db: D1Database, self: string, sender: string, now: number): Promise<boolean> {
  const [low, high] = pairOf(self, sender);
  const [inserted] = await db.batch([
    db
      .prepare(
        `INSERT OR IGNORE INTO friendships (player_low, player_high, created_at)
         SELECT ?1, ?2, ?3 WHERE EXISTS (SELECT 1 FROM friend_requests WHERE sender = ?4 AND recipient = ?5)`,
      )
      .bind(low, high, now, sender, self),
    db
      .prepare(
        "DELETE FROM friend_requests WHERE (sender = ?1 AND recipient = ?2) OR (sender = ?2 AND recipient = ?1)",
      )
      .bind(sender, self),
  ]);
  return (inserted?.meta.changes ?? 0) > 0;
}

export async function deleteRequest(db: D1Database, sender: string, recipient: string): Promise<boolean> {
  const result = await db
    .prepare("DELETE FROM friend_requests WHERE sender = ? AND recipient = ?")
    .bind(sender, recipient)
    .run();
  return result.meta.changes > 0;
}

export async function removeFriend(db: D1Database, self: string, other: string): Promise<boolean> {
  const [low, high] = pairOf(self, other);
  const result = await db
    .prepare("DELETE FROM friendships WHERE player_low = ? AND player_high = ?")
    .bind(low, high)
    .run();
  return result.meta.changes > 0;
}

/** Bloquer coupe tout : l'amitié et les demandes, dans les deux sens. */
export async function block(db: D1Database, self: string, other: string, now: number): Promise<void> {
  const [low, high] = pairOf(self, other);
  await db.batch([
    db.prepare("INSERT OR IGNORE INTO blocks (blocker, blocked, created_at) VALUES (?, ?, ?)").bind(self, other, now),
    db.prepare("DELETE FROM friendships WHERE player_low = ? AND player_high = ?").bind(low, high),
    db
      .prepare(
        "DELETE FROM friend_requests WHERE (sender = ?1 AND recipient = ?2) OR (sender = ?2 AND recipient = ?1)",
      )
      .bind(self, other),
  ]);
}

export async function unblock(db: D1Database, self: string, other: string): Promise<boolean> {
  const result = await db.prepare("DELETE FROM blocks WHERE blocker = ? AND blocked = ?").bind(self, other).run();
  return result.meta.changes > 0;
}

export async function readFriendProfile(db: D1Database, self: string, friend: string): Promise<FriendProfile | undefined> {
  const [low, high] = pairOf(self, friend);
  const [player, record] = await db.batch([
    db
      .prepare(
        `SELECT p.id, p.handle, p.online, p.allow_spectators, p.elo, f.created_at AS since
         FROM friendships f JOIN players p ON p.id = ?3
         WHERE f.player_low = ?1 AND f.player_high = ?2`,
      )
      .bind(low, high, friend),
    recordStatement(db, friend),
  ]);
  const row = player?.results[0] as (Omit<FriendRow, "unread"> & { elo: number }) | undefined;
  if (row === undefined) return undefined;
  return {
    id: row.id,
    handle: row.handle,
    online: row.online === 1,
    since: row.since,
    allowSpectators: row.allow_spectators === 1,
    record: recordOf(record?.results[0]),
    elo: row.elo,
  };
}

interface MessageRow {
  id: string;
  sender: string;
  recipient: string;
  body: string;
  created_at: number;
  read_at: number | null;
}

function messageOf(row: MessageRow): ChatMessage {
  return {
    id: row.id,
    sender: row.sender,
    recipient: row.recipient,
    body: row.body,
    createdAt: row.created_at,
    readAt: row.read_at,
  };
}

export async function listMessages(db: D1Database, self: string, friend: string, before: number): Promise<ChatPage> {
  const rows = await db
    .prepare(
      `SELECT id, sender, recipient, body, created_at, read_at FROM messages
       WHERE ((sender = ?1 AND recipient = ?2) OR (sender = ?2 AND recipient = ?1)) AND created_at < ?3
       ORDER BY created_at DESC, id DESC LIMIT ?4`,
    )
    .bind(self, friend, before, CHAT_PAGE_SIZE + 1)
    .all<MessageRow>();
  const page = rows.results.slice(0, CHAT_PAGE_SIZE).reverse();
  return { messages: page.map(messageOf), hasMore: rows.results.length > CHAT_PAGE_SIZE };
}

/**
 * Écrit un message, sauf si l'expéditeur a dépassé son débit. Le décompte est fait
 * **dans l'insertion elle-même** (`INSERT … SELECT … WHERE`) : deux envois simultanés ne
 * peuvent pas passer tous les deux sous la limite.
 */
export async function insertMessage(
  db: D1Database,
  self: string,
  friend: string,
  body: string,
  now: number,
): Promise<ChatMessage | undefined> {
  const id = crypto.randomUUID();
  const result = await db
    .prepare(
      `INSERT INTO messages (id, sender, recipient, body, created_at)
       SELECT ?1, ?2, ?3, ?4, ?5
       WHERE (SELECT COUNT(*) FROM messages WHERE sender = ?2 AND created_at > ?6) < ?7`,
    )
    .bind(id, self, friend, body, now, now - MESSAGE_WINDOW_MS, MESSAGES_PER_WINDOW)
    .run();
  if (result.meta.changes === 0) return undefined;
  return { id, sender: self, recipient: friend, body, createdAt: now, readAt: null };
}

export async function markRead(db: D1Database, self: string, friend: string, now: number): Promise<number> {
  const result = await db
    .prepare("UPDATE messages SET read_at = ? WHERE sender = ? AND recipient = ? AND read_at IS NULL")
    .bind(now, friend, self)
    .run();
  return result.meta.changes;
}

/** Ce que la garde du spectateur doit savoir d'une partie (`decideWatch`). */
export interface WatchRow {
  readonly finished: boolean;
  readonly player: string | undefined;
  readonly opponent: string | undefined;
  readonly allowSpectators: boolean;
}

export async function readWatchRow(db: D1Database, matchId: string, side: PlayerId): Promise<WatchRow | undefined> {
  const row = await db
    .prepare(
      `SELECT m.finished_at, m.player_a, m.player_b, p.allow_spectators
       FROM matches m JOIN players p ON p.id = CASE WHEN ?2 = 'A' THEN m.player_a ELSE m.player_b END
       WHERE m.id = ?1`,
    )
    .bind(matchId, side)
    .first<{ finished_at: number | null; player_a: string; player_b: string; allow_spectators: number }>();
  if (row === null) return undefined;
  return {
    finished: row.finished_at !== null,
    player: side === "A" ? row.player_a : row.player_b,
    opponent: side === "A" ? row.player_b : row.player_a,
    allowSpectators: row.allow_spectators === 1,
  };
}

/** Tout ce qui rattache un joueur aux autres, effacé avec son compte. */
export function forgetPlayer(db: D1Database, playerId: string): D1PreparedStatement[] {
  return [
    db.prepare("DELETE FROM friendships WHERE player_low = ?1 OR player_high = ?1").bind(playerId),
    db.prepare("DELETE FROM friend_requests WHERE sender = ?1 OR recipient = ?1").bind(playerId),
    db.prepare("DELETE FROM blocks WHERE blocker = ?1 OR blocked = ?1").bind(playerId),
    db.prepare("DELETE FROM messages WHERE sender = ?1 OR recipient = ?1").bind(playerId),
    db.prepare("UPDATE players SET online = 0 WHERE id = ?1").bind(playerId),
  ];
}
