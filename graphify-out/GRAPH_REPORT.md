# Graph Report - Occulis  (2026-10-18)

## Corpus Check
- 518 files · ~264,666 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 12 file(s) not represented in the graph (top: .css 5, (none) 4, .example 1)

## Summary
- 3484 nodes · 8880 edges · 258 communities (115 shown, 143 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 270 edges (avg confidence: 0.92)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `76225c34`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- @occulis/web package.json
- cli.tsx
- selection.ts test suite
- La logique de jeu — `packages/core`
- Motion.tsx
- technical/README.md
- ref_vitest
- AccountApp.tsx
- compilerOptions
- views.tsx
- scripts
- queue-do.ts
- social/api.ts
- Points ouverts (récapitulatif)
- Le moteur de rendu et le client — `apps/web`
- messages
- Occulis — Document de conception (récapitulatif d'itération)
- Components.tsx
- social/queries.ts
- /graphify skill trigger (.claude/CLAUDE.md)
- Outillage et CI/CD — `tooling/infra`, `.github`
- src/theme.ts sole color-value file
- .prettierrc.json
- players table
- apps/server tsconfig.json
- chat.ts
- protocol/src/index.ts
- Points ouverts d'infrastructure
- Piliers de design non négociables
- Visibilité vs Portée
- parts.tsx
- ESLint flat config
- infra tsconfig.json
- Prettier config
- CoordKey (type)
- EYE_HEIGHT
- VS Code conventionalCommits scopes
- Occulis — Architecture technique
- Le serveur — `apps/server`
- ui/package.json
- Occulis
- social/model.ts
- Occulis — Mise en place de l'infrastructure
- engine.md
- look
- Documentation technique
- fog.ts
- web/package.json
- .claude/CLAUDE.md
- Sélection des branches hébergées
- profile/App.tsx
- BoardPrototype.tsx
- better-auth.ts
- server/package.json
- infra/package.json
- Coord
- components/App.tsx
- session.test.ts
- package.json
- devDependencies
- Occulis project overview
- camera.ts
- Le labo de la refonte — `src/lab/`
- MatchDO.load
- placement-canvas.ts
- sources.ts
- One branch = one full hosted environment
- Board
- mockup.js
- docs/architecture.md (infra/server architecture reference)
- infra/src/actions.ts
- Composition
- piece-type.ts
- protocol/package.json
- revealWindow
- server/src/index.ts
- Les composants
- scene.ts
- ridge.ts
- core/package.json
- components/IconButton.tsx
- admin/routes.ts
- MatchDO
- admin/api.ts
- compilerOptions
- compilerOptions
- previews/main.tsx
- social.integration.test.ts
- sky.ts
- compilerOptions
- 5. Ligne de vue (LOS), hauteur, fog of war
- PlacementCanvas
- Friends.tsx
- components/Badge.tsx
- compilerOptions
- Occulis — Estimation des coûts
- packages_ui_src_index_button
- core/tsconfig.json
- protocol/tsconfig.json
- Maquettes des écrans
- Occulis
- profile/api.ts
- current.ts
- me/queries.ts
- env.d.ts
- command.ts test suite
- messages.ts test suite
- animation.test.ts suite
- camera.test.ts suite
- EDGE_NEIGHBOURS (const)
- iso.test.ts suite
- picking.test.ts suite
- TeamsApp.tsx
- cx
- Field.tsx
- lab.test.tsx
- contact
- infra package.json
- action: Créer un environnement de branche
- Notes d'implémentation — interprétations à valider
- action: Créer une base distante
- action: Supprimer un environnement de branche
- action: Déployer
- action: Historique des déploiements
- action: Lancer le serveur en local
- action: Décrire une base
- action: Lister les bases D1
- action: Connexion Cloudflare
- action: Appliquer les migrations
- action: Exécuter une requête SQL
- action: Statut
- action: Logs en direct
- fr/index.ts
- me/feats.ts
- social-do.ts
- handle.ts
- components/Person.tsx
- glyphs.ts
- password.ts
- i18n/package.json
- Chat.tsx
- social-channel.ts
- ./design/DesignSystem.js
- critical.ts
- i18n/tsconfig.json
- coordKey
- ref_react
- tokens.ts
- config.ts
- theme-choice.ts
- net/auth.ts
- settings.ts
- vite.config.ts
- lab/index.ts
- Locale
- Lab.tsx
- src/main.ts
- Refonte graphique — propositions (2026-10-18)
- MotionSection.tsx
- loadCache
- @occulis/infra

## God Nodes (most connected - your core abstractions)
1. `Les composants` - 76 edges
2. `Coord` - 75 edges
3. `PlayerId` - 67 edges
4. `Board` - 66 edges
5. `messages()` - 58 edges
6. `main()` - 53 edges
7. `coordKey` - 52 edges
8. `cx()` - 50 edges
9. `look` - 42 edges
10. `./design/DesignSystem.js` - 41 edges

## Surprising Connections (you probably didn't know these)
- `Tokens ajoutés` --references--> `sweep()`  [INFERRED]
  docs/design/refonte-graphique.md → apps/server/src/maintenance.integration.test.ts
- `Tokens ajoutés` --references--> `tick()`  [INFERRED]
  docs/design/refonte-graphique.md → apps/web/src/load/cache.test.ts
- `Environnements` --references--> `main()`  [INFERRED]
  README.md → apps/web/src/main.ts
- `Les composants` --references--> `MessageComposer()`  [INFERRED]
  docs/technical/ui.md → packages/ui/src/components/Chat.tsx
- `Les composants` --references--> `ChoiceList()`  [INFERRED]
  docs/technical/ui.md → packages/ui/src/components/Choice.tsx

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **CI checks → target resolution → deploy pipeline** — github_workflows_ci_checks_job, github_workflows_ci_target_job, github_workflows_ci_deploy_job, github_deploy_environments_manifest [INFERRED 0.85]

## Communities (258 total, 143 thin omitted)

### Community 2 - "cli.tsx"
Cohesion: 0.11
Nodes (26): ink, Structure, ACTIONS, Level, action, COLOR_CODE, COLOR_CODE, consoleLog() (+18 more)

### Community 4 - "La logique de jeu — `packages/core`"
Cohesion: 0.04
Nodes (38): Module actions.ts : coups légaux et résolution, Module los.ts : raycast Bresenham, géométrie seule, Module movement.ts : verticalité et portée de mêlée, Un type de pièce = une classe (données/comportement séparés), `ActionError`, `actions.ts` — coups légaux et résolution, `Board.fromAscii()`, `board.ts` — le plateau (+30 more)

### Community 5 - "Motion.tsx"
Cohesion: 0.11
Nodes (11): BlockEntrance(), Board(), Countdown(), Curve(), CURVES, Declared(), Motion(), OpponentReveal() (+3 more)

### Community 6 - "technical/README.md"
Cohesion: 0.32
Nodes (4): Coûts hors hébergement (signature, Steam, domaine), Chiffrage plan Workers Paid, pnpm infra (TUI Ink), Séparation comment/pourquoi dans la doc technique

### Community 7 - "ref_vitest"
Cohesion: 0.06
Nodes (39): signUpAdmin(), sweep(), get(), idsOf(), impersonate(), jar(), nextAddress(), profile() (+31 more)

### Community 8 - "AccountApp.tsx"
Cohesion: 0.17
Nodes (29): AccountApp(), AccountAppProps, Forgot(), GoogleEntry(), NoticeLine(), Register(), Reset(), RouteLink() (+21 more)

### Community 10 - "compilerOptions"
Cohesion: 0.12
Nodes (15): compilerOptions, declaration, declarationMap, esModuleInterop, exactOptionalPropertyTypes, forceConsistentCasingInFileNames, isolatedModules, lib (+7 more)

### Community 11 - "views.tsx"
Cohesion: 0.06
Nodes (51): Act, BanDialog(), DeleteDialog(), ICONS, ImpersonateDialog(), Open, QuickActions(), QuickActionsProps (+43 more)

### Community 12 - "scripts"
Cohesion: 0.20
Nodes (11): CI checks job (typecheck/lint/test/build), CI deploy job, scripts, build, dev, format, infra, lint (+3 more)

### Community 13 - "queue-do.ts"
Cohesion: 0.09
Nodes (41): dequeue(), enqueue(), Pairing, requeueFront(), takePairing(), ANNE, BORIS, Waiting (+33 more)

### Community 15 - "social/api.ts"
Cohesion: 0.14
Nodes (24): acceptChallenge(), acceptRequest(), allowSpectators(), block(), call(), cancelRequest(), challenge(), declineChallenge() (+16 more)

### Community 16 - "Points ouverts (récapitulatif)"
Cohesion: 0.22
Nodes (4): Phase de déploiement, Fog of war confirmé, Points ouverts (récapitulatif), Pièges

### Community 17 - "Le moteur de rendu et le client — `apps/web`"
Cohesion: 0.05
Nodes (44): `admin/` — le back-office, Carte des modules, Ce que le client fait, et ne fait pas, Clic contre glissé, `cliffQuads()` et l'ordre du peintre, Conditions de réémission, `game/hypothesis.ts` — la position telle que le joueur peut la croire, `game/movement-diff.ts` — ce que la vue a fait bouger (+36 more)

### Community 18 - "messages"
Cohesion: 0.18
Nodes (19): messages(), attachConsole(), ConsoleElements, GameConsole, describeActionError(), describeFault(), describeIdentity(), describeMove() (+11 more)

### Community 19 - "Occulis — Document de conception (récapitulatif d'itération)"
Cohesion: 0.10
Nodes (20): 10. Récapitulatif — points ouverts à trancher (à date de ce document), 1. Pitch, 2. Piliers de design (non négociables, validés), 3.1 Attaque de mêlée (règle de base, toutes les pièces), 3.2 Attaque à distance (capacité spéciale, certaines pièces seulement), 3.3 Point ouvert non résolu, 3. Règles de capture — état validé, 4. Pièges (+12 more)

### Community 20 - "Components.tsx"
Cohesion: 0.10
Nodes (9): ComponentPage(), Components(), Contained, OverlayHost(), StoryStage(), BlockView(), Conventions(), Markdown() (+1 more)

### Community 21 - "social/queries.ts"
Cohesion: 0.10
Nodes (39): recordOf(), recordStatement(), acceptRequest(), block(), deleteRequest(), FriendRow, handleOf(), insertMessage() (+31 more)

### Community 23 - "Outillage et CI/CD — `tooling/infra`, `.github`"
Cohesion: 0.10
Nodes (21): `checks` — les vérifications, Concurrence, `config.ts` — chemins et conventions, « Créer un environnement de branche », `deploy` — le déploiement, `deploy-manifest.ts` — édition du manifeste, `git.ts`, `.github/deploy-environments.json` — le mécanisme de sélection (+13 more)

### Community 28 - "chat.ts"
Cohesion: 0.24
Nodes (8): CHAT_PAGE_SIZE, checkMessage(), MAX_MESSAGE_LENGTH, MESSAGE_RETENTION_MS, MESSAGE_WINDOW_MS, MessageCheck, MessageError, MESSAGES_PER_WINDOW

### Community 29 - "protocol/src/index.ts"
Cohesion: 0.05
Nodes (65): annotate(), frameOf(), RenameResult, replayLog(), ABSENCE_MS, cardOf(), DEPLOYMENT_MS, deployed() (+57 more)

### Community 35 - "parts.tsx"
Cohesion: 0.08
Nodes (17): MatchDetail(), Replay(), winRate(), clampFrame(), boardForScenario(), asBoardFrames(), describeMyResult(), MatchReplayView() (+9 more)

### Community 49 - "Occulis — Architecture technique"
Cohesion: 0.20
Nodes (10): 1. Cible de distribution, 2. Hébergement : Cloudflare Worker + Durable Objects, 3. Base de données : D1, 5. CI/CD, 6. Coûts, 7. Points ouverts, Conséquence : versionner les règles par partie, Le log d'actions est la source de vérité (+2 more)

### Community 50 - "Le serveur — `apps/server`"
Cohesion: 0.06
Nodes (32): `admin/` — le back-office, `auth/` — comptes et sessions, Better Auth, et ce que le projet garde, Ce que le serveur ne dit pas, Fichiers, `index.ts` — le Worker, Invariants à ne pas casser, L'autorité de tour (+24 more)

### Community 51 - "ui/package.json"
Cohesion: 0.05
Nodes (41): dependencies, @occulis/i18n, description, devDependencies, react, react-dom, tsup, @types/react (+33 more)

### Community 52 - "Occulis"
Cohesion: 0.25
Nodes (8): Commandes, Conventions, graphify, Infrastructure et CI/CD, Modules de `packages/core`, Occulis, Stack et architecture, État du projet

### Community 53 - "social/model.ts"
Cohesion: 0.12
Nodes (22): SocialProvider(), challenged(), EMPTY_SOCIAL, mapFriends(), presenceLabel(), readAll(), receive(), relationTo() (+14 more)

### Community 54 - "Occulis — Mise en place de l'infrastructure"
Cohesion: 0.22
Nodes (9): 0. Préalables, 1. Outillage local, 2. Développement local, 3. Créer les bases distantes, 4. Premier déploiement en recette, 5. Secrets pour la CI, 6. Déclencher un déploiement, 7. Ce qui reste à écrire (+1 more)

### Community 55 - "engine.md"
Cohesion: 0.15
Nodes (5): Le dossier dit la dépendance (view/game purs vs scene/input/ui), Pipeline gestes/saisie → application → rendu, Cycle d'une action (load → applyAction → observe → log → broadcast), WireView / encodeView() protocole réseau, Client et serveur pas encore connectés

### Community 56 - "look"
Cohesion: 0.12
Nodes (27): arc(), at(), boardRadius(), drawSigil(), glyph(), drawBeam(), drawPiece(), PiecePaint (+19 more)

### Community 57 - "Documentation technique"
Cohesion: 0.33
Nodes (6): Carte du système, Documentation technique, L'état réel du câblage, Les cinq documents, Périmètre — et ce que ces documents ne sont pas, Règle de maintenance

### Community 58 - "fog.ts"
Cohesion: 0.08
Nodes (45): ConsoleOptions, ActionError, applyAction(), destinationsFor(), legalActions(), MoveAction, occupancyWithout(), replay() (+37 more)

### Community 59 - "web/package.json"
Cohesion: 0.06
Nodes (34): dependencies, @occulis/core, @occulis/i18n, @occulis/protocol, @occulis/ui, pixi.js, react, react-dom (+26 more)

### Community 61 - "Sélection des branches hébergées"
Cohesion: 0.25
Nodes (7): CI/CD (ci.yml, deploy-environments.json), Quatre environnements, 4. Environnements, Sélection des branches hébergées, Procédure d'installation (local → recette → prod), .github/deploy-environments.json (mécanisme de sélection), Catalogue ACTIONS de tooling/infra

### Community 62 - "profile/App.tsx"
Cohesion: 0.14
Nodes (32): chooseLocale(), Account(), App(), DangerZone(), Editing, EditorProps, EmailEditor(), FeatsCard() (+24 more)

### Community 63 - "BoardPrototype.tsx"
Cohesion: 0.12
Nodes (39): 4. Animations de l'interface, allTiles(), between(), chebyshev(), COLUMNS, destinations(), isWall(), key() (+31 more)

### Community 64 - "better-auth.ts"
Cohesion: 0.11
Nodes (35): database, directory, env, ACCOUNT_MUTATIONS, ADMIN_ROLE, buildAuth(), hasGoogle(), isImpersonated() (+27 more)

### Community 65 - "server/package.json"
Cohesion: 0.06
Nodes (31): dependencies, better-auth, @occulis/core, @occulis/i18n, @occulis/protocol, @occulis/ui, devDependencies, @cloudflare/vitest-pool-workers (+23 more)

### Community 67 - "infra/package.json"
Cohesion: 0.07
Nodes (28): ink-text-input, tsx, @types/node, bin, occulis-infra, dependencies, ink, ink-text-input (+20 more)

### Community 68 - "Coord"
Cohesion: 0.07
Nodes (31): hypothesisFrom(), Movement, movementBetween(), OnlineMatch, ClickOutcome, resolveClick(), selectionFor(), BOARD (+23 more)

### Community 69 - "components/App.tsx"
Cohesion: 0.14
Nodes (23): ActionContext, ActionDef, guardPlaceholder(), App(), envItems(), InteractiveOutcome, Phase, Props (+15 more)

### Community 70 - "session.test.ts"
Cohesion: 0.18
Nodes (13): memory(), WALLED, table(), WALLED, fromQueue(), MATCHED, seated(), wireView() (+5 more)

### Community 72 - "package.json"
Cohesion: 0.12
Nodes (16): engines, node, @cloudflare/workers-types, typescript, wrangler, name, packageManager, pnpm (+8 more)

### Community 73 - "devDependencies"
Cohesion: 0.22
Nodes (9): devDependencies, @cloudflare/workers-types, eslint, eslint-config-prettier, prettier, typescript, @typescript-eslint/eslint-plugin, @typescript-eslint/parser (+1 more)

### Community 74 - "Occulis project overview"
Cohesion: 0.17
Nodes (10): @occulis/server package.json, apps/server (Cloudflare Worker + DO), apps/web (Vite + PixiJS rendering), docs/costs.md (infra cost estimates), docs/design.md (game design reference), Occulis project overview, packages/core (pure game logic), docs/setup.md (install procedure) (+2 more)

### Community 75 - "camera.ts"
Cohesion: 0.13
Nodes (32): attachControls(), ControlsOptions, Drag, DragKind, dragKindOf(), isTyping(), sameCoord(), ensureBoard() (+24 more)

### Community 76 - "Le labo de la refonte — `src/lab/`"
Cohesion: 0.13
Nodes (27): Le labo de la refonte — `src/lab/`, durationMs(), readColor(), readNumber(), readText(), farthestCorner(), compile(), createPaperRenderer() (+19 more)

### Community 77 - "MatchDO.load"
Cohesion: 0.57
Nodes (7): MatchDO.appendToLog(), MatchDO.broadcastViews(), MatchDO.config(), MatchDO.load(), MatchDO.play(), MatchDO.send(), MatchDO.webSocketMessage()

### Community 78 - "placement-canvas.ts"
Cohesion: 0.16
Nodes (36): mountReplay(), draw(), centerOffset(), ditherOf(), Drawable, drawPiece(), fillQuad(), fitPixelCanvas() (+28 more)

### Community 79 - "sources.ts"
Cohesion: 0.08
Nodes (34): balanced(), baseName(), Block, categoryOf(), cleanDoc(), ComponentDoc, componentDocs(), CssAnimation (+26 more)

### Community 80 - "One branch = one full hosted environment"
Cohesion: 0.50
Nodes (4): deploy-environments.json manifest, Branches déployées, Branches déployées README, CI target-environment resolution job

### Community 81 - "Board"
Cohesion: 0.09
Nodes (23): seatHandle(), ReplayCanvas, describeEntry(), fitScale(), frameLabel(), movesBetween(), Perspective, match (+15 more)

### Community 82 - "mockup.js"
Cohesion: 0.22
Nodes (21): allCells(), byDepth(), diamond(), drawGlyph(), drawGlyphIcon(), drawMoveTrail(), drawPiece(), drawPieces() (+13 more)

### Community 83 - "docs/architecture.md (infra/server architecture reference)"
Cohesion: 0.22
Nodes (3): match_actions table, matches table, docs/architecture.md (infra/server architecture reference)

### Community 84 - "infra/src/actions.ts"
Cohesion: 0.16
Nodes (21): stream(), PLACEHOLDER, SERVER_DIR, TOML, commitPaths(), currentBranch(), pathsHaveChanges(), pushCurrentBranch() (+13 more)

### Community 85 - "Composition"
Cohesion: 0.10
Nodes (21): Composition, Banner(), BannerProps, EmptyState(), EmptyStateProps, Card(), CardColumn(), CardGrid() (+13 more)

### Community 86 - "piece-type.ts"
Cohesion: 0.12
Nodes (22): Slot, ConfigurablePieceType, PieceProfile, PieceKind, PieceRole, PieceType, Clairvoyant, FLAT (+14 more)

### Community 87 - "protocol/package.json"
Cohesion: 0.11
Nodes (17): dependencies, @occulis/core, devDependencies, typescript, vitest, @occulis/core, typescript, vitest (+9 more)

### Community 88 - "revealWindow"
Cohesion: 0.14
Nodes (17): DialogProps, Note(), Notify, ToastContext, ToastMessage, ToastStackProps, clamp01(), CLOSE_MS (+9 more)

### Community 89 - "server/src/index.ts"
Cohesion: 0.15
Nodes (20): Account, currentAccount(), handleAuth(), ACCOUNT_PATHS, createMatch(), fetch(), hasAuthSecret(), joinQueue() (+12 more)

### Community 91 - "Les composants"
Cohesion: 0.09
Nodes (30): Le design system du back-office, Les composants, `revealWindow()` — une fenêtre qu'un clic ouvre se déplie, Dialog(), DefinitionList(), Fact, FactStrip(), AsideLayout() (+22 more)

### Community 92 - "scene.ts"
Cohesion: 0.10
Nodes (44): Selection, drawHover(), drawLanding(), drawSelection(), lerp(), scaled(), topOf(), ditherPattern() (+36 more)

### Community 93 - "ridge.ts"
Cohesion: 0.19
Nodes (13): DEMO, MAP, PIECES, REGISTRY, DEPLOYMENT, MAP, mirror(), mirrored() (+5 more)

### Community 94 - "core/package.json"
Cohesion: 0.13
Nodes (14): devDependencies, typescript, vitest, typescript, vitest, main, name, private (+6 more)

### Community 95 - "components/IconButton.tsx"
Cohesion: 0.14
Nodes (11): Button, ButtonProps, IconButton(), IconButtonProps, QuickBarProps, ProgressBar(), TopBar(), TopBarProps (+3 more)

### Community 96 - "admin/routes.ts"
Cohesion: 0.17
Nodes (19): DEFAULT_PAGE_SIZE, integer(), MatchFilter, MatchStatus, MAX_PAGE_SIZE, Page, parseMatchFilter(), parsePage() (+11 more)

### Community 97 - "MatchDO"
Cohesion: 0.19
Nodes (7): absenceKey(), locksFor(), MatchDO, spectatorView(), watchTag(), MatchMemory, encodeView()

### Community 98 - "admin/api.ts"
Cohesion: 0.05
Nodes (58): CreateUserDialog(), useGo(), AdminSession, AdminUser, ban(), call(), create(), impersonate() (+50 more)

### Community 99 - "compilerOptions"
Cohesion: 0.17
Nodes (11): compilerOptions, jsx, lib, module, moduleResolution, noEmit, outDir, rootDir (+3 more)

### Community 100 - "compilerOptions"
Cohesion: 0.18
Nodes (10): compilerOptions, declaration, declarationMap, module, moduleResolution, noEmit, types, extends (+2 more)

### Community 102 - "social.integration.test.ts"
Cohesion: 0.14
Nodes (15): ProfileRow, befriend(), call(), get(), json(), listen(), matchOf(), social() (+7 more)

### Community 103 - "sky.ts"
Cohesion: 0.27
Nodes (17): drawMotes(), drawNebula(), drawSky(), Vault, vaultOf(), constellationsOf(), createMotes(), createStars() (+9 more)

### Community 104 - "compilerOptions"
Cohesion: 0.18
Nodes (10): compilerOptions, allowImportingTsExtensions, jsx, lib, noEmit, outDir, rootDir, extends (+2 more)

### Community 105 - "5. Ligne de vue (LOS), hauteur, fog of war"
Cohesion: 0.40
Nodes (5): 5.1 Décision fondatrice, 5.2 Distinction fondamentale : Visibilité ≠ Portée, 5.3 Règles de hauteur (mêlée / adjacence), 5.4 Fog of war — confirmé, 5. Ligne de vue (LOS), hauteur, fog of war

### Community 107 - "Friends.tsx"
Cohesion: 0.25
Nodes (15): Blocked(), ChatView(), FriendList(), FriendMatchReplay(), FriendsView(), FriendView(), merged(), Requests() (+7 more)

### Community 108 - "components/Badge.tsx"
Cohesion: 0.18
Nodes (9): Occulis UI — conventions, Setup, The three rules of the art direction, Tokens and classes, Badge(), BadgeProps, BadgeRow(), QuickBar() (+1 more)

### Community 109 - "compilerOptions"
Cohesion: 0.22
Nodes (8): compilerOptions, jsx, lib, noEmit, types, extends, include, ../../tsconfig.base.json

### Community 110 - "Occulis — Estimation des coûts"
Cohesion: 0.50
Nodes (4): Coûts hors hébergement, L'hibernation est une condition, pas une optimisation, Non chiffré, Occulis — Estimation des coûts

### Community 112 - "core/tsconfig.json"
Cohesion: 0.29
Nodes (6): compilerOptions, outDir, rootDir, extends, include, ../../tsconfig.base.json

### Community 113 - "protocol/tsconfig.json"
Cohesion: 0.29
Nodes (6): compilerOptions, outDir, rootDir, extends, include, ../../tsconfig.base.json

### Community 115 - "Maquettes des écrans"
Cohesion: 0.33
Nodes (5): Ce que ces fichiers ne sont pas, Ce que les maquettes encodent, Maquettes des écrans, Origine, Proposition non actée : la silhouette des pièces

### Community 116 - "Occulis"
Cohesion: 0.33
Nodes (6): Commandes, Documentation, Démarrage rapide, Environnements, Occulis, Organisation

### Community 117 - "profile/api.ts"
Cohesion: 0.12
Nodes (25): call(), changeEmail(), changeHandle(), changePassword(), createPreset(), currentMatch(), deletePreset(), feats() (+17 more)

### Community 118 - "current.ts"
Cohesion: 0.13
Nodes (17): initLocale(), translateDom(), listeners, onLocaleChange(), setLocale(), BOARD, attachSettings(), shape() (+9 more)

### Community 119 - "me/queries.ts"
Cohesion: 0.10
Nodes (32): MATCH_COLUMNS, MatchRow, readLog(), Auth, availableProviders(), Caller, guardCaller(), deletePreset() (+24 more)

### Community 140 - "TeamsApp.tsx"
Cohesion: 0.08
Nodes (42): isValid(), useRemaining(), ACCEPT_TOTAL_MS, DEPLOYMENT_TOTAL_MS, Content(), Deployment(), Content(), MatchFound() (+34 more)

### Community 149 - "cx"
Cohesion: 0.09
Nodes (25): ChoiceList(), ChoiceRow(), ChoiceRowProps, CountdownRing(), CountdownRingProps, MoveEntry, MoveList(), MoveListProps (+17 more)

### Community 150 - "Field.tsx"
Cohesion: 0.07
Nodes (32): Avertissements connus, Décisions et contournements, Notes de synchronisation — Occulis UI, Préparer un re-sync, Re-sync risks, InlineEdit(), InlineEditProps, PasswordField() (+24 more)

### Community 172 - "lab.test.tsx"
Cohesion: 0.17
Nodes (16): ScreenPoint, travel, DecodeTiming, CALM, FULL, STILL, DEFAULT_MOTION, easing() (+8 more)

### Community 186 - "Notes d'implémentation — interprétations à valider"
Cohesion: 0.50
Nodes (4): Correctifs notables, Décisions volontairement non implémentées, Interprétations encodées, Notes d'implémentation — interprétations à valider

### Community 200 - "fr/index.ts"
Cohesion: 0.07
Nodes (28): account, admin, auth, feats, game, en, mail, prepare (+20 more)

### Community 201 - "me/feats.ts"
Cohesion: 0.19
Nodes (18): parseJson(), readPlayerCard(), FEAT_IDS, FeatId, isFeatId(), PlayerStats, RULES, SHOWCASE_SIZE (+10 more)

### Community 202 - "social-do.ts"
Cohesion: 0.25
Nodes (6): callSocial(), openSocial(), pushTo(), SocialDO, socialOf(), friendIds()

### Community 203 - "handle.ts"
Cohesion: 0.16
Nodes (18): claimDerivedHandle(), claimHandle(), insertPlayer(), anonymousHandle(), checkHandle(), DELETED_PREFIXES, fold(), handleBase() (+10 more)

### Community 206 - "glyphs.ts"
Cohesion: 0.08
Nodes (41): Le composant, CipherFrieze(), CipherFriezeProps, CipherMode, CipherText(), CipherTextProps, Glyph(), GlyphProps (+33 more)

### Community 209 - "password.ts"
Cohesion: 0.31
Nodes (11): breachedPassword(), derive(), deriveOnce(), fromBase64(), hashPassword(), MIN_PASSWORD_LENGTH, parseCost(), PBKDF2_PARAMETERS (+3 more)

### Community 210 - "i18n/package.json"
Cohesion: 0.12
Nodes (15): description, devDependencies, typescript, vitest, typescript, vitest, main, name (+7 more)

### Community 211 - "Chat.tsx"
Cohesion: 0.12
Nodes (10): MessageComposer(), MessageComposerProps, MessageThread(), MessageThreadProps, ThreadMessage, Skeleton(), SkeletonProps, Versus() (+2 more)

### Community 212 - "social-channel.ts"
Cohesion: 0.13
Nodes (12): FIRST_RETRY_MS, MAX_RETRY_MS, retryDelay(), Channel, ChannelOptions, openChannel(), openSocial(), SocialChannel (+4 more)

### Community 213 - "./design/DesignSystem.js"
Cohesion: 0.14
Nodes (21): ./design/DesignSystem.js, DesignRoute, DesignSystem(), PAGES, SPEEDS, TweaksCard(), useAppliedTheme(), useSlowMotion() (+13 more)

### Community 214 - "critical.ts"
Cohesion: 0.35
Nodes (9): criticalPaint(), Fichiers, criticalHead(), PIXEL_FONT_URL, THEME_STORAGE_KEY, withCriticalHead(), BACKGROUND, THEME_NAMES (+1 more)

### Community 215 - "i18n/tsconfig.json"
Cohesion: 0.29
Nodes (6): compilerOptions, outDir, rootDir, extends, include, ../../tsconfig.base.json

### Community 216 - "coordKey"
Cohesion: 0.09
Nodes (21): TileSpec, areAdjacent(), chebyshevDistance(), coordKey, DIAGONAL_STEPS, neighbors(), OCTILE_STEPS, ORTHOGONAL_STEPS (+13 more)

### Community 220 - "tokens.ts"
Cohesion: 0.17
Nodes (17): Les tokens, cssVariables(), DEFAULT_THEME, FONT, hexColor(), INK, MOTION, motionLevelVariables() (+9 more)

### Community 226 - "config.ts"
Cohesion: 0.18
Nodes (7): DEPLOY_MANIFEST, envFlag(), FIXED_DB_NAMES, here, ROOT, slugifyBranch(), FIXTURE

### Community 227 - "theme-choice.ts"
Cohesion: 0.13
Nodes (6): host, host, setLook(), applyTheme(), storedTheme(), isThemeName()

### Community 228 - "net/auth.ts"
Cohesion: 0.18
Nodes (18): authMessage(), AuthOutcome, codeMessage(), failure(), JSON_HEADERS, linkGoogle(), post(), redirectMessage() (+10 more)

### Community 229 - "settings.ts"
Cohesion: 0.18
Nodes (8): Tweaks, TweaksContext, Settings, SettingsElements, SettingsOptions, Knobs, Palette, ThemeName

### Community 230 - "vite.config.ts"
Cohesion: 0.17
Nodes (8): LAB_PAGE, MIME, MOCKUPS_DIR, PAGES, resolveWithin(), serveMockups(), UI_ENTRY, vite

### Community 246 - "lab/index.ts"
Cohesion: 0.16
Nodes (10): AlphabetTable(), CipherSection(), DIRECTIONS, HoverLink(), alphabet, CIPHER_ALPHABETS, CIPHER_CHARSET, cipherGlyph() (+2 more)

### Community 247 - "Locale"
Cohesion: 0.13
Nodes (16): MatchFoundProps, TeamsAppProps, Invariants à ne pas casser, La charte graphique — `packages/ui`, La feuille de style, La synchronisation vers Claude Design, Tests, Locale (+8 more)

### Community 249 - "Lab.tsx"
Cohesion: 0.17
Nodes (6): Knob(), Lab(), loadKnobs(), Override, Range(), MOTION_LEVEL_NAMES

### Community 250 - "src/main.ts"
Cohesion: 0.07
Nodes (30): currentLocale(), element(), intentOf(), main(), prewarmBoard(), showIslands(), Identity, signOut() (+22 more)

### Community 260 - "Refonte graphique — propositions (2026-10-18)"
Cohesion: 0.12
Nodes (14): 1. Tokens et mouvement, 2. Caractères cryptiques, 3. Inversion « papier millimétré », Ce que la structure permet, et ce qu'elle ne fait pas encore, Dette existante à migrer le jour de l'intégration, Deux modes de fusion — à trancher, Décodable ou non — à trancher, Où, et à quelle fréquence (+6 more)

### Community 262 - "MotionSection.tsx"
Cohesion: 0.24
Nodes (6): Role, BoardMove(), MotionSection(), QueueWait(), ROLES, ScreenThreshold()

### Community 271 - "@occulis/infra"
Cohesion: 0.50
Nodes (3): Navigation, @occulis/infra, À distance (sans poste local allumé)

## Knowledge Gaps
- **800 isolated node(s):** `entries`, `printWidth`, `trailingComma`, `name`, `version` (+795 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1252 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **143 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Invariant : déterminisme strict de core` connect `La logique de jeu — `packages/core`` to `protocol/src/index.ts`?**
  _High betweenness centrality (0.122) - this node is a cross-community bridge._
- **Are the 74 inferred relationships involving `Les composants` (e.g. with `Badge()` and `BadgeRow()`) actually correct?**
  _`Les composants` has 74 INFERRED edges - model-reasoned connections that need verification._
- **What connects `entries`, `printWidth`, `trailingComma` to the rest of the system?**
  _800 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `cli.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.10873440285204991 - nodes in this community are weakly interconnected._
- **Why does `Occulis — Document de conception (récapitulatif d'itération)` connect `Occulis — Document de conception (récapitulatif d'itération)` to `5. Ligne de vue (LOS), hauteur, fog of war`, `technical/README.md`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **Should `La logique de jeu — `packages/core`` be split into smaller, more focused modules?**
  _Cohesion score 0.04081632653061224 - nodes in this community are weakly interconnected._
- **Why does `Occulis project overview` connect `Occulis project overview` to `docs/architecture.md (infra/server architecture reference)`, `technical/README.md`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._