# Graph Report - Occulis  (2026-10-15)

## Corpus Check
- 465 files · ~229,098 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 10 file(s) not represented in the graph (top: (none) 4, .css 3, .example 1)

## Summary
- 3079 nodes · 7818 edges · 245 communities (111 shown, 134 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 182 edges (avg confidence: 0.92)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c944c7d5`
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
- main.ts
- social/queries.ts
- /graphify skill trigger (.claude/CLAUDE.md)
- Outillage et CI/CD — `tooling/infra`, `.github`
- src/theme.ts sole color-value file
- .prettierrc.json
- players table
- apps/server tsconfig.json
- profile/resources.ts
- Points ouverts d'infrastructure
- Piliers de design non négociables
- Visibilité vs Portée
- me.integration.test.ts
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
- admin/App.tsx
- web/package.json
- .claude/CLAUDE.md
- social/api.ts
- profile/App.tsx
- overlay.ts
- better-auth.ts
- server/package.json
- infra/package.json
- PlayerId
- components/App.tsx
- core/src/index.ts
- package.json
- devDependencies
- Occulis project overview
- iso.ts
- components.test.tsx
- MatchDO.load
- replay-canvas.ts
- config.ts
- One branch = one full hosted environment
- MatchDetail.tsx
- mockup.js
- docs/architecture.md (infra/server architecture reference)
- actions.ts
- Les composants
- piece-type.ts
- protocol/package.json
- La charte graphique — `packages/ui`
- server/src/index.ts
- parts.tsx
- ref_react
- reveal.ts
- src/team.ts
- core/package.json
- components/TopBar.tsx
- admin/routes.ts
- MatchDO
- admin/api.ts
- compilerOptions
- compilerOptions
- Setting.tsx
- social.integration.test.ts
- sky.ts
- compilerOptions
- vite.config.ts
- components/IconButton.tsx
- compilerOptions
- protocol/src/index.ts
- packages_ui_src_index_button
- core/tsconfig.json
- protocol/tsconfig.json
- Friends.tsx
- Maquettes des écrans
- Occulis
- profile/api.ts
- @occulis/infra
- me/queries.ts
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
- fr/index.ts
- me/feats.ts
- SocialDO
- openChannel
- TeamsApp.tsx
- password.ts
- handle.ts
- net/auth.ts
- current.ts
- command.ts
- i18n/package.json
- scene.ts
- social-do.ts
- i18n/tsconfig.json
- relations.ts
- preparation.integration.test.ts
- `auth/` — comptes et sessions
- PlacementCanvas
- tokens.ts
- toml.ts
- src/admin.ts
- Chat.tsx
- `tooling/infra` — la TUI

## God Nodes (most connected - your core abstractions)
1. `Coord` - 75 edges
2. `PlayerId` - 67 edges
3. `Board` - 66 edges
4. `Les composants` - 66 edges
5. `messages()` - 58 edges
6. `main()` - 54 edges
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

## Communities (245 total, 134 thin omitted)

### Community 2 - "cli.tsx"
Cohesion: 0.11
Nodes (25): ink, Structure, ACTIONS, Level, action, COLOR_CODE, COLOR_CODE, consoleLog() (+17 more)

### Community 4 - "La logique de jeu — `packages/core`"
Cohesion: 0.04
Nodes (38): Module actions.ts : coups légaux et résolution, Module los.ts : raycast Bresenham, géométrie seule, Module movement.ts : verticalité et portée de mêlée, Un type de pièce = une classe (données/comportement séparés), `ActionError`, `actions.ts` — coups légaux et résolution, `Board.fromAscii()`, `board.ts` — le plateau (+30 more)

### Community 5 - "Coord"
Cohesion: 0.08
Nodes (29): Move, PlacedPiece, PlacementState, PlacementBoardProps, TeamBuilderProps, Board, Tile, TileSpec (+21 more)

### Community 6 - "technical/README.md"
Cohesion: 0.21
Nodes (8): Coûts hors hébergement, L'hibernation est une condition, pas une optimisation, Non chiffré, Coûts hors hébergement (signature, Steam, domaine), Occulis — Estimation des coûts, Chiffrage plan Workers Paid, pnpm infra (TUI Ink), Séparation comment/pourquoi dans la doc technique

### Community 7 - "admin.integration.test.ts"
Cohesion: 0.10
Nodes (15): signUpAdmin(), idsOf(), impersonate(), signIn(), Someone, cookieFrom(), nextAddress(), PASSWORD (+7 more)

### Community 8 - "AccountApp.tsx"
Cohesion: 0.14
Nodes (33): AccountApp(), AccountAppProps, Forgot(), GoogleEntry(), NoticeLine(), Register(), Reset(), RouteLink() (+25 more)

### Community 10 - "compilerOptions"
Cohesion: 0.12
Nodes (15): compilerOptions, declaration, declarationMap, esModuleInterop, exactOptionalPropertyTypes, forceConsistentCasingInFileNames, isolatedModules, lib (+7 more)

### Community 11 - "views.tsx"
Cohesion: 0.09
Nodes (42): Act, BanDialog(), DeleteDialog(), ICONS, ImpersonateDialog(), Open, QuickActions(), QuickActionsProps (+34 more)

### Community 12 - "scripts"
Cohesion: 0.22
Nodes (10): CI checks job (typecheck/lint/test/build), CI deploy job, scripts, build, dev, format, infra, lint (+2 more)

### Community 13 - "queue-do.ts"
Cohesion: 0.09
Nodes (41): dequeue(), enqueue(), Pairing, requeueFront(), takePairing(), ANNE, BORIS, Waiting (+33 more)

### Community 15 - "fog.ts"
Cohesion: 0.10
Nodes (40): Occupant, ConsoleOptions, ActionError, applyAction(), destinationsFor(), legalActions(), MoveAction, occupancyWithout() (+32 more)

### Community 16 - "Points ouverts (récapitulatif)"
Cohesion: 0.22
Nodes (4): Phase de déploiement, Fog of war confirmé, Points ouverts (récapitulatif), Pièges

### Community 17 - "Le moteur de rendu et le client — `apps/web`"
Cohesion: 0.05
Nodes (44): `admin/` — le back-office, Carte des modules, Ce que le client fait, et ne fait pas, Clic contre glissé, `cliffQuads()` et l'ordre du peintre, Conditions de réémission, `game/hypothesis.ts` — la position telle que le joueur peut la croire, `game/movement-diff.ts` — ce que la vue a fait bouger (+36 more)

### Community 18 - "messages"
Cohesion: 0.18
Nodes (17): messages(), CommandFault, attachConsole(), ConsoleElements, GameConsole, describeActionError(), describeFault(), describeMove() (+9 more)

### Community 19 - "Occulis — Document de conception (récapitulatif d'itération)"
Cohesion: 0.08
Nodes (25): 10. Récapitulatif — points ouverts à trancher (à date de ce document), 1. Pitch, 2. Piliers de design (non négociables, validés), 3.1 Attaque de mêlée (règle de base, toutes les pièces), 3.2 Attaque à distance (capacité spéciale, certaines pièces seulement), 3.3 Point ouvert non résolu, 3. Règles de capture — état validé, 4. Pièges (+17 more)

### Community 20 - "main.ts"
Cohesion: 0.09
Nodes (24): element(), intentOf(), main(), ensureBoard(), prewarmBoard(), Identity, openSocial(), SocialChannel (+16 more)

### Community 21 - "social/queries.ts"
Cohesion: 0.10
Nodes (40): normalizeHandle(), CHAT_PAGE_SIZE, checkMessage(), MAX_MESSAGE_LENGTH, MESSAGE_RETENTION_MS, MESSAGE_WINDOW_MS, MessageCheck, MessageError (+32 more)

### Community 23 - "Outillage et CI/CD — `tooling/infra`, `.github`"
Cohesion: 0.14
Nodes (14): `checks` — les vérifications, Concurrence, « Créer un environnement de branche », `deploy` — le déploiement, `.github/deploy-environments.json` — le mécanisme de sélection, `.github/workflows/ci.yml` — le pipeline, Les actions de la TUI, Les quatre environnements (+6 more)

### Community 28 - "profile/resources.ts"
Cohesion: 0.08
Nodes (23): Entry, FRESH_MS, loadCache, Loaded, loadedOf(), Outcome, PendingCount, pendingLoads (+15 more)

### Community 35 - "me.integration.test.ts"
Cohesion: 0.14
Nodes (13): get(), jar(), nextAddress(), profile(), MatchReplayViewProps, Outcome, MeCurrentMatch, MeFeat (+5 more)

### Community 49 - "Occulis — Architecture technique"
Cohesion: 0.11
Nodes (17): CI/CD (ci.yml, deploy-environments.json), Quatre environnements, 1. Cible de distribution, 2. Hébergement : Cloudflare Worker + Durable Objects, 3. Base de données : D1, 4. Environnements, 5. CI/CD, 6. Coûts (+9 more)

### Community 50 - "Le serveur — `apps/server`"
Cohesion: 0.08
Nodes (24): `admin/` — le back-office, Fichiers, `index.ts` — le Worker, Invariants à ne pas casser, L'autorité de tour, L'hibernation — le point de coût, L'usurpation, Le cycle d'une action (+16 more)

### Community 51 - "ui/package.json"
Cohesion: 0.05
Nodes (38): dependencies, @occulis/i18n, description, devDependencies, react, react-dom, tsup, @types/react (+30 more)

### Community 52 - "Occulis"
Cohesion: 0.25
Nodes (8): Commandes, Conventions, graphify, Infrastructure et CI/CD, Modules de `packages/core`, Occulis, Stack et architecture, État du projet

### Community 53 - "social/model.ts"
Cohesion: 0.13
Nodes (20): SocialProvider(), challenged(), EMPTY_SOCIAL, mapFriends(), presenceLabel(), readAll(), receive(), socialMessage() (+12 more)

### Community 54 - "Occulis — Mise en place de l'infrastructure"
Cohesion: 0.22
Nodes (9): 0. Préalables, 1. Outillage local, 2. Développement local, 3. Créer les bases distantes, 4. Premier déploiement en recette, 5. Secrets pour la CI, 6. Déclencher un déploiement, 7. Ce qui reste à écrire (+1 more)

### Community 55 - "engine.md"
Cohesion: 0.15
Nodes (5): Le dossier dit la dépendance (view/game purs vs scene/input/ui), Pipeline gestes/saisie → application → rendu, Cycle d'une action (load → applyAction → observe → log → broadcast), WireView / encodeView() protocole réseau, Client et serveur pas encore connectés

### Community 56 - "look"
Cohesion: 0.16
Nodes (20): arc(), at(), boardRadius(), drawSigil(), glyph(), drawBeam(), drawPiece(), PiecePaint (+12 more)

### Community 57 - "Documentation technique"
Cohesion: 0.33
Nodes (6): Carte du système, Documentation technique, L'état réel du câblage, Les cinq documents, Périmètre — et ce que ces documents ne sont pas, Règle de maintenance

### Community 58 - "admin/App.tsx"
Cohesion: 0.09
Nodes (15): Gate(), Page(), host, parseRoute(), Route, sectionOf(), identity, match() (+7 more)

### Community 59 - "web/package.json"
Cohesion: 0.06
Nodes (34): dependencies, @occulis/core, @occulis/i18n, @occulis/protocol, @occulis/ui, pixi.js, react, react-dom (+26 more)

### Community 61 - "social/api.ts"
Cohesion: 0.15
Nodes (23): acceptChallenge(), acceptRequest(), allowSpectators(), block(), call(), cancelRequest(), challenge(), declineChallenge() (+15 more)

### Community 62 - "profile/App.tsx"
Cohesion: 0.11
Nodes (33): stopImpersonating(), Account(), DangerZone(), Editing, EditorProps, EmailEditor(), FeatsCard(), Frame() (+25 more)

### Community 63 - "overlay.ts"
Cohesion: 0.21
Nodes (22): drawHover(), drawLanding(), drawSelection(), lerp(), scaled(), topOf(), isTile(), MOTION_FX (+14 more)

### Community 64 - "better-auth.ts"
Cohesion: 0.11
Nodes (38): database, directory, env, ACCOUNT_MUTATIONS, ADMIN_ROLE, buildAuth(), claimDerivedHandle(), claimHandle() (+30 more)

### Community 65 - "server/package.json"
Cohesion: 0.06
Nodes (31): dependencies, better-auth, @occulis/core, @occulis/i18n, @occulis/protocol, @occulis/ui, devDependencies, @cloudflare/vitest-pool-workers (+23 more)

### Community 67 - "infra/package.json"
Cohesion: 0.07
Nodes (28): ink-text-input, tsx, @types/node, bin, occulis-infra, dependencies, ink, ink-text-input (+20 more)

### Community 68 - "PlayerId"
Cohesion: 0.11
Nodes (21): LockedTeams, hypothesisFrom(), Movement, movementBetween(), OnlineMatch, ClickOutcome, resolveClick(), selectionFor() (+13 more)

### Community 69 - "components/App.tsx"
Cohesion: 0.14
Nodes (22): ActionContext, ActionDef, guardPlaceholder(), App(), envItems(), InteractiveOutcome, Phase, Props (+14 more)

### Community 70 - "core/src/index.ts"
Cohesion: 0.12
Nodes (23): annotate(), frameOf(), RenameResult, replayLog(), memory(), WALLED, table(), WALLED (+15 more)

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
Cohesion: 0.11
Nodes (32): attachControls(), ControlsOptions, Drag, DragKind, dragKindOf(), isTyping(), sameCoord(), Camera (+24 more)

### Community 77 - "MatchDO.load"
Cohesion: 0.57
Nodes (7): MatchDO.appendToLog(), MatchDO.broadcastViews(), MatchDO.config(), MatchDO.load(), MatchDO.play(), MatchDO.send(), MatchDO.webSocketMessage()

### Community 78 - "replay-canvas.ts"
Cohesion: 0.23
Nodes (32): mountReplay(), draw(), centerOffset(), fitScale(), ditherOf(), Drawable, drawPiece(), fillQuad() (+24 more)

### Community 79 - "config.ts"
Cohesion: 0.20
Nodes (7): dbName(), envFlag(), FIXED_DB_NAMES, here, isBranchEnv(), slugifyBranch(), FIXTURE

### Community 80 - "One branch = one full hosted environment"
Cohesion: 0.50
Nodes (4): deploy-environments.json manifest, Branches déployées, Branches déployées README, CI target-environment resolution job

### Community 81 - "MatchDetail.tsx"
Cohesion: 0.15
Nodes (12): Replay(), ReplayCanvas, clampFrame(), describeEntry(), frameLabel(), movesBetween(), Perspective, match (+4 more)

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
Nodes (30): Composition, Invariants à ne pas casser, Les composants, Card(), CardColumn(), CardGrid(), CardProps, DefinitionList() (+22 more)

### Community 86 - "piece-type.ts"
Cohesion: 0.14
Nodes (19): Slot, areAdjacent(), canMeleeReach(), MoveKind, reachableTiles(), ConfigurablePieceType, PieceProfile, PieceKind (+11 more)

### Community 87 - "protocol/package.json"
Cohesion: 0.11
Nodes (17): dependencies, @occulis/core, devDependencies, typescript, vitest, @occulis/core, typescript, vitest (+9 more)

### Community 88 - "La charte graphique — `packages/ui`"
Cohesion: 0.16
Nodes (13): Setup, La charte graphique — `packages/ui`, La feuille de style, La synchronisation vers Claude Design, Tests, Notify, ToastContext, ToastMessage (+5 more)

### Community 89 - "server/src/index.ts"
Cohesion: 0.13
Nodes (22): Auth, availableProviders(), isImpersonated(), Caller, Account, currentAccount(), handleAuth(), ACCOUNT_PATHS (+14 more)

### Community 90 - "parts.tsx"
Cohesion: 0.07
Nodes (7): asBoardFrames(), describeMyResult(), MatchReplayView(), MatchTable(), MyResult(), RecordCard(), Replay()

### Community 91 - "ref_react"
Cohesion: 0.15
Nodes (7): Hero(), HeroProps, Person(), PersonProps, Versus(), VersusProps, VersusSide

### Community 92 - "reveal.ts"
Cohesion: 0.24
Nodes (11): easeInOutSine(), crestAt(), distanceToSources(), lightAt(), progress(), relight(), RevealTiming, settling() (+3 more)

### Community 93 - "src/team.ts"
Cohesion: 0.09
Nodes (22): DEMO, MAP, PIECES, DEFAULT_SCENARIO, REGISTRY, DEPLOYMENT, MAP, mirror() (+14 more)

### Community 94 - "core/package.json"
Cohesion: 0.13
Nodes (14): devDependencies, typescript, vitest, typescript, vitest, main, name, private (+6 more)

### Community 95 - "components/TopBar.tsx"
Cohesion: 0.13
Nodes (12): Banner(), BannerProps, EmptyState(), EmptyStateProps, Button, ButtonProps, ProgressBar(), TopBar() (+4 more)

### Community 96 - "admin/routes.ts"
Cohesion: 0.17
Nodes (19): DEFAULT_PAGE_SIZE, integer(), MatchFilter, MatchStatus, MAX_PAGE_SIZE, Page, parseMatchFilter(), parsePage() (+11 more)

### Community 97 - "MatchDO"
Cohesion: 0.09
Nodes (23): ABSENCE_MS, absenceKey(), cardOf(), DEPLOYMENT_MS, deployed(), seat(), locksFor(), MatchConfig (+15 more)

### Community 98 - "admin/api.ts"
Cohesion: 0.13
Nodes (27): CreateUserDialog(), useGo(), AdminSession, AdminUser, ban(), call(), create(), impersonate() (+19 more)

### Community 99 - "compilerOptions"
Cohesion: 0.17
Nodes (11): compilerOptions, jsx, lib, module, moduleResolution, noEmit, outDir, rootDir (+3 more)

### Community 100 - "compilerOptions"
Cohesion: 0.18
Nodes (10): compilerOptions, declaration, declarationMap, module, moduleResolution, noEmit, types, extends (+2 more)

### Community 101 - "Setting.tsx"
Cohesion: 0.17
Nodes (7): Dialog(), DialogProps, Note(), SettingEditor(), SettingEditorProps, SettingList(), SettingRowProps

### Community 102 - "social.integration.test.ts"
Cohesion: 0.13
Nodes (17): ProfileRow, befriend(), call(), get(), json(), listen(), matchOf(), social() (+9 more)

### Community 103 - "sky.ts"
Cohesion: 0.26
Nodes (17): drawMotes(), drawNebula(), drawSky(), Vault, vaultOf(), constellationsOf(), createMotes(), createStars() (+9 more)

### Community 104 - "compilerOptions"
Cohesion: 0.18
Nodes (10): compilerOptions, allowImportingTsExtensions, jsx, lib, noEmit, outDir, rootDir, extends (+2 more)

### Community 107 - "vite.config.ts"
Cohesion: 0.20
Nodes (7): criticalPaint(), MIME, MOCKUPS_DIR, PAGES, resolveWithin(), serveMockups(), vite

### Community 108 - "components/IconButton.tsx"
Cohesion: 0.15
Nodes (10): Occulis UI — conventions, The three rules of the art direction, Tokens and classes, Badge(), BadgeProps, BadgeRow(), IconButton(), IconButtonProps (+2 more)

### Community 109 - "compilerOptions"
Cohesion: 0.22
Nodes (8): compilerOptions, jsx, lib, noEmit, types, extends, include, ../../tsconfig.base.json

### Community 110 - "protocol/src/index.ts"
Cohesion: 0.09
Nodes (30): ChannelStatus, connect(), connectToMatch(), DeploymentContext, MatchChannel, MatchHandlers, watchMatch(), QueueHandlers (+22 more)

### Community 112 - "core/tsconfig.json"
Cohesion: 0.29
Nodes (6): compilerOptions, outDir, rootDir, extends, include, ../../tsconfig.base.json

### Community 113 - "protocol/tsconfig.json"
Cohesion: 0.29
Nodes (6): compilerOptions, outDir, rootDir, extends, include, ../../tsconfig.base.json

### Community 114 - "Friends.tsx"
Cohesion: 0.31
Nodes (16): Blocked(), ChatView(), FriendList(), FriendMatchReplay(), FriendsView(), FriendView(), merged(), Requests() (+8 more)

### Community 115 - "Maquettes des écrans"
Cohesion: 0.33
Nodes (5): Ce que ces fichiers ne sont pas, Ce que les maquettes encodent, Maquettes des écrans, Origine, Proposition non actée : la silhouette des pièces

### Community 116 - "Occulis"
Cohesion: 0.33
Nodes (6): Commandes, Documentation, Démarrage rapide, Environnements, Occulis, Organisation

### Community 117 - "profile/api.ts"
Cohesion: 0.14
Nodes (24): call(), changeEmail(), changeHandle(), changePassword(), createPreset(), currentMatch(), deletePreset(), feats() (+16 more)

### Community 118 - "@occulis/infra"
Cohesion: 0.50
Nodes (3): Navigation, @occulis/infra, À distance (sans poste local allumé)

### Community 119 - "me/queries.ts"
Cohesion: 0.09
Nodes (43): MATCH_COLUMNS, MatchRow, readLog(), guardCaller(), setShowcase(), createPreset(), deletePreset(), Input (+35 more)

### Community 140 - "Deployment.tsx"
Cohesion: 0.13
Nodes (22): useRemaining(), ACCEPT_TOTAL_MS, DEPLOYMENT_TOTAL_MS, Content(), Deployment(), DeploymentProps, Content(), MatchFound() (+14 more)

### Community 149 - "cx"
Cohesion: 0.10
Nodes (23): ChoiceList(), ChoiceRow(), ChoiceRowProps, CountdownRing(), CountdownRingProps, MoveEntry, MoveList(), MoveListProps (+15 more)

### Community 150 - "Field.tsx"
Cohesion: 0.07
Nodes (33): Avertissements connus, Décisions et contournements, Notes de synchronisation — Occulis UI, Préparer un re-sync, Re-sync risks, InlineEdit(), InlineEditProps, PasswordField() (+25 more)

### Community 172 - "TeamBuilder.tsx"
Cohesion: 0.20
Nodes (19): autoFill(), clear(), clickTile(), emptyDraft(), firstUnplaced(), fromEntries(), isComplete(), placedCount() (+11 more)

### Community 186 - "Notes d'implémentation — interprétations à valider"
Cohesion: 0.50
Nodes (4): Correctifs notables, Décisions volontairement non implémentées, Interprétations encodées, Notes d'implémentation — interprétations à valider

### Community 200 - "fr/index.ts"
Cohesion: 0.07
Nodes (28): account, admin, auth, feats, game, en, mail, prepare (+20 more)

### Community 201 - "me/feats.ts"
Cohesion: 0.19
Nodes (17): parseJson(), readPlayerCard(), FEAT_IDS, FeatId, isFeatId(), PlayerStats, RULES, SHOWCASE_SIZE (+9 more)

### Community 202 - "SocialDO"
Cohesion: 0.32
Nodes (3): callSocial(), pushTo(), SocialDO

### Community 203 - "openChannel"
Cohesion: 0.16
Nodes (10): FIRST_RETRY_MS, MAX_RETRY_MS, retryDelay(), Channel, ChannelOptions, openChannel(), joinQueue(), QueueChannel (+2 more)

### Community 204 - "TeamsApp.tsx"
Cohesion: 0.21
Nodes (6): boardForScenario(), Editing, Editor(), Teams(), TeamsApp(), scenarioFor()

### Community 205 - "password.ts"
Cohesion: 0.31
Nodes (11): breachedPassword(), derive(), deriveOnce(), fromBase64(), hashPassword(), MIN_PASSWORD_LENGTH, parseCost(), PBKDF2_PARAMETERS (+3 more)

### Community 206 - "handle.ts"
Cohesion: 0.27
Nodes (10): checkHandle(), DELETED_PREFIXES, fold(), handleBase(), handleCandidates(), HandleCheck, HandleError, MAX_HANDLE_LENGTH (+2 more)

### Community 207 - "net/auth.ts"
Cohesion: 0.21
Nodes (15): authMessage(), AuthOutcome, codeMessage(), failure(), JSON_HEADERS, linkGoogle(), post(), redirectMessage() (+7 more)

### Community 208 - "current.ts"
Cohesion: 0.10
Nodes (21): App(), chooseLocale(), initLocale(), translateDom(), currentLocale(), listeners, onLocaleChange(), setLocale() (+13 more)

### Community 209 - "command.ts"
Cohesion: 0.21
Nodes (10): Command, parseCommand(), parseCoord(), RESIGN_WORDS, actionFor(), expectMove(), faultOf(), Move (+2 more)

### Community 210 - "i18n/package.json"
Cohesion: 0.12
Nodes (15): description, devDependencies, typescript, vitest, typescript, vitest, main, name (+7 more)

### Community 212 - "scene.ts"
Cohesion: 0.11
Nodes (23): Selection, Board, BoardHooks, mountBoard(), ditherPattern(), Drawable, INSTANT, sameCoord() (+15 more)

### Community 213 - "social-do.ts"
Cohesion: 0.26
Nodes (7): openSocial(), socialOf(), friendIds(), SocialContext, SocialClientMessage, SocialServerMessage, SocialSurface

### Community 215 - "i18n/tsconfig.json"
Cohesion: 0.29
Nodes (6): compilerOptions, outDir, rootDir, extends, include, ../../tsconfig.base.json

### Community 216 - "relations.ts"
Cohesion: 0.23
Nodes (10): decideRequest(), decideWatch(), MAX_PENDING_REQUESTS, RelationFacts, relationOf(), RequestDecision, RequestError, NONE (+2 more)

### Community 217 - "preparation.integration.test.ts"
Cohesion: 0.22
Nodes (3): defaultTeam(), MeProfile, TeamPresetList

### Community 218 - "`auth/` — comptes et sessions"
Cohesion: 0.25
Nodes (8): `auth/` — comptes et sessions, Better Auth, et ce que le projet garde, Ce que le serveur ne dit pas, L'envoi des messages, L'origine est vérifiée, La limitation de débit, La session, La vérification d'adresse

### Community 220 - "tokens.ts"
Cohesion: 0.09
Nodes (34): host, Atmosphere, ATMOSPHERES, lookOf(), looks, setLook(), applyPalette(), applyTheme() (+26 more)

### Community 226 - "toml.ts"
Cohesion: 0.32
Nodes (7): PLACEHOLDER, TOML, appendEnvBlock(), blockHeader(), envBlockExists(), patchDatabaseId(), removeEnvBlock()

### Community 227 - "src/admin.ts"
Cohesion: 0.29
Nodes (5): AdminFramePiece, AdminMatchPage, AdminPlayer, AdminPlayerRef, AdminStats

### Community 228 - "Chat.tsx"
Cohesion: 0.29
Nodes (5): MessageComposer(), MessageComposerProps, MessageThread(), MessageThreadProps, ThreadMessage

### Community 229 - "`tooling/infra` — la TUI"
Cohesion: 0.29
Nodes (7): `config.ts` — chemins et conventions, `deploy-manifest.ts` — édition du manifeste, `git.ts`, Modules, `toml.ts` — édition de `wrangler.toml`, `tooling/infra` — la TUI, `wrangler.ts` — exécution de processus

## Knowledge Gaps
- **731 isolated node(s):** `entries`, `printWidth`, `trailingComma`, `name`, `version` (+726 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1134 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **134 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Invariant : déterminisme strict de core` connect `La logique de jeu — `packages/core`` to `core/src/index.ts`?**
  _High betweenness centrality (0.176) - this node is a cross-community bridge._
- **Are the 65 inferred relationships involving `Les composants` (e.g. with `Badge()` and `BadgeRow()`) actually correct?**
  _`Les composants` has 65 INFERRED edges - model-reasoned connections that need verification._
- **What connects `entries`, `printWidth`, `trailingComma` to the rest of the system?**
  _731 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `cli.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.10984848484848485 - nodes in this community are weakly interconnected._
- **Why does `Occulis project overview` connect `Occulis project overview` to `docs/architecture.md (infra/server architecture reference)`, `technical/README.md`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **Should `La logique de jeu — `packages/core`` be split into smaller, more focused modules?**
  _Cohesion score 0.04081632653061224 - nodes in this community are weakly interconnected._
- **Why does `Le serveur — `apps/server`` connect `Le serveur — `apps/server`` to ``auth/` — comptes et sessions`, `engine.md`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._