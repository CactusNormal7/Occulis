import { defineConfig } from "vitest/config";

/**
 * Les seuils sont ceux mesurés à leur introduction (2026-10-18), recalés le 2026-10-21 sur
 * la mesure de vitest 4, qui compte autrement (remappage par l'arbre syntaxique). Ils ne
 * disent pas ce qui est assez, seulement ce qu'une modification n'a pas le droit de faire
 * baisser. On les remonte à mesure que les tests s'ajoutent.
 */
export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      include: ["src/**"],
      // `* 2.*` : doublons qu'iCloud dépose à côté des sources (N1) ; ignorés par git, ils
      // compteraient à 0 % et feraient tomber le seuil sans qu'aucun code n'ait changé.
      exclude: ["src/**/*.test.ts", "src/testing.ts", "**/* 2.*"],
      thresholds: { lines: 94, branches: 91, functions: 93 },
    },
  },
});
