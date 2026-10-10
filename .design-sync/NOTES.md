# Notes de synchronisation — Occulis UI

Projet Claude Design : « Occulis UI » (`projectId` dans `config.json`), forme `package`, sans Storybook.

## Préparer un re-sync

- Construire le paquet d'abord : `pnpm --filter @occulis/ui build` (tsup + `scripts/bundle-css.mjs`). Le
  convertisseur lit `packages/ui/dist/index.js` (`--entry`) et `packages/ui/node_modules` (`--node-modules`) :
  React y est lié par pnpm.
- Scripts recopiés dans `.ds-sync/` avec leurs dépendances (`esbuild ts-morph @types/react playwright@1.62.0`).
  **Playwright 1.62.0** parce que c'est la version qui épingle le Chromium en cache sur ce poste (révision 1234) ;
  un autre cache demandera une autre version (voir `browsers.json`).
- `wrangler dev` garde le manifeste d'assets du démarrage : après un `build:local` du client, le relancer, sinon
  la page `/admin/` charge des fichiers qui n'existent plus et s'affiche blanche.

## Décisions et contournements

- **`dist/styles.css` est autonome** (tokens inclus) : un `@import "./generated/tokens.css"` laissé dans la
  feuille pointait vers un fichier que le bundle n'embarque pas, et toutes les propriétés `--occ-*` étaient
  indéfinies dans Claude Design.
- **`dtsPropsFor`** pour `Button`, `IconButton`, `TextField`, `SelectField`, `Icon` : le filtre `[DTS_STYLE_SYSTEM]`
  retire tous les attributs HTML hérités, donc `onClick`, `disabled`, `value`, `onChange` disparaissaient du
  contrat. La liste des icônes y est recopiée : **à mettre à jour si `Icon.tsx` gagne une icône**.
- **Catégories** : `docsDir` pointe sur `.design-sync/docs/`, un `.md` par composant qui ne porte que sa
  catégorie. Le `.prompt.md` reste synthétisé depuis le `.d.ts` et les aperçus.
- `UiRoot` est le `provider` de tous les aperçus.

## Avertissements connus

- `[RENDER_THIN] Dialog` — hauteur mesurée 0 px : la fenêtre modale vit dans la couche supérieure du navigateur,
  hors de la boîte mesurée. La capture est complète et notée bonne.

## Re-sync risks

- La liste d'icônes de `dtsPropsFor` est une copie : une icône ajoutée à `Icon.tsx` n'apparaîtra pas dans le
  contrat de `Button`/`IconButton`/`Icon` tant qu'elle n'y est pas reportée.
- Les tokens sont générés depuis `packages/ui/src/tokens.ts` ; `tokens.test.ts` garde `generated/tokens.css`
  synchrone, mais seul le build met `dist/styles.css` à jour — reconstruire avant tout re-sync.
- Le rendu n'a été vérifié qu'en Chromium 1234 (headless shell) ; aucune police n'est servie, la monospace est
  celle du système — elle diffère d'une machine à l'autre, volontairement.
