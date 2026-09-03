# Le moteur de rendu et le client — `apps/web`

Rendu isométrique filaire en dessin procédural : aucun sprite, aucune texture, aucun
moteur 3D. Tout est tracé en traits par `Graphics` de PixiJS 8, à partir des coordonnées
logiques de `packages/core`. Une partie de démonstration est jouable en hot-seat, à la
souris ou au clavier.

## Ce que le client fait, et ne fait pas

**Fait** : projection isométrique avec hauteur, rotation libre du plateau, zoom et
déplacement de la caméra, survol, **sélection d'une pièce au clic et déplacement animé**,
saisie de coups au clavier, occlusion du relief et des pièces, fog of war et fantômes.

**Ne fait pas** : aucun appel réseau. Aucune capture enchaînée à un déplacement (se
déplacer *puis* capturer dans le même tour se tape, ne se clique pas).

## L'organisation des dossiers

Le dossier dit la **classe de dépendance** du module, pas seulement son sujet. C'est ce
qui permet de savoir d'un coup d'œil ce qui est testable sans navigateur.

| Dossier | Contenu | Dépendances |
|---|---|---|
| `view/` | Projection, caméra, désignation, animation | **Aucune** — ni PixiJS, ni DOM |
| `game/` | La partie côté client, la sélection, le scénario | **Aucune** — ni PixiJS, ni DOM |
| `scene/` | Le dessin | PixiJS |
| `input/` | Les gestes sur le canevas | DOM |
| `ui/` | Le panneau HTML | DOM |
| racine | `main.ts` (composition) et `theme.ts` (tokens de DA) | — |

Les dix modules de `view/` et `game/` sont purs : c'est là que vivent tous les tests.

## Le pipeline, de bout en bout

Deux chemins d'entrée convergent sur la même application d'action, puis sur le rendu.

```
  ── GESTES ──────────────────────────────────────────────────────────
  souris / clavier
        │  input/controls.ts   ── seul module qui écoute le canevas
        ├─► view/camera.ts     ── zoomAt / panBy / rotateBy / snapRotation / turn
        ├─► view/picking.ts    ── tileAt() : quelle case est sous le curseur ?
        └─► onPick()           ── au clic, main.ts consulte :
                 game/selection.ts ── resolveClick() → select | play | clear

  ── SAISIE ──────────────────────────────────────────────────────────
  « 1,6 2,5 »
        │  ui/console.ts       ── seul module qui touche le DOM
        └─► ui/command.ts      ── parseCommand() puis toAction()

  ── APPLICATION (main.ts) ───────────────────────────────────────────
        play(action)
        ├─► game/match.ts      ── Match.play() → applyAction() de core
        ├─► view/animation.ts  ── startMove() si la pièce change de case
        └─► handOver()         ── passage de main, DIFFÉRÉ à la fin de l'animation

  ── RENDU (chaque frame) ────────────────────────────────────────────
        ├─► settle()           ── avance l'aimantation de la rotation
        ├─► advance()          ── avance l'animation, handOver() à son terme
        │
        └─► Scene.render()     ── scene/scene.ts
                 ├── root.position ← origin        (pan : simple translation)
                 ├── world   si projection / plateau / vue changés, ou animation en cours
                 └── overlay si survol ou sélection changés, ou projection
```

Le point structurant : **le pan ne reconstruit aucune géométrie** (translation du
conteneur), et **le survol ne reconstruit que la couche `overlay`**.

## Carte des modules

