import { defineConfig } from "astro/config";

/**
 * Le site vitrine est entièrement statique : Astro produit `dist/`, que le Worker du site
 * (`src/worker/index.ts`) sert en assets et devant lequel il ne garde que `/api/*`.
 *
 * `SITE_URL` fixe les adresses absolues (canonique, Open Graph, sitemap). Le domaine
 * définitif n'est pas arrêté : voir docs/technical/site.md.
 */
export default defineConfig({
  site: process.env.SITE_URL ?? "https://occulis-site.0kl.fr",
  output: "static",
  trailingSlash: "always",
  compressHTML: true,
  // La barre d'outils de développement se dessinerait sur les captures (`scripts/capture.mjs`).
  devToolbar: { enabled: false },
  build: {
    // Une seule feuille, petite : en ligne, elle évite une requête bloquante au premier écran.
    inlineStylesheets: "always",
  },
  vite: {
    build: {
      // Aucun script en ligne : la politique de sécurité (`public/_headers`) n'autorise que
      // les scripts servis par le site.
      assetsInlineLimit: 0,
    },
  },
});
