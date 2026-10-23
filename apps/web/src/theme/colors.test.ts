import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * `packages/ui/src/tokens.ts` est le seul fichier du projet à porter une couleur. La règle
 * ESLint le vérifie dans le TypeScript ; ses propres tests, dans les feuilles de la
 * charte. Ce test garde le reste : les feuilles et les pages du client.
 */
const read = (path: string): string => readFileSync(new URL(path, import.meta.url), "utf8");

const COLOR_LITERAL = /#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i;

const STYLESHEETS = ["../ui/ui.css", "../ui/veil.css"];
const PAGES = [
  "../../index.html",
  "../../admin/index.html",
  "../../profile/index.html",
  "../../lab/index.html",
];

describe("une seule source de couleur", () => {
  it.each(STYLESHEETS)("%s ne contient aucune couleur en dur", (path) => {
    expect(read(path)).not.toMatch(COLOR_LITERAL);
  });

  // Le fond et le thème sombre de chaque page sont posés au build par `criticalHead()`.
  it.each(PAGES)("%s ne contient ni couleur ni fond de thème", (path) => {
    const page = read(path);
    expect(page).not.toMatch(COLOR_LITERAL);
    expect(page).not.toContain("var(--occ-bg)");
  });
});
