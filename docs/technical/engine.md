# Le moteur de rendu et le client — `apps/web`

Rendu isométrique filaire en dessin procédural : aucun sprite, aucune texture, aucun
moteur 3D. Tout est tracé en traits par `Graphics` de PixiJS 8, à partir des coordonnées
logiques de `packages/core`. Toute partie est arbitrée par le serveur : le client porte les
écrans de compte et de menu, l'entrée en partie, puis le plateau — à la souris ou au
clavier.

## Ce que le client fait, et ne fait pas

**Fait** : les écrans de compte et de menu, l'entrée en partie (appariement rapide,
salon privé, entrée par code), puis la partie elle-même — projection isométrique avec
hauteur, rotation libre du plateau, zoom et déplacement de la caméra, survol, **sélection
d'une pièce au clic et déplacement animé**, saisie de coups au clavier, occlusion du
relief et des pièces, fog of war et fantômes.

**Ne fait pas** : **aucune partie locale**. Il n'existe pas de mode hot-seat ni de
démonstration hors ligne : tant que le serveur n'a pas assis le joueur, il n'y a rien à
jouer et le canevas reste masqué (`docs/design.md` section 2, « pas de local
multiplayer »). **Aucune capture non plus** : la règle est retirée du moteur
(`docs/design.md` section 3.1, suspendue), donc un tour se réduit à un déplacement et une
pièce adverse n'est ni une cible ni une destination — juste un obstacle.

## L'organisation des dossiers

Le dossier dit la **classe de dépendance** du module, pas seulement son sujet. C'est ce
qui permet de savoir d'un coup d'œil ce qui est testable sans navigateur.

