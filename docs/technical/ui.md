# La charte graphique — `packages/ui`

`@occulis/ui` est la charte d'Occulis en composants React : les tokens (couleurs, typographie,
espacements, mouvement), une feuille de style unique et une quarantaine de briques
d'interface. Le back-office (`apps/web/admin/`) est entièrement construit dessus ; le même
paquet est synchronisé vers le projet Claude Design « Occulis UI », où l'agent de design
construit ses maquettes avec ces composants réels (`.design-sync/`).

Les écrans du jeu (compte, menu, attente, bandeau de partie) sont **encore en DOM natif**
(`apps/web/src/ui/`) et le plateau reste en PixiJS : ils partagent les tokens, pas les
composants.

## Fichiers

| Fichier | Rôle |
|---|---|
| `src/tokens.ts` | **Seule source des valeurs de couleur du projet**, et des tokens de type, d'espacement et de mouvement |
| `src/generated/tokens.css` | Les propriétés `--occ-*` sur `:root`, **générées** depuis `tokens.ts` — jamais éditées |
| `src/styles.css` | La feuille des composants, sous le préfixe `occ-` ; importe les tokens |
| `src/components/*.tsx` | Un composant (ou une petite famille) par fichier |
| `src/index.ts` | Point d'entrée : tokens et composants |
| `src/cx.ts` | Assemblage de noms de classe |
| `scripts/build-tokens.ts` | Écrit `generated/tokens.css` (`pnpm --filter @occulis/ui tokens`) |
| `scripts/bundle-css.mjs` | Écrit `dist/styles.css` : tokens **inclus**, sans `@import` |
| `tsup.config.ts` | Le build publié : `dist/index.js`, `dist/index.d.ts`, `dist/styles.css` |

Dans le monorepo, les consommateurs lisent les **sources** (`exports` pointe sur `src/`) : rien
à construire pour développer. Le build `dist/` ne sert qu'à la synchronisation Claude Design,
et à la CI (`pnpm -r build`).

## Les tokens

`tokens.ts` exporte les valeurs brutes et deux formats de sortie :

| Export | Contenu |
|---|---|
| `BACKGROUND`, `INK` | Le fond et l'encre (entiers `0xRRGGBB`) |
| `CAMP.A`, `CAMP.B` | Couleurs de camp |
| `STATE` | `selection`, `legalMove`, `climb`, `threat` |
| `INK_ALPHA` | Les opacités de l'encre : `soft` .55, `dim` .35, `faint` .2, `line` .1, `ghost` .05 |
| `PANEL_ALPHA` | Le voile des panneaux posés sur le plateau |
| `FONT` | Monospace système, tailles `xs`…`xxl`, interlettrage des capitales |
| `SPACE` | Échelle de 4 en 4 (`1` = 4px … `8` = 32px) |
| `MOTION` | Courbe et durées |
| `cssColor(color, alpha)` | Entier → `rgb(r g b / a)` |
| `cssVariables()` | Nom `--occ-*` → valeur ; c'est ce que `generated/tokens.css` pose |
| `tokensStylesheet()` | Le texte exact de `generated/tokens.css` |

`apps/web/src/theme.ts` (PixiJS) importe `BACKGROUND`, `CAMP`, `INK` et `STATE` depuis
`@occulis/ui/tokens` — un sous-chemin sans React, pour que le jeu n'embarque rien d'autre.

**La règle est mécanique.** `eslint.config.js` interdit tout littéral de couleur dans
`apps/web/src/**` et `packages/ui/src/**`, avec une seule exception : `tokens.ts`. Les feuilles
de style échappent à ESLint ; `tokens.test.ts` les garde à la place :

- `generated/tokens.css` doit égaler `tokensStylesheet()` — le fichier ne dérive pas de sa
  source ;
- `styles.css` ne lit que des propriétés `--occ-*` que `cssVariables()` définit ;
- `styles.css` ne contient aucun `#rrggbb` ni `rgb(…)`.

## La feuille de style

Trois règles de la direction artistique (`docs/design.md` 8.1, maquettes de `docs/mockups/`)
gouvernent `styles.css` :

1. **angles vifs, traits fins** — aucun `border-radius`, des cadres d'un pixel en
   `--occ-ink-line`, aucun bouton plein ;
2. **la hiérarchie par l'alpha** — l'encre est blanche à opacité décroissante, jamais grise ;
3. **la couleur porte l'information de partie** — camps, sélection, coup légal, refus. Les
   états de compte restent blancs ; seule une suspension prend la teinte des refus, et un
   résultat de partie celle du camp vainqueur.

