# Le moteur de rendu et le client — `apps/web`

Rendu isométrique filaire en dessin procédural : aucun sprite, aucune texture, aucun
moteur 3D. Tout est tracé en traits par `Graphics` de PixiJS 8, à partir des coordonnées
logiques de `packages/core`. Une partie de démonstration est jouable en hot-seat par
saisie de coordonnées.

## Ce que le client fait, et ne fait pas

**Fait** : projection isométrique avec hauteur, rotation libre du plateau, zoom et
déplacement de la caméra, désignation de la case sous la souris au survol **et au clic**,
occlusion du relief et des pièces, affichage du fog of war et des fantômes, et une partie
locale jouable au clavier (`1,6 2,5`) avec mémoire de fog par camp.

**Ne fait pas** : aucun appel réseau. Aucune sélection de pièce à la souris, aucun
affichage des coups légaux — le clic **désigne** une case, il ne joue pas.

## Le pipeline, de bout en bout

Deux chemins indépendants convergent sur le rendu.

```
  ── CAMÉRA ET DÉSIGNATION ──────────────────────────────────────────
  événement souris/clavier
        │  controls.ts       ── seul module qui écoute le canevas
        ├─► camera.ts        ── zoomAt / panBy / rotateBy / snapRotation / turn
        ├─► picking.ts       ── tileAt() : quelle case est sous le curseur ?
        └─► onPick()         ── au clic : la case est rapportée à la console

  ── PARTIE ─────────────────────────────────────────────────────────
  saisie « 1,6 2,5 »
        │  ui/console.ts     ── seul module qui touche le DOM
        ├─► ui/command.ts    ── parseCommand() puis toAction()
        ├─► match.ts         ── Match.play() → applyAction() de core
        └─► ui/messages.ts   ── le compte rendu affiché

  ── RENDU (chaque frame, main.ts) ───────────────────────────────────
        ├─► settle()         ── avance l'aimantation de la rotation
        ├─► toProjection()   ── caméra → IsoProjection
        ├─► originOf()       ── caméra → position du conteneur à l'écran
        │
        └─► Scene.render()   ── scene.ts
                 ├── root.position ← origin          (pan : simple translation)
                 ├── si la projection/le plateau/la vue ont changé → drawWorld()
                 │        tuiles triées par profondeur, et pour chacune :
                 │        drawTile()  (draw/terrain.ts) puis drawPiece() (draw/pieces.ts)
                 └── si la case survolée a changé      → drawOverlay()
                          drawHover() (draw/overlay.ts)
```

Le point structurant : **le pan ne reconstruit aucune géométrie** (c'est une translation
du conteneur), et **le survol ne reconstruit que la couche `overlay`**. Seuls la rotation,
le zoom, un changement de plateau ou de vue provoquent une réémission du monde.

## Carte des modules

| Fichier | Rôle | Pur ? |
|---|---|---|
| `apps/web/src/main.ts` | Racine de composition : initialise PixiJS, câble les modules, lance le ticker | non (PixiJS, DOM) |
| `apps/web/src/theme.ts` | Tokens de direction artistique — **seul fichier contenant une couleur** | oui |
| `apps/web/src/iso.ts` | Projection isométrique et géométrie des cases | oui |
| `apps/web/src/camera.ts` | État de caméra et ses transitions | oui |
| `apps/web/src/picking.ts` | Point à l'écran → case du plateau | oui |
| `apps/web/src/match.ts` | La partie locale et la mémoire de chaque joueur | oui |
| `apps/web/src/ui/command.ts` | Grammaire de la saisie de coups | oui |
| `apps/web/src/ui/messages.ts` | Tous les textes de l'interface | oui |
| `apps/web/src/ui/palette.ts` | Passe le code couleur au CSS | non (DOM) |
| `apps/web/src/ui/console.ts` | Branchement DOM de la saisie et des comptes rendus | non (DOM) |
| `apps/web/src/ui/console.css` | Mise en page de la console — **aucune couleur en dur** | — |
| `apps/web/src/controls.ts` | Événements souris/clavier du canevas → intentions | non (DOM) |
| `apps/web/src/scene.ts` | Couches PixiJS et détection de changement | non (PixiJS) |
| `apps/web/src/draw/terrain.ts` | Géométrie d'une case | non (PixiJS) |
| `apps/web/src/draw/pieces.ts` | Silhouette d'une pièce | non (PixiJS) |
| `apps/web/src/draw/overlay.ts` | Surbrillance de survol | non (PixiJS) |
| `apps/web/src/scenario.ts` | Partie de démonstration — **pas du contenu de jeu** | oui |

