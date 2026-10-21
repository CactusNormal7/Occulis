import { whoAmI } from "../net/auth.js";
import { type Resource, resource } from "../load/cache.js";
import * as api from "./api.js";
import type { MatchStatus, Route } from "./model.js";

/**
 * Ce que lit chaque écran du back-office, en un seul endroit : les vues lisent ces
 * ressources, et `resourcesOf()` les précharge toutes à l'arrivée sur une route, pour que
 * l'écran paraisse d'un seul tenant au lieu d'enchaîner ses lectures.
 */
export const identity = resource("identity", async () => ({
  ok: true as const,
  value: await whoAmI(),
}));

export const overview = resource("overview", async () => {
  const [stats, recent, newcomers] = await Promise.all([
    api.stats(),
    api.matches({ offset: 0, limit: 6 }),
    api.users("", 0),
  ]);
  if (!stats.ok) return stats;
  return { ok: true as const, value: { stats: stats.value, recent, newcomers } };
});

export const users = (search: string, offset: number) =>
  resource(`users:${search}:${offset}`, () => api.users(search, offset));

export const user = (id: string) =>
  resource(`user:${id}`, async () => {
    const found = await api.user(id);
    if (!found.ok) return found;
    const playerId = found.value.playerId ?? undefined;
    const [sessions, player, history] = await Promise.all([
      api.sessions(id),
      playerId === undefined ? undefined : api.player(playerId),
      playerId === undefined ? undefined : api.matches({ player: playerId, offset: 0, limit: 6 }),
    ]);
    return { ok: true as const, value: { user: found.value, playerId, sessions, player, history } };
  });

export const player = (id: string) =>
  resource(`player:${id}`, async () => {
    const [found, history] = await Promise.all([
      api.player(id),
      api.matches({ player: id, offset: 0, limit: 100 }),
    ]);
    if (!found.ok) return found;
    return { ok: true as const, value: { player: found.value, history } };
  });

export const matches = (status: MatchStatus | null, offset: number) =>
  resource(`matches:${status}:${offset}`, () => api.matches({ status, offset }));

export const match = (id: string) => resource(`match:${id}`, () => api.match(id));

/**
 * La page du design system, chargée à part : elle embarque tous les aperçus de la charte et
 * les sources qu'elle montre, que le reste du back-office n'a pas à télécharger. Comme une
 * lecture, elle part avec l'écran et le fait attendre en entier.
 */
export const designSystem = resource("design-system", async () => ({
  ok: true as const,
  value: await import("./design/DesignSystem.js"),
}));

export function resourcesOf(route: Route): readonly Resource<unknown>[] {
  switch (route.view) {
    case "overview":
      return [identity, overview];
    case "users":
      return [identity, users(route.search, route.offset)];
    case "user":
      return [identity, user(route.id)];
    case "player":
      return [identity, player(route.id)];
    case "matches":
      return [identity, matches(route.status, route.offset)];
    case "match":
      return [identity, match(route.id)];
    case "design":
      return [identity, designSystem];
  }
}
