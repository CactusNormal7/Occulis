import type { Action, PlayerId } from "@occulis/core";
import type { AdminMatchSummary } from "@occulis/protocol";

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
  if (match.outcome === null) return "en cours";
  return `victoire de ${seatHandle(match, match.outcome.winner)} (abandon)`;
}

export function describeAction(action: Action): string {
  if (action.kind === "resign") return "abandon";
  return `${action.pieceId} → ${action.to.x},${action.to.y}`;
}

/** « 26–50 sur 132 », ou « aucun résultat ». */
export function pageLabel(offset: number, shown: number, total: number): string {
  if (total === 0 || shown === 0) return "aucun résultat";
  return `${offset + 1}–${offset + shown} sur ${total}`;
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
  if (user.banned !== true) return "actif";
  const until = user.banExpires == null ? "définitivement" : `jusqu'au ${formatDate(user.banExpires)}`;
  const reason = user.banReason == null || user.banReason.length === 0 ? "" : ` — ${user.banReason}`;
  return `suspendu ${until}${reason}`;
}

/** Les codes de refus du greffon et des routes du projet, mis en mots. */
export function adminMessage(status: number, payload: { code?: string; message?: string }): string {
  const known = MESSAGES[payload.code ?? ""];
  if (known !== undefined) return known;
  if (status === 401) return "Session expirée. Reconnectez-vous depuis le jeu.";
  if (status === 403) return "Action réservée aux administrateurs.";
  if (status === 429) return "Trop de requêtes. Réessayez dans une minute.";
  return payload.message ?? `Échec (${status}).`;
}

const MESSAGES: Record<string, string> = {
  HANDLE_TAKEN: "Ce pseudo est déjà pris.",
  HANDLE_LENGTH: "Le pseudo doit faire entre 2 et 32 caractères.",
  PASSWORD_TOO_SHORT: "Le mot de passe doit faire au moins 10 caractères.",
  USER_ALREADY_EXISTS: "Cette adresse est déjà utilisée.",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "Cette adresse est déjà utilisée.",
  YOU_CANNOT_BAN_YOURSELF: "Vous ne pouvez pas vous suspendre vous-même.",
  YOU_CANNOT_REMOVE_YOURSELF: "Vous ne pouvez pas supprimer votre propre compte.",
  YOU_CANNOT_IMPERSONATE_ADMINS: "Un administrateur ne peut pas être usurpé.",
  BANNED_USER: "Ce compte est suspendu.",
  VALIDATION_ERROR: "Valeur invalide.",
};

/** Deux lettres pour l'insigne d'un compte, faute d'avatar. */
export function initials(name: string): string {
  const letters = name.replace(/[^\p{L}\p{N}]/gu, "");
  return (letters.slice(0, 2) || "?").toUpperCase();
}

/** Les durées proposées d'un clic dans la fenêtre de suspension. */
export const BAN_PRESETS: readonly { readonly label: string; readonly days: string }[] = [
  { label: "1 jour", days: "1" },
  { label: "7 jours", days: "7" },
  { label: "30 jours", days: "30" },
  { label: "définitive", days: "" },
];

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
  const closed = (when: boolean, reason: string) => (when ? { disabled: reason } : {});
  return [
    { kind: "view", label: "Ouvrir la fiche" },
    { kind: "verify", label: user.emailVerified ? "Marquer l'adresse non vérifiée" : "Marquer l'adresse vérifiée" },
    {
      kind: "role",
      label: admin ? "Retirer le rôle administrateur" : "Nommer administrateur",
      ...closed(isSelf && admin, "Vous ne pouvez pas retirer votre propre rôle."),
    },
    {
      kind: "ban",
      label: banned ? "Lever la suspension" : "Suspendre",
      danger: !banned,
      ...closed(isSelf, "Vous ne pouvez pas vous suspendre vous-même."),
    },
    {
      kind: "impersonate",
      label: "Se connecter en tant que ce joueur",
      ...closed(isSelf, "C'est déjà votre compte."),
      ...closed(!isSelf && admin, "Un administrateur ne peut pas être usurpé."),
      ...closed(!isSelf && !admin && banned, "Un compte suspendu ne peut pas ouvrir de session."),
    },
    { kind: "revoke", label: "Fermer toutes les sessions" },
    {
      kind: "delete",
      label: "Supprimer le compte",
      danger: true,
      ...closed(isSelf, "Vous ne pouvez pas supprimer votre propre compte."),
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
  if (agent == null || agent.length === 0) return "inconnu";
  const browser =
    [["Edg/", "Edge"], ["Firefox/", "Firefox"], ["Chrome/", "Chrome"], ["Safari/", "Safari"]].find(([token]) =>
      agent.includes(token as string),
    )?.[1] ?? "navigateur";
  const system =
    [["Android", "Android"], ["iPhone", "iOS"], ["iPad", "iOS"], ["Windows", "Windows"], ["Mac OS", "macOS"], ["Linux", "Linux"]].find(
      ([token]) => agent.includes(token as string),
    )?.[1] ?? "système inconnu";
  return `${browser} · ${system}`;
}
