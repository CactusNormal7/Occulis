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

| Fichier                             | Rôle                                                                                                                                                                                |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/tokens.ts`                     | **Seule source des valeurs de couleur du projet**, et des tokens de type, d'espacement et de mouvement                                                                              |
| `src/generated/tokens.css`          | Les propriétés `--occ-*` sur `:root`, **générées** depuis `tokens.ts` — jamais éditées                                                                                              |
| `src/styles.css`                    | La feuille des composants, sous le préfixe `occ-` ; importe les tokens                                                                                                              |
| `src/components/*.tsx`              | Un composant (ou une petite famille) par fichier                                                                                                                                    |
| `src/index.ts`                      | Point d'entrée : tokens et composants                                                                                                                                               |
| `src/cx.ts`                         | Assemblage de noms de classe                                                                                                                                                        |
| `src/critical.ts`                   | `criticalHead()` et `withCriticalHead()` : le bloc de tête de chaque page HTML (sous-chemin `@occulis/ui/critical`)                                                                 |
| `src/window-reveal.ts`              | `revealWindow()` : l'ouverture et la fermeture d'une fenêtre qu'un clic ouvre, depuis son centre ou la souris, et son calendrier pur (sous-chemin `@occulis/ui/reveal`, sans React) |
| `scripts/build-tokens.ts`           | Écrit `generated/tokens.css` et `generated/proposed-tokens.css` (`pnpm --filter @occulis/ui tokens`)                                                                                |
| `src/generated/proposed-tokens.css` | Les tokens **proposés** de la refonte (`PROPOSED`), générés eux aussi, lus par le seul labo                                                                                         |
| `src/lab/`                          | Le labo de la refonte (sous-chemin `@occulis/ui/lab`, feuille `@occulis/ui/lab.css`) : composants proposés, qu'aucun écran n'importe — voir « Le labo de la refonte »               |
| `previews/`                         | La page d'aperçus du labo, servie sous `/lab/` par `apps/web/lab/`                                                                                                                  |
| `scripts/bundle-css.mjs`            | Écrit `dist/styles.css` : tokens **inclus**, sans `@import`                                                                                                                         |
| `tsup.config.ts`                    | Le build publié : `dist/index.js`, `dist/index.d.ts`, `dist/styles.css`                                                                                                             |

Dans le monorepo, les consommateurs lisent les **sources** (`exports` pointe sur `src/`) : rien
à construire pour développer. Le build `dist/` ne sert qu'à la synchronisation Claude Design,
et à la CI (`pnpm -r build`).

## Les tokens

`tokens.ts` exporte les valeurs brutes et deux formats de sortie :

| Export                                                     | Contenu                                                                                                                                                                           |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Palette`                                                  | Tout ce qui porte une couleur pour un thème : `background`, `surface`, `ink`, `terrain` (`top`, `peak`, `fog`, `sideLight`, `sideShade`), `camp`, `state`, `sky` (`star`, `aura`) |
| `THEMES`, `ThemeName`, `THEME_NAMES`, `isThemeName()`      | Les thèmes proposés (`obsidian`, `reliquary`, `astral`), une `Palette` chacun                                                                                                     |
| `DEFAULT_THEME`                                            | `obsidian` : premier passage, courriers, première image d'une page                                                                                                                |
| `BACKGROUND`, `SURFACE`, `INK`, `TERRAIN`, `CAMP`, `STATE` | Les valeurs du thème par défaut (entiers `0xRRGGBB`), lues par les courriers et le bloc critique                                                                                  |
| `CAMP.A`, `CAMP.B`                                         | Couleurs de camp                                                                                                                                                                  |
| `STATE`                                                    | `selection`, `legalMove`, `climb`, `threat`                                                                                                                                       |
| `INK_ALPHA`                                                | Les opacités de l'os : `soft` .62, `dim` .4, `faint` .22, `line` .12, `ghost` .06                                                                                                 |
| `PANEL_ALPHA`                                              | Le voile des panneaux posés sur le plateau                                                                                                                                        |
| `FONT`                                                     | `pixel` (Tiny5, la police de toute l'interface), `mono` (système, pour les courriers), tailles `xs`…`display` **toutes multiples de 8**, interlettrages                           |
| `SPACE`                                                    | Échelle de 4 en 4 (`1` = 4px … `8` = 32px)                                                                                                                                        |
| `MOTION`                                                   | Courbe, durées, et `breath` (la respiration des lueurs)                                                                                                                           |
| `cssColor(color, alpha)`                                   | Entier → `rgb(r g b / a)`                                                                                                                                                         |
| `hexColor(color, alpha, over)`                             | Entier → `#rrggbb`, l'alpha **précomposé** sur le fond : le format des courriers HTML du serveur, que la moitié des clients de messagerie lisent sans transparence                |
| `cssVariables(theme)`                                      | Nom `--occ-*` → valeur pour un thème (par défaut, celui par défaut)                                                                                                               |
| `paletteVariables(palette)`                                | Les mêmes propriétés pour une palette quelconque : `cssVariables()` s'en sert, et le design system du back-office pour une palette retouchée à la main                            |
| `tokensStylesheet()`                                       | Le texte exact de `generated/tokens.css` : le thème par défaut sur `:root`, puis chaque thème sous `:root[data-theme="…"]`                                                        |

`cssVariables()` dérive en plus quelques lueurs (`--occ-camp-a-glow`, `--occ-camp-b-glow`,
`--occ-ink-glow`, `--occ-selection-glow`), le ciel (`--occ-star`, `--occ-star-faint`,
`--occ-aura`), les matières (`--occ-surface`, `--occ-matter`, `--occ-matter-peak`,
`--occ-shade`), et les échantillons de **tous** les thèmes (`--occ-swatch-<thème>-bg`,
`-ink`, `-a`, `-b`), identiques sous chaque thème, pour que le sélecteur montre chaque
proposition dans ses propres couleurs.

`apps/web/src/theme/theme.ts` (PixiJS) importe `BACKGROUND`, `CAMP`, `INK`, `STATE` et `TERRAIN` depuis
`@occulis/ui/tokens` — un sous-chemin sans React, pour que le jeu n'embarque rien d'autre.
Le serveur fait de même pour ses courriers (`apps/server/src/auth/mail.ts`).

**La règle est mécanique.** `eslint.config.js` interdit tout littéral de couleur dans
`apps/web/src/**`, `apps/server/src/**` et `packages/ui/src/**` — et dans les aperçus du labo,
`packages/ui/previews/**` et `apps/web/lab/**` —, tests compris, avec une seule exception : `tokens.ts`. Les feuilles
de style échappent à ESLint ; `tokens.test.ts` les garde à la place :

- `generated/tokens.css` doit égaler `tokensStylesheet()` — le fichier ne dérive pas de sa
  source ;
- `styles.css` ne lit que des propriétés `--occ-*` que `cssVariables()` définit ;
- `styles.css` ne contient aucun `#rrggbb` ni `rgb(…)`.

## La feuille de style

Quatre règles de la direction artistique (`docs/design.md` 8.1) gouvernent `styles.css` :

1. **le pixel se voit, il ne saccade pas** — la police Tiny5 à des tailles multiples de 8,
   sans lissage (`-webkit-font-smoothing: none`) ; des cadres d'un pixel aux coins crantés
   (`clip-path: var(--pixel-notch)`, deux pixels coupés par coin) ; des boutons biseautés
   comme des touches (ombre intérieure en pied, qui s'efface à l'appui) et des champs en
   creux (ombre en tête) ; mais des transitions continues ;
2. **la matière est le vide** — panneaux et cartes en `--occ-surface`, une page
   (`occ-root--page`) porte un halo d'aura et, sur ses pseudo-éléments, deux trames
   d'étoiles d'un pixel qui scintillent en décalé (`occ-twinkle`), et le
   voile d'une fenêtre modale est une trame un-sur-deux (`--pixel-dither`) plutôt qu'un
   flou. Seul le bouton principal est plein — d'os ;
3. **la hiérarchie par l'alpha** — l'os à opacité décroissante, jamais gris ; les titres
   luisent (`text-shadow` en `--occ-ink-glow`) ;
4. **la couleur porte l'information de partie** — camps, sélection, coup légal, refus. Les
   états de compte restent dans l'os ; seule une suspension prend la teinte des refus, et un
   résultat de partie celle du camp vainqueur.

`--pixel-notch` et `--pixel-dither` sont des formes, pas des couleurs : elles sont posées
sur `:root` par la feuille elle-même, hors des tokens. Un cran coupe aussi les ombres
portées : les éléments à infobulle (`data-tip`) n'en ont pas.

Un encart (`occ-root` sans `--page`) reste transparent : il se pose sur la matière de son
hôte, un panneau du jeu par exemple.

Classes utilitaires : `occ-root` (posée par `UiRoot`), `occ-page`, `occ-stack`, `occ-enter`
(fondu d'un bloc entier, jamais en cascade), `occ-label`, `occ-muted`, `occ-actions-cell`. Les infobulles passent par
l'attribut `data-tip`. Toutes les animations s'éteignent sous `prefers-reduced-motion`.

## Les composants

| Famille                  | Composants                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fondations               | `UiRoot` (racine : encre, police, langue ; fond pour une page), `Icon` (tracés au trait, `currentColor`)                                                                                                                                                                                                                                                                                                                                                                                        |
| Langue                   | `LocaleProvider`, `useLocale()`, `useMessages()`, `LocaleSwitch` (choix EN/FR)                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Actions                  | `Button` (`default`/`primary`/`danger`/`ghost`), `IconButton` (infobulle, `disabledReason`), `QuickBar`                                                                                                                                                                                                                                                                                                                                                                                         |
| Formulaires              | `TextField` (aide et erreur rattachées par `aria-describedby`), `PasswordField` (bouton d'affichage), `SelectField`, `SearchField` (validé par Entrée ; `onInput` à chaque frappe), `InlineEdit`, `Segmented`, `ChipGroup`                                                                                                                                                                                                                                                                      |
| Parcours de compte       | `FormPanel` (colonne étroite, marque, titre), `FormMessage` (`error`/`success`/`info`), `Divider` (« ou »), `ProviderButton` (« Continuer avec Google », logo monochrome)                                                                                                                                                                                                                                                                                                                       |
| Réglages                 | `SettingList`, `SettingRow` (libellé, valeur, précision, bouton d'édition ou geste propre), `SettingEditor` (l'éditeur déplié dans la ligne)                                                                                                                                                                                                                                                                                                                                                    |
| États                    | `Badge` (`plain`/`strong`/`dim`/`refused`/`A`/`B`), `BadgeRow`, `Banner`, `EmptyState`, `Skeleton`, `ToastProvider` + `useToast`, `ToastStack`, `ProgressBar`                                                                                                                                                                                                                                                                                                                                   |
| Joueurs                  | `TileAvatar` (initiales dans une case 2:1), `Person`, `Versus`, `PlayerPlate` (la plaque d'un joueur à l'annonce d'une partie), `Reveal` (l'annonce : deux plaques et un « vs », réductible en bandeau)                                                                                                                                                                                                                                                                                         |
| Choix                    | `ChoiceList`, `ChoiceRow` (une ligne choisissable, `aria-pressed`, marquée du trait de la sélection)                                                                                                                                                                                                                                                                                                                                                                                            |
| Temps                    | `CountdownRing` (un anneau qui se vide, piloté par ses propriétés, dans la teinte des refus sous cinq secondes)                                                                                                                                                                                                                                                                                                                                                                                 |
| Mise en page             | `Card` (avec `id` d'ancre), `CardGrid`, `CardColumn`, `PageHead`, `BackLink`, `Hero`, `Toolbar`, `ToolbarText`, `TopBar`, `Wordmark`, `Note`                                                                                                                                                                                                                                                                                                                                                    |
| Données                  | `StatTile`, `StatTileGrid`, `Stat`, `StatGrid`, `FactStrip`, `DefinitionList`, `Table`, `Pager`, `List`, `ListRow`, `MoveList`                                                                                                                                                                                                                                                                                                                                                                  |
| Fenêtres                 | `Dialog` (`cancelLabel`, et `dismissible={false}` : ni croix, ni Échap, ni voile — pour une question qui attend une réponse)                                                                                                                                                                                                                                                                                                                                                                    |
| Messages                 | `MessageThread` (fil entre deux personnes), `MessageComposer` (champ d'écriture)                                                                                                                                                                                                                                                                                                                                                                                                                |
| Vitrine (`Showcase.tsx`) | Les briques d'une page qui montre la charte — le design system du back-office : `CodeBlock` (code en monospace système, défilant), `Swatch` (échantillon, modifiable avec `onChange` par le sélecteur de couleur du système) et `SwatchGrid`, `Specimen` (un token montré par son effet), `Stage` (cadre d'un aperçu vivant, titre et actions), `Prose` (texte rédigé : titres, listes, code), `NavList` (table des matières par sections), `AsideLayout` (colonne étroite collante et contenu) |

Quelques comportements à connaître :

- **`Dialog`** s'appuie sur `<dialog>` natif (focus piégé, Échap, page inerte). `onConfirm`
  rend `true` pour fermer, `false` pour rester ouverte sur un refus. Elle s'ouvre et se
  referme depuis son centre (`revealWindow`) ; la fermeture attend la fin de l'animation avant
  d'appeler `onClose`, et son voile tramé se pose en fondu.
- **`IconButton`** exige un `label` ; `disabledReason` grise le bouton **et** remplace
  l'infobulle par la raison.
- **`ToastProvider`** empile les messages en bas à droite ; un refus reste deux fois plus
  longtemps qu'un succès. Chaque message s'ouvre et se referme d'un cadre de sa propre
  couleur (`Toast`, interne : `revealWindow` à l'arrivée et au départ).
- **`CountdownRing`** ne tient aucune horloge : l'appelant fait décroître `remainingMs`, et
  l'anneau glisse d'une valeur à l'autre en une seconde. Une animation CSS aurait été
  écrasée à zéro sous mouvement réduit, vidant l'anneau d'un coup — or le temps restant est
  une information.
- **`Reveal`** fait entrer les deux plaques chacune de son côté, puis le « vs » ; `compact` le
  range en bandeau. Ces animations ne portent rien et s'éteignent sous mouvement réduit.
- **`StatTile`** fait monter son chiffre de zéro (`animate`), sauf sous mouvement réduit.
- **`MoveList`** sépare l'entrée montrée (`shown`, survol) de l'entrée épinglée (`pinned`,
  marquée dans la teinte de la sélection).
- **`TextField` et `PasswordField` gardent le champ dans son libellé** : c'est ce qui les
  associe pour les lecteurs d'écran comme pour les gestionnaires de mots de passe, sans
  identifiant à tenir. `error` passe le champ en `aria-invalid` et l'affiche dans la teinte
  des refus.
- **`PasswordField`** reste de type `password` tant qu'on ne demande pas à l'afficher — c'est
  à ce type que les gestionnaires le reconnaissent — et son bouton (`aria-pressed`) est un
  `type="button"`, jamais un envoi. `autoComplete` est obligatoire : `current-password` ou
  `new-password`.
- **`FormMessage`** est un `role="alert"` pour une erreur, lue aussitôt, `status` sinon.
- **`ProviderButton`** dessine le logo Google **en `currentColor`**, comme toute icône : la
  couleur reste réservée à l'information de partie.
- **`SettingRow`** montre un réglage **en lecture d'abord** ; `editing` remplace la valeur par
  ses `children` (un `SettingEditor`) et retire le bouton. À la fermeture, le focus revient au
  bouton qui avait ouvert l'éditeur — c'est pourquoi `Button` transmet sa référence
  (`forwardRef`).
- **`SettingEditor`** est un vrai `<form>` : Entrée envoie, **Échap annule**, le premier champ
  prend le focus, et le refus du serveur s'affiche dans l'éditeur, au-dessus des boutons.
- **Aucun libellé par défaut n'est écrit en dur** : « Close », « Cancel », « Edit »,
  « Search… », « Nothing to show. », la pagination, « Continue with Google », « seat A » —
  tous viennent du domaine `ui` de `@occulis/i18n`, par `useMessages()`. La langue est celle
  que fixe `UiRoot locale={…}` (qui pose aussi `lang` sur sa racine), à défaut celle d'un
  `LocaleProvider` englobant, à défaut l'anglais. Le build (`tsup`) embarque
  `@occulis/i18n` (`noExternal`) : hors du dépôt, Claude Design ne saurait pas le résoudre.
- **`Skeleton`** est la place d'un contenu qui n'est pas arrivé (`lines`, `card`). Il ne se
  dessine qu'après **150 ms** (`animation-delay`, pas de minuterie). **Le client n'en montre
  aucun** : un écran attend d'être complet pour paraître (`docs/technical/engine.md`,
  « Chargement et premier rendu »), et un squelette serait justement une partie de l'écran
  montrée avant les autres. Il reste dans la charte pour un contenu qui, par nature,
  arriverait après l'écran.
- **`ProgressBar`** n'apparaît qu'après **0,4 s** d'activité, qu'elle soit montée active
  (l'attente d'une page entière) ou qu'elle le devienne (une navigation) : une attente courte
  ne fait rien paraître puis disparaître.
- **`occ-enter`** fond le bloc entier d'un coup. Il n'y a plus d'entrée en cascade : un écran
  qui se compose morceau par morceau se lit comme un écran qui charge. `FormPanel` n'a pas
  d'animation d'entrée, puisqu'il se pose dans un cadre déjà affiché.
- **`criticalHead()`** n'est pas un composant : c'est le texte injecté en tête de chaque page
  HTML par `apps/web/vite.config.ts` — `color-scheme: dark`, `theme-color`, le fond en ligne
  depuis `BACKGROUND` et celui de chaque thème sous `html[data-theme="…"]`, un script en
  ligne qui relit le thème choisi (`THEME_STORAGE_KEY`) et le pose sur `<html data-theme>`
  avant la première image, la déclaration `@font-face` de Tiny5 (`font-display: block`) et son
  préchargement (`PIXEL_FONT_URL`, `/fonts/tiny5-latin.woff2`), `@view-transition` (coupé sous mouvement réduit) et les règles de
  spéculation (`prefetch` au survol). `withCriticalHead(html)` le place juste après la
  déclaration d'encodage, donc avant toute feuille et tout script.
- **`MessageThread`** aligne à droite les messages du lecteur (`mine`), au trait franc, et ceux
  de l'autre à gauche ; aucun aplat. Il reste calé sur le dernier message à chaque arrivée, et
  `more` porte le geste qui charge les plus anciens. C'est un `role="log"`.
- **`MessageComposer`** : Entrée envoie, Maj+Entrée passe à la ligne ; `onSend` rend vrai pour
  vider le champ, faux pour garder le texte d'un envoi refusé. Indication et bouton viennent de
  `ui.messagePlaceholder` et `ui.send` faute de `placeholder` / `sendLabel`.
- Les icônes `userPlus` et `message` servent au système d'amis ; leur liste est recopiée dans
  `.design-sync/config.json` (`dtsPropsFor`).
- Toutes les props optionnelles acceptent `undefined` (`exactOptionalPropertyTypes`).

### `revealWindow()` — une fenêtre qu'un clic ouvre se déplie

Seules les fenêtres qu'un clic ouvre s'animent : `Dialog` et `ToastStack` ici, les réglages
dans la page du jeu. Un cadre d'un pixel part d'un point et s'étire jusqu'aux bords de la
fenêtre en la dévoilant, en s'effaçant à mesure qu'il les rejoint ; la fermeture le replie
vers ce point. Le point est le **centre** de la fenêtre par défaut (une modale, un message)
et la **souris** sur demande (`from = "pointer"`), pour une fenêtre posée à côté de ce
qu'on a cliqué — les réglages sous l'engrenage. Même alors, si la dernière entrée vient du
clavier ou si le pointeur n'a jamais bougé, le geste part du centre. Les écrans du parcours
du jeu (menu, compte, attente, bandeau de partie, bandeau d'usurpation) et les pages
entières n'en usent pas.

| Export                                        | Rôle                                                                                                                                                                                                                                                                                                                       |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `revealWindow(target, mode, from, { speed })` | Joue `"open"` ou `"close"` sur un élément affiché, depuis `"center"` (défaut) ou `"pointer"`, à la vitesse `speed` (1 par défaut ; le design system la ralentit) ; promesse tenue à la fin. Immédiate sous `prefers-reduced-motion` ou pour un élément sans taille ; interrompt une animation en cours sur le même élément |
| `spreadAt(elapsed, mode)`                     | L'étendue à un instant, de 0 (un point) à 1 (la fenêtre entière)                                                                                                                                                                                                                                                           |
| `originIn(width, height, pointer)`            | Le point de départ en coordonnées locales : le pointeur ramené sur les bords, ou le centre s'il est `null`                                                                                                                                                                                                                 |
| `frameAt(spread, origin, width, height)`      | Le rectangle dévoilé, arrondi au pixel                                                                                                                                                                                                                                                                                     |
| `OPEN_MS`, `CLOSE_MS`                         | Les durées (220 ms, 160 ms)                                                                                                                                                                                                                                                                                                |

Le mécanisme : le module écoute `pointermove` et `pointerdown` sur `window` (en capture,
passifs) pour connaître la dernière position du pointeur, et l'oublie à chaque `keydown`.
`revealWindow` la lit une fois, au départ, quand `from` vaut `"pointer"` : le point reste fixe à l'écran même si la
fenêtre grandit en cours d'ouverture (un code qui arrive). Un `clip-path: inset(…)` suit le
rectangle ; le cadre est peint dans un canevas posé **dans** l'élément (et non sur la page,
pour rester dans la couche du haut d'une `<dialog>` modale), de la couleur `color` calculée
de l'élément : l'os pour une fenêtre, la teinte d'un refus pour un message d'erreur. La
taille est relue à chaque image. Le `clip-path` et le `position` en ligne de l'élément sont
rendus à la fin.

Trois propositions ont précédé celle-ci, écartées par le porteur du projet : une nuée de
carrés éclose du centre, un balayage de carrés depuis le coin le plus proche de la souris,
puis un œil qui s'ouvre (trait de lumière et paupières tramées).

## Le labo de la refonte — `src/lab/`

Des propositions de refonte graphique, **non intégrées** (le pourquoi et les options sont dans
[`docs/design/refonte-graphique.md`](../design/refonte-graphique.md)). Elles vivent hors de
`src/index.ts` : ni le jeu, ni le back-office, ni la synchronisation vers Claude Design ne les
voient. Leur feuille, `lab/lab.css`, importe `generated/proposed-tokens.css` ; elle obéit aux
mêmes règles que `styles.css`, gardées par les mêmes tests.

**Tokens proposés** (`tokens.ts`) : `PROPOSED` (espacements 10 / 12 / 16, interlignes,
durées par rôle, courbes, distances, rémanences, niveaux d'intensité, glyphes, papier),
`MOTION_LEVEL_NAMES` / `MotionLevel` / `isMotionLevel()`, `motionLevelVariables(level)`,
`proposedVariables()` et `proposedStylesheet()` — le contenu de `proposed-tokens.css` : les
propriétés sur `:root`, les niveaux sous `:root[data-motion="calm" | "still"]`, et `still`
imposé sous `prefers-reduced-motion`, même avec un `data-motion` explicite. Toute
`--occ-dur-*` vaut `calc(<ms>ms * var(--occ-tempo))`, toute `--occ-dist-*`
`calc(<px>px * var(--occ-motion-amplitude))`.

| Fichier              | Contenu                                                                                                                                                                                                                                                                                                                                                                                                          |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `motion.ts`          | `motionFrom()` (pur) et `readMotion()` : niveau, amplitude et tempo lus sur la racine ; `durationMs(role, motion)` ; `readNumber()`, `readText()`, `readColor()` (une propriété de rôle résolue par une sonde) et `parseRgb()` ; `easing(css)`, une `cubic-bezier` des tokens en fonction                                                                                                                        |
| `glyphs.ts`          | Les trois alphabets (`lattice`, `stele`, `orbit`) générés et filtrés de façon déterministe (`hash()`, sans aléa) : `alphabet(name)` (famille, clé décodable de 36 glyphes, signe de ponctuation), `cipherGlyph()` (décodable ou ornement), `scrambleGlyph()`, `foldChar()` ; le calendrier pur `settleAt()` / `cellAt()` (décodage et encodage, vrai glyphe montré un pas avant la lettre) et `flickerVariant()` |
| `Cipher.tsx`         | `Glyph`, `CipherText` (le texte réel en `occ-cipher__sr`, les cases lettre + glyphe `aria-hidden`, une horloge par pas qui s'arrête au bout), `CipherFrieze` (rangée ou couronne, frémit seulement en `full`)                                                                                                                                                                                                    |
| `paper.ts`           | Le calendrier de l'inversion : `paperAt()` (étalement, tenue, résorption `dither` / `recede` / `none`), `spreadMs()`, `totalMs()`, `farthestCorner()` ; la zone : `zoneDistances()` (en largeur, dans la zone), `zoneTexels()`, `zoneReach()` ; la projection `project()` / `unproject()` / `diamond()`                                                                                                          |
| `paper-gl.ts`        | `createPaperRenderer()` : le shader WebGL (cercle quantifié au quadrillage, ou zone en texture, trame de Bayer pour la résorption), `null` sans WebGL                                                                                                                                                                                                                                                            |
| `PaperInversion.tsx` | Le calque `aria-hidden` qui joue une `PaperRun` — relancé par sa seule clé, pas par un changement de fusion ou de disparition ; réglages lus dans les tokens au départ ; dernière image redessinée après un redimensionnement (qui vide le canevas) ; aucun dessin si les couleurs de rôle ne se lisent pas ; fondu seul sous `still` ; `onCovered`, `onDone`                                                    |
| `choreography.ts`    | Le coup sur le plateau en fonctions du temps : `hopAt()`, `trailAt()`, `waveDelayMs()`                                                                                                                                                                                                                                                                                                                           |

La page d'aperçus (`previews/Lab.tsx`) pose ses réglages comme le ferait une surcharge :
`data-theme`, `data-motion` et propriétés `--occ-*` sur `<html>`, gardés sous la clé
`occulis.lab` du navigateur. `previews/board-mock.ts` est un plateau factice (ligne de vue
simplifiée), **pas** la règle de `packages/core`.

## La synchronisation vers Claude Design

`.design-sync/` porte la configuration, les aperçus rédigés (`previews/<Nom>.tsx`), les
catégories (`docs/<Nom>.md`), l'en-tête de conventions lu par l'agent de design
(`conventions.md`) et les notes de re-sync (`NOTES.md`). Le convertisseur et sa sortie
(`.ds-sync/`, `ds-bundle/`) sont ignorés par git. La procédure et ses pièges sont dans
`.design-sync/NOTES.md`.

## Tests

69 tests, sous Node : `pnpm --filter @occulis/ui test`.

| Fichier                     | Ce qui est verrouillé                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/tokens.test.ts`        | `generated/tokens.css` et `generated/proposed-tokens.css` identiques à leur source, **tokens proposés absents de la feuille de production**, `lab.css` sans propriété indéfinie ni couleur, rôles colorés en renvois au thème, durées par le tempo et distances par l'amplitude, `still` imposé sous mouvement réduit, boucles de `lab.css` suspendues à `--occ-motion-loop`, `generated/tokens.css` identique à sa source, mêmes propriétés pour chaque thème, `styles.css` sans propriété indéfinie ni couleur en dur, conversion des couleurs, **alpha précomposé pour les courriers**                                                                                                                                                                                                                                                                                                                                      |
| `src/components.test.tsx`   | Rendu serveur de chaque composant sans erreur, icônes sans couleur, raison d'un bouton grisé en infobulle, initiales, onglet et option courants marqués, état vide d'une table, libellé de pagination, **aide et erreur rattachées à leur champ**, **champ de mot de passe reconnaissable et bouton d'affichage qui n'envoie pas**, briques des parcours de compte, **logo Google sans couleur propre**, **réglage en lecture puis éditeur à la place de la valeur, bouton retiré pendant l'édition**, **langue fixée par `UiRoot` (et anglais par défaut)**, compte à rebours proportionnel et urgent, plaques dans la couleur de leur camp, ligne de choix marquée, fenêtre sans croix, **fil de messages : les siens marqués à part, texte échappé, état vide, longueur du champ**, squelette annoncé sans texte visible, **vitrine : code échappé, échantillon modifiable seulement avec `onChange`, lien courant marqué** |
| `src/window-reveal.test.ts` | Ouverture continue d'un point à la fenêtre entière, fermeture jusqu'au point et plus rapide ; départ au pointeur ramené sur les bords, au centre sans pointeur ; rectangle qui contient toujours le point de départ                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `src/lab/lab.test.tsx`      | Clé décodable de glyphes distincts par direction, glyphes dans leur case, pentes du plateau seules au treillis, même lettre même glyphe (accents compris) en décodable, aucun lien stable en ornement, déterminisme ; déchiffrement de gauche à droite, vrai glyphe avant la lettre, pas de brouillage hors `full`, encodage inverse, frise qui ne change jamais en bloc ; lecture des boutons et repli sur une surcharge mal formée, courbes, couleurs ; saut aplati par l'amplitude, aucune rémanence ni retard sous `still` ; papier à vitesse constante, tenue, résorptions, distances dans une zone en U, projection aller-retour ; **texte réel donné au lecteur d'écran**, frise et calque entièrement décoratifs                                                                                                                                                                                                       |
| `src/critical.test.ts`      | **Fond et thème sombre sans variable** (la feuille n'est pas encore là), police pixel déclarée et préchargée, thème posé avant la première image, fondu coupé sous mouvement réduit, aucun préchargement de `/api/*` ni `/match/*` et jamais de `prerender`, **bloc placé après l'encodage et avant toute feuille**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |

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
5. **Aucun texte en dur dans un composant** : un libellé par défaut vient de `useMessages()`,
   donc existe en anglais et en français (`@occulis/i18n`).
6. **Le fond d'une page ne dépend jamais de la feuille.** `criticalHead()` le pose en ligne ;
   une variable `--occ-bg` n'existe qu'une fois la feuille chargée, et la page serait blanche
   jusque-là.