Six modules purs (`theme`, `iso`, `camera`, `picking`, `match`, `ui/command`,
`ui/messages`) n'importent ni PixiJS ni le DOM : c'est ce qui les rend testables sans
navigateur. **`ui/console.ts` est le seul module à toucher le DOM, `controls.ts` le seul à
écouter le canevas.**

---

## `iso.ts` — projection et géométrie

Conformément à `docs/design.md` section 8, **rien n'est jamais pivoté au niveau du
rendu** : la rotation est un recalcul appliqué aux coordonnées logiques avant projection.
C'est ce qui garde le dessin en traits net à tout angle.

### Le type central

```ts
interface IsoProjection {
  tileWidth: number;   // largeur d'une case à l'écran, avant zoom
  tileHeight: number;  // hauteur du losange à l'écran (moitié de tileWidth : projection 2:1)
  heightUnit: number;  // décalage vertical à l'écran d'un niveau de hauteur
  scale: number;       // zoom
  rotation: number;    // radians
  pivot: Coord;        // centre de rotation, en coordonnées logiques
}
```

`scale` vit **dans la projection** et non dans la transformation du conteneur PixiJS.
C'est délibéré : avec `root.scale`, les traits s'épaissiraient avec le zoom, ce qu'une DA
filaire ne supporte pas. En passant par la projection, les épaisseurs restent aux valeurs
des tokens à tout niveau de zoom. Le coût est une réémission de géométrie pendant
l'animation de zoom — négligeable à cette échelle.

### Fonctions

| Fonction | Emplacement | Rôle |
|---|---|---|
| `rotate()` (privée) | `apps/web/src/iso.ts` | Rotation d'un point logique autour de `pivot`, avant projection |
| `projectXY()` (privée) | `apps/web/src/iso.ts` | Cœur de la projection : logique → écran, hauteur comprise |
| `project()` | `apps/web/src/iso.ts` | Centre projeté d'une case, au sommet de son relief |
| `tileQuad()` | `apps/web/src/iso.ts` | Les 4 coins projetés de la face supérieure |
| `cliffQuads()` | `apps/web/src/iso.ts` | Les faces verticales, une par arête dominant un voisin plus bas |
| `depthOf()` | `apps/web/src/iso.ts` | Clé de tri du peintre : `{ plane, height }` |
| `compareDepth()` | `apps/web/src/iso.ts` | Comparateur, du plus lointain au plus proche |
| `lerpAngle()` | `apps/web/src/iso.ts` | Interpolation d'angle par le plus court chemin |
| `snapAngle()` | `apps/web/src/iso.ts` | Quart de tour le plus proche |
| `flattenQuad()` | `apps/web/src/iso.ts` | `Quad` → tableau plat pour `Graphics.poly` |

### La projection elle-même

`projectXY(x, y, height, proj)` fait deux choses dans cet ordre :

1. `rotate()` fait tourner `(x, y)` autour de `proj.pivot` — en **coordonnées logiques**.
2. La transformation isométrique 2:1 envoie le résultat à l'écran :

```
écran.x = (rx - ry) × (tileWidth  × scale) / 2
écran.y = (rx + ry) × (tileHeight × scale) / 2  −  height × heightUnit × scale
```

La hauteur est donc une pure translation verticale à l'écran : elle ne déforme jamais la
case.

### `tileQuad()` — pourquoi les quatre coins sont projetés séparément

C'est le point le plus important du module. Une implémentation naïve dessine chaque case
comme un losange à décalages fixes autour de son centre projeté (`±tileWidth/2`,
`±tileHeight/2`). Cela ne fonctionne **qu'aux multiples de 90°** : seuls les centres
tournent, la forme des cases reste figée, et le pavage se déchire dès qu'on s'écarte d'un
angle droit — trous et recouvrements.

`tileQuad()` projette individuellement les quatre coins logiques de la case
(`x ± 0,5`, `y ± 0,5`) à travers la même chaîne `rotate` → projection. La grille étant
l'image affine d'un quadrillage carré, elle reste **jointive à n'importe quel angle**.
C'est ce qui rend la rotation libre possible.

L'ordre des coins est fixe et fait contrat avec `cliffQuads()` :

