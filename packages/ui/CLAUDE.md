# packages/ui

`packages/ui` — la charte graphique en composants React (`@occulis/ui`) : tokens, une feuille de style unique (`occ-*`), environ soixante-dix briques. **`src/tokens.ts` est le seul fichier du projet autorisé à contenir une valeur de couleur** — une règle ESLint le vérifie en TypeScript, des tests dans les feuilles et les pages ; deux exceptions assumées, hors du jeu : la TUI de `tooling/infra` (couleurs de terminal) et les maquettes de `docs/mockups/` ; `src/generated/tokens.css` en est généré, jamais édité. Synchronisée vers le projet Claude Design « Occulis UI » par `.design-sync/` (procédure et pièges dans `.design-sync/NOTES.md`). Voir `docs/technical/ui.md`.

Détail : [docs/technical/ui.md](../../docs/technical/ui.md).