| Fichier | Rôle | Pur ? |
|---|---|---|
| `apps/web/src/main.ts` | Racine de composition : initialise PixiJS, câble tout, lance le ticker | non |
| `apps/web/src/theme.ts` | Tokens de DA — **seul fichier contenant une couleur** | oui |
| `apps/web/src/view/iso.ts` | Projection isométrique et géométrie des cases | oui |
| `apps/web/src/view/camera.ts` | État de caméra et ses transitions | oui |
| `apps/web/src/view/picking.ts` | Point à l'écran → case du plateau | oui |
| `apps/web/src/view/animation.ts` | Interpolation d'un déplacement de pièce | oui |
| `apps/web/src/game/match.ts` | La partie locale et la mémoire de chaque joueur | oui |
| `apps/web/src/game/selection.ts` | Sélection d'une pièce et résolution d'un clic | oui |
| `apps/web/src/game/scenario.ts` | Partie de démonstration — **pas du contenu de jeu** | oui |
| `apps/web/src/scene/scene.ts` | Couches PixiJS et détection de changement | non |
| `apps/web/src/scene/terrain.ts` | Géométrie d'une case | non |
| `apps/web/src/scene/pieces.ts` | Silhouette d'une pièce | non |
| `apps/web/src/scene/overlay.ts` | Survol et sélection | non |
| `apps/web/src/input/controls.ts` | Gestes du canevas → intentions | non |
| `apps/web/src/ui/command.ts` | Grammaire de la saisie de coups | oui |
| `apps/web/src/ui/messages.ts` | Tous les textes de l'interface | oui |
| `apps/web/src/ui/palette.ts` | Passe le code couleur au CSS | non |
| `apps/web/src/ui/console.ts` | Branchement DOM de la saisie et des comptes rendus | non |
| `apps/web/src/ui/console.css` | Mise en page du panneau — **aucune couleur en dur** | — |

---

## `view/iso.ts` — projection et géométrie

Conformément à `docs/design.md` section 8, **rien n'est jamais pivoté au niveau du
rendu** : la rotation est un recalcul appliqué aux coordonnées logiques avant projection.

```ts
interface IsoProjection {
  tileWidth: number;   // largeur d'une case à l'écran, avant zoom
  tileHeight: number;  // hauteur du losange (moitié de tileWidth : projection 2:1)
  heightUnit: number;  // décalage vertical à l'écran d'un niveau de hauteur
  scale: number;       // zoom
  rotation: number;    // radians
  pivot: Coord;        // centre de rotation, en coordonnées logiques
}
```

`scale` vit **dans la projection** et non dans la transformation du conteneur PixiJS :
avec `root.scale`, les traits s'épaissiraient avec le zoom, ce qu'une DA filaire ne
supporte pas. Le coût est une réémission de géométrie pendant l'animation de zoom —
négligeable à cette échelle.

| Fonction | Rôle |
|---|---|
| `rotate()` (privée) | Rotation d'un point logique autour de `pivot`, avant projection |
| `projectXY()` (privée) | Cœur de la projection : logique → écran, hauteur comprise |
| `project()` | Centre projeté d'une case (ou d'un point fractionnaire, en cours d'animation) |
| `tileQuad()` | Les 4 coins projetés de la face supérieure |
| `cliffQuads()` | Les faces verticales, une par arête dominant un voisin plus bas |
| `depthOf()` | Clé de tri du peintre : `{ plane, height }` |
| `compareDepth()` | Comparateur, du plus lointain au plus proche |
| `lerpAngle()` | Interpolation d'angle par le plus court chemin |
| `snapAngle()` | Quart de tour le plus proche |
| `flattenQuad()` | `Quad` → tableau plat pour `Graphics.poly` |

### La projection elle-même

```
écran.x = (rx - ry) × (tileWidth  × scale) / 2
écran.y = (rx + ry) × (tileHeight × scale) / 2  −  height × heightUnit × scale
```

La hauteur est une pure translation verticale : elle ne déforme jamais la case. Les
coordonnées passées peuvent être **fractionnaires** — c'est ce qui permet de dessiner une
pièce entre deux cases pendant une animation.

### `tileQuad()` — pourquoi les quatre coins sont projetés séparément

Le point le plus important du module. Une implémentation naïve dessine chaque case comme
un losange à décalages fixes autour de son centre projeté. Cela ne fonctionne **qu'aux
multiples de 90°** : seuls les centres tournent, la forme reste figée, et le pavage se
déchire dès qu'on s'écarte d'un angle droit.

`tileQuad()` projette individuellement les quatre coins logiques (`x ± 0,5`, `y ± 0,5`) à
travers la même chaîne `rotate` → projection. La grille étant l'image affine d'un
quadrillage carré, elle reste **jointive à n'importe quel angle**.

L'ordre des coins fait contrat avec `cliffQuads()` :

