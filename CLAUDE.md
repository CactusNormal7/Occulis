# Occulis

Jeu de plateau tactique compétitif 1v1 en ligne, vue isométrique 2D, DA minimaliste filaire (dessin procédural en traits, pas de sprites). Squelette conceptuel proche des échecs (roi à protéger, victoire par mat) mais sur une carte à géométrie libre avec hauteur, murs, ligne de vue (LOS) et fog of war.

**Le document de référence pour toute décision de game design est [docs/design.md](docs/design.md).** Il capture l'état exact des règles validées, l'historique des itérations (pourquoi certaines idées ont été écartées — ne pas les reproposer sans relire la section 6), et la liste des points encore ouverts (section 10). Avant de trancher une règle de gameplay non couverte par ce fichier, vérifier la section 10 : si le point y est listé comme ouvert, c'est une vraie décision à soumettre à l'utilisateur, pas à improviser silencieusement.

## Stack et architecture

- Monorepo pnpm workspaces, TypeScript strict partout.
- `packages/core` — logique de jeu pure (règles, plateau, hauteur, calcul de LOS, résolution des tours). **Aucune dépendance de rendu.** Testée avec Vitest.
- `apps/server` — Worker Cloudflare + Durable Object de partie, consomme `@occulis/core`. Squelette : transport, cycle de vie du DO, schéma D1. Ni authentification, ni matchmaking, ni ELO.
- `apps/web` — rendu (Vite + PixiJS/WebGL), consomme `@occulis/core`. La rotation isométrique et les recalculs de projection vivent ici (`src/iso.ts`), jamais dans `core`.
- Séparation logique/rendu actée dès le départ (docs/design.md section 8) pour permettre un futur portage moteur (C++ envisagé mais explicitement reporté, hors scope pour l'instant).
- Pas de backend écrit à ce jour, mais l'infrastructure cible est **décidée** — voir la section « Infrastructure et CI/CD » plus bas et [docs/architecture.md](docs/architecture.md). Quand le multijoueur en ligne sera implémenté : le serveur doit être **autoritaire** et ne jamais transmettre au client des données hors LOS de ce joueur (le fog of war doit être appliqué serveur-side, pas seulement caché visuellement côté client — sans quoi il est contournable via devtools).

## Commandes

```bash
pnpm install
pnpm dev          # lance apps/web (Vite)
pnpm test         # tests de packages/core (Vitest)
pnpm --filter @occulis/web build && cd apps/server && pnpm exec wrangler dev   # serveur en local
pnpm typecheck
pnpm lint
pnpm infra        # TUI Cloudflare (tooling/infra) — bases D1, migrations, déploiement
```

## Conventions

- Toute nouvelle règle de gameplay implémentée dans `packages/core` doit correspondre à une décision déjà actée dans `docs/design.md`. Si elle correspond à un point ouvert (section 10), demander avant d'implémenter plutôt que de choisir une interprétation arbitraire — plusieurs points (ex: attaque à distance combinable avec un déplacement, résolution des zones qui se chevauchent) ont un impact direct sur l'équilibrage.
- La LOS est calculée par raycast 2D (`packages/core/src/los.ts`, type Bresenham) avec comparaison de hauteur interpolée case par case — pas de moteur 3D. Voir docs/design.md section 5.1 pour le raisonnement.
- Grille : coordonnées entières `{x, y}` + hauteur de case séparée (`Tile.height`), jamais un simple array de valeurs numériques (cf. décision fondatrice section 5.1).
- Différenciation des pièces par capacité/mouvement, jamais par points de vie/robustesse.
- Pas de commentaires qui expliquent le "quoi" — seulement le "pourquoi" quand une règle de design non évidente est encodée (référencer la section du design doc au besoin).
- **`packages/core` doit rester strictement déterministe** : aucun `Math.random`, aucun `Date.now`, aucune source d'entropie ou d'horloge. Toute la persistance et tous les replays reposent sur le fait que rejouer un log d'actions reconstruit l'état exact (docs/architecture.md section 3). Un appel non déterministe introduit ici casserait silencieusement la reconstruction côté serveur. Si un aléa devient nécessaire pour une règle, il doit entrer par un seed explicite passé en paramètre, jamais être tiré dans `core`.
- Après toute modification substantielle de règle actée avec l'utilisateur, envisager de mettre à jour `docs/design.md` en parallèle du code pour que les deux restent synchronisés.

## Infrastructure et CI/CD

Décidée et documentée dans [docs/architecture.md](docs/architecture.md) ; chiffrage dans
[docs/costs.md](docs/costs.md) ; procédure d'installation dans [docs/setup.md](docs/setup.md).
Le squelette du Worker (`apps/server`) et la CI/CD existent ; le matchmaking et l'authentification non.
Les points encore ouverts sont listés en section 7 d'architecture.md : demander avant de trancher,
comme pour la section 10 du design doc.

- **Hébergement : Cloudflare Worker + Durable Objects.** **1 Durable Object = 1 partie.** Il détient le `GameState` et les deux `PlayerKnowledge`, et envoie à chaque joueur son propre `viewFor()`. Le fog est donc structurel et non applicatif : un client ne peut pas recevoir ce que le DO ne lui envoie pas. Le DO étant mono-threadé, la sérialisation des tours est acquise — ne pas ajouter de verrous.
- **Un second DO, global, sert de file de matchmaking** : son mono-threading élimine par construction le double appariement.
- **Le DO doit hiberner.** Un DO qui garde un WebSocket ouvert sans hiberner coûte ~20 000 fois plus cher, sans aucune différence fonctionnelle visible. À couvrir par un test dédié.
- **Base : D1** (SQLite managé, natif Workers). Un DO n'est pas une base — aucune requête transversale entre DO n'est possible. Tout ce qui se cherche, se classe ou s'agrège (comptes, ELO, historique, classement, amis) va en D1.
- **Le log d'actions en D1 est la source de vérité ; l'état du DO est un cache reconstructible.** Cela dépend entièrement de l'invariant de déterminisme de `core` ci-dessus.
- **Les règles sont versionnées par partie, pas par connexion.** Une partie démarrée sous le ruleset v3 se termine en v3. La cible étant une app téléchargeable (Electron), un vieux client embarque un vieux `core` ; et le pilier « temps de réflexion illimité » implique des parties qui traversent les déploiements.
- **Quatre environnements** : local (`wrangler dev`, SQLite local), preview par branche (`occulis-<branche>.0kl.fr`), recette (`occulis-staging.0kl.fr`), prod (`occulis.0kl.fr`, sur `main`). **Une branche = un environnement complet** (client + Worker + DO + base), jamais un preview du client seul : une branche qui touche `core` change les règles et serait sinon testée contre celles de `main`.
- **Les branches hébergées sont sélectionnées explicitement**, pas déployées automatiquement : on doit pouvoir en ajouter et en retirer à volonté, pour que la population d'environnements soit décidée et non subie. Le mécanisme n'est pas arrêté (point ouvert 3).
- **CI/CD** : `.github/workflows/ci.yml`. Les vérifications (`typecheck → lint → test → build`) tournent sur toute branche et toute PR ; le déploiement ne concerne que les branches listées dans **`.github/deploy-environments.json`** (`main` → production, `staging` → recette). Une branche absente du manifeste passe la CI sans être déployée : c'est là le mécanisme de sélection des environnements. Les migrations D1 précèdent toujours le déploiement. Un workflow séparé, sur tag, buildera et signera les binaires Electron.
- `VITE_SERVER_URL` est injectée au build, donc **gravée dans le binaire distribué** : l'URL de production doit être définitive avant le premier build public.

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

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
