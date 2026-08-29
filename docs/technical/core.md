# La logique de jeu — `packages/core`

Les règles du jeu, en TypeScript pur. **Aucune dépendance de rendu, aucune dépendance
réseau.** C'est le seul paquet consommé à la fois par le client et par le serveur, et il
l'est sous forme de **code source** : `packages/core/package.json` déclare
`"main": "./src/index.ts"`. Client et serveur issus du même commit exécutent donc
exactement les mêmes règles.

## Deux invariants fondateurs

**1. Déterminisme strict.** Aucun `Math.random`, aucun `Date.now`, aucune source
d'entropie ni d'horloge. Toute la persistance repose là-dessus : le serveur reconstruit
l'état d'une partie en rejouant son log d'actions (`MatchDO.load()`,
`apps/server/src/match-do.ts`). Un appel non déterministe ici casserait silencieusement
cette reconstruction. Si un aléa devient nécessaire, il devra entrer par un seed explicite
passé en paramètre.

**2. Immuabilité.** `Board`, `GameState`, `PlayerKnowledge` et `PlayerView` ne sont jamais
mutés : `applyAction()` et `observe()` renvoient de nouvelles valeurs. Le client s'appuie
directement sur cette propriété — `Scene.render()` (`apps/web/src/scene.ts`) détecte les
changements par **identité de référence**.

Les erreurs sont retournées via `Result<T, E>` (`packages/core/src/result.ts`), **jamais
levées** — sauf pour les erreurs de programmation (identifiant de pièce dupliqué, type de
pièce inconnu), qui lèvent.

## Carte des modules

```
coord.ts ──► board.ts ──► los.ts ──────┐
   │            │                      │
   │            └──► movement.ts ──┐   │
   ▼                               ▼   ▼
piece.ts ──────────────────► state.ts ──► actions.ts
                                   │
                                   └──► fog.ts
```

| Fichier | Rôle |
|---|---|
| `packages/core/src/coord.ts` | Coordonnées, clés de hachage, adjacence, distances |
| `packages/core/src/board.ts` | `Tile` et `Board` immuable |
| `packages/core/src/piece.ts` | `Piece`, `PieceDefinition`, `Ruleset` |
| `packages/core/src/los.ts` | Raycast, ligne de vue, champ de vision |
| `packages/core/src/movement.ts` | Cases atteignables, portée de mêlée |
| `packages/core/src/state.ts` | État de partie et accesseurs |
| `packages/core/src/actions.ts` | Coups légaux, validation, application, fin de partie |
| `packages/core/src/fog.ts` | Mémoire du joueur et vue transmissible |
| `packages/core/src/result.ts` | `Result<T, E>` |
| `packages/core/src/testing.ts` | Fabriques de scénarios — **tests uniquement, non exporté** par `index.ts` |

---

## `coord.ts` — coordonnées et grille

```ts
interface Coord { x: number; y: number }
type CoordKey = string          // format `${x},${y}`
type Adjacency = "orthogonal" | "octile"
```

| Fonction | Rôle |
|---|---|
| `coordKey()` | `Coord` → clé, pour indexer `Map`/`Set` sans allouer d'objets |
| `parseCoordKey()` | L'inverse |
| `coordEquals()` | Égalité de coordonnées |
| `steps()` | Les 4 ou 8 déplacements élémentaires d'une topologie |
| `neighbors()` | Voisins d'une case |
| `areAdjacent()` | Adjacence selon la topologie ; **une case n'est jamais adjacente à elle-même** |
| `chebyshevDistance()` | `max(|dx|, |dy|)` — sert à la portée de vision |
| `manhattanDistance()` | `|dx| + |dy|` |

La topologie **n'est pas une constante globale** : elle est portée par
`MovementProfile.adjacency`, donc déclarée pièce par pièce. `docs/design.md` ne l'ayant
pas tranchée, ce choix laisse le futur roster décider au cas par cas.

---

## `board.ts` — le plateau