| Indice | Coin | Arête sortante | Voisin de l'autre côté |
|---|---|---|---|
| 0 | `(x−0,5, y−0,5)` | 0 → 1 | `(x, y−1)` |
| 1 | `(x+0,5, y−0,5)` | 1 → 2 | `(x+1, y)` |
| 2 | `(x+0,5, y+0,5)` | 2 → 3 | `(x, y+1)` |
| 3 | `(x−0,5, y+0,5)` | 3 → 0 | `(x−1, y)` |

Porté par les constantes privées `CORNERS` et `EDGE_NEIGHBOURS`, volontairement dans le
même fichier : c'est là le vrai risque de désynchronisation.

### `cliffQuads()` et l'ordre du peintre

`cliffQuads()` n'émet une face verticale que si la case **domine** son voisin : deux cases
de même hauteur ne produisent aucune arête interne, et le filaire garde une silhouette
nette au lieu de devenir un maillage.

`depthOf()` renvoie `{ plane, height }` où `plane = rx + ry` après rotation.
`compareDepth()` trie d'abord par `plane`, puis par `height` : à profondeur égale, les
cases basses se dessinent avant les hautes.

---

## `view/camera.ts` — état de caméra

```ts
interface Camera {
  scale: number;
  pan: ScreenPoint;         // décalage utilisateur par rapport au centre du canevas
  rotation: number;
  targetRotation: number;   // angle visé par l'aimantation
  viewport: ScreenPoint;
  pivot: Coord;
}
```

| Fonction | Rôle |
|---|---|
| `pivotOf()` | Centre logique du plateau, par balayage de `board.allTiles()` |
| `createCamera()` | Caméra initiale : échelle 1, pan nul, rotation nulle |
| `originOf()` | Origine écran de la projection = centre du canevas + pan |
| `toProjectionSpace()` | Point écran → espace de projection (retire l'origine) |
| `toProjection()` | Caméra → `IsoProjection`, en y injectant `METRICS` |
| `withViewport()` | Nouvelle taille de canevas (redimensionnement) |
| `zoomAt()` | Zoom vers un point écran, avec bornes |
| `panBy()` | Déplacement de la vue |
| `rotateBy()` | Rotation libre ; la cible suit l'angle courant |
| `snapRotation()` | Vise le quart de tour le plus proche |
| `turn()` | Vise le quart de tour voisin (flèches) |
| `settle()` | Avance l'interpolation vers `targetRotation` |

### `zoomAt()` — pourquoi le point sous le curseur ne bouge pas

L'espace de projection est linéaire en `scale`. Si le point sous le curseur est à `p` et
que l'échelle passe de `s` à `s'`, le pan absorbe exactement la différence :

```
pan' = pan + p × (1 − s'/s)
```

`zoomAt()` renvoie **la même caméra par identité** quand la borne est atteinte.

### `settle()`

Interpole vers `targetRotation` sur `SETTLE_MS` (120 ms), puis **cale exactement** l'angle
sous `SETTLE_EPSILON` (1e-4) — sans quoi l'interpolation, asymptotique, réémettrait la
géométrie indéfiniment pour un écart invisible.

Constantes : `MIN_SCALE` 0,35 · `MAX_SCALE` 3 · `ZOOM_STEP` 1,12 ·
`RADIANS_PER_PIXEL` 0,008 · `SETTLE_MS` 120 · `SETTLE_EPSILON` 1e-4.

---

## `view/picking.ts` — quelle case est sous le curseur

| Fonction | Rôle |
|---|---|
| `containsPoint()` (privée) | Point dans un quadrilatère convexe, par signe des produits vectoriels |
| `tileAt()` | Point en espace de projection → `Coord` ou `undefined` |

**Pas de projection inverse analytique.** Inverser la matrice isométrique donnerait la
case du *sol* sous le curseur, ce qui est faux dès qu'un relief se dresse devant.
`tileAt()` parcourt donc les cases **de la plus proche à la plus lointaine** — l'ordre du
peintre inversé — et teste la face supérieure puis les falaises. La première touchée
gagne. Sert au survol comme au clic.

---

## `view/animation.ts` — le déplacement interpolé

Module pur. **L'action est appliquée à l'état immédiatement** ; seule la position à
l'écran est interpolée. L'animation n'est donc jamais une source de vérité, et
l'interrompre ne peut pas désynchroniser la partie.

```ts
interface MoveAnimation {
  pieceId: PieceId;
  from: Coord; to: Coord;
  fromHeight: number; toHeight: number;
  duration: number; elapsed: number;
}
```

| Fonction | Rôle |
|---|---|
| `startMove()` | Construit l'animation ; relève les hauteurs de départ et d'arrivée |
| `advance()` | Avance le temps écoulé ; **`undefined` une fois terminée** |
| `easeInOutCubic()` (privée) | Départ et arrivée adoucis |
| `positionOf()` | Position intermédiaire : `coord` **fractionnaire** et hauteur interpolée |

La durée croît avec la distance mais **pas proportionnellement** :
`min(420, 90 + 55 × distance)` — au-delà de quelques cases, l'attente deviendrait pénible.

La hauteur est interpolée en même temps que la position : une pièce qui grimpe monte
pendant qu'elle avance, au lieu de sauter à l'arrivée.

---

## `game/match.ts` — la partie locale

Module pur. **Il tient exactement ce que le futur Durable Object tiendra** — l'état réel
et les deux `PlayerKnowledge` — et n'expose vers le rendu que des `PlayerView`
(`docs/architecture.md` section 2). Câbler le serveur reviendra à remplacer cette classe
par un transport, **sans toucher au reste du client**.

| Membre | Rôle |
|---|---|
| `Match` (constructeur) | Prend un `GameState` et initialise les deux mémoires |
| `state` / `board` / `activePlayer` / `isOver` | Accès en lecture |
| `pieceAt()` | La pièce sur une case — résolution coordonnée → pièce |
| `viewFor()` | La `PlayerView` d'un joueur, **mise en cache** |
| `play()` | Applique une action ; l'état ne bouge pas si elle est refusée |

**Le cache de vues n'est pas une optimisation, c'est une nécessité.** `Scene.render()` ne
redessine que si la vue a changé **d'identité de référence** : les vues doivent donc être
stables entre deux actions. `play()` vide le cache, rien d'autre ne le fait.

---

## `game/selection.ts` — sélection et clic

Module pur. **Rien n'y est recalculé de ce que `core` sait déjà** : les possibilités sont
filtrées depuis `legalActions()`, jamais redéduites. L'interface ne peut donc pas proposer
un coup que `applyAction()` refuserait, ni en oublier un. Un test vérifie explicitement
que toute destination affichée est applicable.

```ts
interface Selection {
  piece: Piece;
  moves:   ReadonlyMap<CoordKey, Coord>;    // cases où se rendre
  strikes: ReadonlyMap<CoordKey, PieceId>;  // adversaires frappables sans bouger
}

