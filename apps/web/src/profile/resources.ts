import { type Resource, resource } from "../load/cache.js";
import * as friends from "../social/api.js";
import * as api from "./api.js";
import type { ProfileRoute } from "./model.js";

/**
 * Ce que lit chaque écran du profil, en un seul endroit : les vues lisent ces ressources,
 * et `resourcesOf()` les précharge toutes à l'arrivée sur une route, pour que l'écran
 * paraisse d'un seul tenant au lieu d'enchaîner ses lectures. La liste d'amis et les
 * équipes préparées servent aussi la page du jeu, qui les lit sous la même clé.
 */
export const profile = resource("profile", api.profile);
export const feats = resource("feats", api.feats);
export const sessions = resource("sessions", api.sessions);
export const presets = resource("presets", api.presets);
export const friendsOverview = resource("friends", friends.overview);

export const matches = (offset: number) => resource(`matches:${offset}`, () => api.matches(offset));
export const match = (id: string) => resource(`match:${id}`, () => api.match(id));
export const friend = (id: string) => resource(`friend:${id}`, () => friends.friend(id));
export const friendMatches = (id: string, offset: number) =>
  resource(`friend:${id}:matches:${offset}`, () => friends.friendMatches(id, offset));
export const friendMatch = (id: string, matchId: string) =>
  resource(`friend:${id}:match:${matchId}`, () => friends.friendMatch(id, matchId));
export const chat = (id: string) => resource(`chat:${id}`, () => friends.messages(id));

/** La barre du haut lit le profil et les non-lus de la liste d'amis : toute route en dépend. */
export function resourcesOf(route: ProfileRoute): readonly Resource<unknown>[] {
  const frame = [profile, friendsOverview];
  switch (route.view) {
    case "account":
      return [...frame, feats, sessions];
    case "matches":
      return [...frame, matches(route.offset)];
    case "match":
      return [...frame, match(route.id)];
    case "friends":
      return frame;
    case "friend":
      return [...frame, friend(route.id), friendMatches(route.id, route.offset)];
    case "friendMatch":
      return [...frame, friendMatch(route.id, route.matchId)];
    case "chat":
      return [...frame, chat(route.id)];
  }
}
