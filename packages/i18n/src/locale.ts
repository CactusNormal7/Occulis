/**
 * Les langues de l'interface. L'anglais est la langue par défaut et la langue source :
 * aucun texte affiché n'existe en français seul (CLAUDE.md, conventions).
 */
export const LOCALES = ["en", "fr"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

/**
 * Le nom du cookie qui porte le choix de langue. Un cookie et non le seul stockage local :
 * le serveur doit pouvoir le lire pour écrire ses courriers dans la langue du joueur.
 */
export const LOCALE_COOKIE = "occulis-locale";
export const LOCALE_STORAGE_KEY = "occulis.locale";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/**
 * La langue à employer : le choix enregistré du joueur s'il en a fait un, sinon la
 * première langue connue de son navigateur (`Accept-Language` ou `navigator.languages`),
 * sinon l'anglais.
 */
export function resolveLocale(saved: string | null | undefined, preferred: string | readonly string[] | null | undefined): Locale {
  if (isLocale(saved)) return saved;
  for (const tag of preferredTags(preferred)) {
    const base = tag.split("-")[0]?.toLowerCase();
    if (isLocale(base)) return base;
  }
  return DEFAULT_LOCALE;
}

/** Les étiquettes d'un en-tête `Accept-Language`, par préférence décroissante. */
function preferredTags(preferred: string | readonly string[] | null | undefined): readonly string[] {
  if (preferred === null || preferred === undefined) return [];
  if (typeof preferred !== "string") return preferred;
  return preferred
    .split(",")
    .map((part, index) => {
      const [tag = "", ...params] = part.trim().split(";");
      const q = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
      const weight = q === undefined ? 1 : Number(q.slice(2));
      return { tag: tag.trim(), weight: Number.isFinite(weight) ? weight : 0, index };
    })
    .filter((entry) => entry.tag.length > 0 && entry.weight > 0)
    .sort((a, b) => b.weight - a.weight || a.index - b.index)
    .map((entry) => entry.tag);
}

/** Lit la langue dans un en-tête `Cookie`. */
export function localeFromCookie(header: string | null | undefined): string | undefined {
  if (header === null || header === undefined) return undefined;
  for (const part of header.split(";")) {
    const [name, ...value] = part.trim().split("=");
    if (name === LOCALE_COOKIE) return decodeURIComponent(value.join("="));
  }
  return undefined;
}