type ClickOutcome =
  | { kind: "select"; selection: Selection }
  | { kind: "play";   action: Action }
  | { kind: "clear" }
```

| Fonction | Rôle |
|---|---|
| `selectionFor()` | Ce qu'une pièce peut faire ce tour-ci, filtré depuis `legalActions()` |
| `resolveClick()` | Ce qu'un clic doit produire. **Fonction totale et sans effet** |

### La machine à états, telle que `resolveClick()` l'encode

| Situation | Résultat |
|---|---|
| Clic hors plateau, ou partie terminée | `clear` |
| Sélection active, clic sur la pièce elle-même | `clear` — recliquer désélectionne |
| Sélection active, clic sur une destination | `play` d'un déplacement |
| Sélection active, clic sur un adversaire frappable | `play` d'une frappe **sur place** |
| Clic sur une de ses pièces, à son tour | `select` |
| Tout le reste | `clear` |

Deux limites assumées : on ne sélectionne que ses propres pièces **et seulement à son
tour** ; et seule la frappe *sur place* est cliquable — se déplacer puis capturer
demanderait de désigner deux cases, ce qui n'est pas câblé (la saisie clavier le permet).

Pour une frappe, l'action produite porte `to` = la case de la pièce elle-même : c'est la
forme qu'attend `core` (`docs/implementation-notes.md` point 2).

---

## `ui/command.ts` — la grammaire de saisie

Module pur : la résolution d'une coordonnée en pièce lui est **fournie**.

```
  1,6 2,5        déplace la pièce en (1,6) vers (2,5)
  1,6 > 2,5      identique : la flèche est facultative
  1,6 2,5 x 3,5  se déplace en (2,5) puis capture la pièce en (3,5)
  1,6 x 1,5      frappe un adjacent sans bouger
  abandon        abandonne la partie
