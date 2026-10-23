import { handleKey } from "../auth/handle.js";

/** En deçà, un préfixe correspond à trop de joueurs pour être une recherche. */
export const MIN_SEARCH_LENGTH = 2;
export const SEARCH_LIMIT = 10;

/**
 * Les bornes d'une recherche par préfixe : `[prefix, prefix + U+10FFFF)`.
 *
 * Un intervalle plutôt qu'un `LIKE`, pour deux raisons : un pseudo peut contenir `_`,
 * joker de `LIKE`, qu'il faudrait échapper ; et l'intervalle se sert de l'index
 * `players_handle_key`. Il porte sur la clé du pseudo (`handleKey()`), sans casse ni
 * accents : « él » trouve « Élodie ». U+10FFFF est le plus grand point de code : en
 * UTF-8, aucun caractère ne se range après lui.
 */
export function prefixRange(
  raw: unknown,
): { readonly from: string; readonly to: string } | undefined {
  if (typeof raw !== "string") return undefined;
  const prefix = handleKey(raw);
  if ([...prefix].length < MIN_SEARCH_LENGTH) return undefined;
  return { from: prefix, to: `${prefix}\u{10FFFF}` };
}
