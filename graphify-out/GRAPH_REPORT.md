# Graph Report - Occulis  (2026-10-15)

## Corpus Check
- 468 files · ~232,940 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 10 file(s) not represented in the graph (top: (none) 4, .css 3, .example 1)

## Summary
- 3110 nodes · 7913 edges · 242 communities (112 shown, 130 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 206 edges (avg confidence: 0.92)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5660ef3b`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- @occulis/web package.json
- cli.tsx
- selection.ts test suite
- La logique de jeu — `packages/core`
- Coord
- technical/README.md
- admin.integration.test.ts
- AccountApp.tsx
- compilerOptions
- admin/model.ts
- scripts
- queue-do.ts
- fog.ts
- Points ouverts (récapitulatif)
- Le moteur de rendu et le client — `apps/web`
- messages
- Occulis — Document de conception (récapitulatif d'itération)
- main.ts
- social/queries.ts
- /graphify skill trigger (.claude/CLAUDE.md)
- Outillage et CI/CD — `tooling/infra`, `.github`
- src/theme.ts sole color-value file
- .prettierrc.json
- players table
- apps/server tsconfig.json
- profile/resources.ts
- match-do.ts
- Points ouverts d'infrastructure
- Piliers de design non négociables
- Visibilité vs Portée
- me/queries.ts
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
- Friends.tsx
- Occulis — Mise en place de l'infrastructure
- engine.md
- look
- Documentation technique
- src/team.ts
- web/package.json
- .claude/CLAUDE.md
- social/api.ts
- profile/App.tsx
- scene.ts
- better-auth.ts
- server/package.json
- infra/package.json
- core/src/index.ts
- config.ts
- ref_vitest
- package.json
- devDependencies
- Occulis project overview
- camera.ts
- components.test.tsx
- MatchDO.load
- replay-canvas.ts
- ref_node_fs
- One branch = one full hosted environment
- protocol/src/index.ts
- mockup.js
- docs/architecture.md (infra/server architecture reference)
- actions.ts
- Les composants
- piece-type.ts
- protocol/package.json
- Toast.tsx
- server/src/index.ts
- views.tsx
- iso.ts
- reveal.ts
- ridge.ts
- core/package.json
- components/IconButton.tsx
- admin/queries.ts
- MatchDO
- admin/api.ts
- compilerOptions
- compilerOptions
- pixel-reveal.ts
- social.integration.test.ts
- sky.ts
- compilerOptions
- auth/mail.ts
- vite.config.ts
- components/Badge.tsx
- compilerOptions
- PlayerId
- core/tsconfig.json
- protocol/tsconfig.json
- theme-choice.ts
- Maquettes des écrans
- Occulis
- profile/api.ts
- loadCache
- presets.ts
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
- `pixelReveal()` — les fenêtres flottantes s'ouvrent en petits carrés
- TeamBuilder.tsx
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
- openChannel
- password.ts
- handle.ts
- scene/board.ts
- current.ts
- paging.ts
- i18n/package.json
- components/Icon.tsx
- animation.ts
- rating.ts
- Setting.tsx
- i18n/tsconfig.json
- relations.ts
- `match-do.ts` — `MatchDO`
- Occulis — Estimation des coûts
- `view/iso.ts` — projection et géométrie
- tokens.ts
- components/App.tsx
- Chat.tsx

## God Nodes (most connected - your core abstractions)
1. `Coord` - 75 edges
2. `Les composants` - 68 edges
3. `PlayerId` - 67 edges
4. `Board` - 66 edges
5. `messages()` - 58 edges
6. `main()` - 52 edges
7. `coordKey` - 52 edges
8. `look` - 42 edges
9. `cx()` - 42 edges
10. `MatchDO` - 31 edges

## Surprising Connections (you probably didn't know these)
- `Environnements` --references--> `main()`  [INFERRED]
  README.md → apps/web/src/main.ts
- `Les composants` --references--> `ChoiceList()`  [INFERRED]
  docs/technical/ui.md → packages/ui/src/components/Choice.tsx
- `Les composants` --references--> `Note()`  [INFERRED]
  docs/technical/ui.md → packages/ui/src/components/Dialog.tsx
- `Les composants` --references--> `useLocale()`  [INFERRED]
  docs/technical/ui.md → packages/ui/src/components/Locale.tsx
- `Les composants` --references--> `SettingList()`  [INFERRED]
  docs/technical/ui.md → packages/ui/src/components/Setting.tsx

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **CI checks → target resolution → deploy pipeline** — github_workflows_ci_checks_job, github_workflows_ci_target_job, github_workflows_ci_deploy_job, github_deploy_environments_manifest [INFERRED 0.85]

## Communities (242 total, 130 thin omitted)

### Community 2 - "cli.tsx"
Cohesion: 0.09
Nodes (28): ink, Navigation, @occulis/infra, Structure, À distance (sans poste local allumé), ACTIONS, Level, action (+20 more)

### Community 4 - "La logique de jeu — `packages/core`"
Cohesion: 0.04
Nodes (38): Module actions.ts : coups légaux et résolution, Module los.ts : raycast Bresenham, géométrie seule, Module movement.ts : verticalité et portée de mêlée, Un type de pièce = une classe (données/comportement séparés), `ActionError`, `actions.ts` — coups légaux et résolution, `Board.fromAscii()`, `board.ts` — le plateau (+30 more)

### Community 5 - "Coord"
Cohesion: 0.08
Nodes (31): PlacedPiece, PlacementState, TeamBuilderProps, Board, Tile, TileSpec, areAdjacent(), chebyshevDistance() (+23 more)

### Community 6 - "technical/README.md"
Cohesion: 0.32
Nodes (4): Coûts hors hébergement (signature, Steam, domaine), Chiffrage plan Workers Paid, pnpm infra (TUI Ink), Séparation comment/pourquoi dans la doc technique

### Community 7 - "admin.integration.test.ts"
Cohesion: 0.09
Nodes (18): signUpAdmin(), get(), idsOf(), impersonate(), jar(), nextAddress(), profile(), signIn() (+10 more)

### Community 8 - "AccountApp.tsx"
Cohesion: 0.11
Nodes (44): AccountApp(), AccountAppProps, Forgot(), GoogleEntry(), NoticeLine(), Register(), Reset(), RouteLink() (+36 more)

### Community 10 - "compilerOptions"
Cohesion: 0.12
Nodes (15): compilerOptions, declaration, declarationMap, esModuleInterop, exactOptionalPropertyTypes, forceConsistentCasingInFileNames, isolatedModules, lib (+7 more)

### Community 11 - "admin/model.ts"
Cohesion: 0.08
Nodes (28): Act, BanDialog(), DeleteDialog(), ICONS, ImpersonateDialog(), Open, QuickActions(), QuickActionsProps (+20 more)

### Community 12 - "scripts"
Cohesion: 0.22
Nodes (10): CI checks job (typecheck/lint/test/build), CI deploy job, scripts, build, dev, format, infra, lint (+2 more)

### Community 13 - "queue-do.ts"
Cohesion: 0.09
Nodes (40): dequeue(), enqueue(), Pairing, requeueFront(), takePairing(), ANNE, BORIS, Waiting (+32 more)

### Community 15 - "fog.ts"
Cohesion: 0.12
Nodes (27): destinationsFor(), legalActions(), MoveAction, occupancyWithout(), ReplayError, destinationsOf(), duel(), ruleset (+19 more)

### Community 16 - "Points ouverts (récapitulatif)"
Cohesion: 0.22
Nodes (4): Phase de déploiement, Fog of war confirmé, Points ouverts (récapitulatif), Pièges

### Community 17 - "Le moteur de rendu et le client — `apps/web`"
Cohesion: 0.05
Nodes (40): `admin/` — le back-office, Carte des modules, Ce que le client fait, et ne fait pas, Clic contre glissé, Conditions de réémission, `game/hypothesis.ts` — la position telle que le joueur peut la croire, `game/movement-diff.ts` — ce que la vue a fait bouger, `game/online-match.ts` — la partie arbitrée par le serveur (+32 more)

### Community 18 - "messages"
Cohesion: 0.10
Nodes (29): messages(), Identity, attachConsole(), ConsoleElements, GameConsole, FlowEvent, QueueSeeking, Seeking (+21 more)

### Community 19 - "Occulis — Document de conception (récapitulatif d'itération)"
Cohesion: 0.08
Nodes (25): 10. Récapitulatif — points ouverts à trancher (à date de ce document), 1. Pitch, 2. Piliers de design (non négociables, validés), 3.1 Attaque de mêlée (règle de base, toutes les pièces), 3.2 Attaque à distance (capacité spéciale, certaines pièces seulement), 3.3 Point ouvert non résolu, 3. Règles de capture — état validé, 4. Pièges (+17 more)

### Community 20 - "main.ts"
Cohesion: 0.09
Nodes (26): cleanedSearch(), translateDom(), onLocaleChange(), element(), intentOf(), main(), ensureBoard(), prewarmBoard() (+18 more)

### Community 21 - "social/queries.ts"
Cohesion: 0.09
Nodes (41): CHAT_PAGE_SIZE, checkMessage(), MAX_MESSAGE_LENGTH, MESSAGE_RETENTION_MS, MESSAGE_WINDOW_MS, MessageCheck, MessageError, MESSAGES_PER_WINDOW (+33 more)

### Community 23 - "Outillage et CI/CD — `tooling/infra`, `.github`"
Cohesion: 0.10
Nodes (21): `checks` — les vérifications, Concurrence, `config.ts` — chemins et conventions, « Créer un environnement de branche », `deploy` — le déploiement, `deploy-manifest.ts` — édition du manifeste, `git.ts`, `.github/deploy-environments.json` — le mécanisme de sélection (+13 more)

### Community 28 - "profile/resources.ts"
Cohesion: 0.09
Nodes (32): host, identity, match(), matches(), overview, player(), resourcesOf(), user() (+24 more)

### Community 29 - "match-do.ts"
Cohesion: 0.10
Nodes (22): ABSENCE_MS, cardOf(), DEPLOYMENT_MS, deployed(), seat(), LockedTeams, MatchConfig, spectatorView() (+14 more)

### Community 35 - "me/queries.ts"
Cohesion: 0.09
Nodes (27): MATCH_COLUMNS, MatchRow, readLog(), HANDLE_COOLDOWN_MS, HandleChange, MyMatch, mySummary(), readMyMatch() (+19 more)

### Community 49 - "Occulis — Architecture technique"
Cohesion: 0.11
Nodes (17): CI/CD (ci.yml, deploy-environments.json), Quatre environnements, 1. Cible de distribution, 2. Hébergement : Cloudflare Worker + Durable Objects, 3. Base de données : D1, 4. Environnements, 5. CI/CD, 6. Coûts (+9 more)

### Community 50 - "Le serveur — `apps/server`"
Cohesion: 0.08
Nodes (26): `admin/` — le back-office, `auth/` — comptes et sessions, Better Auth, et ce que le projet garde, Ce que le serveur ne dit pas, Fichiers, `index.ts` — le Worker, Invariants à ne pas casser, L'envoi des messages (+18 more)

### Community 51 - "ui/package.json"
Cohesion: 0.05
Nodes (39): dependencies, @occulis/i18n, description, devDependencies, react, react-dom, tsup, @types/react (+31 more)

### Community 52 - "Occulis"
Cohesion: 0.25
Nodes (8): Commandes, Conventions, graphify, Infrastructure et CI/CD, Modules de `packages/core`, Occulis, Stack et architecture, État du projet

### Community 53 - "Friends.tsx"
Cohesion: 0.11
Nodes (34): Blocked(), ChatView(), FriendList(), FriendMatchReplay(), FriendsView(), FriendView(), merged(), Requests() (+26 more)

### Community 54 - "Occulis — Mise en place de l'infrastructure"
Cohesion: 0.22
Nodes (9): 0. Préalables, 1. Outillage local, 2. Développement local, 3. Créer les bases distantes, 4. Premier déploiement en recette, 5. Secrets pour la CI, 6. Déclencher un déploiement, 7. Ce qui reste à écrire (+1 more)

### Community 55 - "engine.md"
Cohesion: 0.15
Nodes (5): Le dossier dit la dépendance (view/game purs vs scene/input/ui), Pipeline gestes/saisie → application → rendu, Cycle d'une action (load → applyAction → observe → log → broadcast), WireView / encodeView() protocole réseau, Client et serveur pas encore connectés

### Community 56 - "look"
Cohesion: 0.16
Nodes (22): arc(), at(), boardRadius(), drawSigil(), glyph(), drawBeam(), drawPiece(), PiecePaint (+14 more)

### Community 57 - "Documentation technique"
Cohesion: 0.33
Nodes (6): Carte du système, Documentation technique, L'état réel du câblage, Les cinq documents, Périmètre — et ce que ces documents ne sont pas, Règle de maintenance

### Community 58 - "src/team.ts"
Cohesion: 0.13
Nodes (18): applyAction(), replay(), validateAction(), advanceMemory(), replayMemory(), opponentOf(), err(), ok() (+10 more)

### Community 59 - "web/package.json"
Cohesion: 0.06
Nodes (34): dependencies, @occulis/core, @occulis/i18n, @occulis/protocol, @occulis/ui, pixi.js, react, react-dom (+26 more)

### Community 61 - "social/api.ts"
Cohesion: 0.16
Nodes (23): acceptChallenge(), acceptRequest(), allowSpectators(), block(), call(), cancelRequest(), challenge(), declineChallenge() (+15 more)

### Community 62 - "profile/App.tsx"
Cohesion: 0.08
Nodes (35): currentLocale(), showIslands(), Account(), DangerZone(), Editing, EditorProps, EmailEditor(), FeatsCard() (+27 more)

### Community 63 - "scene.ts"
Cohesion: 0.14
Nodes (32): Selection, drawHover(), drawLanding(), drawSelection(), lerp(), scaled(), topOf(), ditherPattern() (+24 more)

### Community 64 - "better-auth.ts"
Cohesion: 0.14
Nodes (21): database, directory, env, ACCOUNT_MUTATIONS, ADMIN_ROLE, buildAuth(), claimDerivedHandle(), claimHandle() (+13 more)

### Community 65 - "server/package.json"
Cohesion: 0.06
Nodes (30): dependencies, better-auth, @occulis/core, @occulis/i18n, @occulis/protocol, @occulis/ui, devDependencies, @cloudflare/vitest-pool-workers (+22 more)

### Community 67 - "infra/package.json"
Cohesion: 0.07
Nodes (28): ink-text-input, tsx, @types/node, bin, occulis-infra, dependencies, ink, ink-text-input (+20 more)

### Community 68 - "core/src/index.ts"
Cohesion: 0.08
Nodes (26): hypothesisFrom(), Movement, movementBetween(), OnlineMatch, ClickOutcome, resolveClick(), selectionFor(), Command (+18 more)

### Community 69 - "config.ts"
Cohesion: 0.18
Nodes (19): App(), envItems(), dbName(), DEPLOY_MANIFEST, envFlag(), FIXED_DB_NAMES, here, isBranchEnv() (+11 more)

### Community 70 - "ref_vitest"
Cohesion: 0.18
Nodes (16): replayLog(), memory(), WALLED, table(), WALLED, BOARD, game(), PIECES (+8 more)

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
Cohesion: 0.21
Nodes (19): attachControls(), ControlsOptions, Drag, DragKind, dragKindOf(), isTyping(), sameCoord(), Camera (+11 more)

### Community 77 - "MatchDO.load"
Cohesion: 0.57
Nodes (7): MatchDO.appendToLog(), MatchDO.broadcastViews(), MatchDO.config(), MatchDO.load(), MatchDO.play(), MatchDO.send(), MatchDO.webSocketMessage()

### Community 78 - "replay-canvas.ts"
Cohesion: 0.26
Nodes (29): mountReplay(), draw(), centerOffset(), fitScale(), ditherOf(), Drawable, drawPiece(), fillQuad() (+21 more)

### Community 79 - "ref_node_fs"
Cohesion: 0.19
Nodes (3): styles, @cloudflare/vitest-pool-workers, FIXTURE

### Community 80 - "One branch = one full hosted environment"
Cohesion: 0.50
Nodes (4): deploy-environments.json manifest, Branches déployées, Branches déployées README, CI target-environment resolution job

### Community 81 - "protocol/src/index.ts"
Cohesion: 0.10
Nodes (19): MatchDetail(), Replay(), seatHandle(), ReplayCanvas, clampFrame(), describeEntry(), frameLabel(), Move (+11 more)

### Community 82 - "mockup.js"
Cohesion: 0.22
Nodes (21): allCells(), byDepth(), diamond(), drawGlyph(), drawGlyphIcon(), drawMoveTrail(), drawPiece(), drawPieces() (+13 more)

### Community 83 - "docs/architecture.md (infra/server architecture reference)"
Cohesion: 0.22
Nodes (3): match_actions table, matches table, docs/architecture.md (infra/server architecture reference)

### Community 84 - "actions.ts"
Cohesion: 0.22
Nodes (15): stream(), ROOT, SERVER_DIR, commitPaths(), currentBranch(), pathsHaveChanges(), pushCurrentBranch(), LineSink (+7 more)

### Community 85 - "Les composants"
Cohesion: 0.08
Nodes (34): Composition, Invariants à ne pas casser, Les composants, Card(), CardColumn(), CardGrid(), CardProps, DefinitionList() (+26 more)

### Community 86 - "piece-type.ts"
Cohesion: 0.17
Nodes (16): Slot, ConfigurablePieceType, PieceProfile, PieceKind, PieceRole, PieceType, Sentinel, MovementProfile (+8 more)

### Community 87 - "protocol/package.json"
Cohesion: 0.11
Nodes (17): dependencies, @occulis/core, devDependencies, typescript, vitest, @occulis/core, typescript, vitest (+9 more)

### Community 88 - "Toast.tsx"
Cohesion: 0.15
Nodes (14): Setup, La charte graphique — `packages/ui`, La feuille de style, La synchronisation vers Claude Design, Tests, Notify, Toast(), ToastContext (+6 more)

### Community 89 - "server/src/index.ts"
Cohesion: 0.12
Nodes (25): Auth, availableProviders(), isImpersonated(), Caller, guardCaller(), Account, currentAccount(), handleAuth() (+17 more)

### Community 90 - "views.tsx"
Cohesion: 0.06
Nodes (21): describeBan(), formatDate(), query(), routeHash(), shortAgent(), winRate(), ACCOUNTS, GAMES (+13 more)

### Community 91 - "iso.ts"
Cohesion: 0.16
Nodes (15): cliffQuads(), CORNERS, EDGE_NEIGHBOURS, IsoProjection, lerpAngle(), projectXY(), Quad, rotate() (+7 more)

### Community 92 - "reveal.ts"
Cohesion: 0.24
Nodes (12): easeInOutSine(), crestAt(), distanceToSources(), lightAt(), LightMap, progress(), relight(), RevealTiming (+4 more)

### Community 93 - "ridge.ts"
Cohesion: 0.18
Nodes (14): DEMO, MAP, PIECES, DEFAULT_SCENARIO, REGISTRY, DEPLOYMENT, MAP, mirror() (+6 more)

### Community 94 - "core/package.json"
Cohesion: 0.13
Nodes (14): devDependencies, typescript, vitest, typescript, vitest, main, name, private (+6 more)

### Community 95 - "components/IconButton.tsx"
Cohesion: 0.12
Nodes (13): Banner(), BannerProps, EmptyState(), EmptyStateProps, IconButton(), IconButtonProps, QuickBarProps, ProgressBar() (+5 more)

### Community 96 - "admin/queries.ts"
Cohesion: 0.14
Nodes (21): annotate(), frameOf(), listMatches(), readMatch(), readPlayer(), readStats(), renamePlayer(), RenameResult (+13 more)

### Community 97 - "MatchDO"
Cohesion: 0.21
Nodes (5): absenceKey(), locksFor(), MatchDO, watchTag(), MatchMemory

### Community 98 - "admin/api.ts"
Cohesion: 0.13
Nodes (27): CreateUserDialog(), useGo(), AdminSession, AdminUser, ban(), call(), create(), impersonate() (+19 more)

### Community 99 - "compilerOptions"
Cohesion: 0.17
Nodes (11): compilerOptions, jsx, lib, module, moduleResolution, noEmit, outDir, rootDir (+3 more)

### Community 100 - "compilerOptions"
Cohesion: 0.18
Nodes (10): compilerOptions, declaration, declarationMap, module, moduleResolution, noEmit, types, extends (+2 more)

### Community 101 - "pixel-reveal.ts"
Cohesion: 0.14
Nodes (20): Dialog(), DialogProps, Note(), cellDelay(), CellState, clamp01(), CLOSE_MS, CLOSE_SPREAD_MS (+12 more)

### Community 102 - "social.integration.test.ts"
Cohesion: 0.14
Nodes (16): ProfileRow, befriend(), call(), get(), json(), listen(), matchOf(), social() (+8 more)

### Community 103 - "sky.ts"
Cohesion: 0.27
Nodes (17): drawMotes(), drawNebula(), drawSky(), Vault, vaultOf(), constellationsOf(), createMotes(), createStars() (+9 more)

### Community 104 - "compilerOptions"
Cohesion: 0.18
Nodes (10): compilerOptions, allowImportingTsExtensions, jsx, lib, noEmit, outDir, rootDir, extends (+2 more)

### Community 105 - "auth/mail.ts"
Cohesion: 0.29
Nodes (15): changeEmailLetter(), COLORS, compose(), Content, deleteAccountLetter(), escapeHtml(), ESCAPES, html() (+7 more)

### Community 107 - "vite.config.ts"
Cohesion: 0.22
Nodes (6): MIME, MOCKUPS_DIR, PAGES, resolveWithin(), serveMockups(), vite

### Community 108 - "components/Badge.tsx"
Cohesion: 0.22
Nodes (7): Occulis UI — conventions, The three rules of the art direction, Tokens and classes, Badge(), BadgeProps, BadgeRow(), QuickBar()

### Community 109 - "compilerOptions"
Cohesion: 0.22
Nodes (8): compilerOptions, jsx, lib, noEmit, types, extends, include, ../../tsconfig.base.json

### Community 110 - "PlayerId"
Cohesion: 0.11
Nodes (28): ChannelStatus, connect(), connectToMatch(), DeploymentContext, MatchChannel, MatchHandlers, SeatedContext, watchMatch() (+20 more)

### Community 112 - "core/tsconfig.json"
Cohesion: 0.29
Nodes (6): compilerOptions, outDir, rootDir, extends, include, ../../tsconfig.base.json

### Community 113 - "protocol/tsconfig.json"
Cohesion: 0.29
Nodes (6): compilerOptions, outDir, rootDir, extends, include, ../../tsconfig.base.json

### Community 114 - "theme-choice.ts"
Cohesion: 0.23
Nodes (12): setLook(), applyTheme(), criticalPaint(), Fichiers, criticalHead(), PIXEL_FONT_URL, THEME_STORAGE_KEY, withCriticalHead() (+4 more)

### Community 115 - "Maquettes des écrans"
Cohesion: 0.33
Nodes (5): Ce que ces fichiers ne sont pas, Ce que les maquettes encodent, Maquettes des écrans, Origine, Proposition non actée : la silhouette des pièces

### Community 116 - "Occulis"
Cohesion: 0.33
Nodes (6): Commandes, Documentation, Démarrage rapide, Environnements, Occulis, Organisation

### Community 117 - "profile/api.ts"
Cohesion: 0.14
Nodes (24): ROUTE_PATHS, call(), changeEmail(), changeHandle(), changePassword(), createPreset(), deletePreset(), feats() (+16 more)

### Community 119 - "presets.ts"
Cohesion: 0.12
Nodes (27): createPreset(), deletePreset(), Input, isValid(), listPresets(), PRESET_LIMIT, PresetError, PresetResult (+19 more)

### Community 140 - "TeamsApp.tsx"
Cohesion: 0.09
Nodes (29): defaultTeam(), boardForScenario(), useRemaining(), ACCEPT_TOTAL_MS, DEPLOYMENT_TOTAL_MS, Content(), Deployment(), DeploymentProps (+21 more)

### Community 149 - "cx"
Cohesion: 0.10
Nodes (23): Button, ButtonProps, ChoiceList(), ChoiceRow(), ChoiceRowProps, CountdownRing(), CountdownRingProps, MoveEntry (+15 more)

### Community 150 - "`pixelReveal()` — les fenêtres flottantes s'ouvrent en petits carrés"
Cohesion: 0.09
Nodes (28): Avertissements connus, Décisions et contournements, Notes de synchronisation — Occulis UI, Préparer un re-sync, Re-sync risks, `pixelReveal()` — les fenêtres flottantes s'ouvrent en petits carrés, InlineEdit(), InlineEditProps (+20 more)

### Community 172 - "TeamBuilder.tsx"
Cohesion: 0.16
Nodes (22): autoFill(), clear(), clickTile(), emptyDraft(), firstUnplaced(), fromEntries(), isComplete(), placedCount() (+14 more)

### Community 186 - "Notes d'implémentation — interprétations à valider"
Cohesion: 0.50
Nodes (4): Correctifs notables, Décisions volontairement non implémentées, Interprétations encodées, Notes d'implémentation — interprétations à valider

### Community 200 - "fr/index.ts"
Cohesion: 0.06
Nodes (34): account, admin, auth, feats, game, en, mail, prepare (+26 more)

### Community 201 - "me/feats.ts"
Cohesion: 0.21
Nodes (17): parseJson(), readPlayerCard(), FEAT_IDS, FeatId, isFeatId(), PlayerStats, RULES, SHOWCASE_SIZE (+9 more)

### Community 202 - "social-do.ts"
Cohesion: 0.15
Nodes (11): callSocial(), openSocial(), pushTo(), SocialDO, socialOf(), friendIds(), SocialContext, PROTOCOL_VERSION (+3 more)

### Community 203 - "openChannel"
Cohesion: 0.31
Nodes (6): FIRST_RETRY_MS, MAX_RETRY_MS, retryDelay(), Channel, ChannelOptions, openChannel()

### Community 205 - "password.ts"
Cohesion: 0.33
Nodes (10): derive(), deriveOnce(), fromBase64(), hashPassword(), MIN_PASSWORD_LENGTH, parseCost(), PBKDF2_PARAMETERS, timingSafeEquals() (+2 more)

### Community 206 - "handle.ts"
Cohesion: 0.25
Nodes (12): anonymousHandle(), checkHandle(), DELETED_PREFIXES, fold(), handleBase(), handleCandidates(), HandleCheck, HandleError (+4 more)

### Community 207 - "scene/board.ts"
Cohesion: 0.27
Nodes (8): Board, BoardHooks, mountBoard(), SceneInput, MoveAnimation, ART_PIXEL, breath(), pixelResolution()

### Community 208 - "current.ts"
Cohesion: 0.12
Nodes (17): App(), Gate(), Page(), parseRoute(), chooseLocale(), initLocale(), listeners, setLocale() (+9 more)

### Community 209 - "paging.ts"
Cohesion: 0.36
Nodes (8): DEFAULT_PAGE_SIZE, integer(), MatchFilter, MatchStatus, MAX_PAGE_SIZE, Page, parseMatchFilter(), parsePage()

### Community 210 - "i18n/package.json"
Cohesion: 0.12
Nodes (15): description, devDependencies, typescript, vitest, typescript, vitest, main, name (+7 more)

### Community 211 - "components/Icon.tsx"
Cohesion: 0.29
Nodes (6): Icon(), ICON_NAMES, IconName, IconProps, ICONS, Shape

### Community 212 - "animation.ts"
Cohesion: 0.26
Nodes (8): advance(), AnimatedPosition, easeInOutCubic(), lagging(), liftOf(), positionOf(), startMove(), BOARD

### Community 213 - "rating.ts"
Cohesion: 0.53
Nodes (4): expectedScore(), INITIAL_RATING, K_FACTOR, ratingChanges()

### Community 214 - "Setting.tsx"
Cohesion: 0.33
Nodes (4): SettingEditor(), SettingEditorProps, SettingList(), SettingRowProps

### Community 215 - "i18n/tsconfig.json"
Cohesion: 0.29
Nodes (6): compilerOptions, outDir, rootDir, extends, include, ../../tsconfig.base.json

### Community 216 - "relations.ts"
Cohesion: 0.20
Nodes (8): MAX_PENDING_REQUESTS, RelationFacts, RequestDecision, RequestError, NONE, WatchError, WatchFacts, Relation

### Community 217 - "`match-do.ts` — `MatchDO`"
Cohesion: 0.33
Nodes (6): L'autorité de tour, L'hibernation — le point de coût, Le cycle d'une action, Le siège : à qui parle-t-on ?, `load()` — la reconstruction par rejeu, `match-do.ts` — `MatchDO`

### Community 218 - "Occulis — Estimation des coûts"
Cohesion: 0.50
Nodes (4): Coûts hors hébergement, L'hibernation est une condition, pas une optimisation, Non chiffré, Occulis — Estimation des coûts

### Community 219 - "`view/iso.ts` — projection et géométrie"
Cohesion: 0.50
Nodes (4): `cliffQuads()` et l'ordre du peintre, La projection elle-même, `tileQuad()` — pourquoi les quatre coins sont projetés séparément, `view/iso.ts` — projection et géométrie

### Community 220 - "tokens.ts"
Cohesion: 0.14
Nodes (18): applyPalette(), SettingsOptions, Les tokens, CAMP, cssVariables(), FONT, hexColor(), INK (+10 more)

### Community 226 - "components/App.tsx"
Cohesion: 0.15
Nodes (16): ActionContext, ActionDef, guardPlaceholder(), InteractiveOutcome, Phase, Props, tomlBadge(), EnvName (+8 more)

### Community 228 - "Chat.tsx"
Cohesion: 0.12
Nodes (10): MessageComposer(), MessageComposerProps, MessageThread(), MessageThreadProps, ThreadMessage, Skeleton(), SkeletonProps, Versus() (+2 more)

## Knowledge Gaps
- **738 isolated node(s):** `entries`, `printWidth`, `trailingComma`, `name`, `version` (+733 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1142 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **130 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Invariant : déterminisme strict de core` connect `La logique de jeu — `packages/core`` to `core/src/index.ts`?**
  _High betweenness centrality (0.160) - this node is a cross-community bridge._
- **Are the 66 inferred relationships involving `Les composants` (e.g. with `Badge()` and `BadgeRow()`) actually correct?**
  _`Les composants` has 66 INFERRED edges - model-reasoned connections that need verification._
- **What connects `entries`, `printWidth`, `trailingComma` to the rest of the system?**
  _738 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `cli.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.09309309309309309 - nodes in this community are weakly interconnected._
- **Why does `Occulis project overview` connect `Occulis project overview` to `docs/architecture.md (infra/server architecture reference)`, `technical/README.md`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **Should `La logique de jeu — `packages/core`` be split into smaller, more focused modules?**
  _Cohesion score 0.04081632653061224 - nodes in this community are weakly interconnected._
- **Should `Coord` be split into smaller, more focused modules?**
  _Cohesion score 0.08208020050125313 - nodes in this community are weakly interconnected._