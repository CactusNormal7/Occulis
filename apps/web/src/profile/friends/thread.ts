import type { ChatMessage } from "@occulis/protocol";

/**
 * Le fil d'une conversation, tel que l'écran le tient : pur, d'où ses tests. Un message peut
 * arriver par l'envoi et par le canal, une page peut se relire : rien n'y est en double.
 */

/** Ajoute un message au fil, une seule fois. */
export function withMessage(
  current: readonly ChatMessage[],
  message: ChatMessage,
): readonly ChatMessage[] {
  return current.some((known) => known.id === message.id) ? current : [...current, message];
}

/** Deux morceaux du même fil, sans doublon, dans l'ordre d'envoi. */
export function merged(
  incoming: readonly ChatMessage[],
  current: readonly ChatMessage[],
): readonly ChatMessage[] {
  const byId = new Map(current.map((message) => [message.id, message]));
  for (const message of incoming) byId.set(message.id, message);
  return [...byId.values()].sort((a, b) => a.createdAt - b.createdAt);
}
