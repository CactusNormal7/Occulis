import { describe, expect, it } from "vitest";
import { LOCALES, localeFromCookie, lookup, messagesFor, resolveLocale } from "./index.js";

/** Les chemins de toutes les feuilles, pour comparer la forme de deux dictionnaires. */
function shape(node: unknown, prefix = ""): string[] {
  if (typeof node === "string") return [`${prefix}:string`];
  if (typeof node === "function") return [`${prefix}:fn${node.length}`];
  return Object.entries(node as Record<string, unknown>).flatMap(([key, value]) =>
    shape(value, prefix === "" ? key : `${prefix}.${key}`),
  );
}

describe("dictionnaires", () => {
  it("toutes les langues ont exactement la forme du dictionnaire anglais", () => {
    const reference = shape(messagesFor("en")).sort();
    for (const locale of LOCALES) expect(shape(messagesFor(locale)).sort()).toEqual(reference);
  });

  it("aucun texte n'est vide", () => {
    for (const locale of LOCALES) {
      const empty = shape(messagesFor(locale)).filter((leaf) => leaf.endsWith(":string"));
      for (const leaf of empty) {
        const path = leaf.slice(0, -":string".length);
        expect(lookup(messagesFor(locale), path)?.trim().length, `${locale} ${path}`).toBeGreaterThan(0);
      }
    }
  });

  it("lit un message par son chemin pointé", () => {
    expect(lookup(messagesFor("fr"), "game.menu.quick")).toBe("Partie rapide");
    expect(lookup(messagesFor("en"), "game.menu.quick")).toBe("Quick match");
    expect(lookup(messagesFor("en"), "game.menu")).toBeUndefined();
    expect(lookup(messagesFor("en"), "game.nope.quick")).toBeUndefined();
  });

  it("garde les paramètres des messages", () => {
    expect(messagesFor("en").ui.pager.range(26, 50, 132)).toBe("26–50 of 132");
    expect(messagesFor("fr").ui.pager.range(26, 50, 132)).toBe("26–50 sur 132");
  });
});

describe("resolveLocale", () => {
  it("préfère le choix enregistré", () => {
    expect(resolveLocale("fr", "en-US")).toBe("fr");
  });

  it("ignore un choix enregistré inconnu", () => {
    expect(resolveLocale("de", "fr-FR,fr;q=0.9")).toBe("fr");
  });

  it("suit l'ordre de préférence d'Accept-Language", () => {
    expect(resolveLocale(undefined, "de-DE,fr;q=0.8,en;q=0.9")).toBe("en");
    expect(resolveLocale(undefined, "de-DE,fr;q=0.9,en;q=0.8")).toBe("fr");
  });

  it("accepte la liste du navigateur", () => {
    expect(resolveLocale(null, ["es-ES", "fr-CA"])).toBe("fr");
  });

  it("retombe sur l'anglais", () => {
    expect(resolveLocale(undefined, undefined)).toBe("en");
    expect(resolveLocale(undefined, "de,es")).toBe("en");
  });
});

describe("localeFromCookie", () => {
  it("lit le cookie de langue parmi d'autres", () => {
    expect(localeFromCookie("a=1; occulis-locale=fr; b=2")).toBe("fr");
    expect(localeFromCookie("a=1")).toBeUndefined();
    expect(localeFromCookie(null)).toBeUndefined();
  });
});
