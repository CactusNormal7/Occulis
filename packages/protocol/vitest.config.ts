import { defineConfig } from "vitest/config";

/** Seuils mesurés à leur introduction (2026-10-18) : ils ne peuvent que monter. */
export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      include: ["src/**"],
      exclude: ["src/**/*.test.ts"],
      thresholds: { lines: 98, branches: 98, functions: 100 },
    },
  },
});