| Indice | Coin | Arête sortante | Voisin de l'autre côté |
|---|---|---|---|
| 0 | `(x−0,5, y−0,5)` | 0 → 1 | `(x, y−1)` |
| 1 | `(x+0,5, y−0,5)` | 1 → 2 | `(x+1, y)` |
| 2 | `(x+0,5, y+0,5)` | 2 → 3 | `(x, y+1)` |
| 3 | `(x−0,5, y+0,5)` | 3 → 0 | `(x−1, y)` |

Cette correspondance est portée par les constantes privées `CORNERS` et `EDGE_NEIGHBOURS`,
volontairement dans le même fichier : c'est là le vrai risque de désynchronisation.

### `cliffQuads()` — ne dessiner que les vraies ruptures

Pour chaque arête, la fonction lit la hauteur du voisin (`board.heightAt()`, `0` si
hors-carte) et n'émet une face verticale que si la case **domine** ce voisin. Deux cases de
même hauteur ne produisent donc aucune arête interne : le filaire garde une silhouette
nette au lieu de devenir un maillage.

### `depthOf()` / `compareDepth()` — l'ordre du peintre

`depthOf()` renvoie `{ plane, height }` où `plane = rx + ry` après rotation. Le
comparateur trie d'abord par `plane` (profondeur dans le plan du damier), puis par
`height` : à profondeur égale, les cases basses se dessinent avant les hautes, pour que
les falaises recouvrent correctement leur voisinage.

---

## `camera.ts` — état de caméra

Module pur, sans PixiJS ni DOM.

```ts
interface Camera {
  scale: number;
  pan: ScreenPoint;         // décalage utilisateur par rapport au centre du canevas
  rotation: number;
  targetRotation: number;   // angle visé par l'aimantation
  viewport: ScreenPoint;    // taille du canevas
  pivot: Coord;
}
```

