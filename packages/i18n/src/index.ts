import { en } from "./en/index.js";
import { fr } from "./fr/index.js";
import type { Locale } from "./locale.js";
import type { Messages } from "./messages.js";

export * from "./locale.js";
export { lookup, type Messages, type MessagePath, type Widen } from "./messages.js";

const CATALOGUE: Readonly<Record<Locale, Messages>> = { en, fr };

/** Le dictionnaire d'une langue. */
export function messagesFor(locale: Locale): Messages {
  return CATALOGUE[locale];
}
