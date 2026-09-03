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

| Portée        | Permission              | Pourquoi                                               |
| ------------- | ----------------------- | ------------------------------------------------------ |
| Compte        | `Workers Scripts:Edit`  | déployer le Worker                                     |
| Compte        | `D1:Edit`               | appliquer les migrations                               |
| Compte        | `Account Settings:Read` | résolution du compte                                   |
| Zone `0kl.fr` | `Workers Routes:Edit`   | rattacher `occulis.0kl.fr` et `occulis-staging.0kl.fr` |
| Zone `0kl.fr` | `Zone:Read`             | lire la zone pour ce rattachement                      |

Les deux permissions de zone sont indispensables depuis que la production déclare un
`custom_domain` : sans elles le déploiement échoue **après** les migrations, sur une erreur
d'autorisation au moment de créer l'enregistrement DNS.

Le déposer dans les secrets **du dépôt** GitHub (_Settings → Secrets and variables → Actions_),
pas dans ceux d'un environnement :

| Secret                  | Valeur                  |
| ----------------------- | ----------------------- |
| `CLOUDFLARE_API_TOKEN`  | le token créé           |
| `CLOUDFLARE_ACCOUNT_ID` | l'ID relevé à l'étape 1 |

Le token est à portée compte : le même sert la production, la recette et **chaque
environnement de branche** — `--env` ne choisit que les routes et la base. Posés une fois au
niveau dépôt, tous les environnements présents et futurs en héritent ; un job qui cible un
`environment:` GitHub voit toujours les secrets du dépôt. Les poser sur les environnements
`production`/`staging` seulement casserait le déploiement des branches.

Sans ces deux secrets, le job de déploiement échoue ; les vérifications, elles, tournent.

```bash
gh secret set CLOUDFLARE_API_TOKEN --repo <owner>/Occulis
gh secret set CLOUDFLARE_ACCOUNT_ID --repo <owner>/Occulis
```

## 6. Déclencher un déploiement

Le workflow `.github/workflows/ci.yml` vérifie **toute** branche et toute pull request, mais
ne déploie que les branches listées dans `.github/deploy-environments.json` :

| Branche   | Environnement | URL                      |
| --------- | ------------- | ------------------------ |
| `main`    | production    | `occulis.0kl.fr`         |
| `staging` | recette       | `occulis-staging.0kl.fr` |

Les routes créées à la main dans le dashboard sont à supprimer : `wrangler.toml` est la
source de vérité et une route orpheline sur un nom à deux niveaux (`staging.occulis.0kl.fr`)
reste sans certificat valide.

La branche `staging` doit exister côté dépôt pour que la recette se déploie :

```bash
git checkout -b staging main && git push -u origin staging
```

Pour une branche de travail, `pnpm infra` → **Créer un environnement de branche** fait tout
d'un geste depuis la branche courante : bloc `[env.<slug>]` dans `wrangler.toml`, base D1
distante et son `database_id`, migrations, entrée dans `.github/deploy-environments.json`,
puis commit et push de ces deux seuls fichiers — la CI enchaîne migrations et déploiement.
**Supprimer un environnement de branche** fait l'inverse — suppression du Worker et de la
base distante, retrait du bloc et de l'entrée, commit et push — mais sur une **cible
choisie** : n'importe quel environnement, depuis n'importe quelle branche, y compris après
la fusion ou l'effacement de la branche concernée.

## 7. Ce qui reste à écrire

- Le rattachement d'une URL aux previews de branche (`occulis-<branche>.0kl.fr`) : le bloc
  `routes` avec `custom_domain = true` est désormais généré par branche, mais l'attache
  n'a pas encore été vérifiée bout en bout sur un vrai preview (point ouvert 2).
- L'authentification : `POST /api/matches` ne vérifie aujourd'hui aucune identité. La table
  `users` existe (migration `0002_users.sql`) mais rien ne l'alimente ni ne la lit encore.