```

| Fonction | Rôle |
|---|---|
| `tokenize()` (privée) | Normalise séparateurs et espaces ; isole le `x` de capture |
| `parseCoord()` (privée) | `"1,6"` → `Coord` |
| `parseCommand()` | Texte → `Result<Command, CommandFault>` — syntaxe seule |
| `toAction()` | `Command` → `Action`, en résolvant les coordonnées |

**`toAction()` est le seul endroit du client où les coordonnées du joueur rejoignent les
identifiants de pièces de `core`** — `core` raisonne en `PieceId`, le joueur en cases.
`CommandFault` couvre les fautes de saisie ; les refus de règle restent des `ActionError`
de `core`.

---

## `ui/messages.ts` — tous les textes

| Fonction | Rôle |
|---|---|
| `formatCoord()` | `Coord` → `"(x,y)"` |
| `describeFault()` | Faute de saisie → phrase |
| `describeActionError()` | `ActionError` de `core` → phrase |
| `describeMove()` | Compte rendu d'un coup joué |
| `describeOutcome()` | Fin de partie |
| `describeTurn()` | Ligne d'état : tour, joueur au trait, point de vue |
| `describeTile()` | Lecture d'une case désignée au clic |

`describeTile()` rend `"1,6 · hauteur 0"`, avec `· infranchissable` le cas échéant. La
coordonnée est écrite **sans parenthèses, sous la forme qu'attend la saisie** : recopiable
telle quelle. Elle ne rapporte **que du terrain** — le relief est public
(`docs/implementation-notes.md` point 10), mais annoncer la pièce présente divulguerait
une position hors LOS. Un test le verrouille.

---

## `ui/palette.ts` et `ui/console.ts`

`applyPalette()` convertit les tokens entiers de `theme.ts` en propriétés personnalisées
CSS (`--ink`, `--ink-soft`, `--ink-faint`, `--panel`, `--accepted`, `--refused`). **Aucune
couleur n'est réécrite en dur dans `console.css`.**

`ui/console.ts` est le seul module de l'interface à toucher le DOM.

| Fonction | Rôle |
|---|---|
| `attachConsole()` | Installe le formulaire et rend un `GameConsole` |
| `refresh()` (interne) | Réécrit la ligne d'état |
| `showTile()` (interne) | Écrit la lecture d'une case désignée au clic |
| `report()` (interne) | Écrit un compte rendu et son état `ok`/`ko` |
| `playAction()` (interne) | Joue une action **et la rapporte** ; rend `true` si acceptée |
| `submit()` (interne) | Analyse la saisie, puis délègue à `playAction()` |

**L'application d'une action lui est fournie (`play`), pas prise sur `Match`.** C'est
l'appelant qui décide ce qu'un coup déclenche — animation, passage de main — et ce module
n'en sait rien. C'est aussi ce qui fait qu'un coup cliqué et un coup tapé sont rapportés
exactement de la même façon : `main.ts` appelle `gameConsole.playAction()` pour le clic.

`GameConsole` expose `refresh()`, `showTile()` et `playAction()`.

Un détail qui compte : `playAction()` compose son résumé **avant** de jouer, car dans
l'état suivant la pièce déplacée n'est plus à sa place et la capturée n'existe plus.

---

## `input/controls.ts` — les gestes du canevas

Seul module du client qui écoute le canevas. Il ne dessine rien et ne détient aucun état
de rendu.

| Geste | Effet |
|---|---|
| Molette | `zoomAt()` vers le curseur. Seul le **signe** de `deltaY` est lu — sa valeur dépend de `deltaMode` et du périphérique |
| Drag bouton gauche | `panBy()` |
| **Clic bouton gauche** | `pickTile()` → `onPick()` : sélection, déplacement, ou lecture de case |
| Drag bouton droit ou milieu | `rotateBy()`, puis `snapRotation()` au relâchement |
| Mouvement de souris | Survol. **Ne notifie que si la case change** |
| Sortie du curseur | Efface le survol |
| Flèches ← → | `turn()` : quart de tour |
| Espace | Bascule le point de vue A / B |

| Fonction | Rôle |
|---|---|
| `attachControls()` | Installe tous les écouteurs |
| `dragKindOf()` (privée) | Bouton → `"pan"` \| `"rotate"` \| rien |
| `isTyping()` (privée) | La cible de l'événement est-elle un champ de saisie |
| `sameCoord()` (privée) | Comparaison de survol tolérante à `undefined` |

### Clic contre glissé

Un pan et un clic partent du **même bouton**. `Drag` accumule donc le déplacement dans
`travelled`, et `endDrag()` ne déclenche `onPick()` que si ce total reste sous
`CLICK_SLOP` (4 px). Sans ce seuil, la moindre tremblote annulerait la désignation ; sans
l'accumulation, un aller-retour de 200 px reviendrait au point de départ et passerait pour
un clic.

### Les raccourcis clavier et la saisie

Les raccourcis sont posés sur `window` pour rester actifs hors du canevas. `isTyping()`
les efface devant une saisie en cours — sans quoi une espace tapée dans le champ de
commande changerait de point de vue.

---

## `scene/scene.ts` — couches, tri et animation

**Deux couches, et deux seulement.**

- **`world`** réunit terrain et pièces. Elles doivent partager un **unique ordre du
  peintre** pour qu'une pièce derrière un relief soit réellement masquée.
- **`overlay`** porte survol et sélection, dessinés par-dessus.

| Fonction | Rôle |
|---|---|
| `Scene.render()` | Positionne le conteneur, décide quelle couche réémettre |
| `Scene.drawWorld()` (privée) | Terrain et pièces triés ensemble par profondeur |
| `Scene.drawOverlay()` (privée) | Sélection puis survol |
| `sameProjection()` (privée) | Compare champ à champ deux `IsoProjection` |
| `sameHover()` (privée) | Compare deux survols, `undefined` compris |
| `occupantsOf()` (privée) | `PlayerView` → identité, case, couleur et opacité par occupant |
| `isTile()` (privée) | Discrimine les deux formes de `Drawable` |

### Conditions de réémission

- **`world`** : projection changée (rotation ou zoom), `Board` ou `PlayerView` changés
  **par identité de référence** — d'où le cache de vues de `Match` — **ou animation en
  cours**. Une pièce qui glisse change de position à chaque image.
- **`overlay`** : survol changé, sélection changée (par identité), ou projection.
- **Le pan ne déclenche rien** : il n'affecte que `root.position`.

### La liste unique de `Drawable`

Cases et pièces sont poussées dans **un seul tableau**, puis triées ensemble par
`compareDepth()`. Les cases sont poussées en premier : le tri de JavaScript étant stable,
à profondeur égale une pièce se dessine donc toujours **après** la case qui la porte.

C'est ce qui rend l'animation possible. Une pièce en mouvement n'est plus attachée à une
case : sa position est celle que renvoie `positionOf()`, **fractionnaire**, et sa
profondeur est calculée depuis cette position. Elle se glisse donc d'elle-même à la bonne
place dans l'ordre du peintre au fil de son déplacement, et passe correctement derrière
puis devant les reliefs qu'elle croise.

`occupantsOf()` insère les fantômes **avant** les pièces réellement vues, pour qu'une
pièce présente l'emporte sur un souvenir situé sur la même case.

---

## `scene/terrain.ts`, `scene/pieces.ts`, `scene/overlay.ts`

Ce sont des **fonctions**, pas des classes : elles écrivent dans un `Graphics` qu'on leur
passe. C'est précisément ce qui permet à `scene.ts` de tout entrelacer dans un seul ordre
du peintre.

| Fonction | Emplacement | Rôle |
|---|---|---|
| `drawTile()` | `scene/terrain.ts` | Falaises puis face supérieure d'une case |
| `depthAlpha()` (privée) | `scene/terrain.ts` | Proximité normalisée → opacité |
| `drawPiece()` | `scene/pieces.ts` | Tige verticale + tête en losange |
| `markTile()` (privée) | `scene/overlay.ts` | Aplat + contour d'une case, falaises en option |
| `drawHover()` | `scene/overlay.ts` | Surbrillance de la case survolée |
| `drawSelection()` | `scene/overlay.ts` | Destinations, cibles frappables, puis la pièce |

L'opacité d'une case est le produit de trois facteurs, dans `drawTile()` :

```
alpha = (visible ? alphaVisible : alphaFogged)
      × (passable ? 1 : impassableFactor)
      × depthAlpha(proximité)
