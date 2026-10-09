# Graph Report - Occulis  (2026-10-09)

## Corpus Check
- 316 files · ~146,927 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 8 file(s) not represented in the graph (top: (none) 3, .css 3, .example 1)

## Summary
- 2193 nodes · 4816 edges · 198 communities (86 shown, 112 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 134 edges (avg confidence: 0.92)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c672a669`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- @occulis/web package.json
- cli.tsx
- selection.ts test suite
- La logique de jeu — `packages/core`
- Board
- technical/README.md
- me.integration.test.ts
- AccountApp.tsx
- compilerOptions
- views.tsx
- scripts
- queue-do.ts
- fog.ts
- Points ouverts (récapitulatif)
- Le moteur de rendu et le client — `apps/web`
- messages.ts
- Occulis — Document de conception (récapitulatif d'itération)
- main.ts
- MatchDetail.tsx
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
- src/theme.ts
- config.ts
- One branch = one full hosted environment
- replay-canvas.ts
- mockup.js
- docs/architecture.md (infra/server architecture reference)
- actions.ts
- Composition
- admin/routes.ts
- protocol/package.json
- La charte graphique — `packages/ui`
- server/src/index.ts
- ref_react
- packages/core/src/index.ts (barrel, referenced)
- Les composants
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
- mount.tsx
- vite.config.ts
- components/Badge.tsx
- compilerOptions
- protocol/src/index.ts
- core/tsconfig.json
- protocol/tsconfig.json
- Maquettes des écrans
- Occulis
- test-setup.ts
- @occulis/infra
- env.d.ts
- command.ts test suite
- messages.ts test suite
- animation.test.ts suite
- camera.test.ts suite
- EDGE_NEIGHBOURS (const)
- iso.test.ts suite
- picking.test.ts suite
- `auth/` — comptes et sessions
- cx
- components/Icon.tsx
- Le schéma D1
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

## God Nodes (most connected - your core abstractions)
1. `Board` - 59 edges
2. `Coord` - 58 edges
3. `Les composants` - 53 edges
4. `coordKey` - 43 edges
5. `PlayerId` - 40 edges
6. `main()` - 38 edges
7. `cx()` - 31 edges
8. `Le moteur de rendu et le client — `apps/web`` - 30 edges
9. `Action` - 29 edges
10. `Composition` - 29 edges

## Surprising Connections (you probably didn't know these)
- `Environnements` --references--> `main()`  [INFERRED]
  README.md → apps/web/src/main.ts
- `Les composants` --references--> `Note()`  [INFERRED]
  docs/technical/ui.md → packages/ui/src/components/Dialog.tsx
- `Les composants` --references--> `FormMessage()`  [INFERRED]
  docs/technical/ui.md → packages/ui/src/components/Form.tsx
- `Les composants` --references--> `Divider()`  [INFERRED]
  docs/technical/ui.md → packages/ui/src/components/Form.tsx
- `Les composants` --references--> `SettingList()`  [INFERRED]
  docs/technical/ui.md → packages/ui/src/components/Setting.tsx

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **CI checks → target resolution → deploy pipeline** — github_workflows_ci_checks_job, github_workflows_ci_target_job, github_workflows_ci_deploy_job, github_deploy_environments_manifest [INFERRED 0.85]

## Communities (198 total, 112 thin omitted)

### Community 2 - "cli.tsx"
Cohesion: 0.11
Nodes (25): ink, Structure, ACTIONS, Level, action, COLOR_CODE, COLOR_CODE, consoleLog() (+17 more)

### Community 4 - "La logique de jeu — `packages/core`"
Cohesion: 0.04
Nodes (38): Module actions.ts : coups légaux et résolution, Module los.ts : raycast Bresenham, géométrie seule, Module movement.ts : verticalité et portée de mêlée, Un type de pièce = une classe (données/comportement séparés), `ActionError`, `actions.ts` — coups légaux et résolution, `Board.fromAscii()`, `board.ts` — le plateau (+30 more)

### Community 5 - "Board"
Cohesion: 0.06
Nodes (49): Move, Selection, Occupant, Scene, SceneInput, MoveAnimation, Board, TileSpec (+41 more)

### Community 6 - "technical/README.md"
Cohesion: 0.32
Nodes (4): Coûts hors hébergement (signature, Steam, domaine), Chiffrage plan Workers Paid, pnpm infra (TUI Ink), Séparation comment/pourquoi dans la doc technique

### Community 7 - "me.integration.test.ts"
Cohesion: 0.17
Nodes (16): signUpAdmin(), get(), idsOf(), impersonate(), jar(), nextAddress(), profile(), signIn() (+8 more)

### Community 8 - "AccountApp.tsx"
Cohesion: 0.07
Nodes (60): AccountApp(), AccountAppProps, Forgot(), GoogleEntry(), NoticeLine(), Register(), Reset(), RouteLink() (+52 more)

### Community 10 - "compilerOptions"
Cohesion: 0.12
Nodes (15): compilerOptions, declaration, declarationMap, esModuleInterop, exactOptionalPropertyTypes, forceConsistentCasingInFileNames, isolatedModules, lib (+7 more)

### Community 11 - "views.tsx"
Cohesion: 0.11
Nodes (39): Loaded, useLoad(), useRoute(), MatchDetail(), BAN_PRESETS, banDuration(), BanState, describeAction() (+31 more)

### Community 12 - "scripts"
Cohesion: 0.22
Nodes (10): CI checks job (typecheck/lint/test/build), CI deploy job, scripts, build, dev, format, infra, lint (+2 more)

### Community 13 - "queue-do.ts"
Cohesion: 0.12
Nodes (22): dequeue(), enqueue(), Pairing, takePairing(), ANNE, BORIS, Waiting, draws() (+14 more)

### Community 15 - "fog.ts"
Cohesion: 0.11
Nodes (34): applyAction(), destinationsFor(), legalActions(), MoveAction, occupancyWithout(), replay(), ReplayError, destinationsOf() (+26 more)

### Community 16 - "Points ouverts (récapitulatif)"
Cohesion: 0.22
Nodes (4): Phase de déploiement, Fog of war confirmé, Points ouverts (récapitulatif), Pièges

### Community 17 - "Le moteur de rendu et le client — `apps/web`"
Cohesion: 0.05
Nodes (44): `admin/` — le back-office, Carte des modules, Ce que le client fait, et ne fait pas, Clic contre glissé, `cliffQuads()` et l'ordre du peintre, Conditions de réémission, `game/hypothesis.ts` — la position telle que le joueur peut la croire, `game/movement-diff.ts` — ce que la vue a fait bouger (+36 more)

### Community 18 - "messages.ts"
Cohesion: 0.10
Nodes (27): Command, CommandFault, parseCommand(), parseCoord(), RESIGN_WORDS, actionFor(), expectMove(), faultOf() (+19 more)

### Community 19 - "Occulis — Document de conception (récapitulatif d'itération)"
Cohesion: 0.08
Nodes (25): 10. Récapitulatif — points ouverts à trancher (à date de ce document), 1. Pitch, 2. Piliers de design (non négociables, validés), 3.1 Attaque de mêlée (règle de base, toutes les pièces), 3.2 Attaque à distance (capacité spéciale, certaines pièces seulement), 3.3 Point ouvert non résolu, 3. Règles de capture — état validé, 4. Pièges (+17 more)

### Community 20 - "main.ts"
Cohesion: 0.10
Nodes (26): cleanedSearch(), element(), intentOf(), main(), Identity, resendVerification(), signOut(), connectToMatch() (+18 more)

### Community 21 - "MatchDetail.tsx"
Cohesion: 0.07
Nodes (7): Replay(), clampFrame(), describeEntry(), frameLabel(), boardForScenario(), entries, scenarioFor()

### Community 23 - "Outillage et CI/CD — `tooling/infra`, `.github`"
Cohesion: 0.10
Nodes (21): `checks` — les vérifications, Concurrence, `config.ts` — chemins et conventions, « Créer un environnement de branche », `deploy` — le déploiement, `deploy-manifest.ts` — édition du manifeste, `git.ts`, `.github/deploy-environments.json` — le mécanisme de sélection (+13 more)

### Community 28 - "iso.ts"
Cohesion: 0.15
Nodes (16): compareDepth(), CORNERS, Depth, depthOf(), EDGE_NEIGHBOURS, lerpAngle(), projectXY(), Quad (+8 more)

### Community 35 - "me/queries.ts"
Cohesion: 0.11
Nodes (26): readLog(), HandleError, changeHandle(), HANDLE_COOLDOWN_MS, HandleChange, listMyMatches(), listSessions(), MyMatch (+18 more)

### Community 49 - "Occulis — Architecture technique"
Cohesion: 0.20
Nodes (10): 1. Cible de distribution, 2. Hébergement : Cloudflare Worker + Durable Objects, 3. Base de données : D1, 5. CI/CD, 6. Coûts, 7. Points ouverts, Conséquence : versionner les règles par partie, Le log d'actions est la source de vérité (+2 more)

### Community 50 - "Le serveur — `apps/server`"
Cohesion: 0.11
Nodes (19): `admin/` — le back-office, Fichiers, `index.ts` — le Worker, Invariants à ne pas casser, L'autorité de tour, L'hibernation — le point de coût, L'usurpation, Le cycle d'une action (+11 more)

### Community 51 - "ui/package.json"
Cohesion: 0.06
Nodes (34): description, devDependencies, react, react-dom, tsup, @types/react, @types/react-dom, typescript (+26 more)

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
Cohesion: 0.08
Nodes (5): App(), Gate(), whoAmI(), Trigger(), Usage()

### Community 59 - "web/package.json"
Cohesion: 0.06
Nodes (32): dependencies, @occulis/core, @occulis/protocol, @occulis/ui, pixi.js, react, react-dom, devDependencies (+24 more)

### Community 61 - "actions.tsx"
Cohesion: 0.08
Nodes (13): Act, BanDialog(), CreateUserDialog(), DeleteDialog(), ICONS, ImpersonateDialog(), Open, QuickActions() (+5 more)

### Community 62 - "profile/App.tsx"
Cohesion: 0.12
Nodes (35): linkGoogle(), stopImpersonating(), Account(), App(), DangerZone(), Editing, EditorProps, EmailEditor() (+27 more)

### Community 63 - "scene.ts"
Cohesion: 0.10
Nodes (25): drawHover(), drawSelection(), Mark, markTile(), drawPiece(), Drawable, isTile(), occupantsOf() (+17 more)

### Community 64 - "better-auth.ts"
Cohesion: 0.07
Nodes (54): database, directory, env, ACCOUNT_MUTATIONS, ADMIN_ROLE, buildAuth(), claimDerivedHandle(), claimHandle() (+46 more)

### Community 65 - "server/package.json"
Cohesion: 0.07
Nodes (28): dependencies, better-auth, @occulis/core, @occulis/protocol, @occulis/ui, devDependencies, @cloudflare/vitest-pool-workers, @cloudflare/workers-types (+20 more)

### Community 67 - "infra/package.json"
Cohesion: 0.07
Nodes (28): ink-text-input, tsx, @types/node, bin, occulis-infra, dependencies, ink, ink-text-input (+20 more)

### Community 68 - "PlayerId"
Cohesion: 0.23
Nodes (8): OnlineMatch, SeatedContext, Action, PlayerView, PlayerId, ActionRecord, WireView, MeLogEntry

### Community 69 - "components/App.tsx"
Cohesion: 0.15
Nodes (22): ActionContext, ActionDef, guardPlaceholder(), App(), envItems(), InteractiveOutcome, Phase, Props (+14 more)

### Community 70 - "ref_vitest"
Cohesion: 0.24
Nodes (15): replayLog(), memory(), WALLED, table(), WALLED, game(), MATCHED, wireView() (+7 more)

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
Cohesion: 0.17
Nodes (26): attachControls(), ControlsOptions, Drag, DragKind, dragKindOf(), isTyping(), sameCoord(), Camera (+18 more)

### Community 77 - "MatchDO.load"
Cohesion: 0.57
Nodes (7): MatchDO.appendToLog(), MatchDO.broadcastViews(), MatchDO.config(), MatchDO.load(), MatchDO.play(), MatchDO.send(), MatchDO.webSocketMessage()

### Community 78 - "src/theme.ts"
Cohesion: 0.17
Nodes (16): GEOMETRY, PLAYERS, STATE, Les tokens, BACKGROUND, CAMP, cssVariables(), FONT (+8 more)

### Community 79 - "config.ts"
Cohesion: 0.10
Nodes (16): styles, @cloudflare/vitest-pool-workers, dbName(), DEPLOY_MANIFEST, envFlag(), FIXED_DB_NAMES, here, PLACEHOLDER (+8 more)

### Community 80 - "One branch = one full hosted environment"
Cohesion: 0.50
Nodes (4): deploy-environments.json manifest, Branches déployées, Branches déployées README, CI target-environment resolution job

### Community 81 - "replay-canvas.ts"
Cohesion: 0.16
Nodes (19): drawPiece(), fillQuad(), mountReplay(), draw(), ReplayCanvas, strokeQuad(), trace(), centerOffset() (+11 more)

### Community 82 - "mockup.js"
Cohesion: 0.22
Nodes (21): allCells(), byDepth(), diamond(), drawGlyph(), drawGlyphIcon(), drawMoveTrail(), drawPiece(), drawPieces() (+13 more)

### Community 83 - "docs/architecture.md (infra/server architecture reference)"
Cohesion: 0.22
Nodes (3): match_actions table, matches table, docs/architecture.md (infra/server architecture reference)

### Community 84 - "actions.ts"
Cohesion: 0.22
Nodes (15): stream(), ROOT, SERVER_DIR, commitPaths(), currentBranch(), pathsHaveChanges(), pushCurrentBranch(), LineSink (+7 more)

### Community 85 - "Composition"
Cohesion: 0.11
Nodes (19): Composition, Banner(), BannerProps, EmptyState(), EmptyStateProps, Card(), CardColumn(), CardGrid() (+11 more)

### Community 86 - "admin/routes.ts"
Cohesion: 0.42
Nodes (8): listMatches(), readPlayer(), readStats(), renamePlayer(), found(), handleAdmin(), refuseNonAdmin(), rename()

### Community 87 - "protocol/package.json"
Cohesion: 0.11
Nodes (17): dependencies, @occulis/core, devDependencies, typescript, vitest, @occulis/core, typescript, vitest (+9 more)

### Community 88 - "La charte graphique — `packages/ui`"
Cohesion: 0.13
Nodes (15): Setup, Fichiers, Invariants à ne pas casser, La charte graphique — `packages/ui`, La feuille de style, La synchronisation vers Claude Design, Tests, Notify (+7 more)

### Community 89 - "server/src/index.ts"
Cohesion: 0.15
Nodes (14): Auth, availableProviders(), isAdmin(), isImpersonated(), Account, currentAccount(), handleAuth(), ACCOUNT_PATHS (+6 more)

### Community 91 - "ref_react"
Cohesion: 0.13
Nodes (8): Hero(), HeroProps, Person(), PersonProps, UiRootProps, Versus(), VersusProps, VersusSide

### Community 92 - "packages/core/src/index.ts (barrel, referenced)"
Cohesion: 0.14
Nodes (10): hypothesisFrom(), Movement, movementBetween(), ClickOutcome, resolveClick(), selectionFor(), BOARD, PIECES (+2 more)

### Community 93 - "Les composants"
Cohesion: 0.18
Nodes (12): Les composants, DefinitionList(), Fact, FactStrip(), Stat(), StatGrid(), StatProps, StatTile() (+4 more)

### Community 94 - "core/package.json"
Cohesion: 0.13
Nodes (14): devDependencies, typescript, vitest, typescript, vitest, main, name, private (+6 more)

### Community 95 - "components/TopBar.tsx"
Cohesion: 0.33
Nodes (6): ProgressBar(), TopBar(), TopBarProps, TopBarTab, Wordmark(), WordmarkProps

### Community 96 - "admin/queries.ts"
Cohesion: 0.11
Nodes (16): annotate(), frameOf(), MATCH_COLUMNS, MatchRow, readMatch(), RenameResult, summary(), Outcome (+8 more)

### Community 97 - "match-do.ts"
Cohesion: 0.13
Nodes (15): MatchConfig, MatchDO, ensurePlayers(), StartedMatch, startMatch(), CURRENT_RULESET_VERSION, REGISTRY, rulesetFor() (+7 more)

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
Cohesion: 0.15
Nodes (8): Dialog(), DialogProps, Note(), SettingEditor(), SettingEditorProps, SettingList(), SettingRow(), SettingRowProps

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

### Community 108 - "components/Badge.tsx"
Cohesion: 0.22
Nodes (7): Occulis UI — conventions, The three rules of the art direction, Tokens and classes, Badge(), BadgeProps, BadgeRow(), QuickBar()

### Community 109 - "compilerOptions"
Cohesion: 0.22
Nodes (8): compilerOptions, jsx, lib, noEmit, types, extends, include, ../../tsconfig.base.json

### Community 110 - "protocol/src/index.ts"
Cohesion: 0.10
Nodes (28): FIRST_RETRY_MS, MAX_RETRY_MS, retryDelay(), Channel, ChannelOptions, ChannelStatus, openChannel(), MatchHandlers (+20 more)

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

### Community 118 - "@occulis/infra"
Cohesion: 0.50
Nodes (3): Navigation, @occulis/infra, À distance (sans poste local allumé)

### Community 140 - "`auth/` — comptes et sessions"
Cohesion: 0.25
Nodes (8): `auth/` — comptes et sessions, Better Auth, et ce que le projet garde, Ce que le serveur ne dit pas, L'envoi des messages, L'origine est vérifiée, La limitation de débit, La session, La vérification d'adresse

### Community 149 - "cx"
Cohesion: 0.13
Nodes (16): Button, ButtonProps, IconButtonProps, QuickBarProps, MoveEntry, MoveList(), MoveListProps, ChipGroup() (+8 more)

### Community 150 - "components/Icon.tsx"
Cohesion: 0.15
Nodes (13): Avertissements connus, Décisions et contournements, Notes de synchronisation — Occulis UI, Préparer un re-sync, Re-sync risks, SelectField(), Icon(), ICON_NAMES (+5 more)

### Community 172 - "Le schéma D1"
Cohesion: 0.40
Nodes (5): Le schéma D1, `migrations/0001_init.sql`, `migrations/0002_users.sql` et `0003_sessions.sql`, `migrations/0004_better_auth.sql`, `migrations/0005_admin.sql`

### Community 186 - "Notes d'implémentation — interprétations à valider"
Cohesion: 0.50
Nodes (4): Correctifs notables, Décisions volontairement non implémentées, Interprétations encodées, Notes d'implémentation — interprétations à valider

## Knowledge Gaps
- **628 isolated node(s):** `entries`, `printWidth`, `trailingComma`, `name`, `version` (+623 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 927 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **112 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Invariant : déterminisme strict de core` connect `La logique de jeu — `packages/core`` to `packages/core/src/index.ts (barrel, referenced)`?**
  _High betweenness centrality (0.140) - this node is a cross-community bridge._
- **Are the 52 inferred relationships involving `Les composants` (e.g. with `Badge()` and `BadgeRow()`) actually correct?**
  _`Les composants` has 52 INFERRED edges - model-reasoned connections that need verification._
- **What connects `entries`, `printWidth`, `trailingComma` to the rest of the system?**
  _628 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `cli.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.10984848484848485 - nodes in this community are weakly interconnected._
- **Why does `Occulis project overview` connect `Occulis project overview` to `docs/architecture.md (infra/server architecture reference)`, `technical/README.md`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Should `La logique de jeu — `packages/core`` be split into smaller, more focused modules?**
  _Cohesion score 0.04081632653061224 - nodes in this community are weakly interconnected._
- **Why does `Board` connect `Board` to `PlayerId`, `ref_vitest`, `camera.ts`, `iso.ts`, `fog.ts`, `replay-canvas.ts`, `messages.ts`, `MatchDetail.tsx`, `packages/core/src/index.ts (barrel, referenced)`, `scene.ts`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._