```ts
interface Tile {
  coord: Coord;
  height: number;    // 0 = niveau sol
  passable: boolean;
}
```

Deux décisions structurantes (`docs/design.md` section 5.1) :

- **Un mur est une case haute, pas un drapeau.** C'est la hauteur seule qui bloque la
  ligne de vue. Il n'existe aucun booléen « bloque la vue ».
- **`passable` est orthogonal à la hauteur.** Un gouffre est infranchissable sans occulter
  quoi que ce soit — `passable` n'intervient **jamais** dans le calcul de LOS.
- **Une case absente est hors-carte** : ni franchissable, ni occultante. C'est un vide,
  pas un obstacle.

| Méthode | Rôle |
|---|---|
| `Board` (constructeur) | Construit depuis des `TileSpec` ; `height` défaut 0, `passable` défaut `true` |
| `tileCount` | Nombre de cases |
| `getTile()` | La case, ou `undefined` hors-carte |
| `contains()` | La case existe-t-elle |
| `heightAt()` | Hauteur, ou `undefined` hors-carte |
| `isPassable()` | `false` hors-carte |
| `allTiles()` | Itère les cases, **en ordre d'insertion** — jamais trié |
| `Board.flat()` | Plateau rectangulaire de hauteur uniforme |
| `Board.fromAscii()` | Plateau depuis une carte texte |

`Board` **n'expose aucune borne** (largeur, hauteur, rectangle englobant) : seulement
`tileCount`. Un appelant qui a besoin des extrémités doit balayer `allTiles()` — c'est ce
que fait `pivotOf()` (`apps/web/src/camera.ts`).

### `Board.fromAscii()`

Une ligne = un `y` croissant, un caractère = un `x` croissant.

| Caractère | Signification |
|---|---|
| `0`–`9` | Case franchissable de cette hauteur |
| `.` | Hors-carte : aucune case |
| `~` | Case infranchissable de hauteur 0 (gouffre, eau) — n'occulte pas |

Tout autre caractère lève. Utilisé par les tests, par `apps/web/src/scenario.ts` et par
`scenarioFor()` (`apps/server/src/scenarios.ts`).

---

## `piece.ts` — pièces et ruleset

```ts
type PlayerId = "A" | "B"
type PieceKind = string          // le roster reste à définir (design.md point ouvert 12)

interface MovementProfile { steps: number; adjacency: Adjacency; canClimb: boolean }
interface VisionProfile   { range: number }   // Chebyshev ; Infinity = limité par l'occultation seule
interface PieceDefinition { kind; movement; vision; isCommander: boolean }
interface Piece           { id; kind; owner; coord }
```

| Fonction / méthode | Rôle |
|---|---|
| `opponentOf()` | `"A"` ↔ `"B"` |
| `Ruleset` (constructeur) | Indexe des `PieceDefinition` par `kind` |
| `Ruleset.get()` | La définition ; **lève** si le type est inconnu |

Deux points à connaître avant de bâtir dessus :

- **Aucun roster n'est défini dans `core`.** Les définitions sont fournies par l'appelant :
  `apps/web/src/scenario.ts` côté client, `apps/server/src/rulesets.ts` côté serveur.
- **`Piece` ne porte pas sa hauteur** : elle se dérive de `board.heightAt(piece.coord)`.
- **`PieceDefinition` n'a aucun champ visuel.** Toute correspondance type → forme
  appartient au rendu (`apps/web/src/draw/pieces.ts`).
- Conformément à `docs/design.md`, la différenciation passe par la capacité et le
  mouvement, **jamais par des points de vie** : `Piece` n'a pas de robustesse.

---

## `los.ts` — la ligne de vue

Raycast 2D de type Bresenham avec comparaison de hauteur interpolée case par case. **Pas
de moteur 3D** (`docs/design.md` section 5.1).

