import type {
  ChatMessage,
  ChatPage,
  FriendProfile,
  FriendsOverview,
  MeMatchDetail,
  MeMatchPage,
  PlayerSearchResult,
  Relation,
} from "@occulis/protocol";
import type { Outcome } from "../load/cache.js";
import { type ErrorWording, jsonInit, request } from "../net/http.js";
import { authMessage } from "../net/auth.js";
import { messages as dictionary } from "../locale/current.js";
import { socialMessage } from "./model.js";

/**
 * Les appels du système d'amis, partagés par le menu du jeu et le profil. Comme pour le
 * profil, aucun ne dit qui appelle : c'est le cookie. Un identifiant dans le chemin
 * désigne toujours l'autre joueur.
 */

export const FRIEND_PAGE_SIZE = 20;

const WORDING: ErrorWording = {
  unreachable: () => dictionary().profile.unreachable,
  describe: (status, payload) =>
    status === 401
      ? dictionary().profile.sessionExpired
      : (socialMessage(payload.code) ?? authMessage(status, payload)),
};

const call = <T>(path: string, init?: RequestInit): Promise<Outcome<T>> =>
  request<T>(path, init, WORDING);

const write = <T>(method: "POST" | "DELETE", path: string, body?: unknown): Promise<Outcome<T>> =>
  call<T>(path, jsonInit(method, body));

const id = encodeURIComponent;

export const overview = () => call<FriendsOverview>("/api/friends");
export const search = (prefix: string) =>
  call<PlayerSearchResult[]>(`/api/players/search?q=${id(prefix)}`);

export const requestFriend = (playerId: string) =>
  write<{ relation: Relation }>("POST", "/api/friends/requests", { playerId });
export const acceptRequest = (playerId: string) =>
  write("POST", `/api/friends/requests/${id(playerId)}/accept`);
export const declineRequest = (playerId: string) =>
  write("POST", `/api/friends/requests/${id(playerId)}/decline`);
export const cancelRequest = (playerId: string) =>
  write("POST", `/api/friends/requests/${id(playerId)}/cancel`);
export const removeFriend = (playerId: string) => write("DELETE", `/api/friends/${id(playerId)}`);
export const block = (playerId: string) => write("POST", "/api/blocks", { playerId });
export const unblock = (playerId: string) => write("DELETE", `/api/blocks/${id(playerId)}`);

export const friend = (playerId: string) => call<FriendProfile>(`/api/friends/${id(playerId)}`);
export const friendMatches = (playerId: string, offset: number) =>
  call<MeMatchPage>(
    `/api/friends/${id(playerId)}/matches?limit=${FRIEND_PAGE_SIZE}&offset=${offset}`,
  );
export const friendMatch = (playerId: string, matchId: string) =>
  call<MeMatchDetail>(`/api/friends/${id(playerId)}/matches/${id(matchId)}`);

export const messages = (playerId: string, before?: number) =>
  call<ChatPage>(
    `/api/friends/${id(playerId)}/messages${before === undefined ? "" : `?before=${before}`}`,
  );
export const sendMessage = (playerId: string, body: string) =>
  write<ChatMessage>("POST", `/api/friends/${id(playerId)}/messages`, { body });
export const markRead = (playerId: string) =>
  write<{ read: number }>("POST", `/api/friends/${id(playerId)}/messages/read`);

export const challenge = (playerId: string) =>
  write("POST", `/api/friends/${id(playerId)}/challenge`);
export const withdrawChallenge = (playerId: string) =>
  write("DELETE", `/api/friends/${id(playerId)}/challenge`);
export const acceptChallenge = (playerId: string) =>
  write<{ matchId: string }>("POST", `/api/friends/${id(playerId)}/challenge/accept`);
export const declineChallenge = (playerId: string) =>
  write("POST", `/api/friends/${id(playerId)}/challenge/decline`);

export const allowSpectators = (allow: boolean) =>
  write<{ allowSpectators: boolean }>("POST", "/api/me/spectators", { allow });