```

`drawSelection()` dessine dans l'ordre : destinations, cibles frappables, **puis** la case
d'origine — pour que celle-ci reste lisible quand des destinations la jouxtent.

`drawPiece()` dérive ses proportions de la projection, ce qui la fait suivre le zoom sans
réglage séparé. Aucun type de `packages/core/src/pieces/` ne porte de champ visuel : la
correspondance `kind` → forme appartient donc à ce module. Le roster n'étant pas acté,
**toutes les pièces partagent aujourd'hui la même silhouette**.

---

## `theme.ts` — le code couleur

Code couleur acté dans `docs/design.md` section 8.1, **provisoire** :

> Le blanc porte la géométrie, la couleur porte l'état de jeu.

| Groupe | Contenu |
|---|---|
| `BACKGROUND` | Fond du canevas — dupliqué dans `index.html`, à synchroniser à la main |
| `METRICS` | `tileWidth` 72, `tileHeight` 36, `heightUnit` 22 |
| `GEOMETRY` | Trait du terrain : opacités visible/fog/infranchissable, atténuation en profondeur, épaisseurs, remplissage |
| `HOVER` | Aplat et contour de la case survolée |
| `PLAYERS` | Couleurs de camp A et B — **provisoires** |
| `STATE` | `selection`, `legalMove`, `threat` consommés ; `climb` réservé |
| `SELECTION` | Couleurs, épaisseurs et opacités du marquage de sélection |
| `PIECES` | Opacités visible/fantôme, épaisseur, proportions de la silhouette |

`STATE.legalMove` est **délibérément distinct des deux couleurs de camp** : une case mise
en avant ne doit jamais se confondre avec une pièce.

Le rendu est **filaire par défaut** : `GEOMETRY.fillAlpha` vaut 0. La géométrie des faces
est pourtant bien émise et triée — repasser à des faces opaques ne demande que de relever
cette seule valeur.

### La règle est mécanique, pas conventionnelle

`eslint.config.js` interdit tout littéral de couleur dans `apps/web/src/**/*.ts`, avec une
exception unique pour `theme.ts`. Deux sélecteurs `no-restricted-syntax` couvrent
`0xffffff` (par le `raw`) et `"#ffffff"` (par la valeur). Le CSS échappe à ESLint : c'est
`ui/palette.ts` qui l'y soumet en pratique.

---

## `main.ts` — la racine de composition

| Fonction | Rôle |
|---|---|
| `main()` | Initialise PixiJS, construit `Match` et `Scene`, câble tout, lance le ticker |
| `element()` | Résout un `id` du DOM ou lève |
| `look()` (interne) | Change de point de vue et recalcule la vue rendue |
| `handOver()` (interne) | Passage de main : bascule la vue et rafraîchit la ligne d'état |
| `play()` (interne) | **Le seul point d'application d'une action**, clic comme clavier |

### `play()` et le passage de main différé

`play()` lit la pièce et la destination **avant** d'appliquer — ensuite la pièce n'est plus
à sa place de départ — puis :

- si la pièce change de case, démarre l'animation et **ne passe pas la main** ;
- sinon (frappe sur place, abandon), appelle `handOver()` immédiatement.

Le passage de main est différé jusqu'à la fin de l'animation, dans le ticker. **Basculer la
vue tout de suite ferait disparaître en plein vol la pièce qui se déplace** : elle
deviendrait adverse, et se trouverait peut-être hors de la ligne de vue du joueur suivant.

La partie se joue en **hot-seat** : la vue suit le joueur au trait, et la barre d'espace
permet de regarder le plateau avec les yeux de l'autre camp (`docs/design.md` 5.4).

---

## `index.html` et `ui/console.css`

La saisie est **en HTML et non dessinée dans le canevas** : aucun design system n'est acté
(`docs/design.md` 8.1), et une entrée texte native donne gratuitement le focus, la
sélection et l'historique du champ.

| Élément | Rôle |
|---|---|
| `#app` | Hôte du canevas PixiJS |
| `#console` | Le panneau, dont `applyPalette()` porte les variables de couleur |
| `#status` | Ligne d'état : tour, joueur au trait, point de vue |
| `#tile-readout` | Lecture de la case désignée au clic |
| `#command-form` / `#command-input` | La saisie |
| `#command-log` | Compte rendu, coloré par `data-state="ok"` ou `"ko"` |
| `#command-help` | Rappel de la grammaire |

