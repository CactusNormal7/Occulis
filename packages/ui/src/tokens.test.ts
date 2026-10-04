import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { BACKGROUND, INK, cssColor, cssVariables, tokensStylesheet } from "./tokens.js";

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

  it("convertit une couleur entière en CSS, avec ou sans alpha", () => {
    expect(cssColor(BACKGROUND)).toBe("rgb(13 15 18)");
    expect(cssColor(INK, 0.5)).toBe("rgb(255 255 255 / 0.5)");
  });
});
