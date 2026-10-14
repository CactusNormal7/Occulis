import { defineConfig } from "tsup";

/**
 * Le build publié : un module ES, ses déclarations, et la feuille de style complète. Il ne
 * sert qu'aux consommateurs hors du dépôt — la synchronisation vers Claude Design
 * (`.design-sync/`) ; dans le monorepo, `apps/web` lit les sources directement.
 */
export default defineConfig({
  entry: { index: "src/index.ts" },
  format: ["esm"],
  dts: true,
  clean: true,
  sourcemap: false,
  external: ["react", "react-dom", "react/jsx-runtime"],
  // Les textes sont embarqués : hors du dépôt, `@occulis/i18n` ne se résout pas.
  noExternal: ["@occulis/i18n"],
  // Une seule feuille, tokens compris (`scripts/bundle-css.mjs`).
  onSuccess: "node scripts/bundle-css.mjs",
});