Classes utilitaires : `occ-root` (posée par `UiRoot`), `occ-page`, `occ-stack`, `occ-enter`
(entrée en cascade), `occ-label`, `occ-muted`, `occ-actions-cell`. Les infobulles passent par
l'attribut `data-tip`. Toutes les animations s'éteignent sous `prefers-reduced-motion`.

## Les composants

| Famille | Composants |
|---|---|
| Fondations | `UiRoot` (racine : fond, encre, police), `Icon` (tracés au trait, `currentColor`) |
| Actions | `Button` (`default`/`primary`/`danger`/`ghost`), `IconButton` (infobulle, `disabledReason`), `QuickBar` |
| Formulaires | `TextField`, `SelectField`, `SearchField` (validé par Entrée), `InlineEdit`, `Segmented`, `ChipGroup` |
| États | `Badge` (`plain`/`strong`/`dim`/`refused`/`A`/`B`), `BadgeRow`, `Banner`, `EmptyState`, `ToastProvider` + `useToast`, `ToastStack`, `ProgressBar` |
| Joueurs | `TileAvatar` (initiales dans une case 2:1), `Person`, `Versus` |
| Mise en page | `Card`, `CardGrid`, `CardColumn`, `PageHead`, `BackLink`, `Hero`, `Toolbar`, `ToolbarText`, `TopBar`, `Wordmark`, `Note` |
| Données | `StatTile`, `StatTileGrid`, `Stat`, `StatGrid`, `FactStrip`, `DefinitionList`, `Table`, `Pager`, `List`, `ListRow`, `MoveList` |
| Fenêtres | `Dialog` |

Quelques comportements à connaître :

- **`Dialog`** s'appuie sur `<dialog>` natif (focus piégé, Échap, page inerte). `onConfirm`
  rend `true` pour fermer, `false` pour rester ouverte sur un refus ; la fermeture attend la
  fin de l'animation de sortie avant d'appeler `onClose`.
- **`IconButton`** exige un `label` ; `disabledReason` grise le bouton **et** remplace
  l'infobulle par la raison.
- **`ToastProvider`** empile les messages en bas à droite ; un refus reste deux fois plus
  longtemps qu'un succès.
- **`StatTile`** fait monter son chiffre de zéro (`animate`), sauf sous mouvement réduit.
- **`MoveList`** sépare l'entrée montrée (`shown`, survol) de l'entrée épinglée (`pinned`,
  marquée dans la teinte de la sélection).
- Toutes les props optionnelles acceptent `undefined` (`exactOptionalPropertyTypes`).

## La synchronisation vers Claude Design

`.design-sync/` porte la configuration, les aperçus rédigés (`previews/<Nom>.tsx`), les
catégories (`docs/<Nom>.md`), l'en-tête de conventions lu par l'agent de design
(`conventions.md`) et les notes de re-sync (`NOTES.md`). Le convertisseur et sa sortie
(`.ds-sync/`, `ds-bundle/`) sont ignorés par git. La procédure et ses pièges sont dans
`.design-sync/NOTES.md`.

## Tests

10 tests, sous Node : `pnpm --filter @occulis/ui test`.

| Fichier | Ce qui est verrouillé |
|---|---|
| `src/tokens.test.ts` | `generated/tokens.css` identique à sa source, `styles.css` sans propriété indéfinie ni couleur en dur, conversion des couleurs |
| `src/components.test.tsx` | Rendu serveur de chaque composant sans erreur, icônes sans couleur, raison d'un bouton grisé en infobulle, initiales, onglet et option courants marqués, état vide d'une table, libellé de pagination |

Le rendu visuel n'est pas testé ici : il l'est par les aperçus vérifiés sur captures lors de
chaque synchronisation (`.design-sync/`).

## Invariants à ne pas casser

1. **Aucune couleur hors de `tokens.ts`.** Ni en TypeScript (ESLint), ni en CSS (tests).
2. **`generated/tokens.css` ne s'édite pas** : modifier `tokens.ts`, puis
   `pnpm --filter @occulis/ui tokens`.
3. **`dist/styles.css` reste autonome.** Un `@import` vers un fichier voisin laisserait les
   `--occ-*` indéfinis chez un consommateur qui ne reçoit que la feuille.
4. **Ce qui manque à une vue s'ajoute à la charte**, pas à la vue : `apps/web/src/admin/` n'a
   ni classe ni feuille propres.
