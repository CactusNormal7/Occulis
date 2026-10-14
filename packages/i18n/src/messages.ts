import type { en } from "./en/index.js";

/**
 * La forme d'un dictionnaire, déduite du dictionnaire anglais : chaque feuille devient
 * `string` (une liste, une liste de `string`), chaque message paramétré garde ses paramètres. Une langue qui oublie une clé,
 * en ajoute une ou change la signature d'un message ne compile pas.
 */
export type Widen<T> = T extends string
  ? string
  : T extends (...args: infer A) => infer R
    ? (...args: A) => Widen<R>
    : { readonly [K in keyof T]: Widen<T[K]> };

export type Messages = Widen<typeof en>;

/** Les chemins pointés (`game.menu.quick`) des messages sans paramètre. */
export type MessagePath<T = Messages, Prefix extends string = ""> = {
  [K in keyof T & string]: T[K] extends string
    ? `${Prefix}${K}`
    : T[K] extends (...args: never[]) => string
      ? never
      : MessagePath<T[K], `${Prefix}${K}.`>;
}[keyof T & string];

/**
 * Lit un message par son chemin pointé — pour le HTML statique, qui ne peut désigner un
 * texte que par une chaîne (`data-i18n`). `undefined` si le chemin ne mène à aucun texte.
 */
export function lookup(messages: Messages, path: string): string | undefined {
  let node: unknown = messages;
  for (const segment of path.split(".")) {
    if (typeof node !== "object" || node === null) return undefined;
    node = (node as Record<string, unknown>)[segment];
  }
  return typeof node === "string" ? node : undefined;
}