---

## Invariants à ne pas casser

1. **Rien n'est pivoté au niveau du rendu.** Faire tourner un `Container` PixiJS
   produirait des traits crénelés et casserait la cohérence du dessin procédural.
2. **`tileQuad()` projette les quatre coins.** Revenir à un losange à décalages fixes
   ferait réapparaître la déchirure du pavage hors des multiples de 90°.
3. **L'ordre de `CORNERS` et `EDGE_NEIGHBOURS` fait contrat.**
4. **Terrain et pièces sont triés ensemble**, dans une seule liste et une seule couche.
   Les séparer réintroduit les pièces dessinées par-dessus les murs et rend l'animation
   impossible à ordonner correctement.
5. **`scale` reste dans la projection**, jamais dans `root.scale`.
6. **`theme.ts` reste le seul détenteur des couleurs**, CSS compris — via `palette.ts`.
7. **`Match.viewFor()` doit rendre des vues stables** entre deux actions.
8. **L'animation n'est jamais une source de vérité.** L'état est appliqué immédiatement ;
   l'interrompre ou la sauter doit rester sans conséquence sur la partie.
9. **Le passage de main attend la fin de l'animation.**
10. **La sélection filtre `legalActions()`, elle ne redéduit rien.** Recalculer la légalité
    dans l'interface la ferait diverger de `applyAction()`.
