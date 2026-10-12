/**
 * Les messages privés entre amis, en logique pure : ce qu'un message peut contenir et
 * à quel rythme on peut en envoyer.
 */

export const MAX_MESSAGE_LENGTH = 500;

/** Fenêtre glissante de la limite d'envoi. */
export const MESSAGE_WINDOW_MS = 60 * 1000;
export const MESSAGES_PER_WINDOW = 20;

/** Les messages plus anciens sont purgés par le cron nocturne. */
export const MESSAGE_RETENTION_MS = 90 * 24 * 60 * 60 * 1000;

export const CHAT_PAGE_SIZE = 50;

export type MessageError = "MESSAGE_EMPTY" | "MESSAGE_TOO_LONG";

export type MessageCheck =
  | { readonly ok: true; readonly body: string }
  | { readonly ok: false; readonly code: MessageError };

/**
 * NFKC, comme les pseudos : deux messages identiques à l'œil le sont aussi en base.
 * Les retours à la ligne survivent, mais pas en rafale, et les caractères de contrôle
 * disparaissent — ils ne servent qu'à casser l'affichage de l'autre.
 */
export function checkMessage(raw: unknown): MessageCheck {
  if (typeof raw !== "string") return { ok: false, code: "MESSAGE_EMPTY" };
  const body = raw
    .normalize("NFKC")
    .replace(/\r\n?/gu, "\n")
    .replace(/[^\P{Cc}\n]/gu, "")
    .replace(/\n{3,}/gu, "\n\n")
    .trim();
  if (body.length === 0) return { ok: false, code: "MESSAGE_EMPTY" };
  if ([...body].length > MAX_MESSAGE_LENGTH) return { ok: false, code: "MESSAGE_TOO_LONG" };
  return { ok: true, body };
}
