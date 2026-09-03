# Graph Report - Occulis  (2026-09-03)

## Corpus Check
- 104 files · ~55,087 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 913 nodes · 2043 edges · 66 communities (40 shown, 26 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 37 edges (avg confidence: 0.82)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `3397a066`
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

## God Nodes (most connected - your core abstractions)
1. `Coord` - 53 edges
2. `Board` - 50 edges
3. `packages/core/src/index.ts (barrel, referenced)` - 29 edges
4. `coordKey` - 27 edges
5. `PieceType` - 27 edges
6. `GameState` - 27 edges
7. `main()` - 25 edges
8. `Match` - 23 edges
9. `Le moteur de rendu et le client — `apps/web`` - 23 edges
10. `PlayerId` - 21 edges

## Surprising Connections (you probably didn't know these)
- `Invariant : déterminisme strict de core` --rationale_for--> `packages/core/src/index.ts (barrel, referenced)`  [INFERRED]
  docs/technical/core.md → packages/core/src/index.ts
- `MatchDO` --conceptually_related_to--> `Global matchmaking Durable Object`  [INFERRED]
  apps/server/src/match-do.ts → CLAUDE.md
- `MatchDO` --rationale_for--> `Fog of war is structural, not applicative`  [EXTRACTED]
  apps/server/src/match-do.ts → CLAUDE.md
- `DA et caméra provisoires` --rationale_for--> `applyPalette()`  [EXTRACTED]
  docs/design.md → apps/web/src/ui/palette.ts
- `CI checks job (typecheck/lint/test/build)` --references--> `scripts`  [EXTRACTED]
  .github/workflows/ci.yml → package.json

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

## Communities (66 total, 26 thin omitted)

### Community 0 - "Rendu isométrique et entrées"
Cohesion: 0.13
Nodes (34): DA et caméra provisoires, Saisie des coups : clic + clavier, attachControls(), Drag, DragKind, dragKindOf(), isTyping(), sameCoord() (+26 more)

### Community 1 - "Types de pièces et vision"
Cohesion: 0.08
Nodes (42): Height as Wall (not a flag), LOS Canonical-Order Symmetry, One Piece Type = One Class, Verticality Movement Rules, ConfigurablePieceType, PieceProfile, PieceKind, PieceType (+34 more)

### Community 2 - "TUI d'infrastructure Ink"
Cohesion: 0.05
Nodes (93): App(), envItems(), InteractiveOutcome, Phase, Props, tomlBadge(), LogLine, OutputPane() (+85 more)

### Community 3 - "État de partie et scénarios"
Cohesion: 0.07
Nodes (70): One Action = One Piece's Full Turn, Fog of War Ghost Memory, Server-Side Fog Redaction, Match, ridgeGame(), Match test suite, DEMO_MAP, DEMO_PIECES (+62 more)

### Community 4 - "Décisions d'architecture et coûts"
Cohesion: 0.04
Nodes (45): Module actions.ts : coups légaux et résolution, Invariant : déterminisme strict de core, Module fog.ts : mémoire fantôme et viewFor(), Invariant : immuabilité (Board, GameState...), Module los.ts : raycast Bresenham, géométrie seule, Module movement.ts : verticalité et portée de mêlée, Un type de pièce = une classe (données/comportement séparés), Grimper consomme le tour entier (+37 more)

### Community 5 - "Sélection et coups légaux"
Cohesion: 0.07
Nodes (38): apps/server (Cloudflare Worker + DO), apps/web (Vite + PixiJS rendering), docs/architecture.md (infra/server architecture reference), packages/core strict determinism invariant, docs/costs.md (infra cost estimates), D1 action log is the source of truth, docs/design.md (game design reference), Durable Object must hibernate (+30 more)

### Community 6 - "Console de commandes texte"
Cohesion: 0.15
Nodes (25): handOver (const), look (const), play (const), Command, CommandFault, parseCommand(), parseCoord(), RESIGN_WORDS (+17 more)

### Community 7 - "Manifeste du paquet core"
Cohesion: 0.11
Nodes (17): devDependencies, typescript, vitest, main, name, private, scripts, test (+9 more)

### Community 8 - "Manifeste du paquet infra"
Cohesion: 0.09
Nodes (21): bin, occulis-infra, dependencies, ink, ink-text-input, react, devDependencies, tsx (+13 more)

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
Cohesion: 0.07
Nodes (31): One branch = one full hosted environment, deploy-environments.json manifest, Branches déployées README, devDependencies, @cloudflare/workers-types, eslint, eslint-config-prettier, prettier (+23 more)

### Community 13 - "Manifeste des environnements"
Cohesion: 0.29
Nodes (6): main, d1Database, wranglerEnv, staging, d1Database, wranglerEnv

### Community 14 - "Scripts racine et CI"
Cohesion: 0.12
Nodes (30): Cible de distribution (Electron), Choix technique (stack, séparation logique/rendu), Le dossier dit la dépendance (view/game purs vs scene/input/ui), 12 invariants du moteur de rendu, drawHover(), Mark, markTile(), depthAlpha() (+22 more)

### Community 15 - "Configuration TypeScript web"
Cohesion: 0.20
Nodes (9): compilerOptions, lib, module, moduleResolution, noEmit, outDir, rootDir, extends (+1 more)

### Community 16 - "Règles de design ouvertes"
Cohesion: 0.22
Nodes (9): Versionnement des règles par partie, Phase de déploiement, Fog of war confirmé, Décision fondatrice LOS (raycast + hauteur), Points ouverts (récapitulatif), Attaque à distance différée, Pièges, Historique des itérations tour/capture (+1 more)

### Community 17 - "Invariants serveur et migrations D1"
Cohesion: 0.06
Nodes (35): Carte des modules, Ce que le client fait, et ne fait pas, Clic contre glissé, `cliffQuads()` et l'ordre du peintre, Conditions de réémission, `game/match.ts` — la partie locale, `game/selection.ts` — sélection et clic, `index.html` et `ui/console.css` (+27 more)

### Community 18 - "Métadonnées du monorepo"
Cohesion: 0.18
Nodes (14): drawSelection(), drawPiece(), Drawable, isTile(), Occupant, occupantsOf(), sameHover(), sameProjection() (+6 more)

### Community 19 - "Outils de développement racine"
Cohesion: 0.09
Nodes (23): 10. Récapitulatif — points ouverts à trancher (à date de ce document), 1. Pitch, 2. Piliers de design (non négociables, validés), 3.1 Attaque de mêlée (règle de base, toutes les pièces), 3.2 Attaque à distance (capacité spéciale, certaines pièces seulement), 3.3 Point ouvert non résolu, 3. Règles de capture — état validé, 4. Pièges (+15 more)

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
Cohesion: 0.17
Nodes (12): Fichiers, `index.ts` — le Worker, Invariants à ne pas casser, Le schéma D1, Le serveur — `apps/server`, `migrations/0001_init.sql`, `migrations/0002_users.sql`, Non implémenté (+4 more)

### Community 51 - "Community 51"
Cohesion: 0.48
Nodes (5): packages/core/src/index.ts (barrel, referenced), AnimatedPosition, easeInOutCubic(), positionOf(), BOARD

### Community 52 - "Community 52"
Cohesion: 0.22
Nodes (8): Commandes, Conventions, graphify, Infrastructure et CI/CD, Modules de `packages/core`, Occulis, Stack et architecture, État du projet

### Community 53 - "Community 53"
Cohesion: 0.27
Nodes (6): Coûts hors hébergement (signature, Steam, domaine), Chiffrage plan Workers Paid, Pipeline gestes/saisie → application → rendu, pnpm infra (TUI Ink), Client et serveur pas encore connectés, Séparation comment/pourquoi dans la doc technique

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
Cohesion: 0.50
Nodes (4): Coûts hors hébergement, L'hibernation est une condition, pas une optimisation, Non chiffré, Occulis — Estimation des coûts

### Community 59 - "Community 59"
Cohesion: 0.50
Nodes (4): L'hibernation — le point de coût, Le cycle d'une action, `load()` — la reconstruction par rejeu, `match-do.ts` — `MatchDO`

### Community 62 - "Community 62"
Cohesion: 0.15
Nodes (12): ControlsOptions, SceneInput, Board, Tile, TileSpec, Coord, Move, MoveAnimation (+4 more)

### Community 63 - "Community 63"
Cohesion: 0.20
Nodes (10): Correctifs notables, Décisions volontairement non implémentées, Interprétations encodées, Notes d'implémentation — interprétations à valider, GEOMETRY, METRICS, STATE, messages.ts test suite (+2 more)

## Knowledge Gaps
- **343 isolated node(s):** `PreToolUse`, `wranglerEnv`, `d1Database`, `wranglerEnv`, `d1Database` (+338 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **26 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `packages/core/src/actions.ts (referenced)` connect `TUI d'infrastructure Ink` to `Types de pièces et vision`, `État de partie et scénarios`, `Décisions d'architecture et coûts`?**
  _High betweenness centrality (0.141) - this node is a cross-community bridge._
- **Why does `packages/core/src/index.ts (barrel, referenced)` connect `Community 51` to `Rendu isométrique et entrées`, `État de partie et scénarios`, `Décisions d'architecture et coûts`, `Sélection et coups légaux`, `Console de commandes texte`, `Manifeste du paquet core`, `Scripts racine et CI`, `Métadonnées du monorepo`, `Community 62`?**
  _High betweenness centrality (0.075) - this node is a cross-community bridge._
- **Why does `Board` connect `Community 62` to `Rendu isométrique et entrées`, `Types de pièces et vision`, `État de partie et scénarios`, `Console de commandes texte`, `Scripts racine et CI`, `Métadonnées du monorepo`, `Community 51`?**
  _High betweenness centrality (0.065) - this node is a cross-community bridge._
- **What connects `PreToolUse`, `wranglerEnv`, `d1Database` to the rest of the system?**
  _369 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Rendu isométrique et entrées` be split into smaller, more focused modules?**
  _Cohesion score 0.1282051282051282 - nodes in this community are weakly interconnected._
- **Should `Types de pièces et vision` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._
- **Should `TUI d'infrastructure Ink` be split into smaller, more focused modules?**
  _Cohesion score 0.0509683995922528 - nodes in this community are weakly interconnected._