| Fonction | Rôle |
|---|---|
| `rasterizeLine()` | Cases traversées par le segment, extrémités incluses |
| `inCanonicalOrder()` (privée) | Fixe le sens de parcours du tracé |
| `hasLineOfSight()` | Y a-t-il vue entre deux cases |
| `visibleFrom()` | Cases visibles depuis un point, dans une portée |

### La hauteur du regard

`EYE_HEIGHT = 1` (constante privée). Une pièce sur une case de hauteur `h` regarde depuis
`h + 1` ; un mur de hauteur `h` occupe l'espace jusqu'à `h`. L'occultation est testée avec
`>=` : **un mur exactement à hauteur du regard bloque** — raser un sommet ne laisse pas
voir derrière. C'est une interprétation encodée faute de décision explicite, consignée
dans `docs/implementation-notes.md` (point 11).

`hasLineOfSight()` interpole linéairement la hauteur de visée entre les deux yeux le long
du tracé, et compare chaque obstacle traversé à cette hauteur. Deux exceptions
délibérées : les cases d'extrémité n'occultent jamais leur propre ligne de vue, et une
case hors-carte traversée n'occulte pas.

### La symétrie, garantie par construction

Le tracé de Bresenham départage les diagonales selon le sens de parcours : tracer A→B et
B→A ne traverse pas toujours les mêmes cases. Laisser cette asymétrie remonter jusqu'à la
LOS donnerait des situations où A voit B sans que B ne voie A — inacceptable en 1v1 à
information cachée. `inCanonicalOrder()` fixe donc un ordre déterministe des extrémités
**avant** le tracé.

**Ne pas casser cette propriété.** Toute modification de `hasLineOfSight()` doit préserver
`hasLineOfSight(b, a, b) === hasLineOfSight(b, b, a)`.

### Portée et hauteur

`visibleFrom(board, origin, range)` : `range` est une distance de **Chebyshev horizontale**.
La hauteur n'étend ni ne réduit la portée de vision — elle ne joue que sur l'occultation
(`docs/design.md` section 5.3). Une pièce sur une tour voit *plus loin* uniquement parce
que moins d'obstacles la gênent, jamais parce que sa portée augmente.

Une pièce **n'occulte pas** la vue : seul le relief le fait (`implementation-notes.md`
point 5). `visibleFrom()` ne consulte donc aucun état de pièces.

---

## `movement.ts` — déplacement et portée de mêlée

```ts
type MoveKind = "walk" | "climb"
interface MoveOption { coord: Coord; cost: number; kind: MoveKind }
```

| Fonction | Rôle |
|---|---|
| `reachableTiles()` | Cases atteignables depuis une case, avec coût et nature du déplacement |
| `canMeleeReach()` | La règle de dénivelé en mêlée. **Ne teste pas l'adjacence** |

### Les règles de verticalité (`docs/design.md` section 5.3)

- **Descendre est libre**, sans limite de dénivelé : seul le pas horizontal coûte. Dans le
  parcours en largeur, un voisin est marchable si `tile.height <= currentHeight`.
- **Monter d'un niveau coûte le tour entier** et exige d'être déjà collé au relief au
  début du tour. C'est donc **l'unique action du tour, jamais enchaînable** après des pas
  horizontaux : les options `"climb"` sont calculées uniquement depuis la case de départ,
  après le parcours, au coût `profile.steps`. Un mur de hauteur 3 se gravit en 3 tours.
- **Un dénivelé de 2 niveaux ou plus en un pas est infranchissable** : la condition
  `tile.height === originHeight + 1` l'exclut.
- `canClimb` est déclaré par pièce — grimper comme capacité générique ou spécifique n'est
  pas tranché (`docs/design.md` point ouvert 7).

Le paramètre `occupied` porte les cases tenues par une pièce : elles bloquent le passage,
et pas seulement l'arrivée.

`canMeleeReach()` applique la même asymétrie : on frappe librement vers le bas, d'un seul
niveau vers le haut (`toHeight - fromHeight <= 1`).

---

## `state.ts` — l'état de partie

