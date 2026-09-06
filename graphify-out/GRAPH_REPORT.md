# Graph Report - Occulis  (2026-09-06)

## Corpus Check
- 139 files · ~78,381 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1124 nodes · 2563 edges · 83 communities (56 shown, 27 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 37 edges (avg confidence: 0.81)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4d071a45`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Rendu isométrique et entrées|Rendu isométrique et entrées]]
- [[_COMMUNITY_Types de pièces et vision|Types de pièces et vision]]
- [[_COMMUNITY_TUI d'infrastructure Ink|TUI d'infrastructure Ink]]
- [[_COMMUNITY_État de partie et scénarios|État de partie et scénarios]]
- [[_COMMUNITY_Décisions d'architecture et coûts|Décisions d'architecture et coûts]]
- [[_COMMUNITY_Sélection et coups légaux|Sélection et coups légaux]]
- [[_COMMUNITY_Console de commandes texte|Console de commandes texte]]
- [[_COMMUNITY_Manifeste du paquet core|Manifeste du paquet core]]
- [[_COMMUNITY_Manifeste du paquet infra|Manifeste du paquet infra]]
- [[_COMMUNITY_Manifeste du paquet web|Manifeste du paquet web]]
- [[_COMMUNITY_Configuration TypeScript de base|Configuration TypeScript de base]]
- [[_COMMUNITY_Manifeste du paquet server|Manifeste du paquet server]]
- [[_COMMUNITY_Carte du projet CLAUDE|Carte du projet CLAUDE.md]]
- [[_COMMUNITY_Manifeste des environnements|Manifeste des environnements]]
- [[_COMMUNITY_Scripts racine et CI|Scripts racine et CI]]
- [[_COMMUNITY_Configuration TypeScript web|Configuration TypeScript web]]
- [[_COMMUNITY_Règles de design ouvertes|Règles de design ouvertes]]
- [[_COMMUNITY_Invariants serveur et migrations D1|Invariants serveur et migrations D1]]
- [[_COMMUNITY_Métadonnées du monorepo|Métadonnées du monorepo]]
- [[_COMMUNITY_Outils de développement racine|Outils de développement racine]]
- [[_COMMUNITY_Configuration TypeScript infra|Configuration TypeScript infra]]
- [[_COMMUNITY_Configuration TypeScript serveur|Configuration TypeScript serveur]]
- [[_COMMUNITY_Intégration graphify|Intégration graphify]]
- [[_COMMUNITY_Environnements de branche|Environnements de branche]]
- [[_COMMUNITY_Règle ESLint des couleurs|Règle ESLint des couleurs]]
- [[_COMMUNITY_Configuration Prettier|Configuration Prettier]]
- [[_COMMUNITY_Tables joueurs et comptes|Tables joueurs et comptes]]
- [[_COMMUNITY_Héritage tsconfig serveur|Héritage tsconfig serveur]]
- [[_COMMUNITY_Typage de l'environnement Worker|Typage de l'environnement Worker]]
- [[_COMMUNITY_Scopes de commit VS Code|Scopes de commit VS Code]]
- [[_COMMUNITY_Points ouverts d'architecture|Points ouverts d'architecture]]
- [[_COMMUNITY_Capture au corps à corps|Capture au corps à corps]]
- [[_COMMUNITY_Piliers du design|Piliers du design]]
- [[_COMMUNITY_Nom du projet|Nom du projet]]
- [[_COMMUNITY_Visibilité et portée|Visibilité et portée]]
- [[_COMMUNITY_Bloc de configuration ESLint|Bloc de configuration ESLint]]
- [[_COMMUNITY_Pièces bloquantes|Pièces bloquantes]]
- [[_COMMUNITY_Descente sans surcoût|Descente sans surcoût]]
- [[_COMMUNITY_Topologie de grille par pièce|Topologie de grille par pièce]]
- [[_COMMUNITY_Interdiction de passer son tour|Interdiction de passer son tour]]
- [[_COMMUNITY_Portées provisoires du roster|Portées provisoires du roster]]
- [[_COMMUNITY_Terrain public, pièces cachées|Terrain public, pièces cachées]]
- [[_COMMUNITY_Métrique de vision Chebyshev|Métrique de vision Chebyshev]]
- [[_COMMUNITY_Fichier tsconfig infra|Fichier tsconfig infra]]
- [[_COMMUNITY_Bloc de configuration Prettier|Bloc de configuration Prettier]]
- [[_COMMUNITY_Clé de coordonnée|Clé de coordonnée]]
- [[_COMMUNITY_Hauteur d'oeil de la LOS|Hauteur d'oeil de la LOS]]
- [[_COMMUNITY_Scopes de commit|Scopes de commit]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 68|Community 68]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 70|Community 70]]
- [[_COMMUNITY_Community 71|Community 71]]
- [[_COMMUNITY_Community 72|Community 72]]
- [[_COMMUNITY_Community 73|Community 73]]
- [[_COMMUNITY_Community 74|Community 74]]
- [[_COMMUNITY_Community 75|Community 75]]
- [[_COMMUNITY_Community 76|Community 76]]
- [[_COMMUNITY_Community 77|Community 77]]
- [[_COMMUNITY_Community 78|Community 78]]
- [[_COMMUNITY_Community 79|Community 79]]
- [[_COMMUNITY_Community 80|Community 80]]
- [[_COMMUNITY_Community 81|Community 81]]

## God Nodes (most connected - your core abstractions)
1. `Board` - 59 edges
2. `Coord` - 55 edges
3. `packages/core/src/index.ts (barrel, referenced)` - 41 edges
4. `PlayerId` - 34 edges
5. `GameState` - 34 edges
6. `main()` - 31 edges
7. `coordKey` - 28 edges
8. `createGame()` - 28 edges
9. `PieceType` - 27 edges
10. `Le moteur de rendu et le client — `apps/web`` - 27 edges

## Surprising Connections (you probably didn't know these)
- `MatchDO` --conceptually_related_to--> `Global matchmaking Durable Object`  [INFERRED]
  apps/server/src/match-do.ts → CLAUDE.md
- `Invariant : déterminisme strict de core` --rationale_for--> `packages/core/src/index.ts (barrel, referenced)`  [INFERRED]
  docs/technical/core.md → packages/core/src/index.ts
- `MatchDO` --rationale_for--> `Fog of war is structural, not applicative`  [EXTRACTED]
  apps/server/src/match-do.ts → CLAUDE.md
- `MatchDO.load()` --rationale_for--> `packages/core strict determinism invariant`  [EXTRACTED]
  apps/server/src/match-do.ts → CLAUDE.md
- `DA et caméra provisoires` --rationale_for--> `applyPalette()`  [EXTRACTED]
  docs/design.md → apps/web/src/ui/palette.ts

## Import Cycles
- 1-file cycle: `packages/protocol/src/index.ts -> packages/protocol/src/index.ts`
- 2-file cycle: `packages/core/src/actions.ts -> packages/core/src/state.ts -> packages/core/src/actions.ts`

## Hyperedges (group relationships)
- **CI checks → target resolution → deploy pipeline** — workflows_ci_checks_job, workflows_ci_target_job, workflows_ci_deploy_job, github_deploy_environments_manifest [INFERRED 0.85]
- **Deterministic action-log replay reconstructing DO state** — src_match_do_matchdo, src_match_do_load, claude_core_determinism_invariant, claude_d1_source_of_truth, migrations_0001_init_match_actions [INFERRED 0.85]
- **graphify workflow enforcement across doc and hooks** — claude_graphify_rules, claude_claude_graphify_trigger, claude_settings_hooks [INFERRED 0.85]
- **Pure game/UI logic modules (no Pixi, no DOM)** — game_match_match, game_selection_selectionfor, game_selection_resolveclick, ui_command_parsecommand, ui_command_toaction [INFERRED 0.85]
- **Scene rendering pipeline (world + overlay drawing)** — scene_scene_scene, scene_terrain_drawtile, scene_pieces_drawpiece, scene_overlay_drawhover, scene_overlay_drawselection [EXTRACTED 1.00]
- **Keyboard command console flow (parse, resolve, report)** — ui_command_parsecommand, ui_command_toaction, ui_console_attachconsole, ui_messages_describefault, ui_messages_describeturn [EXTRACTED 1.00]
- **Pure view/ modules with no Pixi/DOM dependency** — view_iso_project, view_camera_toprojection, view_picking_tileat, view_animation_startmove [INFERRED 0.85]
- **Time-based interpolation pattern across view/** — view_camera_settle, view_animation_advance, view_animation_positionof, view_iso_lerpangle [INFERRED 0.80]
- **Provisional art-direction/camera decisions realized in code** — design_da_camera_decisions, view_camera_zoomat, view_animation_startmove, ui_palette_applypalette [INFERRED 0.85]
- **PieceType Extension Pattern** — pieces_piece_type_piecetype, pieces_configurable_piece_type_configurablepiecetype, pieces_piece_type_test_clairvoyant, pieces_piece_type_test_sentinel [INFERRED 0.85]
- **Legal Action Resolution Pipeline** — src_actions_legalactions, src_actions_validateaction, src_actions_applyaction, src_actions_destinationsfor, src_actions_capturablesfrom [INFERRED 0.85]
- **Fog of War Knowledge Pipeline** — src_fog_visibletilesfor, src_fog_observe, src_fog_viewfor, src_state_gamestate [INFERRED 0.80]
- **CLI Action Catalog** — src_actions_actions, src_actions_status, src_actions_list, src_actions_create_db, src_actions_create_branch_env, src_actions_delete_branch_env, src_actions_migrate, src_actions_dev, src_actions_deploy, src_actions_sql, src_actions_info, src_actions_tail, src_actions_deployments, src_actions_login [INFERRED 0.85]
- **PieceType Roster Implementations** — roster_commander_commander, roster_scout_scout, pieces_piece_type_piecetype [INFERRED 0.85]
- **Branch Environment Lifecycle** — src_actions_create_branch_env, src_actions_delete_branch_env, src_toml_appendenvblock, src_toml_removeenvblock, src_deploy_manifest_upsertdeployenvironment, src_deploy_manifest_removedeployenvironment, src_git_commitpaths, src_git_pushcurrentbranch [INFERRED 0.85]

## Communities (83 total, 27 thin omitted)

### Community 0 - "Rendu isométrique et entrées"
Cohesion: 0.16
Nodes (24): DA et caméra provisoires, Saisie des coups : clic + clavier, element(), main(), BACKGROUND, clamp(), createCamera(), originOf() (+16 more)

### Community 1 - "Types de pièces et vision"
Cohesion: 0.06
Nodes (49): Height as Wall (not a flag), LOS Canonical-Order Symmetry, One Piece Type = One Class, Verticality Movement Rules, ConfigurablePieceType, PieceProfile, PieceKind, PieceType (+41 more)

### Community 2 - "TUI d'infrastructure Ink"
Cohesion: 0.05
Nodes (93): App(), envItems(), InteractiveOutcome, Phase, Props, tomlBadge(), LogLine, OutputPane() (+85 more)

### Community 3 - "État de partie et scénarios"
Cohesion: 0.09
Nodes (49): One Action = One Piece's Full Turn, opponentOf(), Action, applyAction(), capturablesFrom(), destinationsFor(), isCommanderThreatened(), leavesCommanderExposed() (+41 more)

### Community 4 - "Décisions d'architecture et coûts"
Cohesion: 0.04
Nodes (48): Module actions.ts : coups légaux et résolution, Invariant : déterminisme strict de core, Module fog.ts : mémoire fantôme et viewFor(), Invariant : immuabilité (Board, GameState...), Module los.ts : raycast Bresenham, géométrie seule, Module movement.ts : verticalité et portée de mêlée, Un type de pièce = une classe (données/comportement séparés), Grimper consomme le tour entier (+40 more)

### Community 5 - "Sélection et coups légaux"
Cohesion: 0.06
Nodes (40): cookieFrom(), nextAddress(), post(), signUp(), unique(), verifyEmail(), Auth, buildAuth() (+32 more)

### Community 6 - "Console de commandes texte"
Cohesion: 0.19
Nodes (18): handOver (const), look (const), play (const), CommandFault, attachConsole(), ConsoleElements, GameConsole, describeActionError() (+10 more)

### Community 7 - "Manifeste du paquet core"
Cohesion: 0.11
Nodes (17): devDependencies, typescript, vitest, main, name, private, scripts, test (+9 more)

### Community 8 - "Manifeste du paquet infra"
Cohesion: 0.09
Nodes (21): bin, occulis-infra, dependencies, ink, ink-text-input, react, devDependencies, tsx (+13 more)

### Community 9 - "Manifeste du paquet web"
Cohesion: 0.11
Nodes (17): dependencies, @occulis/core, @occulis/protocol, pixi.js, devDependencies, typescript, vite, vitest (+9 more)

### Community 10 - "Configuration TypeScript de base"
Cohesion: 0.12
Nodes (15): compilerOptions, declaration, declarationMap, esModuleInterop, exactOptionalPropertyTypes, forceConsistentCasingInFileNames, isolatedModules, lib (+7 more)

### Community 11 - "Manifeste du paquet server"
Cohesion: 0.10
Nodes (20): dependencies, better-auth, @occulis/core, @occulis/protocol, devDependencies, @cloudflare/vitest-pool-workers, @cloudflare/workers-types, typescript (+12 more)

### Community 12 - "Carte du projet CLAUDE.md"
Cohesion: 0.22
Nodes (10): scripts, build, dev, format, infra, lint, test, typecheck (+2 more)

### Community 13 - "Manifeste des environnements"
Cohesion: 0.29
Nodes (6): main, d1Database, wranglerEnv, staging, d1Database, wranglerEnv

### Community 14 - "Scripts racine et CI"
Cohesion: 0.13
Nodes (29): Cible de distribution (Electron), Choix technique (stack, séparation logique/rendu), Le dossier dit la dépendance (view/game purs vs scene/input/ui), 12 invariants du moteur de rendu, Pipeline gestes/saisie → application → rendu, depthAlpha(), drawTile(), cliffQuads() (+21 more)

### Community 15 - "Configuration TypeScript web"
Cohesion: 0.20
Nodes (9): compilerOptions, lib, module, moduleResolution, noEmit, outDir, rootDir, extends (+1 more)

### Community 16 - "Règles de design ouvertes"
Cohesion: 0.22
Nodes (9): Versionnement des règles par partie, Phase de déploiement, Fog of war confirmé, Décision fondatrice LOS (raycast + hauteur), Points ouverts (récapitulatif), Attaque à distance différée, Pièges, Historique des itérations tour/capture (+1 more)

### Community 17 - "Invariants serveur et migrations D1"
Cohesion: 0.05
Nodes (40): Carte des modules, Ce que le client fait, et ne fait pas, Clic contre glissé, `cliffQuads()` et l'ordre du peintre, Conditions de réémission, `game/hypothesis.ts` — la position telle que le joueur peut la croire, `game/match.ts` — `MatchSurface` et la partie locale, `game/online-match.ts` — la partie arbitrée par le serveur (+32 more)

### Community 18 - "Métadonnées du monorepo"
Cohesion: 0.14
Nodes (20): PieceId, drawPiece(), Drawable, isTile(), Occupant, occupantsOf(), sameHover(), sameProjection() (+12 more)

### Community 19 - "Outils de développement racine"
Cohesion: 0.08
Nodes (25): 10. Récapitulatif — points ouverts à trancher (à date de ce document), 1. Pitch, 2. Piliers de design (non négociables, validés), 3.1 Attaque de mêlée (règle de base, toutes les pièces), 3.2 Attaque à distance (capacité spéciale, certaines pièces seulement), 3.3 Point ouvert non résolu, 3. Règles de capture — état validé, 4. Pièges (+17 more)

### Community 20 - "Configuration TypeScript infra"
Cohesion: 0.25
Nodes (7): compilerOptions, jsx, lib, noEmit, types, extends, include

### Community 21 - "Configuration TypeScript serveur"
Cohesion: 0.25
Nodes (7): compilerOptions, module, moduleResolution, noEmit, types, extends, include

### Community 22 - "Intégration graphify"
Cohesion: 0.40
Nodes (4): /graphify skill trigger (.claude/CLAUDE.md), graphify usage rules (root CLAUDE.md), hooks, PreToolUse

### Community 23 - "Environnements de branche"
Cohesion: 0.10
Nodes (21): `checks` — les vérifications, Concurrence, `config.ts` — chemins et conventions, « Créer un environnement de branche », `deploy` — le déploiement, `deploy-manifest.ts` — édition du manifeste, `git.ts`, `.github/deploy-environments.json` — le mécanisme de sélection (+13 more)

### Community 24 - "Règle ESLint des couleurs"
Cohesion: 1.00
Nodes (3): src/theme.ts sole color-value file, no-restricted-syntax color literal rule, theme.ts color rule exception

### Community 49 - "Community 49"
Cohesion: 0.17
Nodes (12): 1. Cible de distribution, 2. Hébergement : Cloudflare Worker + Durable Objects, 3. Base de données : D1, 4. Environnements, 5. CI/CD, 6. Coûts, 7. Points ouverts, Conséquence : versionner les règles par partie (+4 more)

### Community 50 - "Community 50"
Cohesion: 0.14
Nodes (14): Fichiers, `index.ts` — le Worker, Invariants à ne pas casser, Le schéma D1, Le serveur — `apps/server`, Les tests, `migrations/0001_init.sql`, `migrations/0002_users.sql` et `0003_sessions.sql` (+6 more)

### Community 51 - "Community 51"
Cohesion: 0.29
Nodes (5): boardForScenario(), demoBoard(), demoGame(), scenarioFor(), packages/core/src/index.ts (barrel, referenced)

### Community 52 - "Community 52"
Cohesion: 0.22
Nodes (8): Commandes, Conventions, graphify, Infrastructure et CI/CD, Modules de `packages/core`, Occulis, Stack et architecture, État du projet

### Community 53 - "Community 53"
Cohesion: 0.19
Nodes (9): Coûts hors hébergement (signature, Steam, domaine), Chiffrage plan Workers Paid, Coûts hors hébergement, L'hibernation est une condition, pas une optimisation, Non chiffré, Occulis — Estimation des coûts, pnpm infra (TUI Ink), Client et serveur pas encore connectés (+1 more)

### Community 54 - "Community 54"
Cohesion: 0.22
Nodes (9): 0. Préalables, 1. Outillage local, 2. Développement local, 3. Créer les bases distantes, 4. Premier déploiement en recette, 5. Secrets pour la CI, 6. Déclencher un déploiement, 7. Ce qui reste à écrire (+1 more)

### Community 55 - "Community 55"
Cohesion: 0.25
Nodes (7): Log d'actions comme source de vérité, Base D1, Hébergement Cloudflare Worker + Durable Objects, Hibernation : condition, pas optimisation (~20000x), Cycle d'une action (load → applyAction → observe → log → broadcast), acceptWebSocket() vs accept() — point de coût, WireView / encodeView() protocole réseau

### Community 56 - "Community 56"
Cohesion: 0.29
Nodes (6): Sélection des branches hébergées, CI/CD (ci.yml, deploy-environments.json), Quatre environnements, .github/deploy-environments.json (mécanisme de sélection), Catalogue ACTIONS de tooling/infra, Procédure d'installation (local → recette → prod)

### Community 57 - "Community 57"
Cohesion: 0.33
Nodes (6): Carte du système, Documentation technique, L'état réel du câblage, Les quatre documents, Périmètre — et ce que ces documents ne sont pas, Règle de maintenance

### Community 58 - "Community 58"
Cohesion: 0.15
Nodes (16): Fog of War Ghost Memory, Match, MatchSurface, ridgeGame(), Match test suite, OnlineMatch, SeatedContext, Piece (+8 more)

### Community 59 - "Community 59"
Cohesion: 0.33
Nodes (6): L'autorité de tour, L'hibernation — le point de coût, Le cycle d'une action, Le siège : à qui parle-t-on ?, `load()` — la reconstruction par rejeu, `match-do.ts` — `MatchDO`

### Community 62 - "Community 62"
Cohesion: 0.27
Nodes (10): attachControls(), ControlsOptions, Drag, DragKind, dragKindOf(), isTyping(), sameCoord(), Camera (+2 more)

### Community 63 - "Community 63"
Cohesion: 0.22
Nodes (13): drawHover(), drawSelection(), Mark, markTile(), parseCoordKey(), GEOMETRY, HOVER, METRICS (+5 more)

### Community 66 - "Community 66"
Cohesion: 0.12
Nodes (21): retryDelay(), Channel, ChannelOptions, ChannelStatus, openChannel(), connectToMatch(), MatchChannel, MatchHandlers (+13 more)

### Community 67 - "Community 67"
Cohesion: 0.21
Nodes (17): Server-Side Fog Redaction, hypothesisFrom(), memory(), WALLED, game(), fromQueue(), MATCHED, seated() (+9 more)

### Community 68 - "Community 68"
Cohesion: 0.19
Nodes (17): authMessage(), AuthOutcome, Identity, JSON_HEADERS, MESSAGES, register(), requestReset(), resendVerification() (+9 more)

### Community 69 - "Community 69"
Cohesion: 0.17
Nodes (14): Correctifs notables, Décisions volontairement non implémentées, Interprétations encodées, Notes d'implémentation — interprétations à valider, ClickOutcome, resolveClick(), Selection, selectionFor() (+6 more)

### Community 70 - "Community 70"
Cohesion: 0.13
Nodes (14): dependencies, @occulis/core, devDependencies, typescript, vitest, main, name, private (+6 more)

### Community 71 - "Community 71"
Cohesion: 0.29
Nodes (11): Command, parseCommand(), parseCoord(), RESIGN_WORDS, actionFor(), expectMove(), faultOf(), Move (+3 more)

### Community 72 - "Community 72"
Cohesion: 0.22
Nodes (8): engines, node, name, packageManager, pnpm, onlyBuiltDependencies, private, type

### Community 73 - "Community 73"
Cohesion: 0.22
Nodes (9): devDependencies, @cloudflare/workers-types, eslint, eslint-config-prettier, prettier, typescript, @typescript-eslint/eslint-plugin, @typescript-eslint/parser (+1 more)

### Community 74 - "Community 74"
Cohesion: 0.25
Nodes (8): apps/server (Cloudflare Worker + DO), apps/web (Vite + PixiJS rendering), docs/costs.md (infra cost estimates), docs/design.md (game design reference), docs/implementation-notes.md, Occulis project overview, docs/setup.md (install procedure), docs/technical/ (per-package technical docs)

### Community 75 - "Community 75"
Cohesion: 0.25
Nodes (8): docs/architecture.md (infra/server architecture reference), D1 action log is the source of truth, Durable Object must hibernate, Fog of war is structural, not applicative, Global matchmaking Durable Object, Rules versioned per match, not per connection, match_actions table, matches table

### Community 76 - "Community 76"
Cohesion: 0.25
Nodes (8): `auth/` — comptes et sessions, Better Auth, et ce que le projet garde, Ce que le serveur ne dit pas, L'envoi des messages, L'origine est vérifiée, La limitation de débit, La session, La vérification d'adresse

### Community 77 - "Community 77"
Cohesion: 0.57
Nodes (7): MatchDO.appendToLog(), MatchDO.broadcastViews(), MatchDO.config(), MatchDO.load(), MatchDO.play(), MatchDO.send(), MatchDO.webSocketMessage()

### Community 78 - "Community 78"
Cohesion: 0.33
Nodes (5): compilerOptions, outDir, rootDir, extends, include

### Community 79 - "Community 79"
Cohesion: 0.40
Nodes (5): packages/core strict determinism invariant, LOS symmetry-by-construction, packages/core (pure game logic), pnpm workspace package globs, @occulis/server package.json

### Community 80 - "Community 80"
Cohesion: 0.67
Nodes (4): One branch = one full hosted environment, deploy-environments.json manifest, Branches déployées README, CI target-environment resolution job

## Knowledge Gaps
- **406 isolated node(s):** `PreToolUse`, `wranglerEnv`, `d1Database`, `wranglerEnv`, `d1Database` (+401 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **27 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `packages/core/src/actions.ts (referenced)` connect `TUI d'infrastructure Ink` to `Types de pièces et vision`, `État de partie et scénarios`, `Décisions d'architecture et coûts`?**
  _High betweenness centrality (0.119) - this node is a cross-community bridge._
- **Why does `packages/core/src/index.ts (barrel, referenced)` connect `Community 51` to `Rendu isométrique et entrées`, `Community 66`, `Community 67`, `Décisions d'architecture et coûts`, `Community 69`, `État de partie et scénarios`, `Manifeste du paquet core`, `Sélection et coups légaux`, `Community 71`, `Console de commandes texte`, `Scripts racine et CI`, `Métadonnées du monorepo`, `Community 58`, `Community 62`, `Community 63`?**
  _High betweenness centrality (0.112) - this node is a cross-community bridge._
- **Why does `Match` connect `Community 58` to `Rendu isométrique et entrées`, `État de partie et scénarios`, `Console de commandes texte`, `Métadonnées du monorepo`, `Community 51`, `Community 53`?**
  _High betweenness centrality (0.085) - this node is a cross-community bridge._
- **What connects `PreToolUse`, `wranglerEnv`, `d1Database` to the rest of the system?**
  _432 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Types de pièces et vision` be split into smaller, more focused modules?**
  _Cohesion score 0.06474490963166324 - nodes in this community are weakly interconnected._
- **Should `TUI d'infrastructure Ink` be split into smaller, more focused modules?**
  _Cohesion score 0.0509683995922528 - nodes in this community are weakly interconnected._
- **Should `État de partie et scénarios` be split into smaller, more focused modules?**
  _Cohesion score 0.0867579908675799 - nodes in this community are weakly interconnected._