11. **Rien de ce qui est hors LOS ne doit apparaître dans l'interface.**
12. **`view/` et `game/` restent purs.** Y importer PixiJS ou le DOM rendrait leurs tests
    impossibles sans navigateur.

## Tests

67 tests, sous Node, sans navigateur : `pnpm test` (ou `pnpm --filter @occulis/web test`).

| Fichier | Ce qui est verrouillé |
|---|---|
| `apps/web/src/view/iso.test.ts` | Pavage jointif à angle quelconque, hauteur sans déformation, falaises émises seulement sur rupture, ordre du peintre, chemin court d'angle, aimantation |
| `apps/web/src/view/camera.test.ts` | Le point sous le curseur reste immobile au zoom, bornes d'échelle, convergence exacte de l'aimantation |
| `apps/web/src/view/picking.test.ts` | Chaque case retrouvée depuis son centre à plusieurs angles et échelles, priorité au relief au premier plan, désignation par la falaise |
| `apps/web/src/view/animation.test.ts` | Hauteurs relevées au départ, durée croissante mais bornée, interpolation conjointe position/hauteur, progression monotone, terminaison |
| `apps/web/src/game/match.test.ts` | Vue initiale par camp, **stabilité de la vue** entre deux coups, renouvellement après un coup accepté, état intact après un refus, mémoire fantôme |
| `apps/web/src/game/selection.test.ts` | **Toute destination affichée est applicable par `core`**, exclusion des cases occupées, frappe sur place, machine à états complète de `resolveClick` |
| `apps/web/src/ui/command.test.ts` | Grammaire complète et résolution coordonnée → pièce |
| `apps/web/src/ui/messages.test.ts` | `describeTile()`, dont l'absence de fuite d'information sur les pièces |

## Non implémenté

- **Aucun appel réseau** — voir « L'état réel du câblage » dans [README.md](README.md).
- **Aucune capture enchaînée à un déplacement au clic** : se déplacer puis capturer dans
  le même tour demande la saisie clavier (`1,6 2,5 x 3,5`).
- **Aucun marquage des montées.** `MoveOption.kind` distingue `walk` de `climb` — grimper
  consomme le tour entier — et `STATE.climb` est déjà un token, mais `selectionFor()`
  filtre `legalActions()`, qui ne porte pas cette distinction.
- **Aucune animation de capture** : la pièce prise disparaît d'un coup.
- **Aucune différenciation visuelle** entre types de pièces.
- **Aucun historique de saisie** dans le champ de commande.
