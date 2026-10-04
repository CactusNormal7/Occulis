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
  readonly banned?: boolean | null;
  readonly banReason?: string | null;
  readonly banExpires?: string | Date | null;
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
  VALIDATION_ERROR: "Valeur invalide.",
};
