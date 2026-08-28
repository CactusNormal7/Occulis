# Occulis — Mise en place de l'infrastructure

Procédure de première installation. L'architecture est décidée dans
[architecture.md](architecture.md) ; les coûts dans [costs.md](costs.md).

Toutes les opérations décrites ici sont disponibles dans une interface interactive
(navigation clavier, souris et molette) :

```bash
pnpm infra
```

C'est une petite TUI Ink (`tooling/infra`) qui enveloppe wrangler, reporte
automatiquement les `database_id` dans `wrangler.toml`, et refuse de déployer tant que
l'environnement visé n'est pas configuré. Les commandes brutes restent documentées
ci-dessous pour comprendre ce qu'elle fait.

Principe directeur : **rien ne se crée à la main dans le dashboard Cloudflare.** Les
Workers, bases D1 et namespaces Durable Object naissent de `wrangler.toml` et de la CLI,
sinon les quatre environnements divergent et l'automatisation des previews ne peut pas
recréer les ressources.

## 0. Préalables

- **Le domaine est réglé.** La zone `0kl.fr` appartient au compte et la production publie sur
  `occulis.0kl.fr` (voir architecture.md section 4). Plus rien ne dépend d'`occulis.fr`.
- **Le nom, lui, n'est pas vérifié.** Le risque de marque sur « Occulis » (proximité avec
  Oculus, design doc section 9, point ouvert 8) reste entier. Il porte sur le nom du jeu, pas
  sur le domaine, et se paierait au renommage — y compris de l'URL gravée dans les binaires.
- **Le plan Cloudflare** (point ouvert 6) : vérifier dans **Compute** si les Durable
  Objects exigent le plan Workers Paid. C'est l'hypothèse du chiffrage.

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

`pnpm infra` → « Créer une base distante » crée la base et remplit `wrangler.toml` dans
la foulée. À la main :

```bash
cd apps/server
pnpm exec wrangler d1 create occulis-staging
pnpm exec wrangler d1 create occulis-prod
```

Chaque commande affiche un `database_id`. **Les reporter dans `wrangler.toml`** à la place
des `REMPLACER_PAR_L_ID_*`, puis committer : la configuration des environnements est
versionnée, pas saisie à la main. Tant que ces valeurs ne sont pas remplacées, toutes les
commandes visant ces bases échouent.

## 4. Premier déploiement en recette

```bash
cd apps/server
pnpm exec wrangler d1 migrations apply occulis-staging --remote --env staging
pnpm exec wrangler deploy --env staging
```

`--env staging` est obligatoire sur les deux commandes : les bindings ne sont pas hérités
par les environnements nommés, donc sans lui wrangler ne voit que la configuration par
défaut et ne trouve qu'`occulis-local`.

L'ordre compte : migrations d'abord, déploiement ensuite. Un Worker déployé contre un
schéma non migré échoue à la première requête.

Pour la production, même chose avec `--env production`.

## 5. Secrets pour la CI

Dans le dashboard, **Manage account → API Tokens**, créer un token portant :

| Portée | Permission | Pourquoi |
|---|---|---|
| Compte | `Workers Scripts:Edit` | déployer le Worker |
| Compte | `D1:Edit` | appliquer les migrations |
| Compte | `Account Settings:Read` | résolution du compte |
| Zone `0kl.fr` | `Workers Routes:Edit` | rattacher `occulis.0kl.fr` au Worker |
| Zone `0kl.fr` | `Zone:Read` | lire la zone pour ce rattachement |

Les deux permissions de zone sont indispensables depuis que la production déclare un
`custom_domain` : sans elles le déploiement échoue **après** les migrations, sur une erreur
d'autorisation au moment de créer l'enregistrement DNS.

Le déposer dans les secrets du dépôt GitHub :

| Secret | Valeur |
|---|---|
| `CLOUDFLARE_API_TOKEN` | le token créé |
| `CLOUDFLARE_ACCOUNT_ID` | l'ID relevé à l'étape 1 |

Sans ces deux secrets, le job de déploiement échoue ; les vérifications, elles, tournent.

## 6. Déclencher un déploiement

Le workflow `.github/workflows/ci.yml` vérifie **toute** branche et toute pull request, mais
ne déploie que les branches listées dans `.github/deploy-environments.json` :

| Branche | Environnement |
|---|---|
| `main` | production |
| `staging` | recette |

La branche `staging` doit exister côté dépôt pour que la recette se déploie :

```bash
git checkout -b staging main && git push -u origin staging
```

## 7. Ce qui reste à écrire

- `pnpm infra` doit savoir ajouter et retirer une branche du manifeste, avec son bloc
  `[env.<nom>]` et sa base D1 (point ouvert 3).
- Le rattachement d'une URL à la recette et aux previews (`occulis-beta.0kl.fr`,
  `occulis-<branche>.0kl.fr`). La mécanique est connue — un bloc `routes` avec
  `custom_domain = true`, comme en production — il reste à le générer par environnement.
- L'authentification : `POST /api/matches` ne vérifie aujourd'hui aucune identité.
