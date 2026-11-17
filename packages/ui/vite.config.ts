import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

/**
 * Le build publié de la charte. Il ne sert qu'aux consommateurs hors du dépôt — la
 * synchronisation vers Claude Design (`.design-sync/`) ; dans le monorepo, `apps/web` lit
 * les sources directement.
 *
 * Deux sorties, Vue restant à l'extérieur :
 * - `dist/index.js` (module ES) et ses déclarations `dist/index.d.ts` ;
 * - `dist/occulis-ui.iife.js`, qui pose `window.OcculisUI` et lit Vue sur `window.Vue` :
 *   le bundle qu'une page de Claude Design charge par une simple balise `<script>`.
 *
 * La feuille de style complète (`dist/styles.css`, tokens compris) est écrite à part par
 * `scripts/bundle-css.mjs`, après ce build.
 */
export default defineConfig({
  plugins: [
    vue(),
    dts({
      entryRoot: "src",
      include: ["src/**/*.ts", "src/**/*.vue"],
      exclude: ["src/**/*.test.ts", "src/lab/**"],
    }),
  ],
  build: {
    lib: {
      entry: "src/index.ts",
      name: "OcculisUI",
      formats: ["es", "iife"],
      fileName: (format) => (format === "es" ? "index.js" : "occulis-ui.iife.js"),
    },
    // Les feuilles sont réunies par `bundle-css.mjs` : le build n'en émet aucune.
    cssCodeSplit: false,
    emptyOutDir: true,
    rollupOptions: {
      // Les textes (`@occulis/i18n`) sont embarqués : hors du dépôt, le paquet ne se résout pas.
      external: ["vue"],
      output: { globals: { vue: "Vue" } },
    },
  },
});
