import { defineConfig } from "vitest/config";

/**
 * La couverture ne compte que les modules purs (CLAUDE.md) : ce qui dessine ou touche le
 * DOM n'a pas de test unitaire, par choix. Seuils mesurés à leur introduction
 * (2026-10-18), puis recalés le 2026-10-21 sur la mesure de vitest 4, qui compte
 * autrement (remappage par l'arbre syntaxique) : ils ne peuvent que monter.
 */
export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      include: [
        "src/view/**",
        "src/game/**",
        "src/net/session.ts",
        "src/ui/flow.ts",
        "src/load/cache.ts",
        "src/admin/model.ts",
        "src/replay/replay.ts",
        "src/admin/design/catalog.ts",
        "src/admin/design/tweaks.ts",
      ],
      // `* 2.*` : doublons qu'iCloud dépose à côté des sources (N1) ; ignorés par git, ils
      // compteraient à 0 % et feraient tomber le seuil sans qu'aucun code n'ait changé.
      exclude: ["**/*.test.ts", "**/* 2.*"],
      thresholds: { lines: 97, branches: 85, functions: 94 },
    },
  },
});
