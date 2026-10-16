# Graph Report - Occulis  (2026-10-16)

## Corpus Check
- 468 files · ~232,465 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 10 file(s) not represented in the graph (top: (none) 4, .css 3, .example 1)

## Summary
- 3103 nodes · 7881 edges · 248 communities (114 shown, 134 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 190 edges (avg confidence: 0.92)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `24b1f913`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- @occulis/web package.json
- cli.tsx
- selection.ts test suite
- La logique de jeu — `packages/core`
- Coord
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
- main.ts
- Occulis — Document de conception (récapitulatif d'itération)
- PlayerId
- social/queries.ts
- /graphify skill trigger (.claude/CLAUDE.md)
- Outillage et CI/CD — `tooling/infra`, `.github`
- src/theme.ts sole color-value file
- .prettierrc.json
- players table
- apps/server tsconfig.json
- cache.ts
- core/src/index.ts
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
- social/model.ts
- Occulis — Mise en place de l'infrastructure
- engine.md
- look
- Documentation technique
- fog.ts
- web/package.json
- .claude/CLAUDE.md
- auth/mail.ts
- profile/App.tsx
- overlay.ts
- better-auth.ts
- server/package.json
- infra/package.json
- online-match.ts
- components/App.tsx
- selection.test.ts
- package.json
- devDependencies
- Occulis project overview
- iso.ts
- MatchDO.load
- replay-canvas.ts
- ref_node_fs
- One branch = one full hosted environment
- replay.ts
- mockup.js
- docs/architecture.md (infra/server architecture reference)
- infra/src/actions.ts
- Composition
- piece-type.ts
- protocol/package.json
- window-reveal.ts
- server/src/index.ts
- Identity
- scene.ts
- src/team.ts
- core/package.json
- Les composants
- admin/queries.ts
- MatchDO
- admin/api.ts
- compilerOptions
- compilerOptions
- command.ts
- social.integration.test.ts
- sky.ts
- compilerOptions
- net/auth.ts
- admin/main.tsx
- en/index.ts
- components/Badge.tsx
- compilerOptions
- protocol/src/index.ts
- core/tsconfig.json
- protocol/tsconfig.json
- coord.ts
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
- Field.tsx
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
- parts.tsx
- fr/index.ts
- me/feats.ts
- social-do.ts
- Friends.tsx
- profile/resources.ts
- admin/resources.ts
- me.integration.test.ts
- current.ts
- password.ts
- i18n/package.json
- ref_react
- openChannel
- paging.ts
- relations.ts
- i18n/tsconfig.json
- preparation.integration.test.ts
- rating.ts
- Occulis — Estimation des coûts
- tokens.ts
- config.ts
- src/social.ts
- Sélection des branches hébergées
- settings.ts
- auth/routes.ts
- 5. Ligne de vue (LOS), hauteur, fog of war
- components/Person.tsx
- La charte graphique — `packages/ui`

## God Nodes (most connected - your core abstractions)
1. `Coord` - 75 edges
2. `Les composants` - 69 edges
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
- `Les composants` --references--> `MessageComposer()`  [INFERRED]
  docs/technical/ui.md → packages/ui/src/components/Chat.tsx
- `Les composants` --references--> `ChoiceList()`  [INFERRED]
  docs/technical/ui.md → packages/ui/src/components/Choice.tsx
- `Les composants` --references--> `Note()`  [INFERRED]
  docs/technical/ui.md → packages/ui/src/components/Dialog.tsx
- `Les composants` --references--> `FormMessage()`  [INFERRED]
  docs/technical/ui.md → packages/ui/src/components/Form.tsx

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **CI checks → target resolution → deploy pipeline** — github_workflows_ci_checks_job, github_workflows_ci_target_job, github_workflows_ci_deploy_job, github_deploy_environments_manifest [INFERRED 0.85]

## Communities (248 total, 134 thin omitted)

### Community 2 - "cli.tsx"
Cohesion: 0.10
Nodes (27): ink, Navigation, @occulis/infra, Structure, À distance (sans poste local allumé), Level, action, COLOR_CODE (+19 more)

### Community 4 - "La logique de jeu — `packages/core`"
Cohesion: 0.04
Nodes (38): Module actions.ts : coups légaux et résolution, Module los.ts : raycast Bresenham, géométrie seule, Module movement.ts : verticalité et portée de mêlée, Un type de pièce = une classe (données/comportement séparés), `ActionError`, `actions.ts` — coups légaux et résolution, `Board.fromAscii()`, `board.ts` — le plateau (+30 more)

### Community 5 - "Coord"
Cohesion: 0.10
Nodes (23): Move, PlacedPiece, PlacementState, Board, Tile, TileSpec, areAdjacent(), chebyshevDistance() (+15 more)

### Community 6 - "technical/README.md"
Cohesion: 0.32
Nodes (4): Coûts hors hébergement (signature, Steam, domaine), Chiffrage plan Workers Paid, pnpm infra (TUI Ink), Séparation comment/pourquoi dans la doc technique

### Community 7 - "ref_vitest"
Cohesion: 0.11
Nodes (11): signUpAdmin(), Someone, cookieFrom(), PASSWORD, SESSION_COOKIE, signUp(), unique(), verifyEmail() (+3 more)

### Community 8 - "AccountApp.tsx"
Cohesion: 0.16
Nodes (30): AccountApp(), AccountAppProps, Forgot(), GoogleEntry(), NoticeLine(), Register(), Reset(), RouteLink() (+22 more)

### Community 10 - "compilerOptions"
Cohesion: 0.12
Nodes (15): compilerOptions, declaration, declarationMap, esModuleInterop, exactOptionalPropertyTypes, forceConsistentCasingInFileNames, isolatedModules, lib (+7 more)

### Community 11 - "views.tsx"
Cohesion: 0.07
Nodes (48): Act, BanDialog(), DeleteDialog(), ICONS, ImpersonateDialog(), Open, QuickActions(), QuickActionsProps (+40 more)

### Community 12 - "scripts"
Cohesion: 0.22
Nodes (10): CI checks job (typecheck/lint/test/build), CI deploy job, scripts, build, dev, format, infra, lint (+2 more)

### Community 13 - "queue-do.ts"
Cohesion: 0.09
Nodes (40): dequeue(), enqueue(), Pairing, requeueFront(), takePairing(), ANNE, BORIS, Waiting (+32 more)

### Community 15 - "social/api.ts"
Cohesion: 0.16
Nodes (23): acceptChallenge(), acceptRequest(), allowSpectators(), block(), call(), cancelRequest(), challenge(), declineChallenge() (+15 more)

### Community 16 - "Points ouverts (récapitulatif)"
Cohesion: 0.22
Nodes (4): Phase de déploiement, Fog of war confirmé, Points ouverts (récapitulatif), Pièges

### Community 17 - "Le moteur de rendu et le client — `apps/web`"
Cohesion: 0.05
Nodes (44): `admin/` — le back-office, Carte des modules, Ce que le client fait, et ne fait pas, Clic contre glissé, `cliffQuads()` et l'ordre du peintre, Conditions de réémission, `game/hypothesis.ts` — la position telle que le joueur peut la croire, `game/movement-diff.ts` — ce que la vue a fait bouger (+36 more)

### Community 18 - "main.ts"
Cohesion: 0.09
Nodes (39): messages(), element(), intentOf(), main(), prewarmBoard(), signOut(), openSocial(), SocialChannel (+31 more)

### Community 19 - "Occulis — Document de conception (récapitulatif d'itération)"
Cohesion: 0.10
Nodes (20): 10. Récapitulatif — points ouverts à trancher (à date de ce document), 1. Pitch, 2. Piliers de design (non négociables, validés), 3.1 Attaque de mêlée (règle de base, toutes les pièces), 3.2 Attaque à distance (capacité spéciale, certaines pièces seulement), 3.3 Point ouvert non résolu, 3. Règles de capture — état validé, 4. Pièges (+12 more)

### Community 20 - "PlayerId"
Cohesion: 0.14
Nodes (14): OnlineMatch, SeatedContext, QueueSeat, Action, PlayerView, PlayerId, ActionRecord, WireView (+6 more)

### Community 21 - "social/queries.ts"
Cohesion: 0.10
Nodes (40): CHAT_PAGE_SIZE, checkMessage(), MAX_MESSAGE_LENGTH, MESSAGE_RETENTION_MS, MESSAGE_WINDOW_MS, MessageCheck, MessageError, MESSAGES_PER_WINDOW (+32 more)

### Community 23 - "Outillage et CI/CD — `tooling/infra`, `.github`"
Cohesion: 0.10
Nodes (21): `checks` — les vérifications, Concurrence, `config.ts` — chemins et conventions, « Créer un environnement de branche », `deploy` — le déploiement, `deploy-manifest.ts` — édition du manifeste, `git.ts`, `.github/deploy-environments.json` — le mécanisme de sélection (+13 more)

### Community 28 - "cache.ts"
Cohesion: 0.15
Nodes (9): Entry, FRESH_MS, Loaded, loadedOf(), Outcome, PendingCount, pendingLoads, controlled() (+1 more)

### Community 29 - "core/src/index.ts"
Cohesion: 0.12
Nodes (19): ABSENCE_MS, cardOf(), DEPLOYMENT_MS, deployed(), seat(), LockedTeams, MatchConfig, ensurePlayers() (+11 more)

### Community 35 - "me/queries.ts"
Cohesion: 0.13
Nodes (27): readLog(), availableProviders(), guardCaller(), deletePreset(), setDefaultPreset(), changeHandle(), HANDLE_COOLDOWN_MS, HandleChange (+19 more)

### Community 49 - "Occulis — Architecture technique"
Cohesion: 0.20
Nodes (10): 1. Cible de distribution, 2. Hébergement : Cloudflare Worker + Durable Objects, 3. Base de données : D1, 5. CI/CD, 6. Coûts, 7. Points ouverts, Conséquence : versionner les règles par partie, Le log d'actions est la source de vérité (+2 more)

### Community 50 - "Le serveur — `apps/server`"
Cohesion: 0.06
Nodes (32): `admin/` — le back-office, `auth/` — comptes et sessions, Better Auth, et ce que le projet garde, Ce que le serveur ne dit pas, Fichiers, `index.ts` — le Worker, Invariants à ne pas casser, L'autorité de tour (+24 more)

### Community 51 - "ui/package.json"
Cohesion: 0.05
Nodes (39): dependencies, @occulis/i18n, description, devDependencies, react, react-dom, tsup, @types/react (+31 more)

### Community 52 - "Occulis"
Cohesion: 0.25
Nodes (8): Commandes, Conventions, graphify, Infrastructure et CI/CD, Modules de `packages/core`, Occulis, Stack et architecture, État du projet

### Community 53 - "social/model.ts"
Cohesion: 0.12
Nodes (21): SocialContext, SocialProvider(), challenged(), EMPTY_SOCIAL, mapFriends(), readAll(), receive(), relationTo() (+13 more)

### Community 54 - "Occulis — Mise en place de l'infrastructure"
Cohesion: 0.22
Nodes (9): 0. Préalables, 1. Outillage local, 2. Développement local, 3. Créer les bases distantes, 4. Premier déploiement en recette, 5. Secrets pour la CI, 6. Déclencher un déploiement, 7. Ce qui reste à écrire (+1 more)

### Community 55 - "engine.md"
Cohesion: 0.15
Nodes (5): Le dossier dit la dépendance (view/game purs vs scene/input/ui), Pipeline gestes/saisie → application → rendu, Cycle d'une action (load → applyAction → observe → log → broadcast), WireView / encodeView() protocole réseau, Client et serveur pas encore connectés

### Community 56 - "look"
Cohesion: 0.12
Nodes (27): Board, mountBoard(), arc(), at(), boardRadius(), drawSigil(), glyph(), drawBeam() (+19 more)

### Community 57 - "Documentation technique"
Cohesion: 0.33
Nodes (6): Carte du système, Documentation technique, L'état réel du câblage, Les cinq documents, Périmètre — et ce que ces documents ne sont pas, Règle de maintenance

### Community 58 - "fog.ts"
Cohesion: 0.12
Nodes (36): Occupant, applyAction(), destinationsFor(), legalActions(), MoveAction, occupancyWithout(), replay(), ReplayError (+28 more)

### Community 59 - "web/package.json"
Cohesion: 0.06
Nodes (34): dependencies, @occulis/core, @occulis/i18n, @occulis/protocol, @occulis/ui, pixi.js, react, react-dom (+26 more)

### Community 61 - "auth/mail.ts"
Cohesion: 0.29
Nodes (15): changeEmailLetter(), COLORS, compose(), Content, deleteAccountLetter(), escapeHtml(), ESCAPES, html() (+7 more)

### Community 62 - "profile/App.tsx"
Cohesion: 0.11
Nodes (30): Account(), DangerZone(), Editing, EditorProps, EmailEditor(), FeatsCard(), Frame(), Gate() (+22 more)

### Community 63 - "overlay.ts"
Cohesion: 0.27
Nodes (20): drawHover(), drawLanding(), drawSelection(), lerp(), scaled(), topOf(), clamp01(), easeInOutSine() (+12 more)

### Community 64 - "better-auth.ts"
Cohesion: 0.10
Nodes (32): database, directory, env, ACCOUNT_MUTATIONS, ADMIN_ROLE, buildAuth(), claimDerivedHandle(), claimHandle() (+24 more)

### Community 65 - "server/package.json"
Cohesion: 0.06
Nodes (31): dependencies, better-auth, @occulis/core, @occulis/i18n, @occulis/protocol, @occulis/ui, devDependencies, @cloudflare/vitest-pool-workers (+23 more)

### Community 67 - "infra/package.json"
Cohesion: 0.07
Nodes (28): ink-text-input, tsx, @types/node, bin, occulis-infra, dependencies, ink, ink-text-input (+20 more)

### Community 68 - "online-match.ts"
Cohesion: 0.20
Nodes (8): hypothesisFrom(), Movement, movementBetween(), ClickOutcome, resolveClick(), selectionFor(), coordEquals(), pieceAt()

### Community 69 - "components/App.tsx"
Cohesion: 0.16
Nodes (20): ActionContext, ActionDef, ACTIONS, App(), envItems(), InteractiveOutcome, Phase, Props (+12 more)

### Community 70 - "selection.test.ts"
Cohesion: 0.19
Nodes (16): memory(), WALLED, table(), WALLED, BOARD, game(), PIECES, MATCHED (+8 more)

### Community 72 - "package.json"
Cohesion: 0.12
Nodes (16): engines, node, @cloudflare/workers-types, typescript, wrangler, name, packageManager, pnpm (+8 more)

### Community 73 - "devDependencies"
Cohesion: 0.22
Nodes (9): devDependencies, @cloudflare/workers-types, eslint, eslint-config-prettier, prettier, typescript, @typescript-eslint/eslint-plugin, @typescript-eslint/parser (+1 more)

### Community 74 - "Occulis project overview"
Cohesion: 0.17
Nodes (10): @occulis/server package.json, apps/server (Cloudflare Worker + DO), apps/web (Vite + PixiJS rendering), docs/costs.md (infra cost estimates), docs/design.md (game design reference), Occulis project overview, packages/core (pure game logic), docs/setup.md (install procedure) (+2 more)

### Community 75 - "iso.ts"
Cohesion: 0.10
Nodes (37): attachControls(), ControlsOptions, Drag, DragKind, dragKindOf(), isTyping(), sameCoord(), Camera (+29 more)

### Community 77 - "MatchDO.load"
Cohesion: 0.57
Nodes (7): MatchDO.appendToLog(), MatchDO.broadcastViews(), MatchDO.config(), MatchDO.load(), MatchDO.play(), MatchDO.send(), MatchDO.webSocketMessage()

### Community 78 - "replay-canvas.ts"
Cohesion: 0.26
Nodes (30): mountReplay(), draw(), centerOffset(), fitScale(), movesBetween(), ditherOf(), Drawable, drawPiece() (+22 more)

### Community 80 - "One branch = one full hosted environment"
Cohesion: 0.50
Nodes (4): deploy-environments.json manifest, Branches déployées, Branches déployées README, CI target-environment resolution job

### Community 81 - "replay.ts"
Cohesion: 0.16
Nodes (8): ReplayCanvas, Perspective, match, ReplayBoard(), ReplayBoardProps, METRICS, AdminFrame, AdminMatchDetail

### Community 82 - "mockup.js"
Cohesion: 0.22
Nodes (21): allCells(), byDepth(), diamond(), drawGlyph(), drawGlyphIcon(), drawMoveTrail(), drawPiece(), drawPieces() (+13 more)

### Community 83 - "docs/architecture.md (infra/server architecture reference)"
Cohesion: 0.22
Nodes (3): match_actions table, matches table, docs/architecture.md (infra/server architecture reference)

### Community 84 - "infra/src/actions.ts"
Cohesion: 0.14
Nodes (24): guardPlaceholder(), stream(), PLACEHOLDER, ROOT, SERVER_DIR, TOML, commitPaths(), currentBranch() (+16 more)

### Community 85 - "Composition"
Cohesion: 0.11
Nodes (19): Composition, Banner(), BannerProps, EmptyState(), EmptyStateProps, Card(), CardColumn(), CardGrid() (+11 more)

### Community 86 - "piece-type.ts"
Cohesion: 0.19
Nodes (15): Slot, ConfigurablePieceType, PieceProfile, PieceKind, PieceRole, PieceType, MovementProfile, VisionProfile (+7 more)

### Community 87 - "protocol/package.json"
Cohesion: 0.11
Nodes (17): dependencies, @occulis/core, devDependencies, typescript, vitest, @occulis/core, typescript, vitest (+9 more)

### Community 88 - "window-reveal.ts"
Cohesion: 0.14
Nodes (22): Setup, `revealWindow()` — une fenêtre qu'un clic ouvre se déplie, Dialog(), Notify, Toast(), ToastContext, ToastMessage, ToastProvider() (+14 more)

### Community 89 - "server/src/index.ts"
Cohesion: 0.16
Nodes (19): currentAccount(), handleAuth(), ACCOUNT_PATHS, createMatch(), fetch(), hasAuthSecret(), joinQueue(), joinSocial() (+11 more)

### Community 92 - "scene.ts"
Cohesion: 0.08
Nodes (34): Selection, BoardHooks, ditherPattern(), Drawable, INSTANT, isTile(), occupantsOf(), sameCoord() (+26 more)

### Community 93 - "src/team.ts"
Cohesion: 0.09
Nodes (24): Piece, REGISTRY, DEMO, MAP, PIECES, DEFAULT_SCENARIO, REGISTRY, DEPLOYMENT (+16 more)

### Community 94 - "core/package.json"
Cohesion: 0.13
Nodes (14): devDependencies, typescript, vitest, typescript, vitest, main, name, private (+6 more)

### Community 95 - "Les composants"
Cohesion: 0.11
Nodes (21): Invariants à ne pas casser, Les composants, DefinitionList(), Fact, FactStrip(), LocaleSwitch(), useMessages(), Stat() (+13 more)

### Community 96 - "admin/queries.ts"
Cohesion: 0.12
Nodes (24): annotate(), frameOf(), listMatches(), MATCH_COLUMNS, MatchRow, readMatch(), readPlayer(), readStats() (+16 more)

### Community 97 - "MatchDO"
Cohesion: 0.20
Nodes (6): absenceKey(), locksFor(), MatchDO, spectatorView(), watchTag(), MatchMemory

### Community 98 - "admin/api.ts"
Cohesion: 0.13
Nodes (26): CreateUserDialog(), useGo(), AdminSession, AdminUser, ban(), call(), create(), impersonate() (+18 more)

### Community 99 - "compilerOptions"
Cohesion: 0.17
Nodes (11): compilerOptions, jsx, lib, module, moduleResolution, noEmit, outDir, rootDir (+3 more)

### Community 100 - "compilerOptions"
Cohesion: 0.18
Nodes (10): compilerOptions, declaration, declarationMap, module, moduleResolution, noEmit, types, extends (+2 more)

### Community 101 - "command.ts"
Cohesion: 0.21
Nodes (11): Command, CommandFault, parseCommand(), parseCoord(), RESIGN_WORDS, actionFor(), expectMove(), faultOf() (+3 more)

### Community 102 - "social.integration.test.ts"
Cohesion: 0.19
Nodes (8): befriend(), call(), get(), json(), listen(), matchOf(), social(), ChatPage

### Community 103 - "sky.ts"
Cohesion: 0.27
Nodes (17): drawMotes(), drawNebula(), drawSky(), Vault, vaultOf(), constellationsOf(), createMotes(), createStars() (+9 more)

### Community 104 - "compilerOptions"
Cohesion: 0.18
Nodes (10): compilerOptions, allowImportingTsExtensions, jsx, lib, noEmit, outDir, rootDir, extends (+2 more)

### Community 105 - "net/auth.ts"
Cohesion: 0.20
Nodes (17): authMessage(), AuthOutcome, codeMessage(), failure(), JSON_HEADERS, linkGoogle(), post(), redirectMessage() (+9 more)

### Community 107 - "en/index.ts"
Cohesion: 0.12
Nodes (12): account, admin, auth, feats, game, en, mail, prepare (+4 more)

### Community 108 - "components/Badge.tsx"
Cohesion: 0.22
Nodes (7): Occulis UI — conventions, The three rules of the art direction, Tokens and classes, Badge(), BadgeProps, BadgeRow(), QuickBar()

### Community 109 - "compilerOptions"
Cohesion: 0.22
Nodes (8): compilerOptions, jsx, lib, noEmit, types, extends, include, ../../tsconfig.base.json

### Community 110 - "protocol/src/index.ts"
Cohesion: 0.10
Nodes (30): ChannelStatus, connect(), connectToMatch(), DeploymentContext, MatchChannel, MatchHandlers, watchMatch(), joinQueue() (+22 more)

### Community 112 - "core/tsconfig.json"
Cohesion: 0.29
Nodes (6): compilerOptions, outDir, rootDir, extends, include, ../../tsconfig.base.json

### Community 113 - "protocol/tsconfig.json"
Cohesion: 0.29
Nodes (6): compilerOptions, outDir, rootDir, extends, include, ../../tsconfig.base.json

### Community 114 - "coord.ts"
Cohesion: 0.13
Nodes (11): Adjacency, DIAGONAL_STEPS, OCTILE_STEPS, ORTHOGONAL_STEPS, Clairvoyant, FLAT, ORIGIN, Sentinel (+3 more)

### Community 115 - "Maquettes des écrans"
Cohesion: 0.33
Nodes (5): Ce que ces fichiers ne sont pas, Ce que les maquettes encodent, Maquettes des écrans, Origine, Proposition non actée : la silhouette des pièces

### Community 116 - "Occulis"
Cohesion: 0.33
Nodes (6): Commandes, Documentation, Démarrage rapide, Environnements, Occulis, Organisation

### Community 117 - "profile/api.ts"
Cohesion: 0.15
Nodes (23): call(), changeEmail(), changeHandle(), changePassword(), createPreset(), deletePreset(), feats(), match() (+15 more)

### Community 119 - "presets.ts"
Cohesion: 0.18
Nodes (14): createPreset(), Input, isValid(), listPresets(), PRESET_LIMIT, PresetError, PresetResult, PresetRow (+6 more)

### Community 140 - "TeamsApp.tsx"
Cohesion: 0.10
Nodes (26): boardForScenario(), useRemaining(), ACCEPT_TOTAL_MS, DEPLOYMENT_TOTAL_MS, Content(), Deployment(), Content(), MatchFound() (+18 more)

### Community 149 - "cx"
Cohesion: 0.08
Nodes (28): Button, ButtonProps, ChoiceList(), ChoiceRow(), ChoiceRowProps, CountdownRing(), CountdownRingProps, IconButton() (+20 more)

### Community 150 - "Field.tsx"
Cohesion: 0.07
Nodes (33): Avertissements connus, Décisions et contournements, Notes de synchronisation — Occulis UI, Préparer un re-sync, Re-sync risks, InlineEdit(), InlineEditProps, PasswordField() (+25 more)

### Community 172 - "TeamBuilder.tsx"
Cohesion: 0.14
Nodes (19): autoFill(), clear(), clickTile(), firstUnplaced(), isComplete(), placedCount(), remove(), ROLES (+11 more)

### Community 186 - "Notes d'implémentation — interprétations à valider"
Cohesion: 0.50
Nodes (4): Correctifs notables, Décisions volontairement non implémentées, Interprétations encodées, Notes d'implémentation — interprétations à valider

### Community 199 - "parts.tsx"
Cohesion: 0.05
Nodes (19): MatchDetail(), Replay(), winRate(), clampFrame(), describeEntry(), frameLabel(), asBoardFrames(), describeMyResult() (+11 more)

### Community 200 - "fr/index.ts"
Cohesion: 0.16
Nodes (16): account, admin, auth, feats, game, fr, mail, prepare (+8 more)

### Community 201 - "me/feats.ts"
Cohesion: 0.19
Nodes (18): parseJson(), readPlayerCard(), FEAT_IDS, FeatId, isFeatId(), PlayerStats, RULES, SHOWCASE_SIZE (+10 more)

### Community 202 - "social-do.ts"
Cohesion: 0.17
Nodes (9): callSocial(), openSocial(), pushTo(), SocialDO, socialOf(), friendIds(), SocialClientMessage, SocialServerMessage (+1 more)

### Community 203 - "Friends.tsx"
Cohesion: 0.29
Nodes (17): Blocked(), ChatView(), FriendList(), FriendMatchReplay(), FriendsView(), FriendView(), merged(), Requests() (+9 more)

### Community 205 - "profile/resources.ts"
Cohesion: 0.27
Nodes (13): resource, chat(), feats, friend(), friendMatch(), friendMatches(), friendsOverview, match() (+5 more)

### Community 206 - "admin/resources.ts"
Cohesion: 0.38
Nodes (10): MatchStatus, identity, match(), matches(), overview, player(), resourcesOf(), user() (+2 more)

### Community 207 - "me.integration.test.ts"
Cohesion: 0.23
Nodes (9): get(), idsOf(), impersonate(), jar(), nextAddress(), profile(), signIn(), nextAddress() (+1 more)

### Community 208 - "current.ts"
Cohesion: 0.09
Nodes (27): App(), chooseLocale(), initLocale(), translateDom(), currentLocale(), listeners, onLocaleChange(), setLocale() (+19 more)

### Community 209 - "password.ts"
Cohesion: 0.31
Nodes (11): breachedPassword(), derive(), deriveOnce(), fromBase64(), hashPassword(), MIN_PASSWORD_LENGTH, parseCost(), PBKDF2_PARAMETERS (+3 more)

### Community 210 - "i18n/package.json"
Cohesion: 0.12
Nodes (15): description, devDependencies, typescript, vitest, typescript, vitest, main, name (+7 more)

### Community 211 - "ref_react"
Cohesion: 0.08
Nodes (16): MessageComposer(), MessageComposerProps, MessageThread(), MessageThreadProps, ThreadMessage, DialogProps, Note(), Hero() (+8 more)

### Community 212 - "openChannel"
Cohesion: 0.31
Nodes (6): FIRST_RETRY_MS, MAX_RETRY_MS, retryDelay(), Channel, ChannelOptions, openChannel()

### Community 213 - "paging.ts"
Cohesion: 0.36
Nodes (8): DEFAULT_PAGE_SIZE, integer(), MatchFilter, MatchStatus, MAX_PAGE_SIZE, Page, parseMatchFilter(), parsePage()

### Community 214 - "relations.ts"
Cohesion: 0.24
Nodes (8): MAX_PENDING_REQUESTS, RelationFacts, relationOf(), RequestDecision, RequestError, NONE, WatchError, WatchFacts

### Community 215 - "i18n/tsconfig.json"
Cohesion: 0.29
Nodes (6): compilerOptions, outDir, rootDir, extends, include, ../../tsconfig.base.json

### Community 216 - "preparation.integration.test.ts"
Cohesion: 0.22
Nodes (3): defaultTeam(), MeProfile, TeamPresetList

### Community 217 - "rating.ts"
Cohesion: 0.53
Nodes (4): expectedScore(), INITIAL_RATING, K_FACTOR, ratingChanges()

### Community 218 - "Occulis — Estimation des coûts"
Cohesion: 0.50
Nodes (4): Coûts hors hébergement, L'hibernation est une condition, pas une optimisation, Non chiffré, Occulis — Estimation des coûts

### Community 220 - "tokens.ts"
Cohesion: 0.08
Nodes (36): setLook(), applyPalette(), SettingsOptions, applyTheme(), criticalPaint(), MIME, MOCKUPS_DIR, PAGES (+28 more)

### Community 226 - "config.ts"
Cohesion: 0.33
Nodes (7): dbName(), DEPLOY_MANIFEST, envFlag(), FIXED_DB_NAMES, here, isBranchEnv(), slugifyBranch()

### Community 227 - "src/social.ts"
Cohesion: 0.39
Nodes (7): ProfileRow, MeRecord, ChatMessage, FriendProfile, FriendRequest, PlayerSearchResult, SocialPlayer

### Community 228 - "Sélection des branches hébergées"
Cohesion: 0.25
Nodes (7): CI/CD (ci.yml, deploy-environments.json), Quatre environnements, 4. Environnements, Sélection des branches hébergées, Procédure d'installation (local → recette → prod), .github/deploy-environments.json (mécanisme de sélection), Catalogue ACTIONS de tooling/infra

### Community 229 - "settings.ts"
Cohesion: 0.24
Nodes (5): attachSettings(), Settings, SettingsElements, storedTheme(), isThemeName()

### Community 230 - "auth/routes.ts"
Cohesion: 0.47
Nodes (4): Auth, isImpersonated(), Caller, Account

### Community 245 - "5. Ligne de vue (LOS), hauteur, fog of war"
Cohesion: 0.40
Nodes (5): 5.1 Décision fondatrice, 5.2 Distinction fondamentale : Visibilité ≠ Portée, 5.3 Règles de hauteur (mêlée / adjacence), 5.4 Fog of war — confirmé, 5. Ligne de vue (LOS), hauteur, fog of war

### Community 247 - "La charte graphique — `packages/ui`"
Cohesion: 0.40
Nodes (5): La charte graphique — `packages/ui`, La feuille de style, La synchronisation vers Claude Design, Tests, UiRoot()

## Knowledge Gaps
- **736 isolated node(s):** `entries`, `printWidth`, `trailingComma`, `name`, `version` (+731 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1140 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **134 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Invariant : déterminisme strict de core` connect `La logique de jeu — `packages/core`` to `core/src/index.ts`?**
  _High betweenness centrality (0.152) - this node is a cross-community bridge._
- **Are the 67 inferred relationships involving `Les composants` (e.g. with `Badge()` and `BadgeRow()`) actually correct?**
  _`Les composants` has 67 INFERRED edges - model-reasoned connections that need verification._
- **What connects `entries`, `printWidth`, `trailingComma` to the rest of the system?**
  _736 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `cli.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.09682539682539683 - nodes in this community are weakly interconnected._
- **Why does `Occulis project overview` connect `Occulis project overview` to `docs/architecture.md (infra/server architecture reference)`, `technical/README.md`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **Should `La logique de jeu — `packages/core`` be split into smaller, more focused modules?**
  _Cohesion score 0.04081632653061224 - nodes in this community are weakly interconnected._
- **Should `Coord` be split into smaller, more focused modules?**
  _Cohesion score 0.10303030303030303 - nodes in this community are weakly interconnected._