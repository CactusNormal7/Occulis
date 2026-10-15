import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  BACKGROUND,
  INK,
  THEME_NAMES,
  cssColor,
  cssVariables,
  hexColor,
  isThemeName,
  tokensStylesheet,
} from "./tokens.js";

describe("tokens", () => {
  it("generated/tokens.css n'a pas dérivé de tokens.ts", () => {
    // Le fichier est versionné pour se lire sans build : il doit rester l'image exacte
    // de sa source. Échec ici → `pnpm --filter @occulis/ui tokens`.
    const onDisk = readFileSync(new URL("./generated/tokens.css", import.meta.url), "utf8");
    expect(onDisk).toBe(tokensStylesheet());
  });

  it("styles.css ne lit que des propriétés définies par les tokens", () => {
    const styles = readFileSync(new URL("./styles.css", import.meta.url), "utf8");
    const defined = new Set(Object.keys(cssVariables()));
    const used = [...styles.matchAll(/var\((--occ-[\w-]+)\)/g)].map((match) => match[1]);
    expect(used.filter((name) => !defined.has(name as string))).toEqual([]);
  });

  it("styles.css ne contient aucune couleur en dur", () => {
    const styles = readFileSync(new URL("./styles.css", import.meta.url), "utf8");
    expect(styles).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(/i);
  });

  it("donne à chaque thème les mêmes propriétés, sous son propre sélecteur", () => {
    const names = Object.keys(cssVariables()).sort();
    for (const theme of THEME_NAMES) {
      expect(Object.keys(cssVariables(theme)).sort()).toEqual(names);
      expect(tokensStylesheet()).toContain(`:root[data-theme="${theme}"] {`);
    }
    expect(isThemeName("obsidian")).toBe(true);
    expect(isThemeName("toString")).toBe(false);
  });

  it("convertit une couleur entière en CSS, avec ou sans alpha", () => {
    expect(cssColor(BACKGROUND)).toBe("rgb(5 5 5)");
    expect(cssColor(INK, 0.5)).toBe("rgb(233 230 223 / 0.5)");
  });

  it("précompose l'alpha sur le fond pour les courriers", () => {
    // Comparé par canal plutôt qu'en littéral : la règle ESLint du code couleur
    // n'admet aucune valeur de couleur hors de tokens.ts, tests compris.
    const channels = (hex: string) => [1, 3, 5].map((start) => Number.parseInt(hex.slice(start, start + 2), 16));
    expect(channels(hexColor(BACKGROUND))).toEqual([5, 5, 5]);
    expect(channels(hexColor(INK))).toEqual([233, 230, 223]);
    expect(channels(hexColor(INK, 0.5))).toEqual([119, 118, 114]);
  });
});
