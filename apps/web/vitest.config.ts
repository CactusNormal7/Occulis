import { defineConfig } from "vitest/config";

/**
 * La couverture ne compte que les modules purs (CLAUDE.md) : ce qui dessine ou touche le
 * DOM n'a pas de test unitaire, par choix. Seuils mesurés à leur introduction
 * (2026-10-18) : ils ne peuvent que monter.
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
        "src/admin/replay.ts",
        "src/admin/design/catalog.ts",
        "src/admin/design/tweaks.ts",
      ],
      exclude: ["**/*.test.ts"],
      thresholds: { lines: 63, branches: 87, functions: 88 },
    },
  },
});