| Fonction | Emplacement | Rôle |
|---|---|---|
| `pivotOf()` | `apps/web/src/camera.ts` | Centre logique du plateau, par balayage de `board.allTiles()` |
| `createCamera()` | `apps/web/src/camera.ts` | Caméra initiale : échelle 1, pan nul, rotation nulle |
| `originOf()` | `apps/web/src/camera.ts` | Origine écran de la projection = centre du canevas + pan |
| `toProjectionSpace()` | `apps/web/src/camera.ts` | Point écran → espace de projection (retire l'origine) |
| `toProjection()` | `apps/web/src/camera.ts` | Caméra → `IsoProjection`, en y injectant `METRICS` |
| `withViewport()` | `apps/web/src/camera.ts` | Nouvelle taille de canevas (redimensionnement de fenêtre) |
| `zoomAt()` | `apps/web/src/camera.ts` | Zoom vers un point écran, avec bornes |
| `panBy()` | `apps/web/src/camera.ts` | Déplacement de la vue |
| `rotateBy()` | `apps/web/src/camera.ts` | Rotation libre ; la cible suit l'angle courant |
| `snapRotation()` | `apps/web/src/camera.ts` | Vise le quart de tour le plus proche |
| `turn()` | `apps/web/src/camera.ts` | Vise le quart de tour voisin (flèches) |
| `settle()` | `apps/web/src/camera.ts` | Avance l'interpolation vers `targetRotation` |

### `zoomAt()` — pourquoi le point sous le curseur ne bouge pas

L'espace de projection est linéaire en `scale`. Si le point sous le curseur est à
`p` dans cet espace et que l'échelle passe de `s` à `s'`, il se retrouverait à
`p × s'/s`. Pour qu'il reste immobile à l'écran, le pan absorbe exactement la différence :

```
pan' = pan + p × (1 − s'/s)
```

Vérifié par le test « laisse immobile le point du monde sous le curseur »
(`apps/web/src/camera.test.ts`). `zoomAt()` renvoie **la même caméra par identité** quand
la borne est atteinte.

### `settle()` — l'aimantation

Interpole `rotation` vers `targetRotation` avec `lerpAngle()` sur `SETTLE_MS` (120 ms),
puis **cale exactement** l'angle dès que l'écart passe sous `SETTLE_EPSILON` (1e-4). Sans
ce calage, l'interpolation étant asymptotique, la géométrie serait réémise indéfiniment
pour un écart invisible.

### Constantes de réglage

Toutes dans `apps/web/src/camera.ts` : `MIN_SCALE` 0,35 · `MAX_SCALE` 3 ·
`ZOOM_STEP` 1,12 par cran de molette · `RADIANS_PER_PIXEL` 0,008 ·
`SETTLE_MS` 120 · `SETTLE_EPSILON` 1e-4.

---

## `picking.ts` — quelle case est sous le curseur

| Fonction | Emplacement | Rôle |
|---|---|---|
| `containsPoint()` (privée) | `apps/web/src/picking.ts` | Point dans un quadrilatère convexe, par signe des produits vectoriels |
| `tileAt()` | `apps/web/src/picking.ts` | Point en espace de projection → `Coord` ou `undefined` |

**Pas de projection inverse analytique.** Inverser la matrice isométrique donnerait la
case du sol sous le curseur, ce qui est faux dès qu'un relief se dresse devant : on
désignerait une case cachée. `tileAt()` parcourt donc les cases **de la plus proche à la
plus lointaine** — l'ordre du peintre inversé, via `compareDepth()` — et teste pour
chacune la face supérieure (`tileQuad()`) puis les falaises (`cliffQuads()`). La première
touchée gagne.

C'est exact avec le relief comme à n'importe quel angle, et ne demande aucun objet
interactif PixiJS par case. Sert au survol comme au clic.

---

## `match.ts` — la partie locale

Module pur : ni PixiJS, ni DOM. **Il tient exactement ce que le futur Durable Object
tiendra** — l'état réel et les deux `PlayerKnowledge` — et n'expose vers le rendu que des
`PlayerView` (`docs/architecture.md` section 2). Câbler le serveur reviendra à remplacer
cette classe par un transport, **sans toucher au reste du client**.

| Membre | Emplacement | Rôle |
|---|---|---|
| `Match` (constructeur) | `apps/web/src/match.ts` | Prend un `GameState` et initialise les deux mémoires |
| `state` | `apps/web/src/match.ts` | L'état courant |
| `board` | `apps/web/src/match.ts` | Le plateau, transmis séparément de la vue |
| `activePlayer` | `apps/web/src/match.ts` | Le joueur au trait |
| `isOver` | `apps/web/src/match.ts` | La partie est-elle terminée |
| `pieceAt()` | `apps/web/src/match.ts` | La pièce sur une case — résolution coordonnée → pièce |
| `viewFor()` | `apps/web/src/match.ts` | La `PlayerView` d'un joueur, **mise en cache** |
| `play()` | `apps/web/src/match.ts` | Applique une action ; l'état ne bouge pas si elle est refusée |

**Le cache de vues n'est pas une optimisation, c'est une nécessité.** `Scene.render()` ne
redessine que si la vue a changé **d'identité de référence** : les vues doivent donc être
stables entre deux actions, et recalculées une seule fois après chacune. `play()` vide le
cache, rien d'autre ne le fait.

---

## `ui/command.ts` — la grammaire de saisie

Module pur : il ne lit aucun DOM et ne connaît pas la partie en cours — la résolution
d'une coordonnée en pièce lui est **fournie**, ce qui le rend testable seul.

```
  1,6 2,5        déplace la pièce en (1,6) vers (2,5)
  1,6 > 2,5      identique : la flèche est facultative
  1,6 2,5 x 3,5  se déplace en (2,5) puis capture la pièce en (3,5)
  1,6 x 1,5      frappe un adjacent sans bouger
  abandon        abandonne la partie
```

| Fonction | Emplacement | Rôle |
|---|---|---|
| `tokenize()` (privée) | `apps/web/src/ui/command.ts` | Normalise séparateurs et espaces ; isole le `x` de capture |
| `parseCoord()` (privée) | `apps/web/src/ui/command.ts` | `"1,6"` → `Coord` |
| `parseCommand()` | `apps/web/src/ui/command.ts` | Texte → `Result<Command, CommandFault>` |
| `toAction()` | `apps/web/src/ui/command.ts` | `Command` → `Action` de `core`, en résolvant les coordonnées |

La séparation en deux étapes est délibérée. `parseCommand()` ne fait que de la syntaxe.
**`toAction()` est le seul endroit du client où les coordonnées du joueur rejoignent les
identifiants de pièces de `core`** — `core` raisonne en `PieceId`, le joueur en cases.

`CommandFault` couvre les fautes de saisie (`empty`, `bad-coord`, `missing-destination`,
`missing-target`, `trailing`, `no-piece-here`, `no-target-here`) ; les refus de règle
restent des `ActionError` de `core`. Les deux familles sont distinctes et traduites
séparément.

Détail : une pièce qui reste sur place occupe encore sa case de départ, elle ne peut donc
pas être sa propre cible — `toAction()` le refuse explicitement.

---

## `ui/messages.ts` — tous les textes

Regroupés hors du câblage DOM : le module qui écoute les événements ne contient aucune
phrase, et les formulations restent relisables d'un seul coup d'œil.

| Fonction | Emplacement | Rôle |
|---|---|---|
| `formatCoord()` | `apps/web/src/ui/messages.ts` | `Coord` → `"(x,y)"` |
| `describeFault()` | `apps/web/src/ui/messages.ts` | Faute de saisie → phrase |
| `describeActionError()` | `apps/web/src/ui/messages.ts` | `ActionError` de `core` → phrase |
| `describeMove()` | `apps/web/src/ui/messages.ts` | Compte rendu d'un coup joué |
| `describeOutcome()` | `apps/web/src/ui/messages.ts` | Fin de partie |
| `describeTurn()` | `apps/web/src/ui/messages.ts` | Ligne d'état : tour, joueur au trait, point de vue |
| `describeTile()` | `apps/web/src/ui/messages.ts` | **Lecture d'une case désignée au clic** |

### `describeTile()` — et pourquoi elle ne dit rien des pièces

Rend `"1,6 · hauteur 0"`, avec `· infranchissable` le cas échéant, et `"Hors plateau."`
pour une case absente. La coordonnée est écrite **sans parenthèses, exactement sous la
forme qu'attend la saisie de coups** : on peut la recopier telle quelle dans le champ.

Elle ne rapporte **que du terrain**. Le relief est public
(`docs/implementation-notes.md` point 10), mais annoncer la pièce présente divulguerait
une position hors LOS et contournerait le fog. Un test le verrouille.

---

## `ui/palette.ts` — le code couleur passé au CSS

| Fonction | Emplacement | Rôle |
|---|---|---|
| `cssColor()` (privée) | `apps/web/src/ui/palette.ts` | Entier `0xRRGGBB` → `rgba(...)` |
| `applyPalette()` | `apps/web/src/ui/palette.ts` | Pose les propriétés personnalisées sur l'élément racine de la console |

Les tokens de `theme.ts` sont des entiers, seul format utile à PixiJS ; le CSS les reçoit
via des propriétés personnalisées calculées ici : `--ink`, `--ink-soft`, `--ink-faint`,
`--panel`, `--accepted`, `--refused`. **Aucune couleur n'est donc réécrite en dur dans
`console.css`**, et `theme.ts` reste l'unique détenteur du code couleur.

Un coup accepté et un coup refusé sont de l'information de partie : ils reprennent les
tokens `STATE.legalMove` et `STATE.threat`, pas une couleur d'interface propre.

---

## `ui/console.ts` — le branchement DOM

Seul module de l'interface à toucher le DOM. La grammaire est dans `command.ts`, les
textes dans `messages.ts` : il ne reste ici que le branchement des événements et
l'écriture dans la page.

| Fonction | Emplacement | Rôle |
|---|---|---|
| `attachConsole()` | `apps/web/src/ui/console.ts` | Installe le formulaire et rend un `GameConsole` |
| `refresh()` (interne) | `apps/web/src/ui/console.ts` | Réécrit la ligne d'état |
| `showTile()` (interne) | `apps/web/src/ui/console.ts` | Écrit la lecture d'une case désignée au clic |
| `report()` (interne) | `apps/web/src/ui/console.ts` | Écrit un compte rendu et son état `ok`/`ko` |
| `submit()` (interne) | `apps/web/src/ui/console.ts` | Enchaîne analyse → résolution → application |

`GameConsole` expose `refresh()` (après un changement de point de vue) et
`showTile(coord)` (au clic).

Un détail qui compte dans `submit()` : la pièce déplacée et la pièce capturée sont **lues
avant de jouer**, car dans l'état suivant elles ne sont plus à leur place — ni même
présentes.

Les éléments sont fournis par l'appelant (`ConsoleElements` : `form`, `input`, `log`,
`status`, `readout`), ce qui laisse `main.ts` seul responsable de la résolution des `id`.

