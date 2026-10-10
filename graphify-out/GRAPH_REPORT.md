# Graph Report - Occulis  (2026-10-09)

## Corpus Check
- 396 files · ~182,656 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 8 file(s) not represented in the graph (top: (none) 3, .css 3, .example 1)

## Summary
- 2616 nodes · 6308 edges · 226 communities (102 shown, 124 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 151 edges (avg confidence: 0.92)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `2274dfd7`
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
- views.tsx
- scripts
- queue-do.ts
- fog.ts
- Points ouverts (récapitulatif)
- Le moteur de rendu et le client — `apps/web`
- messages
- Occulis — Document de conception (récapitulatif d'itération)
- flow.ts
- ref_react
- /graphify skill trigger (.claude/CLAUDE.md)
- Outillage et CI/CD — `tooling/infra`, `.github`
- src/theme.ts sole color-value file
- .prettierrc.json
- players table
- apps/server tsconfig.json
- iso.ts
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
- Occulis — Estimation des coûts
- Occulis — Mise en place de l'infrastructure
- engine.md
- Sélection des branches hébergées
- Documentation technique
- admin/App.tsx
- web/package.json
- .claude/CLAUDE.md
- actions.tsx
- profile/App.tsx
- scene.ts
- better-auth.ts
- server/package.json
- infra/package.json
- PlayerId
- components/App.tsx
- ref_vitest
- package.json
- devDependencies
- Occulis project overview
- camera.ts
- MatchDO.load
- replay-canvas.ts
- config.ts
- One branch = one full hosted environment
- core/src/index.ts
- mockup.js
- docs/architecture.md (infra/server architecture reference)
- actions.ts
- Les composants
- piece-type.ts
- protocol/package.json
- La charte graphique — `packages/ui`
- server/src/index.ts
- components/Person.tsx
- selection.ts
- src/team.ts
- core/package.json
- components/TopBar.tsx
- admin/queries.ts
- match-do.ts
- admin/api.ts
- compilerOptions
- compilerOptions
- Setting.tsx
- Field.tsx
- Form.tsx
- compilerOptions
- paging.ts
- prepare/mount.tsx
- vite.config.ts
- components/IconButton.tsx
- compilerOptions
- match-channel.ts
- TeamsApp.tsx
- core/tsconfig.json
- protocol/tsconfig.json
- Maquettes des écrans
- Occulis
- profile/api.ts
- @occulis/infra
- presets.ts
- env.d.ts
- command.ts test suite
- messages.ts test suite
- animation.test.ts suite
- camera.test.ts suite
- EDGE_NEIGHBOURS (const)
- iso.test.ts suite
- picking.test.ts suite
- Deployment.tsx
- cx
- components/Icon.tsx
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
- MatchDO
- main.ts
- i18n/src/index.ts
- en/index.ts
- net/auth.ts
- browser.ts
- command.ts
- i18n/package.json
- packages_core_src_index_board
- current.ts
- i18n/tsconfig.json
- ToastProvider.tsx
- 5. Ligne de vue (LOS), hauteur, fog of war
- PlacementCanvas
- bundle-css.mjs

## God Nodes (most connected - your core abstractions)
1. `Coord` - 72 edges
2. `Board` - 65 edges
3. `Les composants` - 62 edges
4. `PlayerId` - 57 edges
5. `messages()` - 50 edges
6. `coordKey` - 49 edges
7. `main()` - 47 edges
8. `cx()` - 38 edges
9. `Le moteur de rendu et le client — `apps/web`` - 30 edges
10. `Action` - 29 edges

## Surprising Connections (you probably didn't know these)
- `Environnements` --references--> `main()`  [INFERRED]
  README.md → apps/web/src/main.ts
- `Les composants` --references--> `ChoiceList()`  [INFERRED]
  docs/technical/ui.md → packages/ui/src/components/Choice.tsx
- `Les composants` --references--> `Note()`  [INFERRED]
  docs/technical/ui.md → packages/ui/src/components/Dialog.tsx
- `Les composants` --references--> `FormMessage()`  [INFERRED]
  docs/technical/ui.md → packages/ui/src/components/Form.tsx
- `Les composants` --references--> `Divider()`  [INFERRED]
  docs/technical/ui.md → packages/ui/src/components/Form.tsx

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **CI checks → target resolution → deploy pipeline** — github_workflows_ci_checks_job, github_workflows_ci_target_job, github_workflows_ci_deploy_job, github_deploy_environments_manifest [INFERRED 0.85]

## Communities (226 total, 124 thin omitted)

### Community 2 - "cli.tsx"
Cohesion: 0.11
Nodes (25): ink, Structure, ACTIONS, Level, action, COLOR_CODE, COLOR_CODE, consoleLog() (+17 more)

### Community 4 - "La logique de jeu — `packages/core`"
Cohesion: 0.04
Nodes (38): Module actions.ts : coups légaux et résolution, Module los.ts : raycast Bresenham, géométrie seule, Module movement.ts : verticalité et portée de mêlée, Un type de pièce = une classe (données/comportement séparés), `ActionError`, `actions.ts` — coups légaux et résolution, `Board.fromAscii()`, `board.ts` — le plateau (+30 more)

### Community 5 - "Coord"
Cohesion: 0.08
Nodes (31): PlacedPiece, PlacementState, Board, Tile, TileSpec, areAdjacent(), chebyshevDistance(), Coord (+23 more)

### Community 6 - "technical/README.md"
Cohesion: 0.32
Nodes (4): Coûts hors hébergement (signature, Steam, domaine), Chiffrage plan Workers Paid, pnpm infra (TUI Ink), Séparation comment/pourquoi dans la doc technique

### Community 7 - "admin.integration.test.ts"
Cohesion: 0.10
Nodes (18): signUpAdmin(), get(), idsOf(), impersonate(), jar(), nextAddress(), profile(), signIn() (+10 more)

### Community 8 - "AccountApp.tsx"
Cohesion: 0.15
Nodes (31): AccountApp(), AccountAppProps, Forgot(), GoogleEntry(), NoticeLine(), Register(), Reset(), RouteLink() (+23 more)

### Community 10 - "compilerOptions"
Cohesion: 0.12
Nodes (15): compilerOptions, declaration, declarationMap, esModuleInterop, exactOptionalPropertyTypes, forceConsistentCasingInFileNames, isolatedModules, lib (+7 more)

### Community 11 - "views.tsx"
Cohesion: 0.14
Nodes (28): useLoad(), MatchDetail(), BanState, describeBan(), describeResult(), formatDate(), initials(), MatchStatus (+20 more)

### Community 12 - "scripts"
Cohesion: 0.22
Nodes (10): CI checks job (typecheck/lint/test/build), CI deploy job, scripts, build, dev, format, infra, lint (+2 more)

### Community 13 - "queue-do.ts"
Cohesion: 0.09
Nodes (40): dequeue(), enqueue(), Pairing, requeueFront(), takePairing(), ANNE, BORIS, Waiting (+32 more)

### Community 15 - "fog.ts"
Cohesion: 0.16
Nodes (25): ConsoleOptions, ActionError, applyAction(), destinationsFor(), legalActions(), MoveAction, occupancyWithout(), replay() (+17 more)

### Community 16 - "Points ouverts (récapitulatif)"
Cohesion: 0.22
Nodes (4): Phase de déploiement, Fog of war confirmé, Points ouverts (récapitulatif), Pièges

### Community 17 - "Le moteur de rendu et le client — `apps/web`"
Cohesion: 0.05
Nodes (44): `admin/` — le back-office, Carte des modules, Ce que le client fait, et ne fait pas, Clic contre glissé, `cliffQuads()` et l'ordre du peintre, Conditions de réémission, `game/hypothesis.ts` — la position telle que le joueur peut la croire, `game/movement-diff.ts` — ce que la vue a fait bouger (+36 more)

### Community 18 - "messages"
Cohesion: 0.14
Nodes (22): messages(), attachConsole(), ConsoleElements, GameConsole, Seeking, describeActionError(), describeFault(), describeIdentity() (+14 more)

### Community 19 - "Occulis — Document de conception (récapitulatif d'itération)"
Cohesion: 0.10
Nodes (20): 10. Récapitulatif — points ouverts à trancher (à date de ce document), 1. Pitch, 2. Piliers de design (non négociables, validés), 3.1 Attaque de mêlée (règle de base, toutes les pièces), 3.2 Attaque à distance (capacité spéciale, certaines pièces seulement), 3.3 Point ouvert non résolu, 3. Règles de capture — état validé, 4. Pièges (+12 more)

### Community 20 - "flow.ts"
Cohesion: 0.19
Nodes (7): Identity, advance(), FlowEvent, Stage, START, waiting, Shell

### Community 21 - "ref_react"
Cohesion: 0.10
Nodes (5): Replay(), describeAction(), describeEntry(), frameLabel(), entries

### Community 23 - "Outillage et CI/CD — `tooling/infra`, `.github`"
Cohesion: 0.10
Nodes (21): `checks` — les vérifications, Concurrence, `config.ts` — chemins et conventions, « Créer un environnement de branche », `deploy` — le déploiement, `deploy-manifest.ts` — édition du manifeste, `git.ts`, `.github/deploy-environments.json` — le mécanisme de sélection (+13 more)

### Community 28 - "iso.ts"
Cohesion: 0.14
Nodes (12): CORNERS, Depth, EDGE_NEIGHBOURS, lerpAngle(), projectXY(), Quad, rotate(), FLAT (+4 more)

### Community 35 - "me/queries.ts"
Cohesion: 0.11
Nodes (22): readLog(), replayLog(), HANDLE_COOLDOWN_MS, HandleChange, listMyMatches(), MyMatch, mySummary(), ProfileRow (+14 more)

### Community 49 - "Occulis — Architecture technique"
Cohesion: 0.20
Nodes (10): 1. Cible de distribution, 2. Hébergement : Cloudflare Worker + Durable Objects, 3. Base de données : D1, 5. CI/CD, 6. Coûts, 7. Points ouverts, Conséquence : versionner les règles par partie, Le log d'actions est la source de vérité (+2 more)

### Community 50 - "Le serveur — `apps/server`"
Cohesion: 0.06
Nodes (32): `admin/` — le back-office, `auth/` — comptes et sessions, Better Auth, et ce que le projet garde, Ce que le serveur ne dit pas, Fichiers, `index.ts` — le Worker, Invariants à ne pas casser, L'autorité de tour (+24 more)

### Community 51 - "ui/package.json"
Cohesion: 0.05
Nodes (37): dependencies, @occulis/i18n, description, devDependencies, react, react-dom, tsup, @types/react (+29 more)

### Community 52 - "Occulis"
Cohesion: 0.25
Nodes (8): Commandes, Conventions, graphify, Infrastructure et CI/CD, Modules de `packages/core`, Occulis, Stack et architecture, État du projet

### Community 53 - "Occulis — Estimation des coûts"
Cohesion: 0.50
Nodes (4): Coûts hors hébergement, L'hibernation est une condition, pas une optimisation, Non chiffré, Occulis — Estimation des coûts

### Community 54 - "Occulis — Mise en place de l'infrastructure"
Cohesion: 0.22
Nodes (9): 0. Préalables, 1. Outillage local, 2. Développement local, 3. Créer les bases distantes, 4. Premier déploiement en recette, 5. Secrets pour la CI, 6. Déclencher un déploiement, 7. Ce qui reste à écrire (+1 more)

### Community 55 - "engine.md"
Cohesion: 0.15
Nodes (5): Le dossier dit la dépendance (view/game purs vs scene/input/ui), Pipeline gestes/saisie → application → rendu, Cycle d'une action (load → applyAction → observe → log → broadcast), WireView / encodeView() protocole réseau, Client et serveur pas encore connectés

### Community 56 - "Sélection des branches hébergées"
Cohesion: 0.25
Nodes (7): CI/CD (ci.yml, deploy-environments.json), Quatre environnements, 4. Environnements, Sélection des branches hébergées, Procédure d'installation (local → recette → prod), .github/deploy-environments.json (mécanisme de sélection), Catalogue ACTIONS de tooling/infra

### Community 57 - "Documentation technique"
Cohesion: 0.33
Nodes (6): Carte du système, Documentation technique, L'état réel du câblage, Les cinq documents, Périmètre — et ce que ces documents ne sont pas, Règle de maintenance

### Community 58 - "admin/App.tsx"
Cohesion: 0.10
Nodes (15): Outcome, App(), Gate(), Page(), Loaded, useRoute(), parseRoute(), Route (+7 more)

### Community 59 - "web/package.json"
Cohesion: 0.06
Nodes (34): dependencies, @occulis/core, @occulis/i18n, @occulis/protocol, @occulis/ui, pixi.js, react, react-dom (+26 more)

### Community 61 - "actions.tsx"
Cohesion: 0.15
Nodes (18): Act, BanDialog(), CreateUserDialog(), DeleteDialog(), ICONS, ImpersonateDialog(), Open, QuickActions() (+10 more)

### Community 62 - "profile/App.tsx"
Cohesion: 0.14
Nodes (31): Account(), DangerZone(), Editing, EditorProps, EmailEditor(), FeatsCard(), Gate(), GoogleSetting() (+23 more)

### Community 63 - "scene.ts"
Cohesion: 0.14
Nodes (23): Selection, drawHover(), drawSelection(), Mark, markTile(), drawPiece(), Drawable, isTile() (+15 more)

### Community 64 - "better-auth.ts"
Cohesion: 0.05
Nodes (70): database, directory, env, ACCOUNT_MUTATIONS, ADMIN_ROLE, buildAuth(), claimDerivedHandle(), claimHandle() (+62 more)

### Community 65 - "server/package.json"
Cohesion: 0.06
Nodes (31): dependencies, better-auth, @occulis/core, @occulis/i18n, @occulis/protocol, @occulis/ui, devDependencies, @cloudflare/vitest-pool-workers (+23 more)

### Community 67 - "infra/package.json"
Cohesion: 0.07
Nodes (28): ink-text-input, tsx, @types/node, bin, occulis-infra, dependencies, ink, ink-text-input (+20 more)

### Community 68 - "PlayerId"
Cohesion: 0.12
Nodes (18): Movement, OnlineMatch, SeatedContext, Occupant, Action, MatchMemory, PlayerKnowledge, PlayerView (+10 more)

### Community 69 - "components/App.tsx"
Cohesion: 0.14
Nodes (23): ActionContext, ActionDef, guardPlaceholder(), App(), envItems(), InteractiveOutcome, Phase, Props (+15 more)

### Community 70 - "ref_vitest"
Cohesion: 0.10
Nodes (22): hypothesisFrom(), memory(), WALLED, table(), WALLED, BOARD, game(), PIECES (+14 more)

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
Nodes (28): mountReplay(), draw(), centerOffset(), fitScale(), movesBetween(), Drawable, drawPiece(), fillQuad() (+20 more)

### Community 79 - "config.ts"
Cohesion: 0.14
Nodes (13): envFlag(), FIXED_DB_NAMES, here, isBranchEnv(), PLACEHOLDER, slugifyBranch(), TOML, FIXTURE (+5 more)

### Community 80 - "One branch = one full hosted environment"
Cohesion: 0.50
Nodes (4): deploy-environments.json manifest, Branches déployées, Branches déployées README, CI target-environment resolution job

### Community 81 - "core/src/index.ts"
Cohesion: 0.12
Nodes (13): ReplayCanvas, clampFrame(), Move, Perspective, match, ReplayBoard(), ReplayBoardProps, QUARTER_TURN (+5 more)

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
Cohesion: 0.09
Nodes (29): Composition, Les composants, Card(), CardColumn(), CardGrid(), CardProps, DefinitionList(), Fact (+21 more)

### Community 86 - "piece-type.ts"
Cohesion: 0.15
Nodes (19): Slot, Adjacency, ConfigurablePieceType, PieceProfile, PieceKind, PieceRole, PieceType, MovementProfile (+11 more)

### Community 87 - "protocol/package.json"
Cohesion: 0.11
Nodes (17): dependencies, @occulis/core, devDependencies, typescript, vitest, @occulis/core, typescript, vitest (+9 more)

### Community 88 - "La charte graphique — `packages/ui`"
Cohesion: 0.15
Nodes (14): Setup, Fichiers, La charte graphique — `packages/ui`, La feuille de style, La synchronisation vers Claude Design, Tests, Notify, ToastContext (+6 more)

### Community 89 - "server/src/index.ts"
Cohesion: 0.12
Nodes (18): availableProviders(), isImpersonated(), Account, currentAccount(), handleAuth(), ACCOUNT_PATHS, createMatch(), fetch() (+10 more)

### Community 92 - "selection.ts"
Cohesion: 0.21
Nodes (6): movementBetween(), ClickOutcome, resolveClick(), selectionFor(), sameHover(), coordEquals()

### Community 93 - "src/team.ts"
Cohesion: 0.09
Nodes (23): Piece, REGISTRY, DEMO, MAP, PIECES, DEFAULT_SCENARIO, REGISTRY, DEPLOYMENT (+15 more)

### Community 94 - "core/package.json"
Cohesion: 0.13
Nodes (14): devDependencies, typescript, vitest, typescript, vitest, main, name, private (+6 more)

### Community 95 - "components/TopBar.tsx"
Cohesion: 0.13
Nodes (12): Banner(), BannerProps, EmptyState(), EmptyStateProps, Button, ButtonProps, ProgressBar(), TopBar() (+4 more)

### Community 96 - "admin/queries.ts"
Cohesion: 0.12
Nodes (22): annotate(), frameOf(), listMatches(), MATCH_COLUMNS, MatchRow, readMatch(), readPlayer(), readStats() (+14 more)

### Community 97 - "match-do.ts"
Cohesion: 0.13
Nodes (16): cardOf(), LockedTeams, MatchConfig, ensurePlayers(), StartedMatch, startMatch(), expectedScore(), INITIAL_RATING (+8 more)

### Community 98 - "admin/api.ts"
Cohesion: 0.15
Nodes (24): AdminSession, AdminUser, ban(), call(), create(), impersonate(), match(), matches() (+16 more)

### Community 99 - "compilerOptions"
Cohesion: 0.17
Nodes (11): compilerOptions, jsx, lib, module, moduleResolution, noEmit, outDir, rootDir (+3 more)

### Community 100 - "compilerOptions"
Cohesion: 0.18
Nodes (10): compilerOptions, declaration, declarationMap, module, moduleResolution, noEmit, types, extends (+2 more)

### Community 101 - "Setting.tsx"
Cohesion: 0.11
Nodes (11): Dialog(), DialogProps, Note(), SettingEditor(), SettingEditorProps, SettingList(), SettingRow(), SettingRowProps (+3 more)

### Community 102 - "Field.tsx"
Cohesion: 0.22
Nodes (10): InlineEdit(), InlineEditProps, PasswordField(), PasswordFieldProps, SearchField(), SearchFieldProps, SelectFieldProps, TextField() (+2 more)

### Community 103 - "Form.tsx"
Cohesion: 0.20
Nodes (9): Divider(), FormMessage(), FormMessageProps, FormPanel(), FormPanelProps, GoogleMark(), ProviderButton(), ProviderButtonProps (+1 more)

### Community 104 - "compilerOptions"
Cohesion: 0.18
Nodes (10): compilerOptions, allowImportingTsExtensions, jsx, lib, noEmit, outDir, rootDir, extends (+2 more)

### Community 105 - "paging.ts"
Cohesion: 0.36
Nodes (8): DEFAULT_PAGE_SIZE, integer(), MatchFilter, MatchStatus, MAX_PAGE_SIZE, Page, parseMatchFilter(), parsePage()

### Community 107 - "vite.config.ts"
Cohesion: 0.22
Nodes (6): MIME, MOCKUPS_DIR, PAGES, resolveWithin(), serveMockups(), vite

### Community 108 - "components/IconButton.tsx"
Cohesion: 0.17
Nodes (9): Occulis UI — conventions, The three rules of the art direction, Tokens and classes, Badge(), BadgeProps, BadgeRow(), IconButtonProps, QuickBar() (+1 more)

### Community 109 - "compilerOptions"
Cohesion: 0.22
Nodes (8): compilerOptions, jsx, lib, noEmit, types, extends, include, ../../tsconfig.base.json

### Community 110 - "match-channel.ts"
Cohesion: 0.07
Nodes (35): DEPLOYMENT_MS, deployed(), seat(), FIRST_RETRY_MS, MAX_RETRY_MS, retryDelay(), Channel, ChannelOptions (+27 more)

### Community 111 - "TeamsApp.tsx"
Cohesion: 0.08
Nodes (3): Editing, Teams(), TeamsApp()

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
Cohesion: 0.11
Nodes (24): defaultTeam(), call(), changeEmail(), changeHandle(), changePassword(), createPreset(), deletePreset(), feats() (+16 more)

### Community 118 - "@occulis/infra"
Cohesion: 0.50
Nodes (3): Navigation, @occulis/infra, À distance (sans poste local allumé)

### Community 119 - "presets.ts"
Cohesion: 0.14
Nodes (26): setShowcase(), createPreset(), deletePreset(), Input, isValid(), listPresets(), PRESET_LIMIT, PresetError (+18 more)

### Community 140 - "Deployment.tsx"
Cohesion: 0.17
Nodes (18): useRemaining(), ACCEPT_TOTAL_MS, DEPLOYMENT_TOTAL_MS, Content(), Deployment(), DeploymentProps, Content(), MatchFound() (+10 more)

### Community 149 - "cx"
Cohesion: 0.11
Nodes (21): ChoiceList(), ChoiceRow(), ChoiceRowProps, CountdownRing(), CountdownRingProps, MoveEntry, MoveList(), MoveListProps (+13 more)

### Community 150 - "components/Icon.tsx"
Cohesion: 0.15
Nodes (13): Avertissements connus, Décisions et contournements, Notes de synchronisation — Occulis UI, Préparer un re-sync, Re-sync risks, SelectField(), Icon(), ICON_NAMES (+5 more)

### Community 172 - "TeamBuilder.tsx"
Cohesion: 0.19
Nodes (22): autoFill(), clear(), clickTile(), emptyDraft(), firstUnplaced(), fromEntries(), isComplete(), placedCount() (+14 more)

### Community 186 - "Notes d'implémentation — interprétations à valider"
Cohesion: 0.50
Nodes (4): Correctifs notables, Décisions volontairement non implémentées, Interprétations encodées, Notes d'implémentation — interprétations à valider

### Community 200 - "fr/index.ts"
Cohesion: 0.21
Nodes (11): account, admin, auth, feats, game, mail, prepare, profile (+3 more)

### Community 201 - "me/feats.ts"
Cohesion: 0.21
Nodes (17): parseJson(), readPlayerCard(), FEAT_IDS, FeatId, isFeatId(), PlayerStats, RULES, SHOWCASE_SIZE (+9 more)

### Community 202 - "MatchDO"
Cohesion: 0.28
Nodes (4): locksFor(), MatchDO, rulesetFor(), scenarioFor()

### Community 203 - "main.ts"
Cohesion: 0.16
Nodes (12): boardForScenario(), translateDom(), element(), intentOf(), main(), signOut(), joinQueue(), presets() (+4 more)

### Community 205 - "i18n/src/index.ts"
Cohesion: 0.12
Nodes (16): MatchFoundProps, TeamsAppProps, Invariants à ne pas casser, en, fr, CATALOGUE, Locale, MessagePath (+8 more)

### Community 206 - "en/index.ts"
Cohesion: 0.14
Nodes (10): account, admin, auth, feats, game, mail, prepare, profile (+2 more)

### Community 207 - "net/auth.ts"
Cohesion: 0.22
Nodes (16): authMessage(), codeMessage(), failure(), JSON_HEADERS, linkGoogle(), post(), redirectMessage(), redirectTo() (+8 more)

### Community 208 - "browser.ts"
Cohesion: 0.19
Nodes (8): shape(), isLocale(), LOCALE_COOKIE, LOCALE_STORAGE_KEY, LOCALES, preferredTags(), resolveLocale(), lookup()

### Community 209 - "command.ts"
Cohesion: 0.19
Nodes (11): Command, CommandFault, parseCommand(), parseCoord(), RESIGN_WORDS, actionFor(), expectMove(), faultOf() (+3 more)

### Community 210 - "i18n/package.json"
Cohesion: 0.12
Nodes (15): description, devDependencies, typescript, vitest, typescript, vitest, main, name (+7 more)

### Community 212 - "packages_core_src_index_board"
Cohesion: 0.31
Nodes (6): advance(), AnimatedPosition, easeInOutCubic(), positionOf(), startMove(), BOARD

### Community 213 - "current.ts"
Cohesion: 0.29
Nodes (5): currentLocale(), listeners, onLocaleChange(), showIslands(), DEFAULT_LOCALE

### Community 215 - "i18n/tsconfig.json"
Cohesion: 0.29
Nodes (6): compilerOptions, outDir, rootDir, extends, include, ../../tsconfig.base.json

### Community 218 - "5. Ligne de vue (LOS), hauteur, fog of war"
Cohesion: 0.40
Nodes (5): 5.1 Décision fondatrice, 5.2 Distinction fondamentale : Visibilité ≠ Portée, 5.3 Règles de hauteur (mêlée / adjacence), 5.4 Fog of war — confirmé, 5. Ligne de vue (LOS), hauteur, fog of war

## Knowledge Gaps
- **688 isolated node(s):** `entries`, `printWidth`, `trailingComma`, `name`, `version` (+683 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1034 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **124 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Invariant : déterminisme strict de core` connect `La logique de jeu — `packages/core`` to `core/src/index.ts`?**
  _High betweenness centrality (0.128) - this node is a cross-community bridge._
- **Are the 61 inferred relationships involving `Les composants` (e.g. with `Badge()` and `BadgeRow()`) actually correct?**
  _`Les composants` has 61 INFERRED edges - model-reasoned connections that need verification._
- **What connects `entries`, `printWidth`, `trailingComma` to the rest of the system?**
  _688 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `cli.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.10984848484848485 - nodes in this community are weakly interconnected._
- **Why does `Occulis project overview` connect `Occulis project overview` to `docs/architecture.md (infra/server architecture reference)`, `technical/README.md`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **Should `La logique de jeu — `packages/core`` be split into smaller, more focused modules?**
  _Cohesion score 0.04081632653061224 - nodes in this community are weakly interconnected._
- **Should `Coord` be split into smaller, more focused modules?**
  _Cohesion score 0.07924984875983061 - nodes in this community are weakly interconnected._