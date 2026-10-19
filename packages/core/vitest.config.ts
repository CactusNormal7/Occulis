import { defineConfig } from "vitest/config";

/**
 * Les seuils sont ceux mesurés à leur introduction (2026-10-18) : ils ne disent pas ce qui
 * est assez, seulement ce qu'une modification n'a pas le droit de faire baisser. On les
 * remonte à mesure que les tests s'ajoutent.
 */
export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      include: ["src/**"],
      exclude: ["src/**/*.test.ts", "src/testing.ts"],
      thresholds: { lines: 76, branches: 93, functions: 87 },
    },
  },
});