```ts
interface GameState {
  board: Board;
  ruleset: Ruleset;
  pieces: ReadonlyMap<PieceId, Piece>;
  activePlayer: PlayerId;
  turn: number;              // incrémenté à chaque action
  outcome: Outcome | null;
}

type Outcome =
  | { kind: "victory"; winner: PlayerId; reason: "commander-captured" | "resignation" }
  | { kind: "draw";    reason: "stalemate" }
```

| Fonction | Rôle |
|---|---|
| `createGame()` | Construit l'état initial et **valide** le placement |
| `pieceAt()` | La pièce sur une case, par balayage linéaire |
| `occupancy()` | Ensemble des cases occupées |
| `piecesOf()` | Les pièces d'un joueur |
| `commanderOf()` | La pièce maîtresse d'un joueur |

`createGame()` lève sur identifiant dupliqué, sur deux pièces à la même case, ou sur une
pièce posée sur une case infranchissable. Ce sont des erreurs de programmation, pas des
coups illégaux — d'où l'exception plutôt qu'un `Result`.

**`turn` compte les actions, pas les rondes** : un tour = une action d'une seule pièce
(`docs/design.md` section 6). Il sert aussi de `seq` dans le log d'actions du serveur et
de `lastSeenTurn` pour les fantômes.

---

## `actions.ts` — coups légaux et résolution

```ts
type Action =
  | { kind: "move"; pieceId: PieceId; to: Coord; capture?: PieceId }
  | { kind: "resign" }
```

| Fonction | Rôle |
|---|---|
| `destinationsFor()` (privée) | Destinations légales d'une pièce, **sa case de départ incluse** |
| `capturablesFrom()` (privée) | Adversaires capturables depuis une case donnée |
| `legalActions()` | Toutes les actions légales du joueur au trait |
| `validateAction()` | Valide une action ; `Result<Action, ActionError>` |
| `withOutcome()` (privée) | Détermine la fin de partie après une action |
| `applyAction()` | Valide puis applique ; `Result<GameState, ActionError>` |
| `isCommanderThreatened()` | La pièce maîtresse est-elle capturable au coup suivant |

### Une action = le tour complet d'une pièce

La capture de mêlée est **instantanée et résolue dans la même action** que le déplacement
qui l'a permise, comme aux échecs (`docs/design.md` section 3.1).

Elle est **déclarée explicitement** (`capture`) plutôt que déduite du seul contact. Cela a
une conséquence à connaître pour toute interface : `to` peut valoir la case de départ de
la pièce, ce qui exprime « frapper un adverse adjacent sans bouger »
(`implementation-notes.md` point 2). Le cas est refusé sans capture — l'erreur
`must-do-something` existe pour empêcher de passer son tour.

### Ordre de détection de la fin de partie

`withOutcome()` teste **d'abord** la disparition d'une pièce maîtresse (victoire par
capture), **ensuite** l'absence de coup légal (pat). La reddition court-circuite tout dans
`applyAction()`.

Le pat est le pat classique : aucun coup légal du tout. **Aucune règle
anti-blocage/anti-répétition n'existe** — c'est un point explicitement reporté
(`docs/design.md` point ouvert 4). De même, **il n'y a pas de détection de mat** :
`isCommanderThreatened()` répond « menacé », pas « mat ».

### `ActionError`

`game-over` · `unknown-piece` · `not-your-piece` · `unreachable` · `must-do-something` ·
`unknown-target` · `target-is-friendly` · `target-out-of-melee`.

Ces codes traversent le réseau tels quels : `ServerMessage` de type `rejected`
(`apps/server/src/protocol.ts`) les transporte.

### Un piège de performance

`legalActions()` appelle `destinationsFor()` pour chaque pièce, et `withOutcome()` appelle
`legalActions()` à chaque application d'action pour détecter le pat.
`isCommanderThreatened()` fait de même pour chaque pièce adverse. Rien n'est mémoïsé.
C'est sans conséquence à l'échelle actuelle (quelques dizaines de cases, jeu au tour par
tour), mais à garder en tête avant d'ajouter une recherche en profondeur.

