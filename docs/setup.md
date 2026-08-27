# Occulis — Mise en place de l'infrastructure

Procédure de première installation. L'architecture est décidée dans
[architecture.md](architecture.md) ; les coûts dans [costs.md](costs.md).

Principe directeur : **rien ne se crée à la main dans le dashboard Cloudflare.** Les
Workers, bases D1 et namespaces Durable Object naissent de `wrangler.toml` et de la CLI,
sinon les quatre environnements divergent et l'automatisation des previews ne peut pas
recréer les ressources.

## 0. Bloquants à lever avant toute commande

- **Le domaine.** `occulis.fr` n'a jamais été vérifié, ni en disponibilité ni en marque
  déposée (design doc section 9, point ouvert 8). Le risque de proximité avec « Oculus »
  est déjà identifié. Acheter puis découvrir un conflit imposerait de tout renommer,
  y compris l'URL gravée dans les binaires distribués.
- **Le plan Cloudflare** (point ouvert 6) : vérifier dans **Compute** si les Durable
  Objects exigent le plan Workers Paid. C'est l'hypothèse du chiffrage.

Les étapes 1 à 4 ne dépendent d'aucun des deux et peuvent se faire tout de suite.

## 1. Outillage local

Depuis la racine du dépôt :

```bash
pnpm install
pnpm exec wrangler login     # ouvre le navigateur
pnpm exec wrangler whoami    # confirme le compte et affiche l'Account ID
```

Noter l'**Account ID** : il servira en secret GitHub à l'étape 5.

## 2. Développement local

Aucune ressource cloud n'est nécessaire. `wrangler dev` émule D1 et les Durable Objects
sur un SQLite local, persistant dans `.wrangler/state` et propre à chaque développeur.

```bash
pnpm --filter @occulis/web build          # le Worker sert ../web/dist
cd apps/server
pnpm exec wrangler d1 migrations apply occulis-local --local
pnpm exec wrangler dev
```

## 3. Créer les bases distantes

```bash
cd apps/server
pnpm exec wrangler d1 create occulis-staging
pnpm exec wrangler d1 create occulis-prod
```

Chaque commande affiche un `database_id`. **Les reporter dans `wrangler.toml`** à la place
des `REMPLACER_PAR_L_ID_*`, puis committer : la configuration des environnements est
versionnée, pas saisie à la main.

## 4. Premier déploiement en recette

```bash
cd apps/server
pnpm exec wrangler d1 migrations apply occulis-staging --remote
pnpm exec wrangler deploy --env staging
```

L'ordre compte : migrations d'abord, déploiement ensuite. Un Worker déployé contre un
schéma non migré échoue à la première requête.

## 5. Secrets pour la CI

Dans le dashboard, **Manage account → API Tokens**, créer un token avec les permissions
`Workers Scripts:Edit`, `D1:Edit` et `Account Settings:Read`.

Le déposer dans les secrets du dépôt GitHub :

| Secret | Valeur |
|---|---|
| `CLOUDFLARE_API_TOKEN` | le token créé |
| `CLOUDFLARE_ACCOUNT_ID` | l'ID relevé à l'étape 1 |

## 6. Ce qui reste à écrire

- Le workflow GitHub Actions (`typecheck → lint → test → build → migrations → deploy`).
- Le mécanisme de sélection des branches hébergées (point ouvert 3) — à trancher avant
  d'écrire le workflow, puisqu'il en conditionne la condition de déploiement.
- Le rattachement des hostnames `<branche>.beta.occulis.fr` (point ouvert 2), dont la
  mécanique n'est pas vérifiée.
- L'authentification : `POST /api/matches` ne vérifie aujourd'hui aucune identité.
