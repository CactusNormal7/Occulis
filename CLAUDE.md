# Occulis

Jeu de plateau tactique compétitif 1v1 en ligne, vue isométrique 2D, DA minimaliste filaire (dessin procédural en traits, pas de sprites). Squelette conceptuel proche des échecs (roi à protéger, victoire par mat) mais sur une carte à géométrie libre avec hauteur, murs, ligne de vue (LOS) et fog of war.

**Le document de référence pour toute décision de game design est [docs/design.md](docs/design.md).** Il capture l'état exact des règles validées, l'historique des itérations (pourquoi certaines idées ont été écartées — ne pas les reproposer sans relire la section 6), et la liste des points encore ouverts (section 10). Avant de trancher une règle de gameplay non couverte par ce fichier, vérifier la section 10 : si le point y est listé comme ouvert, c'est une vraie décision à soumettre à l'utilisateur, pas à improviser silencieusement.

## Stack et architecture

- Monorepo pnpm workspaces, TypeScript strict partout.
- `packages/core` — logique de jeu pure (règles, plateau, hauteur, calcul de LOS, résolution des tours). **Aucune dépendance de rendu.** Testée avec Vitest.
- `apps/web` — rendu (Vite + PixiJS/WebGL), consomme `@occulis/core`. La rotation isométrique et les recalculs de projection vivent ici (`src/iso.ts`), jamais dans `core`.
- Séparation logique/rendu actée dès le départ (docs/design.md section 8) pour permettre un futur portage moteur (C++ envisagé mais explicitement reporté, hors scope pour l'instant).
- Pas de backend pour l'instant, mais l'infrastructure cible est décidée et documentée dans [docs/architecture.md](docs/architecture.md) (Cloudflare Worker + Durable Objects, base D1, environnements et CI/CD, chiffrage). Quand le multijoueur en ligne sera implémenté : le serveur doit être **autoritaire** et ne jamais transmettre au client des données hors LOS de ce joueur (le fog of war doit être appliqué serveur-side, pas seulement caché visuellement côté client — sans quoi il est contournable via devtools).

## Commandes

```bash
pnpm install
pnpm dev          # lance apps/web (Vite)
pnpm test         # tests de packages/core (Vitest)
pnpm typecheck
pnpm lint
```

## Conventions

- Toute nouvelle règle de gameplay implémentée dans `packages/core` doit correspondre à une décision déjà actée dans `docs/design.md`. Si elle correspond à un point ouvert (section 10), demander avant d'implémenter plutôt que de choisir une interprétation arbitraire — plusieurs points (ex: attaque à distance combinable avec un déplacement, résolution des zones qui se chevauchent) ont un impact direct sur l'équilibrage.
- La LOS est calculée par raycast 2D (`packages/core/src/los.ts`, type Bresenham) avec comparaison de hauteur interpolée case par case — pas de moteur 3D. Voir docs/design.md section 5.1 pour le raisonnement.
- Grille : coordonnées entières `{x, y}` + hauteur de case séparée (`Tile.height`), jamais un simple array de valeurs numériques (cf. décision fondatrice section 5.1).
- Différenciation des pièces par capacité/mouvement, jamais par points de vie/robustesse.
- Pas de commentaires qui expliquent le "quoi" — seulement le "pourquoi" quand une règle de design non évidente est encodée (référencer la section du design doc au besoin).
- Après toute modification substantielle de règle actée avec l'utilisateur, envisager de mettre à jour `docs/design.md` en parallèle du code pour que les deux restent synchronisés.

## Modules de `packages/core`

- `coord.ts` — coordonnées, clés de hachage, adjacence (`orthogonal` / `octile`), distances.
- `board.ts` — `Tile` (hauteur + franchissabilité) et `Board` immuable. Un **mur est une case haute**, jamais un flag ; une case absente est hors-carte. `Board.fromAscii` construit un plateau depuis une carte texte (pratique en test).
- `piece.ts` — `Piece`, `PieceDefinition`, `Ruleset`. **Aucun roster n'y est défini** : les définitions sont fournies par l'appelant.
- `los.ts` — raycast, LOS, champ de vision. La LOS est **symétrique par construction** (l'ordre des extrémités est canonicalisé avant le tracé de Bresenham) ; ne pas casser cette propriété.
- `movement.ts` — cases atteignables et portée de mêlée, avec les règles de verticalité de la section 5.3.
- `state.ts` / `actions.ts` — état de partie immuable, génération des coups légaux, application d'une action, fin de partie. Les erreurs sont retournées via `Result`, jamais levées.
- `fog.ts` — état *connu* de chaque joueur (mémoire fantôme) et `viewFor`, qui produit la vue transmissible sans aucune donnée hors LOS. C'est ce que le futur serveur devra envoyer.
- `testing.ts` — fabriques de scénarios pour les tests uniquement.

## État du projet

Logique de jeu posée et testée (57 tests) : plateau à hauteur, LOS, verticalité, déplacement, capture de mêlée, tours alternés, fog of war avec mémoire, abandon et pat. Rendu isométrique filaire fonctionnel avec rotation et fog of war à l'écran.

Non implémenté volontairement, car listé comme ouvert en section 10 du design doc : attaque à distance différée, pièges, déploiement, règle anti-répétition, détection du mat, roster de pièces. Pas de backend ni de design system (ce dernier est explicitement prévu pour plus tard par l'utilisateur).

**Les interprétations qu'il a fallu encoder faute de décision explicite sont consignées dans [docs/implementation-notes.md](docs/implementation-notes.md)** — les relire avant de bâtir dessus, et faire valider celles qui sont concernées avant d'ajouter une règle qui en dépend.