---

## `controls.ts` — les entrées du canevas

Seul module du client qui écoute le canevas. Il ne dessine rien et ne détient aucun état
de rendu : il traduit les gestes en transformations de caméra et en intentions.

| Geste | Fonction appelée | Effet |
|---|---|---|
| Molette | `zoomAt()` | Zoom vers le curseur. Seul le **signe** de `deltaY` est lu — sa valeur dépend de `deltaMode` et du périphérique |
| Drag bouton gauche | `panBy()` | Déplacement de la vue |
| **Clic bouton gauche** | `pickTile()` → `onPick()` | **Rapporte la case désignée** |
| Drag bouton droit ou milieu | `rotateBy()` puis `snapRotation()` au relâchement | Rotation libre, aimantée sur le quart de tour |
| Mouvement de souris | `pickTile()` → `setHovered()` | Survol. **Ne notifie que si la case change** — sinon l'overlay serait réémis à chaque pixel |
| Sortie du curseur | `setHovered(undefined)` | Efface le survol |
| Flèches ← → | `turn()` | Quart de tour direct |
| Espace | `toggleViewer()` | Bascule le point de vue joueur A / joueur B |

| Fonction | Emplacement | Rôle |
|---|---|---|
| `attachControls()` | `apps/web/src/controls.ts` | Installe tous les écouteurs |
| `dragKindOf()` (privée) | `apps/web/src/controls.ts` | Bouton de souris → `"pan"` \| `"rotate"` \| rien |
| `isTyping()` (privée) | `apps/web/src/controls.ts` | La cible de l'événement est-elle un champ de saisie |
| `sameCoord()` (privée) | `apps/web/src/controls.ts` | Comparaison de survol tolérante à `undefined` |

