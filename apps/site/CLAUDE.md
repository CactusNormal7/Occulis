# apps/site

`apps/site` — le site vitrine (`@occulis/site`) : Astro en sortie statique, servi avec la route `/api/beta` par le Worker `occulis-site` (base D1 `occulis-site`). Un seul objectif : l'inscription à la beta. **Tous les textes vivent dans `src/content/<langue>/`**, jamais dans les composants. Aucune couleur hors des propriétés `--occ-*` posées depuis `@occulis/ui/tokens` (`colors.test.ts` le vérifie). Aucun script en ligne (CSP), aucun tiers hors Cloudflare Web Analytics. Rien ne promet ce qui n'est pas décidé (nombre de pièces, date, prix). Les images de `public/` se régénèrent par `pnpm --filter @occulis/site capture`.

Détail : [docs/technical/site.md](../../docs/technical/site.md) ; décision : [docs/architecture.md](../../docs/architecture.md#8-site-vitrine).
