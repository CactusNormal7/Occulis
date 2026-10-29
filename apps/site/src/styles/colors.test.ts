import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Le pendant, pour les feuilles et les composants du site, de la règle ESLint qui
 * interdit toute couleur hors de `packages/ui/src/tokens.ts` (ESLint ne lit pas les
 * fichiers `.astro` ni `.css`).
 */
const SRC = fileURLToPath(new URL("..", import.meta.url));
const COLOR = /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?)\(/;

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return files(path);
    return /\.(css|astro)$/.test(name) ? [path] : [];
  });
}

describe("les couleurs du site", () => {
  it.each(files(SRC).map((path) => [path.slice(SRC.length), path]))(
    "%s n'en écrit aucune",
    (_, path) => {
      const offending = readFileSync(path, "utf8")
        .split("\n")
        // Un fragment d'URL (`href="#beta"`) n'est pas une couleur : seule une valeur CSS compte.
        .filter((line) => COLOR.test(line.replace(/(?:href|id|action)="#?[^"]*"/g, "")));
      expect(offending).toEqual([]);
    },
  );
});
