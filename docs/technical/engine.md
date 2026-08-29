# Le moteur de rendu — `apps/web`

Rendu isométrique filaire en dessin procédural : aucun sprite, aucune texture, aucun
moteur 3D. Tout est tracé en traits par `Graphics` de PixiJS 8, à partir des coordonnées
logiques de `packages/core`.

## Ce que le moteur fait, et ne fait pas

**Fait** : projection isométrique avec hauteur, rotation libre du plateau, zoom et
déplacement de la caméra, désignation de la case sous la souris, surbrillance au survol,
occlusion du relief et des pièces, affichage du fog of war et des fantômes.

**Ne fait pas** : aucune interaction de jeu. Cliquer sur une case ne sélectionne rien,
aucune action n'est produite, `legalActions()` n'est jamais appelé. Aucun appel réseau
non plus — la partie affichée est locale et figée (`demoGame()`).

## Le pipeline d'une image, de bout en bout

```
  événement souris/clavier
        │  controls.ts       ── seul module qui écoute des événements
        ├─► camera.ts        ── zoomAt / panBy / rotateBy / snapRotation / turn
        └─► picking.ts       ── tileAt() : quelle case est sous le curseur ?
                    │
  ticker PixiJS (chaque frame, main.ts)
        │
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
| `apps/web/src/controls.ts` | Événements souris/clavier → intentions | non (DOM) |
| `apps/web/src/scene.ts` | Couches PixiJS et détection de changement | non (PixiJS) |
| `apps/web/src/draw/terrain.ts` | Géométrie d'une case | non (PixiJS) |
| `apps/web/src/draw/pieces.ts` | Silhouette d'une pièce | non (PixiJS) |
| `apps/web/src/draw/overlay.ts` | Surbrillance de survol | non (PixiJS) |
| `apps/web/src/scenario.ts` | Partie de démonstration — **pas du contenu de jeu** | oui |

Les quatre modules purs (`theme`, `iso`, `camera`, `picking`) n'importent ni PixiJS ni le
DOM. C'est ce qui les rend testables sans navigateur : `iso.test.ts`, `camera.test.ts` et
`picking.test.ts` tournent sous Node.

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
case. `tileQuad()` le vérifie dans les tests — les coins d'une case élevée sont ceux de la
même case au sol, décalés de `height × heightUnit × scale`.

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
nette au lieu de devenir un maillage. C'est aussi ce qui fait que le sol plat ne coûte
aucune géométrie de falaise.

### `depthOf()` / `compareDepth()` — l'ordre du peintre

`depthOf()` renvoie `{ plane, height }` où `plane = rx + ry` après rotation. Le
comparateur trie d'abord par `plane` (profondeur dans le plan du damier), puis par
`height` : à profondeur égale, les cases basses se dessinent avant les hautes, pour que
les falaises recouvrent correctement leur voisinage. La structure évite un encodage en un
seul nombre, qui aurait exigé un facteur magique.

---

## `camera.ts` — état de caméra

Module pur, sans PixiJS ni DOM : les entrées viennent de `controls.ts`, la sortie est
consommée par `scene.ts`.

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
(`apps/web/src/camera.test.ts`), qui projette une case avant et après zoom et compare sa
position à l'écran.

`zoomAt()` renvoie **la même caméra par identité** quand la borne est atteinte, ce qui
rend le cas « on ne peut plus zoomer » détectable sans comparaison de champs.

### `settle()` — l'aimantation

Interpole `rotation` vers `targetRotation` avec `lerpAngle()` sur `SETTLE_MS` (120 ms),
puis **cale exactement** l'angle dès que l'écart passe sous `SETTLE_EPSILON` (1e-4).
Sans ce calage, l'interpolation étant asymptotique, la géométrie serait réémise
indéfiniment pour un écart invisible.

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
interactif PixiJS par case. Le coût est un tri et quelques dizaines de tests par mouvement
de souris — négligeable pour une carte de cette taille, et le prix à payer pour garder la
fonction pure.

Les quadrilatères sont convexes par construction et leur enroulement est constant (la
transformation isométrique préserve l'orientation), ce qui rend le test par signe fiable.

---

## `controls.ts` — les entrées

Seul module du client qui écoute des événements. Il ne dessine rien et ne détient aucun
état de rendu : il traduit les gestes en transformations de caméra et en intention de
survol, via les rappels de `ControlsOptions`.

| Geste | Fonction appelée | Effet |
|---|---|---|
| Molette | `zoomAt()` | Zoom vers le curseur. Seul le **signe** de `deltaY` est lu — sa valeur dépend de `deltaMode` et du périphérique |
| Drag bouton gauche | `panBy()` | Déplacement de la vue |
| Drag bouton droit ou milieu | `rotateBy()` puis `snapRotation()` au relâchement | Rotation libre, aimantée sur le quart de tour |
| Mouvement de souris | `pickTile()` → `setHovered()` | Survol. **Ne notifie que si la case change** — sinon l'overlay serait réémis à chaque pixel |
| Sortie du curseur | `setHovered(undefined)` | Efface le survol |
| Flèches ← → | `turn()` | Quart de tour direct |
| Espace | `toggleViewer()` | Bascule le point de vue joueur A / joueur B |

| Fonction | Emplacement | Rôle |
|---|---|---|
| `attachControls()` | `apps/web/src/controls.ts` | Installe tous les écouteurs |
| `dragKindOf()` (privée) | `apps/web/src/controls.ts` | Bouton de souris → `"pan"` \| `"rotate"` \| rien |
| `sameCoord()` (privée) | `apps/web/src/controls.ts` | Comparaison de survol tolérante à `undefined` |

Détails qui comptent : `setPointerCapture()` rend le drag fiable même hors du canevas ;
le menu contextuel est supprimé sur le canevas pour libérer le bouton droit ; la
conversion écran → espace de projection est faite ici (via `toProjectionSpace()`), ce qui
laisse `picking.ts` pur.

---

## `scene.ts` — couches et détection de changement

**Deux couches, et deux seulement.**

- **`world`** réunit terrain et pièces. Elles doivent partager un **unique ordre du
  peintre** pour qu'une pièce derrière un relief soit réellement masquée — ce qui interdit
  de les séparer en deux `Graphics`. `drawWorld()` trie les cases par profondeur et, pour
  chacune, dessine la case puis la pièce éventuellement posée dessus.
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
  `PlayerView` — ces deux derniers par identité de référence, `packages/core` étant
  immuable.
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

`drawPiece()` reçoit un point déjà projeté et dérive ses proportions de la projection
(`proj.heightUnit × stemRatio`, `proj.tileWidth × headRatio`), ce qui la fait suivre le
zoom sans réglage séparé. `PieceDefinition` de `packages/core` ne porte aucun champ
visuel — la correspondance entre un `kind` et une forme appartient donc à ce module. Le
roster n'étant pas acté (`docs/design.md` point ouvert 12), **toutes les pièces partagent
aujourd'hui la même silhouette**.

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
| `STATE` | Réservé : sélection, coup légal, grimpe, menace. **Aucun n'est consommé aujourd'hui** |
| `PIECES` | Opacités visible/fantôme, épaisseur, proportions de la silhouette |

Le rendu est **filaire par défaut** : `GEOMETRY.fillAlpha` vaut 0, aucune face n'est
remplie. La géométrie des faces est pourtant bien émise et triée par profondeur —
repasser à des faces opaques, et retrouver une occlusion par surface, ne demande donc que
de relever cette seule valeur.

### La règle est mécanique, pas conventionnelle

`eslint.config.js` interdit tout littéral de couleur dans `apps/web/src/**/*.ts`, avec une
exception unique pour `theme.ts`. Deux sélecteurs `no-restricted-syntax` couvrent les deux
formes : `0xffffff` (par le `raw` du littéral) et `"#ffffff"` (par sa valeur).
`pnpm lint` échoue sur toute couleur écrite ailleurs.

---

## Invariants à ne pas casser

1. **Rien n'est pivoté au niveau du rendu.** La rotation passe par les coordonnées
   logiques dans `rotate()`. Faire tourner un `Container` PixiJS produirait des traits
   crénelés et casserait la cohérence du dessin procédural (`docs/design.md` section 8).
2. **`tileQuad()` projette les quatre coins.** Revenir à un losange à décalages fixes
   ferait réapparaître la déchirure du pavage hors des multiples de 90°. Verrouillé par le
   test « garde le pavage jointif à un angle quelconque ».
3. **L'ordre de `CORNERS` et `EDGE_NEIGHBOURS` fait contrat.** Modifier l'un sans l'autre
   fait dessiner les falaises sur les mauvaises arêtes.
4. **Terrain et pièces restent dans la même couche.** Les séparer réintroduit les pièces
   dessinées par-dessus les murs.
5. **`scale` reste dans la projection.** Le déplacer vers `root.scale` ferait varier
   l'épaisseur des traits avec le zoom.
6. **`theme.ts` reste le seul détenteur des couleurs.** La règle ESLint le garantit ;
   la désactiver viderait le code couleur de son sens.
7. **`iso`, `camera` et `picking` restent purs.** Y importer PixiJS ou le DOM rendrait
   leurs tests impossibles sans navigateur.

## Tests

26 tests, sous Node, sans navigateur : `pnpm test` (ou `pnpm --filter @occulis/web test`).

| Fichier | Ce qui est verrouillé |
|---|---|
| `apps/web/src/iso.test.ts` | Pavage jointif à angle quelconque, hauteur sans déformation, falaises émises seulement sur rupture, ordre du peintre, chemin court d'angle, aimantation |
| `apps/web/src/camera.test.ts` | Le point sous le curseur reste immobile au zoom (au sol et en hauteur), bornes d'échelle, convergence exacte de l'aimantation |
| `apps/web/src/picking.test.ts` | Chaque case retrouvée depuis son centre à plusieurs angles et échelles, priorité au relief au premier plan, désignation par la falaise, `undefined` hors plateau |

## Non implémenté

- Aucune interaction de jeu : sélection de pièce, affichage des coups légaux
  (`reachableTiles()` et `MoveOption.kind` de `packages/core` sont disponibles et
  inutilisés), envoi d'action.
- Aucun appel réseau — voir la section « L'état réel du câblage » de
  [README.md](README.md).
- Aucune animation de déplacement de pièce.
- Aucune différenciation visuelle entre types de pièces.
- Aucun HUD : ni tour courant, ni joueur au trait, ni issue de partie, alors que
  `PlayerView` porte `turn`, `activePlayer` et `outcome`.
