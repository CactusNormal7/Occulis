# Notes de synchronisation — Occulis UI

Projet Claude Design : « Occulis UI » (`projectId` dans `config.json`), forme `package`, sans Storybook.
Le projet d'origine a été supprimé et recréé le 2026-10-19 (nouvel identifiant) : son ancre `_ds_sync.json`
date de ce jour-là.

**Depuis le 2026-10-21, la charte vit dans un artifact « Design System » :
https://claude.ai/artifact/PrwsGTxMaSez6XXHUmGEVq.** Le `projectId` de `config.json` ne répond plus (404 sur
`DesignSync`, absent de `list_projects` au 2026-10-23) : l'outil `DesignSync` ne peut plus écrire nulle part.
Un re-sync se fait donc **par l'outil Artifact**, fichier par fichier sous `project/` (voir « Re-sync vers
l'artifact » plus bas).

## Préparer un re-sync

- Construire le paquet d'abord : `pnpm --filter @occulis/ui build` (tsup + `scripts/bundle-css.mjs`). Le
  convertisseur lit `packages/ui/dist/index.js` (`--entry`) et `packages/ui/node_modules` (`--node-modules`) :
  React y est lié par pnpm.
- Scripts recopiés dans `.ds-sync/` avec leurs dépendances (`esbuild ts-morph @types/react playwright`).
  Depuis le 2026-10-15 : **Playwright 1.64.0**, Chromium révision 1248, installé par
  `cd .ds-sync && npx playwright install chromium` (le cache 1234 avait disparu du poste). Un autre cache
  demandera une autre version (voir `node_modules/playwright-core/browsers.json`).
- **Sous WSL (`~/docs/Occulis`, 2026-10-19)** : le cache Playwright contient Chromium **1228**, donc
  `npm i playwright@1.61.0` dans `.ds-sync/`. Le headless shell y échoue au lancement (« Target page, context
  or browser has been closed ») faute de `libasound.so.2` : sans `sudo`, `apt-get download libasound2t64` puis
  `dpkg-deb -x` dans un dossier temporaire, et exporter `LD_LIBRARY_PATH=<dossier>/usr/lib/x86_64-linux-gnu`
  avant `package-validate.mjs` et `package-capture.mjs`. Le shell est zsh : une variable contenant plusieurs
  fichiers n'est pas découpée, les nommer un à un.
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
  Envoyés avec la première synchronisation de l'artifact (2026-10-21).

## Avertissements connus

- `[RENDER_THIN] Dialog` — hauteur mesurée 0 px : la fenêtre modale vit dans la couche supérieure du navigateur,
  hors de la boîte mesurée. La capture est complète et notée bonne.

## Re-sync risks

- La liste d'icônes de `dtsPropsFor` est une copie : une icône ajoutée à `Icon.tsx` n'apparaîtra pas dans le
  contrat de `Button`/`IconButton`/`Icon` tant qu'elle n'y est pas reportée. **C'est arrivé** (`eyeOff`, `check`,
  `user`, `link`, rattrapées le 2026-10-15) : la regénérer depuis les clés de `ICONS` à chaque re-sync.
- Même chose pour les props de `TextField`/`PasswordField`/`ProviderButton` dans `dtsPropsFor` : une prop ajoutée
  au composant (comme `error`) n'atteint le contrat qu'en la reportant à la main.
- `conventions.md` a été réécrit le 2026-10-23 d'après le README de l'artifact, plus à jour : DA pixel, Tiny5,
  coins crantés, trois matières, trois thèmes, composants des parcours de compte, pas d'espacement 7. Les
  deux doivent rester identiques, la section « Not synced » comprise.
- Les tokens sont générés depuis `packages/ui/src/tokens.ts` ; `tokens.test.ts` garde `generated/tokens.css`
  synchrone, mais seul le build met `dist/styles.css` à jour — reconstruire avant tout re-sync.
- Le rendu n'a été vérifié qu'en Chromium 1234 puis 1228 (headless shell). Tiny5 est servie avec la charte
  (`fonts/tiny5-latin.woff2` dans l'artifact) ; seule la monospace des données et du code reste celle du
  système, et diffère d'une machine à l'autre, volontairement.

## Re-sync vers l'artifact

Dernier envoi : 2026-10-30 (version 12), `WorkInProgress` ajouté. Le fichier `project/components/bundle.css`
n'est **pas** `dist/styles.css` : ses tokens viennent de `tokens.json`. Il garde son bloc `:root` de tête (polices,
mouvement), suivi de `styles.css` avec `wip.css` intégré. Un token ajouté à `tokens.ts` s'ajoute donc aussi à
`project/tokens.json` (ici `occ-caution`, `occ-caution-ground`). L'artifact refuse une publication sans lecture
préalable de la version courante (`action: "read"` sur l'URL seule). `SkeletonScreen` est dans le bundle, sans fiche.

Fait ainsi le 2026-10-23 (version 7 de l'artifact) :

- Comparer le dépôt au dernier commit synchronisé (`lastChange.via` de `project/design-system.json`) :
  `git diff --stat <commit> -- packages/ui/src .design-sync/previews .design-sync/docs`.
- **`project/components/bundle.js`** : un IIFE minifié qui pose `window.OcculisUI` et lit React sur
  `window.React`, sa première ligne étant l'en-tête `/* @ds-bundle: … */` de l'ancien bundle. Le reconstruire
  avec l'esbuild de `.ds-sync/node_modules` depuis `packages/ui/src/index.ts` : `react` et `react-dom` remplacés
  par `window.React` / `window.ReactDOM`, `react/jsx-runtime` par un `createElement` qui pose la clé, CSS ignorée,
  `var OcculisUI=` réécrit en `window.OcculisUI=`. Vérifier que les exports sont les mêmes que l'ancien et
  qu'aucun `</script` n'y figure.
- `project/components/bundle.css` : ne change que si `styles.css` ou les tokens changent.
- `project/components/index.d.ts` part en `text/plain` (l'extension `.ts` n'est pas servie) ; les
  `components/<Nom>/README.md` recopient les commentaires du composant, à corriger avec lui.
- Un seul envoi avec l'index en dernier, `lastChange` mis à jour ; relire juste avant chaque fichier remplacé,
  la page de l'artifact pouvant enregistrer elle-même une version.
