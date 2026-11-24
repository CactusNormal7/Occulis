import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vitest/config";

/**
 * Les tests de la charte rendent les composants côté serveur (`vue/server-renderer`) et
 * vérifient le balisage produit : ils n'ont besoin ni de navigateur ni de DOM simulé.
 */
export default defineConfig({
  plugins: [vue()],
});
