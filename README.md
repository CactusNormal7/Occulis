# Occulis

Jeu de plateau tactique compétitif **1v1 en ligne**, en vue isométrique 2D, dessiné en
traits blancs sur fond sombre (rendu procédural, aucun sprite). Le squelette rappelle les
échecs — un roi à protéger — mais sur une carte à géométrie libre, avec hauteur, murs,
ligne de vue et fog of war.

> **État** : prototype jouable en ligne. Plateau à hauteur, ligne de vue occultée par le
> relief et les pièces, déplacement, tours alternés, fog of war avec mémoire, comptes,
> matchmaking, salons privés et back-office. La capture et la fin de partie sont
> temporairement retirées du moteur : **une partie ne se termine que par abandon**
> ([design.md](docs/design.md), point ouvert 13). Le roster et les cartes sont provisoires.

## Démarrage rapide

Prérequis : **Node 24** (voir `.nvmrc` — wrangler refuse Node 22) et **pnpm 10**.

```bash
pnpm install
pnpm dev          # client seul (Vite) ; les maquettes sont servies sur /mockups
```

Le jeu se joue contre le serveur. Pour une partie complète en local (client + Worker +
Durable Objects + D1 locale) :

```bash
pnpm --filter @occulis/web build:local
cd apps/server && pnpm exec wrangler dev
```

Ouvrir deux navigateurs (ou une fenêtre privée), créer deux comptes, puis lancer une
partie rapide ou un salon privé par code.

## Commandes

| Commande | Rôle |
|---|---|
| `pnpm dev` | Serveur de développement du client (`apps/web`) |
| `pnpm test` | Tests Vitest de tous les paquets |
| `pnpm typecheck` | Vérification TypeScript stricte |
| `pnpm lint` | ESLint |
| `pnpm build` | Build de tous les paquets |
| `pnpm infra` | TUI Cloudflare : bases D1, migrations, environnements, déploiement |

## Organisation

Monorepo pnpm, TypeScript strict partout.

```
packages/core       logique de jeu pure et déterministe — plateau, LOS, déplacement, fog
packages/protocol   messages client ↔ serveur, ni règle ni transport
packages/ui         charte graphique en composants React (@occulis/ui)
apps/web            client : rendu isométrique PixiJS, écrans, back-office (/admin/)
apps/server         Worker Cloudflare : Durable Object par partie, file de matchmaking, D1, Better Auth
tooling/infra       TUI de pilotage de l'infrastructure Cloudflare
docs/               design, architecture, documentation technique
```

Deux invariants à ne pas casser :

- **Le serveur est autoritaire et le fog est appliqué à la source** : un client ne reçoit
  jamais de donnée hors de sa ligne de vue.
- **`packages/core` est strictement déterministe** (ni `Math.random`, ni horloge) : le log
  d'actions en D1 est la source de vérité et chaque partie se reconstruit par rejeu.

## Documentation

| Question | Document |
|---|---|
| Quelles sont les règles, et pourquoi ? | [docs/design.md](docs/design.md) |
| Pourquoi cette infrastructure ? | [docs/architecture.md](docs/architecture.md) |
| Comment le code fonctionne-t-il, fonction par fonction ? | [docs/technical/](docs/technical/README.md) |
| Qu'a-t-il fallu interpréter faute de décision ? | [docs/implementation-notes.md](docs/implementation-notes.md) |
| Comment installer et déployer ? | [docs/setup.md](docs/setup.md) |
| Combien ça coûte ? | [docs/costs.md](docs/costs.md) |

## Environnements

Hébergé sur Cloudflare (Workers, Durable Objects, D1). La CI
(`.github/workflows/ci.yml`) vérifie toute branche ; seules celles listées dans
`.github/deploy-environments.json` sont déployées :

- production — [occulis.0kl.fr](https://occulis.0kl.fr) (`main`)
- recette — `occulis-staging.0kl.fr` (`staging`)
- previews de branche — `occulis-<branche>.0kl.fr`, ajoutées et retirées via `pnpm infra`
