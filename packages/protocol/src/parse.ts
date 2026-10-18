/**
 * Lecture des messages qu'un client envoie sur un WebSocket.
 *
 * Les types de ce paquet ne disent que ce qu'un client honnête envoie ; un client
 * modifié envoie ce qu'il veut. Un message lu ici a donc exactement la forme de son
 * type, et rien de plus : chaque objet est **reconstruit** champ par champ, jamais
 * repris tel quel. C'est ce qui protège le log d'actions, source de vérité de la partie
 * (docs/architecture.md section 3) : une coordonnée `"1"` passe `coordKey()` comme la
 * coordonnée `1`, puis serait écrite en D1 et rejouée à l'identique ; un champ en trop
 * y serait écrit aussi.
 *
 * Un message illisible rend `undefined`, et le serveur l'ignore comme un message d'un
 * genre inconnu. La forme seulement : les règles restent l'affaire de `@occulis/core`.
 */
import { type Action, type TeamEntry, parseTeam } from "@occulis/core";
import type { ClientMessage, QueueClientMessage, QueueIntent, SocialClientMessage } from "./index.js";

/**
 * Un `ClientMessage` lu. Une équipe illisible reste `undefined` au lieu d'invalider le
 * message : le serveur la refuse explicitement (`malformed-team`), le joueur devant
 * savoir que son équipe n'est pas partie.
 */
export type ParsedClientMessage =
  | Exclude<ClientMessage, { readonly kind: "deploy" }>
  | { readonly kind: "deploy"; readonly team: readonly TeamEntry[] | undefined };

export function parseClientMessage(raw: string): ParsedClientMessage | undefined {
  const message = record(json(raw));
  switch (message?.kind) {
    case "hello":
      return hello(message);
    case "action": {
      const action = parseAction(message.action);
      return action === undefined ? undefined : { kind: "action", action };
    }
    case "deploy":
      return { kind: "deploy", team: parseTeam(message.team) };
    default:
      return undefined;
  }
}

export function parseQueueClientMessage(raw: string): QueueClientMessage | undefined {
  const message = record(json(raw));
  switch (message?.kind) {
    case "hello": {
      const greeting = hello(message);
      const intent = parseIntent(message.intent);
      return greeting === undefined || intent === undefined ? undefined : { ...greeting, intent };
    }
    case "accept":
    case "decline":
      return isId(message.proposalId) ? { kind: message.kind, proposalId: message.proposalId } : undefined;
    default:
      return undefined;
  }
}

export function parseSocialClientMessage(raw: string): SocialClientMessage | undefined {
  const message = record(json(raw));
  return message?.kind === "hello" ? hello(message) : undefined;
}

/**
 * Le champ `player` d'un abandon n'est jamais repris du client : c'est le siège qui dit
 * qui abandonne (`MatchDO.play()`), sans quoi un joueur ferait abandonner l'adversaire.
 */
export function parseAction(value: unknown): Action | undefined {
  const action = record(value);
  if (action?.kind === "resign") return { kind: "resign" };
  if (action?.kind !== "move" || !isId(action.pieceId)) return undefined;
  const to = record(action.to);
  if (to === undefined || !Number.isSafeInteger(to.x) || !Number.isSafeInteger(to.y)) return undefined;
  return { kind: "move", pieceId: action.pieceId, to: { x: to.x as number, y: to.y as number } };
}

function parseIntent(value: unknown): QueueIntent | undefined {
  const intent = record(value);
  if (intent?.kind === "quick" || intent?.kind === "host") return { kind: intent.kind };
  if (intent?.kind === "join" && typeof intent.code === "string" && intent.code.length <= MAX_ID) {
    return { kind: "join", code: intent.code };
  }
  return undefined;
}

/** La version n'est que lue : la comparer à `PROTOCOL_VERSION` revient au serveur. */
function hello(message: Readonly<Record<string, unknown>>): { kind: "hello"; protocol: number } | undefined {
  return typeof message.protocol === "number" ? { kind: "hello", protocol: message.protocol } : undefined;
}

function json(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

function record(value: unknown): Readonly<Record<string, unknown>> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function isId(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= MAX_ID;
}

/** Bien au-delà de tout identifiant de pièce, de proposition ou code de salon. */
const MAX_ID = 128;