### Clic contre glissé

Un pan et un clic partent du **même bouton**. `Drag` accumule donc le déplacement dans son
champ `travelled`, et `endDrag()` ne rapporte la case que si ce total reste sous
`CLICK_SLOP` (4 px). Sans ce seuil, la moindre tremblote de souris pendant l'appui
annulerait la désignation ; sans l'accumulation, un aller-retour de 200 px reviendrait au
point de départ et passerait pour un clic.

### Les raccourcis clavier et la saisie

Les raccourcis sont posés sur `window` pour rester actifs hors du canevas. `isTyping()`
les efface donc devant une saisie en cours — sans quoi une espace tapée dans le champ de
commande changerait de point de vue.

Autres détails : `setPointerCapture()` rend le drag fiable même hors du canevas ; le menu
contextuel est supprimé sur le canevas pour libérer le bouton droit ; la conversion écran
→ espace de projection est faite ici (via `toProjectionSpace()`), ce qui laisse
`picking.ts` pur.

---

## `scene.ts` — couches et détection de changement

**Deux couches, et deux seulement.**

- **`world`** réunit terrain et pièces. Elles doivent partager un **unique ordre du
  peintre** pour qu'une pièce derrière un relief soit réellement masquée — ce qui interdit
  de les séparer en deux `Graphics`.
- **`overlay`** porte la surbrillance, dessinée par-dessus. C'est ce qui permet qu'un
  mouvement de souris ne reconstruise jamais la géométrie du terrain.

| Fonction | Emplacement | Rôle |
|---|---|---|
| `Scene` (classe) | `apps/web/src/scene.ts` | Détient `root`, les deux `Graphics` et l'état précédent |
| `Scene.render()` | `apps/web/src/scene.ts` | Positionne le conteneur, décide quelle couche réémettre |
| `Scene.drawWorld()` (privée) | `apps/web/src/scene.ts` | Terrain et pièces entrelacés par profondeur |
| `Scene.drawOverlay()` (privée) | `apps/web/src/scene.ts` | Surbrillance de la case survolée |
| `sameProjection()` (privée) | `apps/web/src/scene.ts` | Compare champ à champ deux `IsoProjection` |
| `sameHover()` (privée) | `apps/web/src/scene.ts` | Compare deux survols, `undefined` compris |
| `occupantsOf()` (privée) | `apps/web/src/scene.ts` | `PlayerView` → couleur et opacité par case occupée |

Conditions de réémission :

- **`world`** : la projection a changé (rotation ou zoom), ou le `Board`, ou la
  `PlayerView` — ces deux derniers par **identité de référence**, d'où le cache de vues de
  `Match`.
- **`overlay`** : la case survolée a changé, ou la projection.
- **Le pan ne déclenche rien** : il n'affecte que `root.position`.

`occupantsOf()` insère les fantômes **avant** les pièces réellement vues, pour qu'une
pièce présente l'emporte sur un souvenir situé sur la même case.

L'atténuation en profondeur est calculée ici : `drawWorld()` normalise la profondeur de
chaque case entre 0 (la plus lointaine) et 1 (la plus proche) et passe cette valeur à
`drawTile()`.

---

## `draw/` — l'émission de géométrie

Ce sont des **fonctions**, pas des classes : elles écrivent dans un `Graphics` qu'on leur
passe. C'est précisément ce qui permet à `scene.ts` d'entrelacer terrain et pièces dans un
seul ordre du peintre.