---

## `fog.ts` — mémoire du joueur et vue transmissible

```ts
interface PlayerKnowledge {
  player: PlayerId;
  visible: ReadonlySet<CoordKey>;
  remembered: ReadonlyMap<PieceId, RememberedPiece>;
}

interface PlayerView {
  player; activePlayer; turn; outcome;
  visible: ReadonlySet<CoordKey>;
  ownPieces: readonly Piece[];
  visibleEnemies: readonly Piece[];
  ghosts: readonly RememberedPiece[];   // mémorisées mais hors LOS
}
```

| Fonction | Rôle |
|---|---|
| `emptyKnowledge()` | Connaissance vierge d'un joueur |
| `visibleTilesFor()` | Union des champs de vision de toutes les pièces d'un joueur |
| `observe()` | Fait avancer la mémoire après un changement d'état |
| `viewFor()` | Produit l'état transmissible à un joueur |

### La règle de la mémoire fantôme

`observe()` (`docs/design.md` section 5.4) :

1. Un souvenir n'est effacé que lorsqu'il est **contredit** — c'est-à-dire quand la case
   mémorisée redevient visible et que la pièce n'y est plus. Sinon il persiste : le joueur
   n'a aucun moyen de savoir qu'elle a bougé.
2. Toute pièce adverse actuellement visible est (re)mémorisée à sa position, avec le
   `turn` courant en `lastSeenTurn`.

`viewFor()` retire des fantômes les pièces actuellement vues, pour qu'une même pièce
n'apparaisse jamais deux fois.

### Ce que `PlayerView` ne contient pas

**Il ne contient pas le `Board`.** Le relief est **public** : les deux joueurs connaissent
la carte, seules les *pièces* sont masquées hors LOS (`implementation-notes.md` point 10).
Le rendu estompe le terrain non visible sans le cacher. Un consommateur de `PlayerView`
doit donc recevoir le plateau séparément — c'est ce que fait `SceneInput`
(`apps/web/src/scene.ts`), qui porte `board` et `view` côte à côte.

Il n'existe par conséquent **aucune notion de « case mémorisée »** : seulement
`visible` (éclairée) contre tout le reste (estompé). Le souvenir ne concerne que les
pièces.

### Pourquoi c'est le fog structurel

`viewFor()` produit un objet qui **ne contient pas** les données hors LOS — elles ne sont
pas masquées à l'affichage, elles sont absentes. C'est exactement ce que le serveur envoie
(`encodeView()`, `apps/server/src/protocol.ts`). Un fog appliqué seulement côté client
serait contournable via les devtools.

---

## Tests

57 tests : `pnpm test` (ou `pnpm --filter @occulis/core test`).

| Fichier | Couvre |
|---|---|
| `packages/core/src/los.test.ts` | Tracé, occultation par la hauteur, symétrie, portée |
| `packages/core/src/movement.test.ts` | Parcours, verticalité, grimpe, blocage par occupation |
| `packages/core/src/actions.test.ts` | Coups légaux, validation, capture, fin de partie |
| `packages/core/src/fog.test.ts` | Visibilité, mémoire fantôme, contenu de `PlayerView` |

`packages/core/src/testing.ts` fournit `definePiece()`, `testRuleset()` et `placePiece()`.
**Il n'est pas réexporté par `index.ts`** : c'est du support de test, pas de l'API.

## Non implémenté

Tout ce qui suit est listé comme ouvert en section 10 de `docs/design.md` et **n'a
volontairement pas été codé** : attaque à distance différée, pièges, cases de déploiement,
règle anti-répétition, détection du mat, roster de pièces, téléporteurs, poussée,
objets bloquant la LOS.

Avant d'implémenter l'un d'eux, relire la section 6 de `docs/design.md` (pistes déjà
écartées) et `docs/implementation-notes.md` (interprétations non validées).