| Dossier | Contenu | Dépendances |
|---|---|---|
| `view/` | Projection, caméra, désignation, animation | **Aucune** — ni PixiJS, ni DOM |
| `game/` | La partie côté client, la sélection, le scénario | **Aucune** — ni PixiJS, ni DOM |
| `net/` | La lecture des messages du serveur | **Aucune** sauf `channel.ts` (WebSocket) |
| `scene/` | Le dessin | PixiJS |
| `input/` | Les gestes sur le canevas | DOM |
| `ui/` | Les écrans et le bandeau de partie | DOM sauf `flow.ts`, `messages.ts`, `command.ts` |
| `account/` | L'écran de compte, îlot React sur `@occulis/ui` dans la page du jeu | React, DOM et réseau sauf `model.ts` |
| `profile/` | La page de profil, page à part sous `/profile/`, en React sur `@occulis/ui` | React, DOM et réseau sauf `model.ts` |
| `i18n/` | La langue courante (`current.ts`) et son choix dans le navigateur (`browser.ts`) | Aucune sauf `browser.ts` (DOM, stockage, cookie) |
| `team/` | Le brouillon d'équipe (`model.ts`), le constructeur (`TeamBuilder.tsx`) et son plateau (`placement-canvas.ts`) | React, DOM sauf `model.ts` |
| `prepare/` | Les îlots d'avant-partie : fenêtre d'acceptation et déploiement (annonce de l'adversaire comprise) | React, DOM sauf `model.ts` |
| `teams/` | Les équipes préparées, depuis le menu | React, DOM et réseau |
| `canvas/` | Les primitives du plateau en Canvas 2D, partagées par le rejeu et le déploiement | DOM (canevas) |
| `admin/` | Le back-office, page à part sous `/admin/`, en React sur `@occulis/ui` | React, DOM et réseau sauf `model.ts` et `replay.ts` |
| racine | `main.ts` (composition) et `theme.ts` (tokens de DA) | — |

Les modules de `view/`, `game/` et `net/session.ts` sont purs : c'est là que vivent tous
les tests, avec `ui/flow.ts`, `ui/command.ts`, `ui/messages.ts`, `account/model.ts`,
`profile/model.ts` et `admin/model.ts`. `net/channel.ts` est la
seule exception de son dossier — il ouvre le socket, et rien d'autre.

## Le pipeline, de bout en bout

Rien de tout cela n'existe avant qu'une partie ne commence : les écrans passent d'abord
par `ui/flow.ts`.

```
  ── ENTRÉE EN PARTIE ────────────────────────────────────────────────
  main.ts        ── whoAmI() ─────────────► identity  (account/ si personne)
  ui/shell.ts    ── clic sur une entrée ──► seek
        │  ui/flow.ts        ── advance() : auth → menu → waiting → game
        └─► net/queue-channel.ts ── joinQueue(intent)
                 └─ matched ─► net/match-channel.ts ── connectToMatch()
                                    └─ welcome + view ─► game/online-match.ts
```

Une fois assis, deux chemins d'entrée convergent sur la même application d'action, puis
sur le rendu.

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
        ├─► game/online-match.ts ── envoie l'action, applique l'anticipation locale
        ├─► view/animation.ts    ── startMove() si la pièce change de case
        └─► console.refresh()    ── état du tour, DIFFÉRÉ à la fin de l'animation

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
| `apps/web/src/game/online-match.ts` | La partie arbitrée par le serveur, vue du client | oui |
| `apps/web/src/game/hypothesis.ts` | `PlayerView` → position telle que le joueur peut la croire | oui |
| `apps/web/src/game/movement-diff.ts` | Ce que deux vues successives ont fait bouger | oui |
| `apps/web/src/game/selection.ts` | Sélection d'une pièce et résolution d'un clic | oui |
| `apps/web/src/game/scenario.ts` | Résout la carte annoncée par le serveur | oui |
| `apps/web/src/net/session.ts` | Réduction des messages serveur en état de session | oui |
| `apps/web/src/net/queue-channel.ts` | Le canal de la file : appariement, salon, entrée par code | non |
| `apps/web/src/net/match-channel.ts` | Le canal d'une partie : transport + interprétation | non |
| `apps/web/src/net/channel.ts` | Transport WebSocket et reconnexion | non |
| `apps/web/src/net/backoff.ts` | Délai avant la n-ième tentative de reconnexion | oui |
| `apps/web/src/ui/flow.ts` | Quel écran a lieu d'être : compte, menu, attente, partie | oui |
| `apps/web/src/ui/shell.ts` | Les écrans hors partie : affichage et gestes | non |
| `apps/web/src/account/AccountApp.tsx` | Écran de compte : connexion, inscription, oubli, réinitialisation, Google | non |
| `apps/web/src/account/mount.tsx` | Monte l'îlot de compte dans `#account-root` | non |
| `apps/web/src/account/model.ts` | Parcours ↔ URL, messages de retour, refus rattachés à leur champ, indication de longueur | oui |
| `apps/web/src/net/auth.ts` | Appels d'authentification et traduction des refus | non (sauf `authMessage()`, `redirectMessage()`) |
| `apps/web/src/i18n/current.ts` | La langue courante et son dictionnaire, sans DOM | oui |
| `apps/web/src/i18n/browser.ts` | Choix de langue (stockage, cookie, `<html lang>`) et remplissage du HTML statique (`data-i18n`) | non |
| `apps/web/src/team/model.ts` | Le brouillon d'une équipe : emplacements, clic sur une case, échange, remplissage ; verdict délégué à `validateTeam()` | oui |
| `apps/web/src/team/TeamBuilder.tsx` | Le constructeur d'équipe : emplacements, plateau, actions | non |
| `apps/web/src/team/placement-canvas.ts` | Le plateau de placement en Canvas 2D : zones, pièces posées, survol, clic | non |
| `apps/web/src/canvas/paint.ts` | Relief, cases et pièces en Canvas 2D, avec la géométrie du jeu | non |
| `apps/web/src/prepare/model.ts` | Temps restant, envoi automatique, presets jouables, équipe préchargée | oui |
| `apps/web/src/prepare/MatchFound.tsx` | La fenêtre « partie trouvée » | non |
| `apps/web/src/prepare/Deployment.tsx` | L'écran de déploiement : annonce de l'adversaire, compte à rebours, constructeur, verrou | non |
| `apps/web/src/prepare/Plates.tsx` | La plaque d'un joueur depuis sa `PlayerCard` | non |
| `apps/web/src/prepare/clock.ts` | `useRemaining()`, le seul minuteur des écrans d'avant-partie | non |
| `apps/web/src/prepare/mount.tsx` | Monte les deux îlots dans `#match-found-root` et `#deploy-root` | non |
| `apps/web/src/teams/TeamsApp.tsx` | La liste des équipes préparées et leur éditeur | non |
| `apps/web/src/teams/mount.tsx` | Monte l'îlot dans `#teams-root` | non |
| `apps/web/profile/index.html` | Page de profil, troisième entrée Vite | — |
| `apps/web/src/profile/main.tsx` | Point d'entrée du profil : monte `App` | non |
| `apps/web/src/profile/App.tsx` | Compte, sécurité, sessions, suppression, parties et replay de son point de vue | non |
| `apps/web/src/profile/api.ts` | Appels `/api/me/*` et routes de compte de Better Auth | non |
| `apps/web/src/profile/model.ts` | Routes du profil, messages d'arrivée, délai de pseudo, liaison retirable, images du replay | oui |
| `apps/web/src/scene/scene.ts` | Couches PixiJS et détection de changement | non |
| `apps/web/src/scene/terrain.ts` | Géométrie d'une case | non |
| `apps/web/src/scene/pieces.ts` | Silhouette d'une pièce | non |
| `apps/web/src/scene/overlay.ts` | Survol et sélection | non |
| `apps/web/src/input/controls.ts` | Gestes du canevas → intentions | non |
| `apps/web/src/ui/command.ts` | Grammaire de la saisie de coups | oui |
| `apps/web/src/ui/messages.ts` | Tous les textes de l'interface | oui |
| `apps/web/src/ui/palette.ts` | Passe le code couleur au CSS | non |
| `apps/web/src/ui/console.ts` | Bandeau de partie : saisie de coups et comptes rendus | non |
| `apps/web/src/ui/ui.css` | Mise en page des écrans — **aucune couleur en dur** | — |
| `apps/web/admin/index.html` | Page du back-office, seconde entrée Vite | — |
| `apps/web/src/admin/main.tsx` | Point d'entrée du back-office : monte `App` | non |
| `apps/web/src/admin/App.tsx` | Racine : garde d'affichage, barre du haut, aiguillage des vues | non |
| `apps/web/src/admin/views.tsx` | Vue d'ensemble, comptes, fiche, profil, liste des parties | non |
| `apps/web/src/admin/MatchDetail.tsx` | Détail d'une partie et son rejeu | non |
| `apps/web/src/admin/ReplayBoard.tsx` | Le canevas du rejeu, en composant React | non |
| `apps/web/src/admin/actions.tsx` | Actions rapides d'un compte et leurs fenêtres | non |
| `apps/web/src/admin/shared.tsx` | Pastilles d'état, résultat, table des parties | non |
| `apps/web/src/admin/hooks.ts` | `useRoute()` et `useLoad()` | non |
| `apps/web/src/admin/model.ts` | Routes du back-office et mise en mots des données | oui |
| `apps/web/src/admin/api.ts` | Appels `/api/admin/*` et `/api/auth/admin/*` | non |
| `apps/web/src/admin/replay.ts` | Rejeu : coups lus entre deux images, libellés, cadrage du plateau | oui |
| `apps/web/src/admin/replay-canvas.ts` | Rejeu : le plateau dessiné en Canvas 2D, avec la géométrie du jeu | non |

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

## `ui/flow.ts` et `ui/shell.ts` — les écrans

Il n'existe **aucune partie locale**. À l'arrivée sur la page, le canevas est masqué et
c'est le formulaire de compte qui occupe l'écran ; le jeu commence quand le serveur assied
le joueur, jamais avant (`docs/design.md` section 2).

`flow.ts` est **pur** : il dit quel écran a lieu d'être, pas à quoi il ressemble.

| Étape | Quand | Ce qu'on y voit |
|---|---|---|
| `auth` | Personne n'est connecté | L'îlot de compte : connexion, inscription, mot de passe oublié, réinitialisation |
| `menu` | Connecté | Partie rapide, créer une partie, rejoindre avec un code, **équipes** |
| `teams` | Entrée « Équipes » du menu | L'îlot des équipes préparées (`teams/`) |
| `waiting` | Une demande est partie | Le code du salon, ou l'attente d'un adversaire |
| `proposal` | File rapide : `proposal` reçu | La fenêtre « partie trouvée » par-dessus l'attente (`prepare/MatchFound.tsx`) |
| `deploying` | Assis, `deployment` reçu | L'annonce de l'adversaire et le constructeur d'équipe (`prepare/Deployment.tsx`) |
| `game` | Le serveur a répondu `welcome` + `view` | Le plateau et le bandeau de partie |

Les transitions ajoutées : `proposed` n'ouvre la fenêtre que depuis une attente **rapide** ;
`lapsed` remet en attente qui avait accepté (`requeued`), au menu les autres ; `deploying`
vient de l'attente ou de la fenêtre, jamais d'une partie commencée (une reconnexion qui
réannoncerait le déploiement n'en fait pas sortir) ; `teams` ne s'ouvre que depuis le menu.

`advance(stage, event)` encode trois précautions qui ne se voient pas sur le schéma :

- **Une déconnexion ramène au formulaire d'où que l'on soit**, partie comprise : sans
  session, ni la file ni le Durable Object n'accepteraient plus rien de ce client.
- **Une identité reconfirmée n'arrache personne à sa partie.** `whoAmI()` est rappelé après
  chaque action de compte, donc aussi en pleine partie ; seul un passage depuis `auth`
  ouvre le menu.
- **Un `hosting` arrivé après l'appariement est ignoré.** C'est un message en retard, et
  l'afficher ferait revenir un joueur déjà assis à l'écran d'attente.

`shell.ts` est le pendant DOM : il montre ce que `flow.ts` a décidé, désactive les entrées
du menu tant que l'adresse n'est pas vérifiée, met la saisie du code en capitales, et rend
les gestes du joueur à `main.ts`. Il ne décide rien et n'appelle jamais le réseau.

**Le conteneur des écrans couvre la page mais ne l'intercepte pas** (`pointer-events:
none`, rendu aux écrans eux-mêmes) : pendant une partie il est vide, et un clic doit
atteindre le canevas qui est dessous.

---

## `game/hypothesis.ts` — la position telle que le joueur peut la croire

En ligne, le client **n'a pas** la position : le serveur ne lui envoie que son
`PlayerView`, et c'est tout l'intérêt du fog of war. Or désigner une case au clic demande
un `GameState`. `hypothesisFrom()` en fabrique un depuis la seule vue : ses propres
pièces, les adverses réellement visibles, rien d'autre.

**Elle ne sert qu'à la géométrie** — quelle pièce occupe telle case, à qui appartient-elle.
Aucune décision n'en est tirée, parce qu'elle est fausse dans les deux sens : ignorant les
pièces hors LOS, elle croit libres des cases occupées et ne voit pas les menaces cachées,
mais elle croit aussi libre de passer un attaquant qu'une pièce invisible bloque. La
légalité arrive du serveur, dans `PlayerView.legalActions`.

Les fantômes en sont exclus : un souvenir peut être périmé, et l'ériger en obstacle
masquerait des coups réellement jouables (`implementation-notes.md` point 16).

---

## `game/movement-diff.ts` — ce que la vue a fait bouger

`movementBetween(before, after)` rend le déplacement décrit par deux vues successives.
C'est ce qui remplace l'anticipation locale : le client n'applique plus les coups, donc il
lit ce qui a bougé dans ce que le serveur lui envoie — et **les coups de l'adversaire
s'animent enfin**, alors qu'ils apparaissaient d'un coup.

Seules les pièces **présentes dans les deux vues** sont comparées. Sous fog, une pièce qui
entre ou sort de la ligne de vue n'a pas bougé pour autant : l'animer dessinerait un trajet
qui n'a pas eu lieu, et trahirait une position que le joueur n'est pas censé connaître.

---

## `game/online-match.ts` — la partie arbitrée par le serveur

**Jouer n'écrit rien.** `play()` valide localement — de quoi répondre tout de suite sur ce
que le client peut juger seul, pièce hors de portée ou pas au trait — puis envoie, et
s'arrête là. Seule la vue suivante déplace une pièce. `receive()` est donc le **seul**
chemin par lequel l'état entre, ce qui rend toute divergence impossible par construction ;
il rend au passage le déplacement à animer (`movement-diff.ts`).

Le client anticipait autrefois le coup, pour ne pas figer le plateau pendant l'aller-retour
réseau. Il en résultait un blocage complet à chaque refus : le coup était appliqué et le
trait passé à l'adversaire, le serveur refusait **sans rediffuser de vue** (les deux
branches de refus de `MatchDO.play` sortent avant `broadcastViews`), et plus rien n'était
sélectionnable — le client se croyait hors trait alors que le serveur attendait toujours
son coup, donc l'adversaire ne jouait pas et aucune vue ne venait. Seule une reconnexion
du WebSocket débloquait la partie. Un aller-retour est sans conséquence dans un jeu au tour
par tour sans limite de temps de réflexion (`docs/design.md` section 2) ; une
désynchronisation, elle, casse la partie.

`main.ts` tient un **coup en attente** entre l'envoi et la réponse : tant qu'il est en vol,
clic et clavier sont inertes, sans quoi deux clics enverraient deux coups pour le même
tour. L'attente se lève sur une vue **comme** sur un refus — un refus ne consomme rien, le
joueur enchaîne aussitôt sur un autre coup.

`viewFor()` rend toujours la même vue, quel que soit le joueur demandé : il n'en existe
qu'une côté client, celle du siège. Regarder le plateau avec les yeux d'en face n'a pas de
sens en ligne, et la bascule de point de vue est désactivée dans ce mode.

---

## Le compte

L'écran de compte est un **îlot React sur la charte** (`account/`), monté par
`mountAccount()` dans `#account-root`, à l'intérieur de `#screen-auth` que `shell.ts` montre
ou masque comme les autres écrans. C'est le premier écran du jeu à avoir migré sur
`@occulis/ui` ; le menu, l'attente et la partie restent en DOM natif.

`net/auth.ts` appelle `/api/auth/*`. **Le jeton de session n'apparaît nulle part dans ce
code** : il vit dans un cookie `HttpOnly`, que le navigateur joint seul et qu'aucun script de
la page ne peut lire — un jeton lisible en JavaScript est un jeton exfiltrable.

### Écrit pour les gestionnaires de mots de passe

C'est par eux que passe un mot de passe solide, et l'ancien écran — un formulaire unique dont
on masquait des champs selon un onglet — ne leur permettait pas de distinguer une connexion
d'une inscription. Les règles :

- **un `<form>` par parcours, chacun à son URL** : `/sign-in` (et `/`), `/sign-up`,
  `/forgot-password`, `/reset-password` (`ROUTE_PATHS`, `routeOf()`, `pathOf()`). On passe
  de l'un à l'autre par `history.pushState`, sans recharger ; le Worker sert la page du jeu
  sur chacune ;
- des `autocomplete` exacts : l'adresse en `username` (avec `type="email"`), le mot de passe
  en `current-password` à la connexion, `new-password` ailleurs, avec `minlength`,
  `maxlength` et `passwordrules` (lu par Safari et 1Password pour générer un mot de passe
  conforme) ; le pseudo en `nickname`, **après** l'adresse, pour qu'il ne soit pas pris pour
  l'identifiant ;
- un vrai `<form method="post" action="/api/auth/…">`, intercepté en JS, puis **une
  navigation au succès** (`history.pushState("/")`) : c'est à elle que les gestionnaires
  reconnaissent une connexion réussie et proposent d'enregistrer ;
- la réinitialisation porte un champ `username` prérempli avec l'adresse saisie à la demande
  (`rememberResetEmail()`, en `sessionStorage`, propre à l'onglet) : sans lui, le
  gestionnaire ne saurait pas à quelle entrée rattacher le nouveau mot de passe ;
- l'adresse saisie suit d'un parcours à l'autre, et un bouton (`PasswordField`) affiche le
  mot de passe sans jamais changer le type du champ tant qu'on ne le demande pas.

Un refus du serveur s'affiche **sous le champ qu'il concerne** (`fieldOf()` : `HANDLE_*` sous
le pseudo, `PASSWORD_*` sous le mot de passe, adresse prise sous l'adresse), qui reçoit le
focus ; les autres en tête du formulaire (`FormMessage`). « Adresse ou mot de passe
incorrect » n'est rattaché à aucun champ : le serveur ne dit pas lequel.

**Google** : le bouton « Continuer avec Google » n'apparaît que si `/api/auth/me` liste
`google` dans `providers`. `signInWithGoogle()` demande l'adresse de consentement au serveur
et y part dans la page même. Un compte créé par ce chemin arrive sur `/profile/?welcome=1`,
pour voir et changer le pseudo dérivé de son nom Google ; une erreur revient sur
`/sign-in?error=…`.

### Les retours par l'URL

Le serveur ne parle au retour d'un lien ou de Google qu'en paramètres d'URL : `?verified=1`
(adresse confirmée), `?deleted=1` (compte supprimé), `?error=…` (lien expiré, liaison
refusée…), `?token=…` (réinitialisation). `main.ts` lit le parcours (`routeOf()`) et le
message (`arrivalNotice()`) **avant** de retirer ces paramètres (`cleanedSearch()`,
`history.replaceState`) : le jeton de réinitialisation ne doit rester ni dans la barre
d'adresse ni dans l'historique. Le message s'affiche dans l'îlot si personne n'est connecté,
sous le menu sinon. Un lien expiré propose d'en redemander un (`retry`).

**L'état affiché n'est jamais déduit de ce qu'on vient d'envoyer** : après chaque action,
`refresh()` (`main.ts`) redemande l'identité au serveur. Lui seul sait si l'adresse est
vérifiée, et c'est ce qui ouvre ou ferme le jeu en ligne. Connecté sur une URL de parcours,
la page revient à `/`.

### Le menu

**Pendant une usurpation** (`/api/auth/me` rend `impersonating: true`), un bandeau
`#impersonation` reste affiché au-dessus de tous les écrans, partie comprise, avec le pseudo
incarné et un bouton **Revenir à mon compte** : `stopImpersonating()` (`net/auth.ts`) rend sa
session à l'administrateur, et la page repart vers `/admin/`. Jouer sous un nom d'emprunt ne
doit jamais passer inaperçu.

Le **coin du compte** (`#account-corner`), en haut à droite hors du panneau, affiche le
pseudo et mène au profil : ce n'est pas un geste de jeu, il n'a pas sa place parmi les
entrées du menu. `shell.ts` ne le montre **qu'au menu** — en attente il ferait quitter la
file, en partie le siège. Le menu porte en pied un lien
**Back-office** pour les administrateurs (`#menu-admin` : `/api/auth/me` rend `admin: true`,
et `shell.setIdentity()` démasque le lien — le serveur revérifie le rôle à chaque appel), et
**Se déconnecter**. Tant que l'adresse n'est pas vérifiée, **Renvoyer le message de
vérification** (`#account-resend`) l'expédie à `identity.email`, l'adresse que rend
`/api/auth/me` — et non plus un champ du formulaire de connexion, vide une fois connecté.

Les trois entrées du menu restent désactivées tant que personne n'est connecté **ou tant
que l'adresse n'est pas vérifiée** : la file répondrait 401 dans le premier cas, 403 dans
le second. `describeIdentity()` (`ui/messages.ts`) dit laquelle des deux raisons s'applique —
sans quoi des boutons désactivés n'auraient aucune explication à l'écran.

### La traduction des refus

`authMessage()` s'accroche au **code** renvoyé par le serveur, jamais à la phrase : le
message d'une bibliothèque change sans prévenir, son code est un contrat. Deux refus
restent volontairement indiscernables, parce que le serveur les rend indiscernables :
adresse inconnue et mot de passe faux d'un côté, adresse inscrite ou non à la demande de
réinitialisation de l'autre. Les distinguer à l'écran annulerait la précaution serveur.
Un 429 annonce la limitation de débit, sauf `HANDLE_COOLDOWN` (le délai de pseudo).

`redirectMessage()` traduit les erreurs portées par l'URL : en majuscules pour les liens de
Better Auth (`INVALID_TOKEN`), en minuscules pour l'OAuth (`account_not_linked`,
`access_denied`…). `account_not_linked` explique la règle de liaison : un compte dont
l'adresse n'a jamais été confirmée ne se lie pas à Google, sans quoi inscrire une adresse
d'avance suffirait à capter le futur compte Google de son propriétaire.

## `profile/` — la page de profil

Une **page à part**, `apps/web/profile/index.html`, servie sous `/profile/`, en React sur
`@occulis/ui` comme le back-office, sans PixiJS ni classe propre. Elle charge `/api/me` ;
un 401 affiche un lien vers `/sign-in`.

| Vue | Fragment | Contenu |
|---|---|---|
| Compte | `#/` (et `#security`, l'ancre des courriers et de `/.well-known/change-password`) | Compte (pseudo, adresse), bilan, connexion et sécurité (mot de passe, Google), sessions, zone sensible |
| Parties | `#/matches?offset=` | Ses parties, son camp, l'adversaire, le résultat de son point de vue |
| Partie | `#/matches/<id>` | Le replay **de son point de vue** |

- **Tout est en lecture d'abord** (`SettingRow`) : chaque réglage montre sa valeur et un
  bouton (« Modifier », « Changer », « Définir »), qui déplie son éditeur dans la ligne
  (`SettingEditor`). **Un seul éditeur ouvert à la fois** (`Editing`), Échap annule, le refus
  du serveur reste dans l'éditeur, un succès le referme avec un message et relit le compte.
  Le bouton du pseudo est grisé pendant le délai, dont la date s'affiche à sa place.
- **Mot de passe** : l'éditeur est un vrai formulaire avec un champ `username` caché égal à
  l'adresse, pour que le gestionnaire mette à jour la bonne entrée. Un compte Google sans
  mot de passe reçoit à la place **Définir**, qui envoie le lien de réinitialisation après
  confirmation.
- **Google** : lier (`linkGoogle()`, retour sur `?linked=google#security`) ou retirer ; retirer
  est grisé quand Google est la seule méthode de connexion (`canUnlink()`).
- **Sessions** : la liste de `/api/me/sessions`, l'appareil courant marqué, chaque autre
  fermable, ou toutes d'un geste.
- **Suppression** : une fenêtre de confirmation, puis un lien par courrier ; rien n'est
  supprimé avant son ouverture.
- **Replay** : `asBoardFrames()` adapte les images du serveur au plateau rejoué du
  back-office (`admin/ReplayBoard.tsx`, réutilisé tel quel), avec la seule ligne de vue de
  son camp et le point de vue fixé sur lui.
- **Pendant une usurpation**, un bandeau signale la lecture seule, aucun réglage n'a de
  bouton d'édition et chaque geste est grisé — le serveur les refuse de toute façon.

Comme pour le back-office, **la page ne décide d'aucun accès** : tout ce qu'elle grise, le
serveur le refuse (`docs/technical/server.md`, « `me/` »).

## `net/` — la session en ligne

| Fichier | Rôle |
|---|---|
| `session.ts` | **Pur.** Réduit `QueueServerMessage` et `ServerMessage` en un état affichable |
| `backoff.ts` | **Pur.** Délai exponentiel borné avant la n-ième reconnexion |
| `queue-channel.ts` | Ouvre le canal de la file — appariement, salon privé, entrée par code ; `accept()` / `decline()` répondent à la proposition en cours |
| `match-channel.ts` | Ouvre le canal d'une partie et traduit l'état de session en appels ; `deploy()` envoie l'équipe |
| `channel.ts` | Le WebSocket lui-même et sa reconnexion |

**Une coupure n'est pas une fin de partie.** Le temps de réflexion est illimité
(`docs/design.md` section 2), donc un socket peut tomber en cours de route. Aucun protocole
de reprise n'est nécessaire : le Durable Object reconstruit l'état depuis le log et
rediffuse les vues à chaque `hello`, donc **se reconnecter suffit**. Seul le code de
fermeture 4001 (protocole incompatible) arrête les tentatives — les répéter ne ferait que
répéter le refus.

Le découpage a une raison : la lecture des messages est la partie qui mérite des tests, et
elle n'a besoin d'aucun socket. `session.ts` ne décide de rien non plus — le client ne
connaît son camp qu'à réception de `welcome`, et la position que par les vues reçues.

**`welcome` et la première `view` ne sont pas ordonnés.** Le serveur rediffuse les vues aux
deux joueurs à chaque `hello` : un client peut donc recevoir une vue avant son propre
`welcome`. `match-channel.ts` attend d'avoir camp, carte **et** vue avant de construire la
partie, plutôt que de supposer un ordre (vérifié en conditions réelles).

**Les trois façons d'entrer en partie passent par un seul canal.** L'intention voyage dans
le `hello` (`quick`, `host`, `join`) et non dans l'URL : le serveur ne doit pouvoir faire
attendre un joueur qu'à un seul endroit (voir [server.md](server.md), `QueueDO`). Changer
d'intention, c'est donc refermer ce canal et en rouvrir un — ce que fait `main.ts` à chaque
entrée de menu. Le canal se referme aussi de lui-même sur `matched` (la suite se joue sur
celui de la partie) et sur `room-fault` (ce code n'amènera jamais d'adversaire).

Le `hello` étant renvoyé à chaque reconnexion, un hôte qui perd son socket **retrouve le
code de son salon** plutôt qu'un nouveau : c'est le serveur qui le garantit, mais c'est le
renvoi de l'intention qui le déclenche.

**La file rapide passe par une proposition.** `session.ts` en tient deux phases de plus :
`proposed` (identifiant, temps restant, qui a accepté) et `lapsed` (`requeued`).
`queue-channel.ts` rend `onProposal` à chaque proposition et acceptation, `onLapsed` à la
chute — et se referme si le joueur est sorti de la file.

**Le déploiement est une phase de la session assise** : `deployment` en garde l'annonce
(`DeploymentState`), `deployment-update` y met à jour les verrous, et la première `view`
l'efface. `match-channel.ts` rend `onDeployment` tant qu'aucune vue n'est arrivée — à
l'annonce, à chaque verrou, et à chaque reconnexion, le serveur réannonçant la phase au
`hello`.

Les URL sont **relatives** : le client est servi par le Worker lui-même, donc de même
origine (`docs/architecture.md` section 4). Seule la future distribution Electron demandera
une URL absolue.

---

## `game/selection.ts` — sélection et clic

Module pur. **Rien n'y est recalculé** : les possibilités sont filtrées depuis la liste de
coups légaux que le serveur a jointe à la vue, jamais redéduites. Un coup affiché est donc
un coup que le serveur acceptera, et aucun coup jouable n'est escamoté.

La liste est passée en paramètre (`selectionFor(legal, piece)`, `resolveClick(legal,
state, …)`) plutôt que recalculée sur place : le client ne saurait pas la produire juste,
il ne voit qu'un camp — et depuis que les pièces occultent la vue, il en voit moins encore.

```ts
interface Selection {
  piece: Piece;
  moves: ReadonlyMap<CoordKey, Coord>;   // cases où se rendre
}

type ClickOutcome =
  | { kind: "select"; selection: Selection }
  | { kind: "play";   action: Action }
  | { kind: "clear" }
```

| Fonction | Rôle |
|---|---|
| `selectionFor()` | Ce qu'une pièce peut faire ce tour-ci, filtré depuis la liste du serveur |
| `resolveClick()` | Ce qu'un clic doit produire. **Fonction totale et sans effet** |

### La machine à états, telle que `resolveClick()` l'encode

| Situation | Résultat |
|---|---|
| Clic hors plateau, ou partie terminée | `clear` |
| Sélection active, clic sur la pièce elle-même | `clear` — recliquer désélectionne |
| Sélection active, clic sur une destination | `play` d'un déplacement |
| Clic sur une de ses pièces, à son tour | `select` |
| Tout le reste | `clear` |

Une limite assumée : on ne sélectionne que ses propres pièces **et seulement à son tour**.
Une pièce adverse, adjacente ou non, retombe donc sur `clear` — il n'y a plus rien à lui
faire depuis le retrait de la capture, et `Selection` ne porte plus de `strikes`.

---

## `ui/command.ts` — la grammaire de saisie

Module pur : la résolution d'une coordonnée en pièce lui est **fournie**.

```
  1,6 2,5        déplace la pièce en (1,6) vers (2,5)
  1,6 > 2,5      identique : la flèche est facultative
  abandon        abandonne la partie
```

La syntaxe `x` de capture a disparu avec la règle (`docs/design.md` section 3.1).

| Fonction | Rôle |
|---|---|
| `tokenize()` (privée) | Normalise séparateurs et espaces |
| `parseCoord()` (privée) | `"1,6"` → `Coord` |
| `parseCommand()` | Texte → `Result<Command, CommandFault>` — syntaxe seule |
| `toAction()` | `Command` → `Action`, en résolvant les coordonnées |

**`toAction()` est le seul endroit du client où les coordonnées du joueur rejoignent les
identifiants de pièces de `core`** — `core` raisonne en `PieceId`, le joueur en cases.
`CommandFault` couvre les fautes de saisie ; les refus de règle restent des `ActionError`
de `core`.

---

## `i18n/` — la langue

**Aucun texte affiché n'existe en français seul** : tous vivent dans `@occulis/i18n`
(`packages/i18n`), en anglais — la langue par défaut et la langue source — et en français.
Le dictionnaire français est typé sur la forme de l'anglais (`Messages`) : une clé oubliée,
ajoutée ou un message dont les paramètres changent ne compile pas. Un message paramétré est
une fonction (`m.game.outdated(4)`), jamais une chaîne à trous : pas d'interpolation à
l'exécution, et les pluriels s'écrivent dans la fonction.

- `i18n/current.ts` porte **la langue courante**, sans DOM : `messages()` rend son
  dictionnaire, `setLocale()` la change et prévient les abonnés de `onLocaleChange()`. Les
  modules purs (`ui/messages.ts`, `account/model.ts`, `profile/model.ts`, `admin/model.ts`,
  `admin/replay.ts`, `net/auth.ts`) y lisent leurs phrases et restent testables — les tests
  dont les attentes sont en français appellent `setLocale("fr")` en tête de fichier.
- `i18n/browser.ts` choisit la langue au chargement (`initLocale()` : choix enregistré, puis
  `navigator.languages`, puis l'anglais — `resolveLocale()`), l'enregistre au changement
  (`chooseLocale()` : stockage local **et** cookie `occulis-locale`, que le serveur lit pour
  ses courriers), tient `<html lang>` à jour, et remplit le HTML statique :
  `translateDom()` donne son texte à chaque `data-i18n`, son indication à chaque
  `data-i18n-placeholder`, son `aria-label` à chaque `data-i18n-label`.
- Les composants React lisent la langue par `useMessages()` (`@occulis/ui`), que fixe
  `UiRoot locale={…}`. Chaque page la passe : l'îlot de compte la reçoit en propriété
  (`AccountAppProps.locale`), le profil et le back-office la tiennent dans un état et
  offrent un `LocaleSwitch` dans leur barre du haut.
- Dans la page du jeu, `#locale-switch` (en haut à gauche, hors partie) change la langue ;
  `main.ts` réécrit alors tout ce qui est affiché — HTML statique, écran courant, identité,
  îlot de compte. Un message déjà affiché (`notify`) garde sa langue d'origine.

## `team/` — le constructeur d'équipe

`team/model.ts` est **pur** : un `TeamDraft` est la liste des emplacements fixés par la
composition du ruleset (`emptyDraft()` : maîtresse, trois à capacité, quatre pions, la
maîtresse en main), chacun avec son type et sa case, et l'emplacement « en main ».

| Fonction | Rôle |
|---|---|
| `emptyDraft()`, `fromEntries()` | Un brouillon vide, ou rempli depuis une équipe (preset, équipe de la carte) — chaque entrée prend le premier emplacement libre de son rôle |
| `clickTile()` | Le clic sur une case : prendre une pièce posée ; poser la pièce en main sur une case de la zone, **en échangeant** avec celle qui s'y trouvait ; puis prendre en main le prochain emplacement vide |
| `select()`, `setKind()`, `remove()`, `clear()`, `autoFill()` | Choisir un emplacement, changer de type **dans son rôle seulement**, reprendre, tout retirer, poser le reste sur les cases libres |
| `toEntries()`, `isComplete()`, `placedCount()` | Ce qui part au serveur, et où l'on en est |
| `verdict()` | `validateTeam()` de `core` sur le brouillon — **la validité n'est jamais redéduite ici**, comme `game/selection.ts` ne redéduit pas la légalité |

`TeamBuilder.tsx` montre le brouillon : la liste des emplacements (`ChoiceList`, le type
d'une pièce à capacité au choix parmi ceux de son rôle), et le plateau. Il ne tient aucun
état — `draft` et `onChange` viennent de l'appelant, le déploiement ou les équipes.

`placement-canvas.ts` dessine le plateau en Canvas 2D, comme le rejeu et avec les
primitives de `canvas/paint.ts` : la page n'a pas encore de partie à confier à PixiJS, et
le même plateau sert hors partie. La zone du joueur est dans la teinte de son camp, celle
d'en face en pointillé dans la sienne, la pièce en main dans la teinte de la sélection — de
l'information de partie, donc en couleur. Les pièces portent **l'initiale de leur type**,
le seul endroit où elles se distinguent. Le camp B voit la carte retournée d'un demi-tour,
pour que sa zone se présente comme celle du camp A. Le clic passe par `tileAt()`
(`view/picking.ts`), ramené dans l'espace de la projection.

## `prepare/` — de l'appariement au premier tour

- **`MatchFound.tsx`** : la fenêtre « partie trouvée », un `Dialog` **non refermable**
  (`dismissible={false}`) — ne pas répondre revient à refuser. Accepter la laisse ouverte
  sur l'attente de l'autre ; « Refuser » envoie `decline`. Un compte à rebours
  (`CountdownRing`) et un titre d'onglet clignotant signalent la partie à qui fait autre
  chose.
- **`Deployment.tsx`** : l'annonce (`Reveal`, deux `PlayerPlate` : pseudo, Elo, bilan, faits
  exhibés par leur nom) entre en scène puis se range en bandeau au bout de 2,6 s ; dessous,
  le constructeur d'équipe, le compte à rebours, le choix d'un preset et **Verrouiller**.
  L'équipe préchargée est le preset par défaut s'il est jouable ici, sinon celle de la
  carte (`initialTeam()`) — remplacée à l'arrivée des presets tant que le joueur n'a touché
  à rien. **Juste avant l'échéance** (`AUTO_SEND_MS`, 1,5 s), un brouillon complet et
  valide part de lui-même (`shouldAutoSend()`). Un refus du serveur s'affiche et rend la
  main.
- **Le temps** : le serveur envoie un temps restant et non une échéance ;
  `remainingAt()` le décompte depuis l'arrivée du message sur l'horloge du client
  (`performance.now()`), et `useRemaining()` le réévalue quatre fois par seconde. Les
  durées totales de `constants.ts` ne servent qu'à proportionner les anneaux : les
  échéances restent tenues par le serveur.

`main.ts` tient les propriétés des trois îlots (`found`, `deploying`, `teamsOpen`) et les
rend toutes par `showIslands()`, après chaque message comme après un changement de langue.

## `teams/` — les équipes préparées

L'entrée **Équipes** du menu ouvre l'îlot : la liste (par défaut, caduque, dupliquer,
supprimer après confirmation, choisir celle par défaut) et l'éditeur, qui reprend
`TeamBuilder` **dans la zone du camp A** de la carte courante — un preset s'y écrit, et se
transpose au camp tenu au déploiement (`presetTeam()`). Les appels passent par
`profile/api.ts` (`/api/me/presets`), les mêmes que lit le déploiement. Le serveur valide
chaque équipe ; un preset que de nouvelles règles rendent caduc reste listé, grisé.

## `canvas/paint.ts` — le plateau en Canvas 2D

Les primitives communes au rejeu (`admin/replay-canvas.ts`) et au placement :
`terrainDrawables()` (le relief avec l'atténuation en profondeur du jeu, et un crochet pour
peindre une zone ou un survol **dans l'ordre du peintre**), `drawPiece()` (la silhouette de
`scene/pieces.ts`), `strokeQuad()`, `fillQuad()`.

## `ui/messages.ts` — tous les textes

Les phrases sont dans `@occulis/i18n` (domaine `game`) ; ce module choisit laquelle dire.

| Fonction | Rôle |
|---|---|
| `formatCoord()` | `Coord` → `"(x,y)"` |
| `describeFault()` | Faute de saisie → phrase |
| `describeActionError()` | `ActionError` de `core` → phrase |
| `describeMove()` | Compte rendu d'un coup joué |
| `describeOutcome()` | Fin de partie |
| `describeTurn()` | Ligne d'état : tour, joueur au trait, point de vue |
| `describeTile()` | Lecture d'une case désignée au clic |
| `describeRejection()` | Un refus du serveur : règle de coup, d'équipe, siège ou phase |
| `describeTeamError()` | Pourquoi une équipe n'est pas déployable |

`describeTile()` rend `"1,6 · height 0"` (`"1,6 · hauteur 0"` en français), avec
`· impassable` le cas échéant. La
coordonnée est écrite **sans parenthèses, sous la forme qu'attend la saisie** : recopiable
telle quelle. Elle ne rapporte **que du terrain** — le relief est public
(`docs/implementation-notes.md` point 10), mais annoncer la pièce présente divulguerait
une position hors LOS. Un test le verrouille.

---

## `ui/palette.ts` et `ui/console.ts`

`applyPalette()` convertit les tokens entiers de `theme.ts` en propriétés personnalisées
CSS (`--ink`, `--ink-soft`, `--ink-dim`, `--ink-faint`, `--panel`, `--accepted`, `--refused`)
pour les écrans du jeu ; la conversion est `cssColor()` de `@occulis/ui/tokens`. Le back-office
n'en dépend pas : il lit les `--occ-*` de la feuille de `@occulis/ui`, posées sur la racine du document. **Aucune couleur n'est réécrite en dur dans
`ui.css`.**

`ui/console.ts` porte le bandeau affiché **pendant une partie**, et rien d'autre : le
compte et le menu ont leurs écrans (`shell.ts`).

| Fonction | Rôle |
|---|---|
| `attachConsole()` | Installe le formulaire et rend un `GameConsole` |
| `refresh()` (interne) | Réécrit la ligne d'état |
| `showTile()` (interne) | Écrit la lecture d'une case désignée au clic |
| `report()` (interne) | Écrit un compte rendu et son état `ok`/`ko` |
| `playAction()` (interne) | Joue une action **et la rapporte** ; rend `true` si acceptée |
| `submit()` (interne) | Analyse la saisie, puis délègue à `playAction()` |

**L'application d'une action lui est fournie (`play`), pas prise sur la partie.** C'est
l'appelant qui décide ce qu'un coup déclenche — animation, passage de main — et ce module
n'en sait rien. C'est aussi ce qui fait qu'un coup cliqué et un coup tapé sont rapportés
exactement de la même façon : `main.ts` appelle `gameConsole.playAction()` pour le clic.

`GameConsole` expose `refresh()`, `report()`, `showTile()` et `playAction()`. La partie lui
est fournie **par accès** (`match: () => OnlineMatch | undefined`) : elle change d'objet à
chaque appariement, et n'existe pas du tout tant que le joueur est au menu — auquel cas la
console s'efface au lieu de lever.

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
les efface devant une saisie en cours — sans quoi une flèche tapée dans le champ de
commande ferait pivoter le plateau.

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
| `drawSelection()` | `scene/overlay.ts` | Destinations, puis la pièce |

L'opacité d'une case est le produit de trois facteurs, dans `drawTile()` :

```
alpha = (visible ? alphaVisible : alphaFogged)
      × (passable ? 1 : impassableFactor)
      × depthAlpha(proximité)
```

`drawSelection()` dessine les destinations, **puis** la case d'origine — pour que celle-ci
reste lisible quand des destinations la jouxtent.

`drawPiece()` dérive ses proportions de la projection, ce qui la fait suivre le zoom sans
réglage séparé. Aucun type de `packages/core/src/pieces/` ne porte de champ visuel : la
correspondance `kind` → forme appartient donc à ce module. Le roster n'étant pas acté,
**toutes les pièces partagent aujourd'hui la même silhouette**.

---

## `theme.ts` — le code couleur

Code couleur acté dans `docs/design.md` section 8.1, **provisoire**. Les **valeurs** de couleur
(`BACKGROUND`, camps, états) viennent de `@occulis/ui/tokens`, seule source du projet
(`docs/technical/ui.md`) ; `theme.ts` les reprend et y ajoute ce qui n'appartient qu'au rendu
PixiJS — métriques, alphas, épaisseurs :

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

`eslint.config.js` interdit tout littéral de couleur dans `apps/web/src/**` et
`packages/ui/src/**` (`.ts` et `.tsx`), avec une exception unique : `packages/ui/src/tokens.ts`.
Deux sélecteurs `no-restricted-syntax` couvrent `0xffffff` (par le `raw`) et `"#ffffff"` (par
la valeur). Le CSS échappe à ESLint : `ui/palette.ts` y soumet les écrans du jeu, et les tests
de `@occulis/ui` gardent sa feuille.

---

## `main.ts` — la racine de composition

| Fonction | Rôle |
|---|---|
| `main()` | Initialise PixiJS et `Scene`, câble tout, lance le ticker |
| `element()` | Résout un `id` du DOM ou lève |
| `intentOf()` | L'entrée de menu choisie → l'intention que la file attend |
| `go()` (interne) | Fait avancer `flow.ts` et réaffiche les écrans |
| `sit()` (interne) | Ouvre le canal de la partie et construit `OnlineMatch` à `welcome` |
| `leave()` (interne) | Referme file, canal et partie, vide la scène et rend la main au menu |
| `adopt()` (interne) | Une vue reçue fait autorité : efface sélection et animation |
| `play()` (interne) | **Le seul point d'application d'une action**, clic comme clavier |

### `play()` et le passage de main différé

`play()` lit la pièce et la destination **avant** d'appliquer — ensuite la pièce n'est plus
à sa place de départ — puis :

- si la pièce change de case, démarre l'animation et diffère le compte rendu ;
- sinon (frappe sur place, abandon), rafraîchit la ligne d'état immédiatement.

Le rafraîchissement est différé jusqu'à la fin de l'animation, dans le ticker : l'état du
tour ne doit pas annoncer un coup encore en cours de dessin.

**Il n'y a qu'un point de vue, celui du siège.** Le serveur n'envoie jamais la vue d'en
face — c'est tout l'objet du fog of war — donc aucun basculement de vue n'existe côté
client, et `input/controls.ts` n'a plus de raccourci pour cela.

`play()` est aussi le seul endroit à interroger `match`, qui peut être absent : au menu, il
n'y a rien à jouer.

---

## `index.html` et `ui/ui.css`

Les écrans et la saisie sont **en HTML et non dessinés dans le canevas** : des champs natifs
donnent gratuitement le focus, la saisie, l'autocomplétion et l'accessibilité. L'écran de
compte est en React sur la charte ; les autres restent en DOM natif, habillés par
`ui/ui.css`, dont les règles génériques (`button`, `form`) sont circonscrites pour ne pas
atteindre les composants `occ-*`.

| Élément | Rôle |
|---|---|
| `#app` | Hôte du canevas PixiJS — **masqué hors partie** |
| `#shell` | Conteneur des écrans, transparent aux clics |
| `#screen-auth` / `#account-root` | Compte : l'hôte de l'îlot React (`account/`) |
| `#impersonation` | Bandeau de session d'emprunt, au-dessus de tous les écrans — masqué hors usurpation |
| `#account-corner` | Pseudo et lien vers le profil, en haut à droite — montré au seul menu |
| `#screen-menu` | Identité, renvoi de vérification, partie rapide, création, entrée par code, lien du back-office (`#menu-admin`, administrateurs seuls), déconnexion |
| `#screen-waiting` | Le code du salon, sa copie, l'attente et son annulation |
| `#console` | Le bandeau de partie |
| `#status` | Ligne d'état : tour, camp au trait, camp du joueur |
| `#tile-readout` | Lecture de la case désignée au clic |
| `#command-form` / `#command-input` | La saisie |
| `#command-log` | Compte rendu, coloré par `data-state="ok"` ou `"ko"` |
| `#command-help` | Rappel de la grammaire |
| `#leave-match` | Quitte la partie et revient au menu |

`applyPalette()` porte les variables de couleur, posées sur la racine du document. La règle
`[hidden] { display: none !important }` est nécessaire : les `display: flex` de la feuille
l'emporteraient sinon sur l'attribut, et un écran masqué resterait visible.

---

## `admin/` — le back-office

Une **page à part**, `apps/web/admin/index.html`, servie sous `/admin/`, **en React sur les
composants de `@occulis/ui`** (`docs/technical/ui.md`). Elle ne charge ni PixiJS ni le moteur
de jeu, et le jeu n'embarque rien d'elle. Elle n'a **ni classe ni feuille propres** : tout ce
qui manquait à une vue (`Toolbar`, `Versus`…) a été ajouté à la charte, pas à la page.

**La garde réelle est côté serveur.** `App` interroge `whoAmI()` et n'affiche rien à qui n'est
pas connecté ou pas administrateur, mais ce n'est qu'une politesse : chaque appel d'`api.ts`
est revérifié par `handleAdmin()` ou par le greffon Better Auth (`docs/technical/server.md`,
« `admin/` »). Pendant une usurpation, la page n'affiche que le bouton de retour.

**Le routage tient dans le fragment** (`#/users/<id>`, `#/matches?status=ongoing`…) : la page
reste un seul fichier statique, et une fiche se partage par son lien. `parseRoute()` et
`routeHash()` (`model.ts`) sont inverses l'un de l'autre, ce que les tests vérifient ;
`useRoute()` (`hooks.ts`) suit `hashchange`. `App` rend la vue sous une clé égale à la route,
ce qui rejoue l'animation d'entrée (`occ-enter`) à chaque navigation.

**Les données passent par `useLoad(key, load)`** : une réponse arrivée après un changement de
`key` est jetée — une navigation rapide n'affiche jamais la vue d'avant — et `reload()` relit
depuis le serveur après chaque geste, pour que l'écran montre ce que la base contient et non ce
qu'on vient d'envoyer.

| Route | Vue (`views.tsx`, `MatchDetail.tsx`) | Contenu |
|---|---|---|
| `#/` | `Overview` | Les huit compteurs de `/api/admin/stats`, les dernières parties, les derniers inscrits |
| `#/users?q=&offset=` | `UserList` | Recherche (par adresse si la saisie contient `@`, par pseudo sinon), table paginée avec les **actions rapides** de chaque compte, création en fenêtre modale |
| `#/users/<id>` | `UserDetail` | `Hero` (insigne, pastilles, actions rapides), bandeau de suspension ; en deux colonnes : profil de jeu et dernières parties, puis édition (pseudo, adresse, mot de passe) et sessions |
| `#/players/<id>` | `PlayerDetail` | Profil de jeu — y compris ceux **sans compte**, créés par `POST /api/matches` — et tout son historique |
| `#/matches?status=&offset=` | `MatchList` | Toutes, en cours ou terminées (`Segmented` en liens), paginées |
| `#/matches/<id>` | `MatchDetail` | `Versus`, `FactStrip` ; la liste des coups, et sous elle **le plateau rejoué** |

**Les actions rapides** (`QuickActions`, `actions.tsx`) sont une rangée d'`IconButton`, la même
dans la liste et sur la fiche : vérification de l'adresse, rôle, suspension ou levée,
usurpation, fermeture des sessions, suppression. `quickActions()` (`model.ts`, pur et testé)
dit lesquelles sont fermées et pourquoi — `disabledReason` met la raison dans l'infobulle. Sont
fermés : se suspendre, se supprimer, s'usurper ou se retirer soi-même le rôle (le seul moyen de
s'enfermer dehors), usurper un administrateur ou un compte suspendu. Les gestes lourds passent
par un `Dialog` : suspension (durées en `ChipGroup`, `banDuration()` refuse une valeur
illisible plutôt que de la lire comme définitive), suppression (le pseudo est à retaper),
usurpation, nomination, création d'un compte. Un `Dialog` ne se ferme que si le serveur a
accepté ; sur un refus il reste ouvert et le message s'affiche. `useAct()` annonce chaque
résultat par `useToast()` et relit la vue ; `useGo()` change de route en gardant le message.

**Le pseudo se change par `/api/admin/players/:id/handle`**, jamais par `update-user` : le
serveur refuse ce dernier, qui n'écrirait qu'une des deux tables portant le pseudo.

**L'usurpation** ouvre une session au nom du joueur et renvoie sur le jeu (`/`), où le bandeau
`#impersonation` permet de revenir.

### Le rejeu d'une partie

`Replay` (`MatchDetail.tsx`) montre la `MoveList` — numéro, camp, `2,4 → 3,4`, chaque ligne
dans la couleur du camp, comme l'historique de la maquette de partie — et sous elle une
`Toolbar` (lecture, libellé de l'image, point de vue, rotation) puis le plateau. **Survoler** un
coup montre la position qui le suit ; **cliquer** l'épingle, et le plateau y revient quand la
souris quitte la liste. Les flèches du clavier parcourent la partie, la lecture la déroule. Le
point de vue **tout / vue de A / vue de B** estompe les cases hors de la ligne de vue du camp
choisi et passe en fantôme (`PIECES.alphaGhost`) les pièces adverses qu'il ne voyait pas.

`ReplayBoard` enveloppe le canevas impératif de `replay-canvas.ts` : React ne lui transmet que
l'image, le point de vue et le nombre de quarts de tour ; le dessin et ses animations restent
hors du cycle de rendu, et `destroy()` cesse d'observer le canevas au démontage. Le plateau est
dessiné en **Canvas 2D**, pas en PixiJS, mais avec la géométrie du jeu à l'identique —
`view/iso.ts` pour la projection et l'ordre du peintre (relief et pièces dans une seule
liste), `view/camera.ts` pour le quart de tour amorti, `view/animation.ts` pour le glissement
des pièces, `theme.ts` pour les métriques et les couleurs — et la carte vient du registre de
`core` (`boardForScenario`). Le dernier coup est marqué : départ en pointillé, trajet dans la
couleur du camp, arrivée dans la teinte de la sélection. `fitScale()` (`replay.ts`) calcule une
échelle qui tient **aux quatre quarts de tour**, pour que le plateau ne change pas de taille en
tournant. Les positions viennent du serveur (`frames`) : le client ne rejoue rien, il n'a pas
les rulesets versionnés.

## `vite.config.ts` — le service des maquettes

**Trois pages d'entrée** (`PAGES`, `build.rollupOptions.input`) : `index.html`, le jeu,
`admin/index.html`, le back-office, et `profil/index.html`, le profil. `pnpm dev` sert les
deux dernières sous `/admin/` et `/profile/` sans configuration de plus, et son repli SPA
sert le jeu sur les URL de parcours de compte.

Les maquettes d'écrans de [`docs/mockups/`](../mockups/README.md) sont exposées sous
`/mockups`. Elles restent de la documentation : le client ne les importe jamais, et elles
ne doivent jamais partir en production.

Deux greffons, volontairement disjoints, parce que les deux chemins n'ont pas les mêmes
contraintes :

| Greffon | `apply` | Ce qu'il fait |
|---|---|---|
| `occulis-mockups-serve` | `serve` | Middleware sur `/mockups` qui lit les fichiers **dans `docs/`**, sans rien copier |
| `occulis-mockups-embed` | `build` | Copie `docs/mockups/` vers `dist/mockups/` — **uniquement sous le mode `mockups`** |

`pnpm dev` sert donc les maquettes depuis la source : les modifier se voit au rafraîchissement,
sans build. Le serveur local wrangler, lui, ne sait servir que `apps/web/dist` (binding
`ASSETS`) : il faut donc `pnpm --filter @occulis/web build:local`, qui pose `--mode mockups`.

Trois points qui se sont révélés à l'usage et qu'il ne faut pas défaire :

- **Le middleware est posé dans le corps de `configureServer`**, pas dans la fonction qu'il
  retourne. Dans la fonction de retour il passerait *après* les middlewares internes de Vite,
  et le repli SPA capterait `/mockups/` avant lui.
- **`resolveWithin()` vérifie que le chemin résolu ne sort pas du dossier.** Sans ce contrôle,
  `/mockups/../../../etc/passwd` servirait n'importe quel fichier du poste. Les deux formes,
  brute et pourcent-encodée, sont refusées et repassent la main à Vite.
- **Le mode ne peut pas s'appeler `local`** : Vite rejette ce nom, en collision avec le suffixe
  des fichiers `.env.local`. Il ne s'appelle pas non plus `development`, qui basculerait
  `NODE_ENV` et produirait un bundle différent de celui qui est déployé — or le serveur local
  sert précisément à tester celui-là. Sous `--mode mockups`, le bundle est identique au bundle
  de production, au dossier `mockups/` près.

Sous wrangler, Cloudflare applique son `html_handling` par défaut : `/mockups` redirige en 307
vers `/mockups/`, et `/mockups/partie.html` vers `/mockups/partie`. Les liens relatifs des
maquettes continuent de résoudre, la redirection étant transparente pour le navigateur.

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
7. **La vue rendue doit rester stable** entre deux actions : `Scene.render()` ne redessine
   que si elle a changé d'identité de référence.
8. **L'animation n'est jamais une source de vérité.** L'état est appliqué immédiatement ;
   l'interrompre ou la sauter doit rester sans conséquence sur la partie.
9. **Le compte rendu du tour attend la fin de l'animation.**
10. **La sélection filtre la liste du serveur, elle ne redéduit rien.** Recalculer la légalité
    dans l'interface la ferait diverger de `applyAction()`.
11. **Rien de ce qui est hors LOS ne doit apparaître dans l'interface.**
12. **`view/` et `game/` restent purs**, ainsi que `net/session.ts`, `ui/flow.ts`,
    `ui/command.ts` et `ui/messages.ts`. Y importer PixiJS ou le DOM rendrait leurs tests
    impossibles sans navigateur.
13. **L'hypothèse locale ne doit jamais escamoter un coup légal.** Elle peut en proposer
    trop — le serveur refuse — jamais trop peu.
14. **`OnlineMatch.receive()` fait autorité.** Toute autre écriture de l'état en ligne
    serait une seconde source de vérité, en contradiction avec le serveur autoritaire.
15. **Aucune partie ne se joue sans le serveur.** Réintroduire une partie locale rendrait
    le fog contournable — le client aurait la position entière — et contredirait le pilier
    « pas de local multiplayer » (`docs/design.md` section 2).
16. **Les maquettes ne partent jamais en production.** `pnpm build` tourne en mode
    `production` et ne copie rien ; seul le mode `mockups` embarque `docs/mockups/`. Les
    servir inconditionnellement mettrait la documentation de conception dans le site
    déployé, et demain dans le binaire Electron distribué.
17. **Le back-office et le profil ne décident d'aucun accès.** Masquer un bouton n'est pas une garde :
    toute permission se vérifie côté serveur, et la page se contente d'afficher ce que les
    routes d'administration acceptent de lui rendre.
18. **Le back-office, le profil et l'îlot de compte n'ont ni classe ni couleur propres.**
    Ce qui manque à une vue s'ajoute à `@occulis/ui`, pour que la charte synchronisée vers
    Claude Design reste celle du produit.
19. **Un parcours de compte = un formulaire = une URL.** Fusionner deux parcours dans un
    formulaire, ou retirer un `autocomplete`, rend l'écran illisible aux gestionnaires de
    mots de passe.
20. **Le jeton de réinitialisation est retiré de l'URL dès sa lecture.**

## Tests

163 tests, sous Node, sans navigateur : `pnpm test` (ou `pnpm --filter @occulis/web test`).

| Fichier | Ce qui est verrouillé |
|---|---|
| `apps/web/src/view/iso.test.ts` | Pavage jointif à angle quelconque, hauteur sans déformation, falaises émises seulement sur rupture, ordre du peintre, chemin court d'angle, aimantation |
| `apps/web/src/view/camera.test.ts` | Le point sous le curseur reste immobile au zoom, bornes d'échelle, convergence exacte de l'aimantation |
| `apps/web/src/view/picking.test.ts` | Chaque case retrouvée depuis son centre à plusieurs angles et échelles, priorité au relief au premier plan, désignation par la falaise |
| `apps/web/src/view/animation.test.ts` | Hauteurs relevées au départ, durée croissante mais bornée, interpolation conjointe position/hauteur, progression monotone, terminaison |
| `apps/web/src/ui/flow.test.ts` | Départ sur le formulaire, menu ouvert à la connexion, retour au formulaire à la déconnexion **même en partie**, identité reconfirmée sans effet, code affiché dans l'attente, `hosting` en retard ignoré, **fenêtre d'acceptation ouverte depuis la seule attente rapide**, retour en attente ou au menu à sa chute, déploiement avant la partie et jamais après, équipes depuis le menu |
| `apps/web/src/game/selection.test.ts` | **Toute destination affichée est applicable par `core`**, exclusion des cases occupées, frappe sur place, machine à états complète de `resolveClick` |
| `apps/web/src/ui/command.test.ts` | Grammaire complète et résolution coordonnée → pièce |
| `apps/web/src/ui/messages.test.ts` | `describeTile()`, dont l'absence de fuite d'information sur les pièces |
| `apps/web/src/game/hypothesis.test.ts` | L'hypothèse ne contient que le visible et reporte la fin de partie annoncée par la vue |
| `apps/web/src/game/online-match.test.ts` | **`play()` n'écrit rien** — ni position, ni trait —, n'envoie pas un coup refusé localement, laisse rejouer après un refus, et n'avance qu'à réception de la vue |
| `apps/web/src/game/movement-diff.test.ts` | Le déplacement lu entre deux vues, y compris celui de l'adversaire ; une pièce qui entre ou sort de la LOS n'est pas animée |
| `apps/web/src/net/session.test.ts` | Enchaînement file → siège → vues, code de salon retenu, code refusé sans siège, reconstruction du `Set` de cases visibles, refus retenu puis effacé, message hors partie ignoré, **déploiement annoncé puis verrous suivis, effacé à la première vue**, proposition ouverte, acceptations suivies, chute rapportée |
| `apps/web/src/net/backoff.test.ts` | Croissance exponentielle, plafond, robustesse à une tentative absurde |
| `apps/web/src/admin/model.test.ts` | Routes du back-office lues et réécrites à l'identique, fiche rangée sous sa liste, résultat nommé par le siège, coups, dates ISO et millisecondes, pagination, **durée de suspension illisible refusée plutôt que lue comme définitive**, actions rapides fermées sur soi-même, sur un administrateur et sur un compte suspendu, initiales, taux de victoire, résumé du navigateur d'une session |
| `apps/web/src/admin/replay.test.ts` | Pièce déplacée retrouvée entre deux images et elle seule, coup écrit comme l'historique de la maquette, libellé d'image avec camp et joueur, navigation bornée, **plateau centré et contenu dans son cadre aux quatre quarts de tour** |
| `apps/web/src/net/auth.test.ts` | Traduction sur le code et non sur la phrase, compte suspendu, **refus indiscernables laissés indiscernables**, limitation de débit annoncée sur le statut et distinguée du délai de pseudo, retours de Google et des liens expirés, mot de passe ayant fuité |
| `apps/web/src/account/model.test.ts` | Parcours ↔ URL dans les deux sens, connexion par défaut, jeton lu, **jeton et erreurs retirés de l'URL**, adresse confirmée, compte supprimé, lien expiré du bon type, refus de liaison Google expliqué, **refus rattaché au bon champ, jamais pour des identifiants faux**, indication de longueur, **anciens noms de paramètres encore reconnus** |
| `apps/web/src/team/model.test.ts` | Emplacements de la composition, pose dans la zone seulement, **reprise puis échange de deux pièces**, type changé dans son rôle seulement, brouillon rempli depuis une équipe et rendu à l'identique, **verdict de la règle de `core`**, remplissage, retrait |
| `apps/web/src/prepare/model.test.ts` | Décompte sur l'horloge du client, **envoi automatique d'un seul brouillon valide juste avant l'échéance**, preset par défaut transposé au camp tenu, repli sur l'équipe de la carte |
| `apps/web/src/profile/model.test.ts` | Routes du profil dans les deux sens, ancre de sécurité, **identifiant de partie suspect refusé**, messages d'arrivée, délai de pseudo, **dernière méthode de connexion non retirable**, résultat de son point de vue, **ligne de vue de son seul camp prêtée au plateau**, ancienneté d'une session |

## Non implémenté

- **Aucun signal de déconnexion de l'adversaire** : rien ne distingue à l'écran un
  adversaire qui réfléchit d'un adversaire parti.
- **Aucune animation des coups adverses** : ils apparaissent à la vue suivante.
- **Aucun marquage des montées.** `MoveOption.kind` distingue `walk` de `climb` — grimper
  consomme le tour entier — et `STATE.climb` est déjà un token, mais `selectionFor()`
  filtre `legalActions()`, qui ne porte pas cette distinction.
- **Aucune capture, ni au clic ni au clavier** : la règle est retirée du moteur
  (`docs/design.md` section 3.1). Il n'y a donc ni cible à désigner, ni animation de prise,
  ni marquage de case frappable — le token `STATE.threat` du thème n'a plus d'emploi.
- **Aucun affichage d'échec ni de fin de partie automatique** : la règle « échecs strict »
  et les nulles sont retirées (`docs/design.md` 7.1 et 7.2). L'état du tour n'annonce plus
  `ÉCHEC`, et `describeOutcome()` ne connaît que l'abandon.
- **Aucune différenciation visuelle** entre types de pièces.
- **Aucun historique de saisie** dans le champ de commande.
- **Aucune reprise de partie depuis le menu.** Quitter une partie referme le canal ; rien
  ne propose d'y revenir, alors que le Durable Object la tient toujours.
- **Aucun partage du code autrement qu'à la main** : ni lien joignable, ni invitation.
