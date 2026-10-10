import type { AdminFrame, MeFrame, MeMatchSummary, MeProfile, MeResult } from "@occulis/protocol";
import { currentLocale, messages } from "../i18n/current.js";
import { redirectMessage } from "../net/auth.js";

/**
 * Ce que la page de profil décide sans DOM ni réseau : sa route, ses messages d'arrivée,
 * ce qui est permis au compte affiché. Pur, et éprouvé comme `admin/model.ts`.
 *
 * Rien ici n'est une garde : le serveur refuse de lui-même ce que la page grise
 * (`apps/server/src/me/routes.ts`). Griser n'évite qu'un clic dans le vide.
 */

export type ProfileRoute = { readonly view: "account" } | { readonly view: "matches"; readonly offset: number } | { readonly view: "match"; readonly id: string };

export function parseProfileRoute(hash: string): ProfileRoute {
  const [path = "", query = ""] = hash.replace(/^#/, "").split("?");
  const parts = path.split("/").filter((part) => part.length > 0);
  if (parts[0] === "matches") {
    if (parts[1] !== undefined && /^[\w-]+$/.test(parts[1])) return { view: "match", id: parts[1] };
    const offset = Number.parseInt(new URLSearchParams(query).get("offset") ?? "0", 10);
    return { view: "matches", offset: Number.isFinite(offset) && offset > 0 ? offset : 0 };
  }
  // `#security` est l'ancre que visent les courriers et `/.well-known/change-password` :
  // elle reste sur la vue du compte, qui défile jusqu'à la carte.
  return { view: "account" };
}

export function profileHash(route: ProfileRoute): string {
  if (route.view === "match") return `#/matches/${route.id}`;
  if (route.view === "matches") return route.offset > 0 ? `#/matches?offset=${route.offset}` : "#/matches";
  return "#/";
}

export interface ArrivalMessage {
  readonly ok: boolean;
  readonly text: string;
}

/** Le message à montrer en arrivant d'une redirection : bienvenue Google, liaison faite ou refusée. */
export function arrivalMessage(search: string): ArrivalMessage | undefined {
  const parameters = new URLSearchParams(search);
  const error = parameters.get("error");
  if (error !== null && error.length > 0) return { ok: false, text: redirectMessage(error) };
  const m = messages().profile.arrival;
  if (parameters.get("linked") === "google") return { ok: true, text: m.googleLinked };
  if (parameters.get("welcome") === "1") return { ok: true, text: m.welcome };
  return undefined;
}

/** La date du prochain changement de pseudo, en clair ; `undefined` s'il est permis. */
export function handleCooldownLabel(profile: Pick<MeProfile, "nextHandleChangeAt">, now: number): string | undefined {
  const next = profile.nextHandleChangeAt;
  if (next === null || next <= now) return undefined;
  const date = new Date(next).toLocaleDateString(currentLocale(), { day: "numeric", month: "long", year: "numeric" });
  return messages().profile.account.cooldown(date);
}

/**
 * Peut-on retirer ce fournisseur ? Pas s'il est la **seule** porte d'entrée du compte :
 * sans mot de passe ni autre fournisseur, le délier enfermerait le joueur dehors. Le
 * serveur le refuse de toute façon (`allowUnlinkingAll`).
 */
export function canUnlink(profile: Pick<MeProfile, "hasPassword" | "providers">, provider: string): boolean {
  if (!profile.providers.includes(provider)) return false;
  return profile.hasPassword || profile.providers.some((other) => other !== provider);
}

export function describeMyResult(match: Pick<MeMatchSummary, "result" | "outcome">): string {
  const results = messages().profile.results;
  if (match.outcome?.reason === "resignation") return match.result === "won" ? results.wonByResignation : results.lostByResignation;
  const RESULTS: Record<MeResult, string> = results;
  return RESULTS[match.result];
}

/**
 * Les images du replay joueur au format du plateau rejoué du back-office
 * (`admin/ReplayBoard.tsx`), qui attend la ligne de vue des deux camps : celle de
 * l'adversaire est vide, puisqu'on ne la connaît pas. Les pièces sont déjà réduites par
 * le serveur à celles que votre camp voyait.
 */
export function asBoardFrames(frames: readonly MeFrame[], seat: "A" | "B"): AdminFrame[] {
  return frames.map((frame) => ({
    pieces: frame.pieces,
    visible: seat === "A" ? { A: frame.visible, B: [] } : { A: [], B: frame.visible },
  }));
}

/** « 2 h », « 3 j » : depuis quand une session n'a pas servi. */
export function sinceLabel(timestamp: number, now: number): string {
  const m = messages().profile.since;
  const minutes = Math.max(0, Math.round((now - timestamp) / 60_000));
  if (minutes < 2) return m.now;
  if (minutes < 60) return m.minutes(minutes);
  const hours = Math.round(minutes / 60);
  if (hours < 48) return m.hours(hours);
  return m.days(Math.round(hours / 24));
}