| Fonction | Emplacement | Rôle |
|---|---|---|
| `drawTile()` | `apps/web/src/draw/terrain.ts` | Falaises puis face supérieure d'une case |
| `depthAlpha()` (privée) | `apps/web/src/draw/terrain.ts` | Proximité normalisée → opacité |
| `drawPiece()` | `apps/web/src/draw/pieces.ts` | Tige verticale + tête en losange |
| `drawHover()` | `apps/web/src/draw/overlay.ts` | Aplat blanc sur la face supérieure + contours renforcés |

L'opacité d'une case est le produit de trois facteurs, dans `drawTile()` :

```
alpha = (visible ? alphaVisible : alphaFogged)
      × (passable ? 1 : impassableFactor)
      × depthAlpha(proximité)
```

`drawPiece()` reçoit un point déjà projeté et dérive ses proportions de la projection, ce
qui la fait suivre le zoom sans réglage séparé. Aucun type de `packages/core/src/pieces/`
ne porte de champ visuel — la correspondance entre un `kind` et une forme appartient donc à
ce module. Le roster n'étant pas acté (`docs/design.md` point ouvert 12), **toutes les
pièces partagent aujourd'hui la même silhouette**.

---

## `theme.ts` — le code couleur

Code couleur acté dans `docs/design.md` section 8.1, **provisoire** :

> Le blanc porte la géométrie, la couleur porte l'état de jeu.

Tout le terrain est blanc. Le fog of war, la hauteur et l'infranchissabilité se lisent par
opacité et par épaisseur de trait, **jamais par teinte**. Conséquence directe et voulue :
un trait coloré signifie toujours une information de partie.

| Groupe de tokens | Contenu |
|---|---|
| `BACKGROUND` | Fond du canevas — dupliqué dans `apps/web/index.html`, à garder synchronisé à la main |
| `METRICS` | `tileWidth` 72, `tileHeight` 36, `heightUnit` 22 |
| `GEOMETRY` | Trait du terrain : opacités visible/fog/infranchissable, atténuation en profondeur, épaisseurs, remplissage |
| `HOVER` | Aplat et contour de la case survolée |
| `PLAYERS` | Couleurs de camp A et B — **provisoires** |
| `STATE` | Sélection, coup légal, grimpe, menace. `legalMove` et `threat` sont consommés par `ui/palette.ts` pour les comptes rendus de la console ; `selection` et `climb` restent réservés |
| `PIECES` | Opacités visible/fantôme, épaisseur, proportions de la silhouette |

Le rendu est **filaire par défaut** : `GEOMETRY.fillAlpha` vaut 0, aucune face n'est
remplie. La géométrie des faces est pourtant bien émise et triée par profondeur —
repasser à des faces opaques ne demande donc que de relever cette seule valeur.

### La règle est mécanique, pas conventionnelle

`eslint.config.js` interdit tout littéral de couleur dans `apps/web/src/**/*.ts`, avec une
exception unique pour `theme.ts`. Deux sélecteurs `no-restricted-syntax` couvrent les deux
formes : `0xffffff` (par le `raw` du littéral) et `"#ffffff"` (par sa valeur).
`pnpm lint` échoue sur toute couleur écrite ailleurs.

Le CSS échappe à ESLint : c'est `ui/palette.ts` qui l'y soumet en pratique, en y injectant
les tokens plutôt qu'en laissant `console.css` définir ses propres couleurs.

---

## `main.ts` — la racine de composition

Elle câble les modules, elle n'en implémente aucun.

| Fonction | Emplacement | Rôle |
|---|---|---|
| `main()` | `apps/web/src/main.ts` | Initialise PixiJS, construit `Match` et `Scene`, câble tout, lance le ticker |
| `element()` | `apps/web/src/main.ts` | Résout un `id` du DOM ou lève |
| `look()` (interne) | `apps/web/src/main.ts` | Change de point de vue et recalcule la vue rendue |

La partie se joue en **hot-seat** : la vue suit le joueur au trait (`onPlayed` appelle
`look(match.activePlayer)`), et la barre d'espace permet de regarder le plateau avec les
yeux de l'autre camp (`docs/design.md` 5.4). Le ticker n'appelle que `settle()` puis
`scene.render()`.

---

## `index.html` et `ui/console.css`

La saisie de coups est **en HTML et non dessinée dans le canevas** : aucun design system
n'est acté (`docs/design.md` 8.1), et une entrée texte native donne gratuitement le focus,
la sélection et l'historique du champ.

