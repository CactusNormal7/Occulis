import type { Action, PlayerId } from "@occulis/core";
import type { AdminMatchSummary } from "@occulis/protocol";
import { messages } from "../i18n/current.js";

/**
 * Ce que le back-office décide sans toucher ni au DOM ni au réseau : la route lue dans
 * l'URL et la mise en mots des données. Pur, donc éprouvé sans navigateur, comme
 * `ui/flow.ts` l'est pour les écrans du jeu.
 */

export type Route =
  | { readonly view: "overview" }
  | { readonly view: "users"; readonly search: string; readonly offset: number }
  | { readonly view: "user"; readonly id: string }
  | { readonly view: "matches"; readonly status: MatchStatus | null; readonly offset: number }
  | { readonly view: "match"; readonly id: string }
  | { readonly view: "player"; readonly id: string };

export type MatchStatus = "ongoing" | "finished";

/**
 * La route vit dans le fragment (`#/users/…`) : la page reste un seul fichier statique,
 * servi tel quel par le binding `ASSETS`, et un lien vers une fiche se partage.
 */
export function parseRoute(hash: string): Route {
  const [path = "", query = ""] = hash.replace(/^#\/?/, "").split("?");
  const parameters = new URLSearchParams(query);
  const offset = Math.max(Number.parseInt(parameters.get("offset") ?? "0", 10) || 0, 0);
  const [section, id] = path.split("/").map(decodeURIComponent);

  if (section === "users") {
    if (id !== undefined && id.length > 0) return { view: "user", id };
    return { view: "users", search: parameters.get("q") ?? "", offset };
  }
  if (section === "matches") {
    if (id !== undefined && id.length > 0) return { view: "match", id };
    const status = parameters.get("status");
    return {
      view: "matches",
      status: status === "ongoing" || status === "finished" ? status : null,
      offset,
    };
  }
  if (section === "players" && id !== undefined && id.length > 0) return { view: "player", id };
  return { view: "overview" };
}

export function routeHash(route: Route): string {
  switch (route.view) {
    case "overview":
      return "#/";
    case "users":
      return `#/users${query({ q: route.search, offset: route.offset || "" })}`;
    case "user":
      return `#/users/${encodeURIComponent(route.id)}`;
    case "matches":
      return `#/matches${query({ status: route.status ?? "", offset: route.offset || "" })}`;
    case "match":
      return `#/matches/${encodeURIComponent(route.id)}`;
    case "player":
      return `#/players/${encodeURIComponent(route.id)}`;
  }
}

function query(values: Record<string, string | number>): string {
  const parameters = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== "") parameters.set(key, String(value));
  }
  const text = parameters.toString();
  return text.length === 0 ? "" : `?${text}`;
}

/** L'onglet allumé pour une route : une fiche reste rangée sous sa liste. */
export function sectionOf(route: Route): "overview" | "users" | "matches" {
  if (route.view === "users" || route.view === "user" || route.view === "player") return "users";
  if (route.view === "matches" || route.view === "match") return "matches";
  return "overview";
}

/**
 * Better Auth rend ses dates en texte ISO, les tables du jeu en millisecondes : les deux
 * passent ici. Heure locale, à la minute — c'est l'heure de celui qui lit.
 */
