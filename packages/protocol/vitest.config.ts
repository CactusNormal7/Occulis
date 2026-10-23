import { defineConfig } from "vitest/config";

/**
 * Seuils mesurés à leur introduction (2026-10-18), puis recalés le 2026-10-21 sur la mesure
 * de vitest 4, qui compte autrement : ils ne peuvent que monter.
 */
export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      include: ["src/**"],
      // `* 2.*` : doublons qu'iCloud dépose à côté des sources (N1) ; ignorés par git, ils
      // compteraient à 0 % et feraient tomber le seuil sans qu'aucun code n'ait changé.
      exclude: ["src/**/*.test.ts", "**/* 2.*"],
      thresholds: { lines: 97, branches: 97, functions: 100 },
    },
  },
});
