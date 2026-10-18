# Notes de synchronisation — Occulis UI

Projet Claude Design : « Occulis UI » (`projectId` dans `config.json`), forme `package`, sans Storybook.

## Préparer un re-sync

- Construire le paquet d'abord : `pnpm --filter @occulis/ui build` (tsup + `scripts/bundle-css.mjs`). Le
  convertisseur lit `packages/ui/dist/index.js` (`--entry`) et `packages/ui/node_modules` (`--node-modules`) :
  React y est lié par pnpm.
- Scripts recopiés dans `.ds-sync/` avec leurs dépendances (`esbuild ts-morph @types/react playwright`).
  Depuis le 2026-10-15 : **Playwright 1.64.0**, Chromium révision 1248, installé par
  `cd .ds-sync && npx playwright install chromium` (le cache 1234 avait disparu du poste). Un autre cache
  demandera une autre version (voir `node_modules/playwright-core/browsers.json`).
- **Le dossier est sur le Bureau, synchronisé par iCloud, qui fabrique des copies numérotées** (`Button 3.jsx`,
  `react 2.js`, `Reveal 2.tsx`…) jusque dans `ds-bundle/`. Le `.gitignore` les écarte de git (`* 2.*`), mais pas
  de l'envoi : **filtrer la liste d'envoi** (`grep -vE ' [0-9]+(\.[A-Za-z.]+)?$'`). Dans `.design-sync/previews/`,
  le convertisseur les signale comme « stale preview » — sans effet.
- `wrangler dev` garde le manifeste d'assets du démarrage : après un `build:local` du client, le relancer, sinon
  la page `/admin/` charge des fichiers qui n'existent plus et s'affiche blanche.

## Décisions et contournements

- **`dist/styles.css` est autonome** (tokens inclus) : un `@import "./generated/tokens.css"` laissé dans la
  feuille pointait vers un fichier que le bundle n'embarque pas, et toutes les propriétés `--occ-*` étaient
  indéfinies dans Claude Design.
- **`dtsPropsFor`** pour `Button`, `IconButton`, `TextField`, `SelectField`, `Icon`, `PasswordField`,
  `ProviderButton` : le filtre `[DTS_STYLE_SYSTEM]`
  retire tous les attributs HTML hérités, donc `onClick`, `disabled`, `value`, `onChange` disparaissaient du
  contrat. La liste des icônes y est recopiée : **à mettre à jour si `Icon.tsx` gagne une icône**.
- **Catégories** : `docsDir` pointe sur `.design-sync/docs/`, un `.md` par composant qui ne porte que sa
  catégorie. Le `.prompt.md` reste synthétisé depuis le `.d.ts` et les aperçus.
- `UiRoot` est le `provider` de tous les aperçus.
- **Langue des aperçus** : les plus anciens sont en français, ceux ajoutés depuis l'i18n (2026-10) en anglais —
  les composants affichent leurs propres textes (« Cancel », « Continue with Google ») dans la langue active,
  l'anglais par défaut, et une carte qui mêle les deux langues se lit mal. Un nouvel aperçu s'écrit en anglais.
- **`Divider` sans mot** laisse un trou au milieu du trait (l'écart des pseudo-éléments subsiste) : l'application
  ne s'en sert qu'avec « or », l'aperçu aussi.
- `LocaleProvider` garde la carte minimale : un fournisseur sans rendu propre.

## Le design system du back-office

- **Les aperçus de `previews/` sont aussi montés tels quels dans le back-office** (`#/design`,
  `apps/web/src/admin/design/`), avec leur code et la catégorie de `docs/`. Renommer un export, en
  retirer un ou casser un aperçu se voit donc aussi là. Un aperçu doit se rendre seul sous `UiRoot`
  et `ToastProvider` ; une fenêtre modale (catégorie `Overlays`) ne s'y monte qu'à la demande.
- `vite.config.ts` résout `@occulis/ui` et React pour ces fichiers, hors de tout paquet, et compile
  leur JSX en runtime automatique : rien à faire ici, mais ne pas déplacer `previews/` sans le dire
  à `sources.ts`.
- Huit composants ajoutés à la charte pour cette page (`Showcase.tsx` : `CodeBlock`, `Swatch`,
  `SwatchGrid`, `Specimen`, `Stage`, `Prose`, `NavList`, `AsideLayout`), avec aperçus et fiches.
  **Pas encore envoyés** à Claude Design : ils partiront au prochain re-sync.

## Avertissements connus

- `[RENDER_THIN] Dialog` — hauteur mesurée 0 px : la fenêtre modale vit dans la couche supérieure du navigateur,
  hors de la boîte mesurée. La capture est complète et notée bonne.

## Re-sync risks

- La liste d'icônes de `dtsPropsFor` est une copie : une icône ajoutée à `Icon.tsx` n'apparaîtra pas dans le
  contrat de `Button`/`IconButton`/`Icon` tant qu'elle n'y est pas reportée. **C'est arrivé** (`eyeOff`, `check`,
  `user`, `link`, rattrapées le 2026-10-15) : la regénérer depuis les clés de `ICONS` à chaque re-sync.
- Même chose pour les props de `TextField`/`PasswordField`/`ProviderButton` dans `dtsPropsFor` : une prop ajoutée
  au composant (comme `error`) n'atteint le contrat qu'en la reportant à la main.
- `conventions.md` annonce `--occ-space-1…8` alors que `--occ-space-7` n'existe pas, et ne cite aucun composant
  des parcours de compte (`FormPanel`, `PasswordField`, `SettingRow`…) : correction proposée, pas encore faite.
- **`conventions.md` décrit encore la DA d'avant la refonte** (relevé le 2026-10-16, en l'affichant dans le
  back-office) : « thin white wireframe », « the monospace font » (c'est Tiny5, une police pixel), aucun mot des
  trois thèmes (`data-theme`), des coins crantés (`--pixel-notch`), de l'ouverture des fenêtres (`revealWindow`,
  réservée aux fenêtres qu'un clic ouvre) ni du voile tramé verrouillé. À réécrire avec le porteur du projet au
  re-sync qui suivra le choix du thème (tâche Notion « Resynchroniser la charte vers Claude Design »).
- Les tokens sont générés depuis `packages/ui/src/tokens.ts` ; `tokens.test.ts` garde `generated/tokens.css`
  synchrone, mais seul le build met `dist/styles.css` à jour — reconstruire avant tout re-sync.
- Le rendu n'a été vérifié qu'en Chromium 1234 (headless shell) ; aucune police n'est servie, la monospace est
  celle du système — elle diffère d'une machine à l'autre, volontairement.