export function formatDate(value: number | string | Date | null | undefined): string {
  if (value === null || value === undefined) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

export function seatHandle(match: AdminMatchSummary, seat: PlayerId): string {
  return seat === "A" ? match.playerA.handle : match.playerB.handle;
}

/**
 * Une partie qui n'a jamais été conclue reste « en cours » : seul l'abandon termine une
 * partie aujourd'hui (design.md 7.1), donc une partie délaissée le reste indéfiniment.
 */
export function describeResult(match: AdminMatchSummary): string {
  const m = messages().admin.result;
  if (match.outcome === null) return m.ongoing;
  return m.victory(seatHandle(match, match.outcome.winner));
}

export function describeAction(action: Action): string {
  if (action.kind === "resign") return messages().admin.resign;
  return `${action.pieceId} → ${action.to.x},${action.to.y}`;
}

/** « 26–50 of 132 », ou « no results ». */
export function pageLabel(offset: number, shown: number, total: number): string {
  const m = messages().admin.pageLabel;
  if (total === 0 || shown === 0) return m.none;
  return m.range(offset + 1, offset + shown, total);
}

/**
 * La durée d'un bannissement, saisie en jours. Vide : définitif. Better Auth l'attend
 * en secondes ; une valeur illisible ou nulle est refusée plutôt que lue comme
 * « définitif », qui serait la pire erreur possible dans ce sens.
 */
export function banDuration(days: string): { ok: true; seconds: number | undefined } | { ok: false } {
  const text = days.trim();
  if (text.length === 0) return { ok: true, seconds: undefined };
  const value = Number(text.replace(",", "."));
  if (!Number.isFinite(value) || value <= 0) return { ok: false };
  return { ok: true, seconds: Math.round(value * 24 * 60 * 60) };
}

export interface BanState {
  readonly banned?: boolean | null | undefined;
  readonly banReason?: string | null | undefined;
  readonly banExpires?: string | Date | null | undefined;
}

export function describeBan(user: BanState): string {
  const m = messages().admin.ban;
  if (user.banned !== true) return m.active;
  const until = user.banExpires == null ? m.forever : m.until(formatDate(user.banExpires));
  const reason = user.banReason == null || user.banReason.length === 0 ? "" : ` — ${user.banReason}`;
  return m.suspended(until, reason);
}

/** Les codes de refus du greffon et des routes du projet, mis en mots. */
export function adminMessage(status: number, payload: { code?: string; message?: string }): string {
  const m = messages().admin.errors;
  const codes: Readonly<Record<string, string>> = m.codes;
  const code = payload.code ?? "";
  if (Object.hasOwn(codes, code)) return codes[code] ?? "";
  if (status === 401) return m.sessionExpired;
  if (status === 403) return m.adminsOnly;
  if (status === 429) return m.tooMany;
  return payload.message ?? m.failed(status);
}

/** Deux lettres pour l'insigne d'un compte, faute d'avatar. */
export function initials(name: string): string {
  const letters = name.replace(/[^\p{L}\p{N}]/gu, "");
  return (letters.slice(0, 2) || "?").toUpperCase();
}

/** Les durées proposées d'un clic dans la fenêtre de suspension. */
export function banPresets(): readonly { readonly label: string; readonly days: string }[] {
  const m = messages().admin.ban.presets;
  return [
    { label: m.day, days: "1" },
    { label: m.week, days: "7" },
    { label: m.month, days: "30" },
    { label: m.forever, days: "" },
  ];
}

export type QuickActionKind = "view" | "verify" | "role" | "ban" | "impersonate" | "revoke" | "delete";

export interface QuickAction {
  readonly kind: QuickActionKind;
  readonly label: string;
  /** Absent : l'action est permise. Présent : pourquoi elle ne l'est pas. */
  readonly disabled?: string;
  readonly danger?: boolean;
}

export interface QuickTarget extends BanState {
  readonly name: string;
  readonly role?: string | null | undefined;
  readonly emailVerified: boolean;
}

export function isAdminRole(role: string | null | undefined): boolean {
  return (role ?? "").split(",").some((entry) => entry.trim() === "admin");
}

/**
 * Les actions rapides d'un compte, et celles qui sont fermées. Le serveur refuse de
 * toute façon ce qui l'est (se suspendre, se supprimer, usurper un administrateur) :
 * griser le bouton évite seulement de cliquer sur un refus. Se retirer soi-même le rôle
 * est fermé ici sans que le serveur l'interdise — c'est le seul moyen de s'enfermer
 * dehors, et un autre administrateur peut le faire à votre place.
 */
export function quickActions(user: QuickTarget, self: string): QuickAction[] {
  const isSelf = user.name === self;
  const admin = isAdminRole(user.role);
  const banned = user.banned === true;
  const m = messages().admin.quick;
  const closed = (when: boolean, reason: string) => (when ? { disabled: reason } : {});
  return [
    { kind: "view", label: m.view },
    { kind: "verify", label: user.emailVerified ? m.markUnverified : m.markVerified },
    {
      kind: "role",
      label: admin ? m.demote : m.promote,
      ...closed(isSelf && admin, m.ownRole),
    },
    {
      kind: "ban",
      label: banned ? m.unban : m.ban,
      danger: !banned,
      ...closed(isSelf, m.banSelf),
    },
    {
      kind: "impersonate",
      label: m.impersonate,
      ...closed(isSelf, m.alreadyYou),
      ...closed(!isSelf && admin, m.adminImpersonation),
      ...closed(!isSelf && !admin && banned, m.bannedImpersonation),
    },
    { kind: "revoke", label: m.revoke },
    {
      kind: "delete",
      label: m.delete,
      danger: true,
      ...closed(isSelf, m.deleteSelf),
    },
  ];
}

/** Part des victoires sur les parties conclues, en pourcentage entier ; `null` sans partie conclue. */
export function winRate(record: { readonly won: number; readonly lost: number }): number | null {
  const decided = record.won + record.lost;
  return decided === 0 ? null : Math.round((record.won / decided) * 100);
}

/** « Chrome · Windows » plutôt que la chaîne entière, illisible dans un tableau. */
export function shortAgent(agent: string | null | undefined): string {
  const m = messages().admin.agent;
  if (agent == null || agent.length === 0) return m.unknown;
  const browser =
    [["Edg/", "Edge"], ["Firefox/", "Firefox"], ["Chrome/", "Chrome"], ["Safari/", "Safari"]].find(([token]) =>
      agent.includes(token as string),
    )?.[1] ?? m.browser;
  const system =
    [["Android", "Android"], ["iPhone", "iOS"], ["iPad", "iOS"], ["Windows", "Windows"], ["Mac OS", "macOS"], ["Linux", "Linux"]].find(
      ([token]) => agent.includes(token as string),
    )?.[1] ?? m.system;
  return `${browser} · ${system}`;
}
