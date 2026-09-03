# Graph Report - .  (2026-08-29)

## Corpus Check
- 103 files · ~51,852 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 719 nodes · 1825 edges · 49 communities (26 shown, 23 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 35 edges (avg confidence: 0.82)
- Token cost: 572,880 input · 0 output

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

## God Nodes (most connected - your core abstractions)
1. `Coord` - 53 edges
2. `Board` - 50 edges
3. `packages/core/src/index.ts (barrel, referenced)` - 29 edges
4. `coordKey` - 27 edges
5. `PieceType` - 27 edges
6. `GameState` - 27 edges
7. `main()` - 25 edges
8. `docs/technical/engine.md` - 24 edges
9. `Match` - 23 edges
10. `PlayerId` - 21 edges

## Surprising Connections (you probably didn't know these)
- `MatchDO` --conceptually_related_to--> `Global matchmaking Durable Object`  [INFERRED]
  apps/server/src/match-do.ts → CLAUDE.md
- `Invariant : déterminisme strict de core` --rationale_for--> `packages/core/src/index.ts (barrel, referenced)`  [INFERRED]
  docs/technical/core.md → packages/core/src/index.ts
- `MatchDO` --rationale_for--> `Fog of war is structural, not applicative`  [EXTRACTED]
  apps/server/src/match-do.ts → CLAUDE.md
- `MatchDO.load()` --rationale_for--> `packages/core strict determinism invariant`  [EXTRACTED]
  apps/server/src/match-do.ts → CLAUDE.md
- `scenarioFor()` --references--> `docs/design.md`  [EXTRACTED]
  apps/server/src/scenarios.ts → docs/design.md

## Import Cycles
- None detected.

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

## Communities (49 total, 23 thin omitted)

### Community 0 - "Rendu isométrique et entrées"
Cohesion: 0.06
Nodes (87): Cible de distribution (Electron), DA et caméra provisoires, Choix technique (stack, séparation logique/rendu), docs/design.md, Le dossier dit la dépendance (view/game purs vs scene/input/ui), 12 invariants du moteur de rendu, Pipeline gestes/saisie → application → rendu, Saisie des coups : clic + clavier (+79 more)

### Community 1 - "Types de pièces et vision"
Cohesion: 0.06
Nodes (58): Height as Wall (not a flag), LOS Canonical-Order Symmetry, One Piece Type = One Class, Verticality Movement Rules, ConfigurablePieceType, PieceProfile, PieceKind, PieceType (+50 more)

### Community 2 - "TUI d'infrastructure Ink"
Cohesion: 0.06
Nodes (80): App(), InteractiveOutcome, Phase, Props, tomlBadge(), LogLine, OutputPane(), Props (+72 more)

### Community 3 - "État de partie et scénarios"
Cohesion: 0.07
Nodes (54): One Action = One Piece's Full Turn, Fog of War Ghost Memory, Server-Side Fog Redaction, Match, ridgeGame(), Match test suite, DEMO_MAP, DEMO_PIECES (+46 more)

### Community 4 - "Décisions d'architecture et coûts"
Cohesion: 0.06
Nodes (39): Log d'actions comme source de vérité, Sélection des branches hébergées, CI/CD (ci.yml, deploy-environments.json), Base D1, Quatre environnements, Hébergement Cloudflare Worker + Durable Objects, Module actions.ts : coups légaux et résolution, Invariant : déterminisme strict de core (+31 more)

### Community 5 - "Sélection et coups légaux"
Cohesion: 0.13
Nodes (31): ClickOutcome, resolveClick(), Selection, selectionFor(), BOARD, game(), PIECES, selection.ts test suite (+23 more)

### Community 6 - "Console de commandes texte"
Cohesion: 0.13
Nodes (28): docs/implementation-notes.md, handOver (const), look (const), play (const), Command, CommandFault, parseCommand(), parseCoord() (+20 more)

### Community 7 - "Manifeste du paquet core"
Cohesion: 0.11
Nodes (17): devDependencies, typescript, vitest, main, name, private, scripts, test (+9 more)

### Community 8 - "Manifeste du paquet infra"
Cohesion: 0.11
Nodes (18): bin, occulis-infra, dependencies, ink, ink-text-input, react, devDependencies, tsx (+10 more)

### Community 9 - "Manifeste du paquet web"
Cohesion: 0.12
Nodes (16): dependencies, @occulis/core, pixi.js, devDependencies, typescript, vite, vitest, name (+8 more)

### Community 10 - "Configuration TypeScript de base"
Cohesion: 0.12
Nodes (15): compilerOptions, declaration, declarationMap, esModuleInterop, exactOptionalPropertyTypes, forceConsistentCasingInFileNames, isolatedModules, lib (+7 more)

### Community 11 - "Manifeste du paquet server"
Cohesion: 0.13
Nodes (14): dependencies, @occulis/core, devDependencies, @cloudflare/workers-types, typescript, wrangler, name, private (+6 more)

### Community 12 - "Carte du projet CLAUDE.md"
Cohesion: 0.15
Nodes (13): apps/server (Cloudflare Worker + DO), apps/web (Vite + PixiJS rendering), packages/core strict determinism invariant, docs/costs.md (infra cost estimates), docs/design.md (game design reference), docs/implementation-notes.md, LOS symmetry-by-construction, Occulis project overview (+5 more)

### Community 13 - "Manifeste des environnements"
Cohesion: 0.20
Nodes (9): feature/engine, d1Database, wranglerEnv, main, d1Database, wranglerEnv, staging, d1Database (+1 more)

### Community 14 - "Scripts racine et CI"
Cohesion: 0.22
Nodes (10): scripts, build, dev, format, infra, lint, test, typecheck (+2 more)

### Community 15 - "Configuration TypeScript web"
Cohesion: 0.20
Nodes (9): compilerOptions, lib, module, moduleResolution, noEmit, outDir, rootDir, extends (+1 more)

### Community 16 - "Règles de design ouvertes"
Cohesion: 0.22
Nodes (9): Versionnement des règles par partie, Phase de déploiement, Fog of war confirmé, Décision fondatrice LOS (raycast + hauteur), Points ouverts (récapitulatif), Attaque à distance différée, Pièges, Historique des itérations tour/capture (+1 more)

### Community 17 - "Invariants serveur et migrations D1"
Cohesion: 0.22
Nodes (9): docs/architecture.md (infra/server architecture reference), D1 action log is the source of truth, Durable Object must hibernate, Fog of war is structural, not applicative, Global matchmaking Durable Object, Rules versioned per match, not per connection, match_actions table, matches table (+1 more)

### Community 18 - "Métadonnées du monorepo"
Cohesion: 0.22
Nodes (8): engines, node, name, packageManager, pnpm, onlyBuiltDependencies, private, type

### Community 19 - "Outils de développement racine"
Cohesion: 0.22
Nodes (9): devDependencies, @cloudflare/workers-types, eslint, eslint-config-prettier, prettier, typescript, @typescript-eslint/eslint-plugin, @typescript-eslint/parser (+1 more)

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
Cohesion: 0.67
Nodes (4): One branch = one full hosted environment, deploy-environments.json manifest, Branches déployées README, CI target-environment resolution job

### Community 24 - "Règle ESLint des couleurs"
Cohesion: 1.00
Nodes (3): src/theme.ts sole color-value file, no-restricted-syntax color literal rule, theme.ts color rule exception

## Knowledge Gaps
- **201 isolated node(s):** `PreToolUse`, `wranglerEnv`, `d1Database`, `wranglerEnv`, `d1Database` (+196 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **23 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `packages/core/src/actions.ts (referenced)` connect `TUI d'infrastructure Ink` to `Types de pièces et vision`, `État de partie et scénarios`, `Décisions d'architecture et coûts`, `Sélection et coups légaux`?**
  _High betweenness centrality (0.147) - this node is a cross-community bridge._
- **Why does `Board` connect `Types de pièces et vision` to `Rendu isométrique et entrées`, `État de partie et scénarios`, `Sélection et coups légaux`, `Console de commandes texte`?**
  _High betweenness centrality (0.088) - this node is a cross-community bridge._
- **Why does `packages/core/src/index.ts (barrel, referenced)` connect `Rendu isométrique et entrées` to `Types de pièces et vision`, `État de partie et scénarios`, `Décisions d'architecture et coûts`, `Sélection et coups légaux`, `Console de commandes texte`, `Manifeste du paquet core`?**
  _High betweenness centrality (0.081) - this node is a cross-community bridge._
- **What connects `PreToolUse`, `wranglerEnv`, `d1Database` to the rest of the system?**
  _227 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Rendu isométrique et entrées` be split into smaller, more focused modules?**
  _Cohesion score 0.056074766355140186 - nodes in this community are weakly interconnected._
- **Should `Types de pièces et vision` be split into smaller, more focused modules?**
  _Cohesion score 0.05862939235099981 - nodes in this community are weakly interconnected._
- **Should `TUI d'infrastructure Ink` be split into smaller, more focused modules?**
  _Cohesion score 0.05960729312762973 - nodes in this community are weakly interconnected._