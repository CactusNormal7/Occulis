import { messages } from "../i18n/current.js";
import { ROUTE_PATHS, redirectMessage } from "../net/auth.js";

/**
 * Ce que l'écran de compte décide, sans DOM ni réseau : quel parcours montrer pour une
 * URL, quel message porter au retour d'une redirection, à quel champ rattacher un refus.
 * Les composants (`AccountApp.tsx`) ne font que l'afficher.
 */

export type AccountRoute =
  | { readonly kind: "signin" }
  | { readonly kind: "register" }
  | { readonly kind: "forgot" }
  /** `token` absent : on est arrivé ici sans le lien du courrier, ou il a expiré. */
  | { readonly kind: "reset"; readonly token: string | undefined };

export type RouteKind = AccountRoute["kind"];

export function routeOf(pathname: string, search: string): AccountRoute {
  const parameters = new URLSearchParams(search);
  switch (pathname.replace(/\/+$/, "")) {
    case ROUTE_PATHS.register:
      return { kind: "register" };
    case ROUTE_PATHS.forgot:
      return { kind: "forgot" };
    case ROUTE_PATHS.reset: {
      const token = parameters.get("token");
      return { kind: "reset", token: token === null || token.length === 0 ? undefined : token };
    }
    default:
      return { kind: "signin" };
  }
}

export function pathOf(kind: RouteKind): string {
  return ROUTE_PATHS[kind];
}

export interface Notice {
  readonly tone: "error" | "success" | "info";
  readonly text: string;
  /** Le message invite à redemander un lien (vérification ou réinitialisation). */
  readonly retry?: "reset" | "verification" | undefined;
}

/** Les paramètres de retour que la page lit une fois, puis retire de l'URL. */
const ARRIVAL_PARAMETERS = ["verified", "deleted", "verifiee", "supprime", "error", "error_description", "token"] as const;

/**
 * Les anciens noms de ces paramètres, d'avant le passage du nommage en anglais : des
 * courriers déjà envoyés ramènent sur `/?verifiee=1`. Le Worker redirige les anciennes
 * pages (`legacy-routes.ts`), mais `/` est servi tel quel par les assets statiques, sans
 * passer par lui — c'est donc ici qu'on les reconnaît encore.
 */
const LEGACY_FLAGS = { verified: "verifiee", deleted: "supprime" } as const;

function flag(parameters: URLSearchParams, name: keyof typeof LEGACY_FLAGS): boolean {
  return parameters.get(name) === "1" || parameters.get(LEGACY_FLAGS[name]) === "1";
}

/**
 * Le message à montrer en arrivant d'un lien ou d'une redirection : adresse confirmée,
 * lien expiré, connexion Google refusée.
 */
export function arrivalNotice(pathname: string, search: string): Notice | undefined {
  const parameters = new URLSearchParams(search);
  const error = parameters.get("error");
  if (error !== null && error.length > 0) {
    const onReset = pathname.replace(/\/+$/, "") === ROUTE_PATHS.reset;
    const expired = error === "INVALID_TOKEN" || error === "TOKEN_EXPIRED";
    return {
      tone: "error",
      text: redirectMessage(error),
      retry: expired ? (onReset ? "reset" : "verification") : undefined,
    };
  }
  if (flag(parameters, "deleted")) {
    return { tone: "success", text: messages().account.arrival.deleted };
  }
  if (flag(parameters, "verified")) {
    return { tone: "success", text: messages().account.arrival.verified };
  }
  return undefined;
}

/**
 * L'URL sans ses paramètres de retour. Le jeton de réinitialisation surtout ne doit pas
 * rester dans la barre d'adresse : il finirait dans l'historique, ou dans une capture
 * d'écran partagée. Il est lu avant d'être retiré.
 */
export function cleanedSearch(search: string): string {
  const parameters = new URLSearchParams(search);
  for (const name of ARRIVAL_PARAMETERS) parameters.delete(name);
  const rest = parameters.toString();
  return rest.length === 0 ? "" : `?${rest}`;
}

export type FieldName = "email" | "password" | "handle";

/** Le champ auquel rattacher un refus du serveur, pour que l'erreur s'affiche sous lui. */
export function fieldOf(code: string | undefined): FieldName | undefined {
  if (code === undefined) return undefined;
  if (code.startsWith("HANDLE_")) return "handle";
  if (code.startsWith("PASSWORD_")) return "password";
  if (code === "VALIDATION_ERROR" || code === "INVALID_EMAIL" || code.startsWith("USER_ALREADY_EXISTS")) return "email";
  return undefined;
}

export const MIN_PASSWORD_LENGTH = 10;
export const MAX_PASSWORD_LENGTH = 128;

/** L'indication sous un nouveau mot de passe, mise à jour à la frappe. */
export function passwordHint(password: string): string {
  const hint = messages().account.passwordHint;
  const length = [...password].length;
  if (length === 0) return hint.empty(MIN_PASSWORD_LENGTH);
  if (length < MIN_PASSWORD_LENGTH) return hint.missing(MIN_PASSWORD_LENGTH - length);
  return hint.enough;
}

/**
 * L'adresse saisie à la demande de réinitialisation, gardée le temps d'aller lire le
 * courrier : la page de réinitialisation la remet dans un champ `username`, sans quoi un
 * gestionnaire de mots de passe ne saurait pas à quelle entrée rattacher le nouveau.
 * `sessionStorage` : propre à l'onglet, effacé à sa fermeture.
 */
const RESET_EMAIL_KEY = "occulis.reset-email";

export function rememberResetEmail(email: string): void {
  try {
    sessionStorage.setItem(RESET_EMAIL_KEY, email);
  } catch {
    // Stockage refusé (navigation privée stricte) : le champ restera simplement vide.
  }
}

export function recallResetEmail(): string {
  try {
    return sessionStorage.getItem(RESET_EMAIL_KEY) ?? "";
  } catch {
    return "";
  }
}

export function forgetResetEmail(): void {
  try {
    sessionStorage.removeItem(RESET_EMAIL_KEY);
  } catch {
    // Rien à faire : il n'y avait rien à effacer.
  }
}