| Élément | Rôle |
|---|---|
| `#app` | Hôte du canevas PixiJS |
| `#console` | Le panneau, dont `applyPalette()` porte les variables de couleur |
| `#status` | Ligne d'état : tour, joueur au trait, point de vue |
| `#tile-readout` | **Lecture de la case désignée au clic** |
| `#command-form` / `#command-input` | La saisie |
| `#command-log` | Compte rendu, coloré par `data-state="ok"` ou `"ko"` |
| `#command-help` | Rappel de la grammaire |

`console.css` ne fait que de la mise en page : toutes ses couleurs viennent des variables
posées par `palette.ts`. `#tile-readout` est en blanc atténué (`--ink-soft`) et n'emprunte
aucune couleur d'état — une coordonnée de case est de la géométrie, pas de l'information
de partie.

---

## Invariants à ne pas casser

1. **Rien n'est pivoté au niveau du rendu.** La rotation passe par les coordonnées
   logiques dans `rotate()`. Faire tourner un `Container` PixiJS produirait des traits
   crénelés et casserait la cohérence du dessin procédural.
2. **`tileQuad()` projette les quatre coins.** Revenir à un losange à décalages fixes
   ferait réapparaître la déchirure du pavage hors des multiples de 90°. Verrouillé par un
   test.
3. **L'ordre de `CORNERS` et `EDGE_NEIGHBOURS` fait contrat.** Modifier l'un sans l'autre
   fait dessiner les falaises sur les mauvaises arêtes.
4. **Terrain et pièces restent dans la même couche.** Les séparer réintroduit les pièces
   dessinées par-dessus les murs.
5. **`scale` reste dans la projection.** Le déplacer vers `root.scale` ferait varier
   l'épaisseur des traits avec le zoom.
6. **`theme.ts` reste le seul détenteur des couleurs**, CSS compris — via `palette.ts`.
7. **`Match.viewFor()` doit rendre des vues stables** entre deux actions. Recalculer à
   chaque appel ferait redessiner le monde à chaque frame.
8. **Rien de ce qui est hors LOS ne doit apparaître dans l'interface.** `describeTile()`
   ne rapporte que du terrain pour cette raison ; le fog serait sinon contournable par la
   console.
9. **Les modules purs restent purs.** Y importer PixiJS ou le DOM rendrait leurs tests
   impossibles sans navigateur.

## Tests

48 tests, sous Node, sans navigateur : `pnpm test` (ou `pnpm --filter @occulis/web test`).

| Fichier | Ce qui est verrouillé |
|---|---|
| `apps/web/src/iso.test.ts` | Pavage jointif à angle quelconque, hauteur sans déformation, falaises émises seulement sur rupture, ordre du peintre, chemin court d'angle, aimantation |
| `apps/web/src/camera.test.ts` | Le point sous le curseur reste immobile au zoom, bornes d'échelle, convergence exacte de l'aimantation |
| `apps/web/src/picking.test.ts` | Chaque case retrouvée depuis son centre à plusieurs angles et échelles, priorité au relief au premier plan, désignation par la falaise, `undefined` hors plateau |
| `apps/web/src/match.test.ts` | Vue initiale par camp, **stabilité de la vue** entre deux coups, renouvellement après un coup accepté, état intact après un refus, persistance de la mémoire fantôme |
| `apps/web/src/ui/command.test.ts` | Grammaire complète : déplacement, séparateurs, capture, frappe sur place, abandon, saisies illisibles ; résolution coordonnée → pièce et ses refus |
| `apps/web/src/ui/messages.test.ts` | `describeTile()` : forme recopiable, hauteur, infranchissabilité, hors plateau, **et l'absence de fuite d'information sur les pièces** |

## Non implémenté

- **Aucun appel réseau** — ni `fetch`, ni `WebSocket`. `Match` tient la partie en local ;
  voir « L'état réel du câblage » dans [README.md](README.md).
- **Aucune sélection de pièce à la souris.** Le clic désigne une case et en rapporte la
  position, il ne sélectionne ni ne joue. Un coup se tape.
- **Aucun affichage des coups légaux**, alors que `PieceType.destinationsFrom()` et
  `MoveOption.kind` (`walk` / `climb`) sont disponibles et que `STATE.legalMove` et
  `STATE.climb` sont déjà des tokens.
- **Aucune animation** de déplacement de pièce.
- **Aucune différenciation visuelle** entre types de pièces.
- **Aucun historique de saisie** : le champ ne rappelle pas les commandes précédentes.
