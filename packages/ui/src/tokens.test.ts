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
  proposedStylesheet,
  proposedVariables,
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

  describe("proposition de refonte", () => {
    const lab = readFileSync(new URL("./lab/lab.css", import.meta.url), "utf8");

    it("generated/proposed-tokens.css n'a pas dérivé de tokens.ts", () => {
      const onDisk = readFileSync(new URL("./generated/proposed-tokens.css", import.meta.url), "utf8");
      expect(onDisk).toBe(proposedStylesheet());
    });

    it("reste hors de la feuille de production", () => {
      // Les tokens proposés ne doivent atteindre aucun écran avant validation.
      expect(tokensStylesheet()).not.toContain("--occ-tempo");
      expect(readFileSync(new URL("./styles.css", import.meta.url), "utf8")).not.toContain("proposed-tokens");
      const production = Object.keys(cssVariables());
      expect(Object.keys(proposedVariables()).filter((name) => production.includes(name))).toEqual([]);
    });

    it("lab.css ne lit que des propriétés définies, et aucune couleur en dur", () => {
      const defined = new Set([...Object.keys(cssVariables()), ...Object.keys(proposedVariables())]);
      const used = [...lab.matchAll(/var\((--occ-[\w-]+)\)/g)].map((match) => match[1]);
      expect(used.filter((name) => !defined.has(name as string))).toEqual([]);
      expect(lab).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(/i);
    });

    it("ne donne aux rôles colorés que des renvois au thème, jamais une valeur", () => {
      const variables = proposedVariables();
      for (const name of ["--occ-paper", "--occ-paper-dot", "--occ-cipher-ink", "--occ-cipher-ink-faint"]) {
        expect(variables[name]).toMatch(/^var\(--occ-[\w-]+\)$/);
      }
    });

    it("fait passer chaque durée par le tempo, chaque distance par l'amplitude", () => {
      const variables = Object.entries(proposedVariables());
      const durations = variables.filter(([name]) => name.startsWith("--occ-dur-"));
      const distances = variables.filter(([name]) => name.startsWith("--occ-dist-"));
      expect(durations.length).toBeGreaterThan(0);
      expect(durations.every(([, value]) => value.includes("var(--occ-tempo)"))).toBe(true);
      expect(distances.every(([, value]) => value.includes("var(--occ-motion-amplitude)"))).toBe(true);
    });

    it("impose `still` sous prefers-reduced-motion, par-dessus un choix explicite", () => {
      const sheet = proposedStylesheet();
      const media = sheet.slice(sheet.indexOf("@media (prefers-reduced-motion: reduce)"));
      expect(media).toContain(":root[data-motion]");
      expect(media).toContain("--occ-motion-amplitude: 0;");
      expect(media).toContain("--occ-motion-loop: paused;");
    });

    it("ne laisse dans lab.css aucune boucle hors de --occ-motion-loop", () => {
      const loops = [...lab.matchAll(/animation:[^;]*infinite[^;]*;([^}]*)/g)];
      expect(loops.length).toBeGreaterThan(0);
      for (const loop of loops) expect(loop[1]).toContain("animation-play-state: var(--occ-motion-loop)");
    });
  });
});
