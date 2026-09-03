# Outillage et CI/CD — `tooling/infra`, `.github`

Comment un commit devient un environnement en ligne, et comment on crée ou supprime un
environnement de branche.

## Les quatre environnements

| Environnement | Domaine | Base D1 | Déclenché par |
|---|---|---|---|
| local | `wrangler dev` | `occulis-local` (SQLite local) | manuel |
| branche | `occulis-<branche>.0kl.fr` | `occulis-<branche>` | push sur une branche **listée au manifeste** |
| recette | `occulis-staging.0kl.fr` | `occulis-staging` | push sur `staging` |
| production | `occulis.0kl.fr` | `occulis-prod` | push sur `main` |

**Une branche = un environnement complet** (client + Worker + DO + base), jamais un
preview du client seul : une branche qui touche `packages/core` change les règles et
serait sinon testée contre celles de `main`.

**Les branches hébergées sont sélectionnées explicitement**, pas déployées
automatiquement. Le mécanisme de sélection est le manifeste ci-dessous.

## `.github/deploy-environments.json` — le mécanisme de sélection

```json
{
  "main":           { "wranglerEnv": "production",     "d1Database": "occulis-prod" },
  "staging":        { "wranglerEnv": "staging",        "d1Database": "occulis-staging" },
  "feature/engine": { "wranglerEnv": "feature-engine", "d1Database": "occulis-feature-engine" }
}
```

La clé est le **nom de branche brut**, avec ses éventuels `/`, pour correspondre à
`$GITHUB_REF_NAME` tel que le workflow le lit. La valeur `wranglerEnv` est ce même nom
**normalisé** (`/` → `-`), car un nom d'environnement wrangler ne peut pas contenir de `/`.

**Une branche absente de ce fichier passe la CI sans être déployée.** C'est tout le
mécanisme : ajouter une entrée héberge la branche, la retirer cesse de l'héberger.

---

## `.github/workflows/ci.yml` — le pipeline

Déclenché sur `push` de **toute** branche et sur toute `pull_request`.

```
  checks ────────┐
  (toute branche)│
                 ├──► deploy   (seulement si le manifeste résout un environnement)
  target ────────┘
  (push seulement)
```

### `checks` — les vérifications

Node 22, pnpm, `pnpm install --frozen-lockfile`, puis dans l'ordre :
`pnpm typecheck` → `pnpm lint` → `pnpm test` → `pnpm build`.

`pnpm -r test` n'exécute que les paquets déclarant un script `test` : `packages/core`,
`apps/web` et `tooling/infra` en déclarent un. Ajouter des tests à `apps/server` suffira
donc à les voir passer ici, **sans toucher au workflow**.

### `target` — résoudre la branche

Lit le manifeste avec `jq` et expose deux sorties : `wrangler_env` et `d1_database`. Si la
branche n'y figure pas, les sorties sont vides et un `::notice::` l'annonce.

### `deploy` — le déploiement

Conditionné à `needs.target.outputs.wrangler_env != ''`. Utilise l'environnement GitHub
homonyme (`environment:`), ce qui permet d'y attacher des secrets et des règles de
protection. Trois étapes, **dans cet ordre** :

1. **Build du client** — `pnpm --filter @occulis/web build`. Le Worker sert
   `../web/dist` : le client doit exister avant le déploiement, et provenir du **même
   commit** que le serveur, sinon les deux n'ont pas le même `core`.
2. **Migrations D1** — `wrangler d1 migrations apply … --remote --env <env>`. Avant le
   déploiement : un Worker servi contre un schéma non migré échoue à la première requête.
3. **Déploiement** — `wrangler deploy --env <env>`.

Secrets attendus : `CLOUDFLARE_API_TOKEN` et `CLOUDFLARE_ACCOUNT_ID`.

### Concurrence

Les vérifications redondantes d'une pull request sont annulées ; **un déploiement en cours
ne l'est pas** — d'où `cancel-in-progress` restreint à `pull_request`.

---

## `tooling/infra` — la TUI

Lancée par `pnpm infra`. Interface Ink (React dans le terminal) qui pilote wrangler, édite
`wrangler.toml` et le manifeste, et enchaîne les commandes git.

### Modules

| Fichier | Rôle |
|---|---|
| `tooling/infra/src/cli.tsx` | Point d'entrée : montage Ink, restauration du terminal, boucle des commandes interactives |
| `tooling/infra/src/components/App.tsx` | Menu, sélection d'environnement, saisie, exécution |
| `tooling/infra/src/components/SelectList.tsx` | Liste sélectionnable (clavier et souris) |
| `tooling/infra/src/components/OutputPane.tsx` | Panneau de sortie en flux |
| `tooling/infra/src/components/useMouse.ts` | Suivi souris via séquences ANSI |
| `tooling/infra/src/components/theme.ts` | Couleurs et préfixes par niveau de log |
| `tooling/infra/src/actions.ts` | **Le catalogue des actions** |
| `tooling/infra/src/config.ts` | Chemins, noms de bases, découverte des environnements |
| `tooling/infra/src/toml.ts` | Lecture/écriture de `wrangler.toml` |
| `tooling/infra/src/deploy-manifest.ts` | Lecture/écriture du manifeste de déploiement |
| `tooling/infra/src/git.ts` | Branche courante, commit ciblé, push |
| `tooling/infra/src/wrangler.ts` | Exécution de processus et parsing de la sortie wrangler |
| `tooling/infra/src/*.test.ts` | Tests de `config.ts`, `toml.ts` et `deploy-manifest.ts` (Vitest) |

### `config.ts` — chemins et conventions

| Fonction / constante | Rôle |
|---|---|
| `ROOT`, `SERVER_DIR`, `TOML`, `DEPLOY_MANIFEST` | Chemins absolus, dérivés de `import.meta.url` |
| `PLACEHOLDER` | `"REMPLACER_PAR_L_ID"` — marque un `database_id` non renseigné |
| `dbName()` | Environnement → nom de base. Table fixe pour `local`/`staging`/`production`, sinon `occulis-<env>` |
| `isBranchEnv()` | Faux pour les trois environnements fixes, vrai pour tous les autres — donc pour tout ce qui est jetable |
| `listEnvNames()` | **Découvre** les environnements en lisant les en-têtes `[env.X]` du toml |
| `slugifyBranch()` | Nom de branche → nom d'environnement (`/` → `-`) |
| `envFlag()` | `[]` pour `local`, `["--env", env]` sinon |

`listEnvNames()` découvre dynamiquement plutôt que de maintenir une liste figée : tout
environnement de branche déjà créé apparaît sans intervention.

### `toml.ts` — édition de `wrangler.toml`

**Pas de bibliothèque TOML** : manipulation ligne à ligne, cohérente entre les quatre
fonctions.

| Fonction | Rôle |
|---|---|
| `envBlockExists()` | Le bloc `[env.X]` est-il présent |
| `appendEnvBlock()` | Ajoute un bloc complet (route, assets, DO, D1) sur le modèle exact des blocs existants |
| `removeEnvBlock()` | Retire le bloc et tous ses sous-blocs, plus les lignes vides qui le précèdent. Inverse d'`appendEnvBlock()` |
| `patchDatabaseId()` | Remplace `database_id` sous le bloc D1 de l'environnement visé |
| `configuredDatabaseId()` | Lit ce `database_id`, ou `null` |
| `blockHeader()` (privée) | `[[d1_databases]]` pour `local`, `[[env.X.d1_databases]]` sinon |

`configuredDatabaseId()` ne juge **que l'environnement visé** : un placeholder resté sur la
production ne doit pas empêcher de travailler sur la recette.

### `deploy-manifest.ts` — édition du manifeste

Contrairement au toml, c'est du JSON réel : pas de manipulation ligne à ligne.

| Fonction | Rôle |
|---|---|
| `upsertDeployEnvironment()` | Ajoute ou met à jour une entrée ; renvoie `"created"` ou `"updated"` |
| `listDeployEnvironments()` | Le manifeste sous forme de liste `{ branch, wranglerEnv, d1Database }` |
| `findDeployEnvironment()` | Résout une cible donnée **par nom de branche ou par slug wrangler** — les deux ne diffèrent que sur les branches contenant un `/` |
| `listBranchEnvNames()` | Les environnements supprimables : union du toml et du manifeste, moins les fixes |
| `removeDeployEnvironment()` | Retire l'entrée ; renvoie `false` si absente |

`listBranchEnvNames()` fait l'**union** des deux sources plutôt que de croire le seul
manifeste : un environnement à moitié défait (bloc toml sans entrée, ou l'inverse) reste
ainsi visible et réparable depuis la TUI.

### `git.ts`

| Fonction | Rôle |
|---|---|
| `currentBranch()` | Nom de branche, ou `null` si HEAD détaché |
| `pathsHaveChanges()` | `git status --porcelain` restreint à des chemins |
| `commitPaths()` | Committe **uniquement** ces chemins (pathspec), quel que soit le reste de l'index |
| `pushCurrentBranch()` | `git push`, avec `-u origin <branche>` si aucun amont |

`commitPaths()` utilise un pathspec délibérément : **l'outil ne s'approprie jamais les
autres changements du dépôt.**

### `wrangler.ts` — exécution de processus

| Fonction | Rôle |
|---|---|
| `runStreaming()` | Runner générique : streame chaque ligne, accumule stdout, peut alimenter stdin |
| `runWrangler()` | `pnpm exec wrangler …` depuis `apps/server`, en flux |
| `runWranglerInherited()` | Pour les commandes exigeant un vrai TTY (login, `dev`, `tail`) |
| `runInherited()` | Idem, commande quelconque |
| `listRemoteDatabases()` | `wrangler d1 list --json`, parsé |
| `remoteDatabaseId()` | Nom de base → identifiant distant, ou `""` |

Deux détails qui évitent des bugs pénibles : le paramètre `input` alimente stdin puis le
ferme, de quoi répondre « y » aux confirmations de wrangler sans TTY ;
`listRemoteDatabases()` repart de la **première ligne qui ouvre réellement le tableau
JSON**, wrangler préfixant sa sortie de bandeaux (proxy, mises à jour).

Les commandes « inherited » démontent Ink avant de rendre le contrôle du terminal — sans
quoi la sortie serait illisible et le terminal resterait en suivi souris.

---

## Les actions de la TUI

Catalogue dans `ACTIONS` (`tooling/infra/src/actions.ts`). Chaque `ActionDef` déclare
`needsEnv` (demande un environnement), `remoteOnly` (exclut `local`), `branchEnvsOnly`
(restreint le sélecteur aux environnements de branche), `prompt` (saisie libre) et
`interactive` (prend le contrôle du terminal).

| Action | Ce qu'elle fait |
|---|---|
| Statut | Rapport de configuration, via `checkConfig()` |
| Lister les bases D1 | `wrangler d1 list` |
| Créer une base distante | Crée la base et écrit son identifiant dans le toml |
| **Créer un environnement de branche** | Voir ci-dessous — branche courante |
| **Supprimer un environnement de branche** | Voir ci-dessous — **n'importe quelle cible, depuis n'importe quelle branche** |
| Appliquer les migrations | `wrangler d1 migrations apply` |
| Lancer le serveur en local | `wrangler dev` (interactive) |
| Déployer | `wrangler deploy --env …` |
| Exécuter une requête SQL | `wrangler d1 execute` avec saisie libre |
| Décrire une base | `wrangler d1 info` |
| Logs en direct | `wrangler tail` (interactive) |
| Historique des déploiements | `wrangler deployments list` |
| Connexion Cloudflare | `wrangler login` (interactive) |

Deux garde-fous transverses : `guardPlaceholder()` refuse d'agir tant que le
`database_id` de l'environnement visé est un placeholder ; `checkConfig()` signale les
placeholders restants et l'absence de `.wrangler/` dans `.gitignore`.

### « Créer un environnement de branche »

Sur la branche courante, dans cet ordre :

1. Refuse `main` et `staging` — ils ont un environnement fixe.
2. `appendEnvBlock()` ajoute `[env.<slug>]` au toml (route `occulis-<slug>.0kl.fr`).
3. Crée la base D1 si elle n'existe pas déjà, puis `patchDatabaseId()` inscrit son
   identifiant.
4. Applique les migrations en distant.
5. `upsertDeployEnvironment()` ajoute l'entrée au manifeste.
6. Committe **uniquement** `wrangler.toml` et le manifeste, puis pousse.

Le push déclenche la CI, qui applique les migrations puis déploie.

### « Supprimer un environnement de branche »

**La cible est explicite, jamais la branche courante** : l'action prend un environnement en
paramètre (`needsEnv` + `branchEnvsOnly`), désigné par son slug wrangler *ou* par le nom de
sa branche. Un environnement reste donc supprimable après la fusion ou l'effacement de sa
branche — sans quoi il ne resterait plus qu'à le défaire à la main dans le dashboard.

`findDeployEnvironment()` résout la cible, puis `isBranchEnv()` refuse les trois
environnements fixes : viser `main` résout `production` et se fait rejeter. La confirmation
accepte indifféremment le slug ou le nom de branche.

**L'ordre est important** : le Worker se supprime via `--env`, qui lit encore son bloc dans
`wrangler.toml` — donc **avant** de retirer ce bloc. Ensuite seulement viennent la
suppression de la base, `removeEnvBlock()`, `removeDeployEnvironment()`, puis commit et
push.

Une fois les ressources Cloudflare détruites, **plus rien n'interrompt le compte rendu** :
un HEAD détaché ou un push en échec est signalé, pas levé — l'utilisateur doit savoir ce
qu'il reste à committer à la main.

Le commit part sur la **branche courante**, qui n'est pas forcément celle de
l'environnement supprimé. Le manifeste étant versionné, chaque branche porte sa propre
copie et c'est celle de la branche poussée que la CI lit : quand les deux diffèrent,
l'action prévient que la branche cible garde son entrée et redéploierait contre une base
désormais absente.

L'environnement GitHub Actions homonyme, s'il existe, survit et reste inoffensif ; son
retrait se fait depuis Settings → Environments.

---

## Les tests

`tooling/infra/src/*.test.ts`, exécutés par `pnpm test` à la racine — donc par la CI, qui
n'a rien eu à déclarer pour cela.

| Fichier | Ce qu'il verrouille |
|---|---|
| `config.test.ts` | `dbName()`, `slugifyBranch()`, `envFlag()` et surtout **`isBranchEnv()`**, le prédicat qui empêche la suppression d'atteindre la production ou la recette |
| `toml.test.ts` | Le bloc généré est complet (route, assets, DO, D1) ; `appendEnvBlock()` est idempotent ; **`removeEnvBlock()` annule exactement `appendEnvBlock()`** et ne mange pas le bloc suivant ; `patchDatabaseId()` n'écrit que sous le bloc visé |
| `deploy-manifest.test.ts` | La résolution d'une cible par nom de branche **ou** par slug ; viser `main` renvoie l'entrée `production` ; `listBranchEnvNames()` fait bien l'union toml ∪ manifeste |

Ces trois modules écrivent dans des fichiers dont le chemin vient de `config.ts` : les tests
détournent `TOML` et `DEPLOY_MANIFEST` vers des fichiers temporaires (`vi.mock` sur
`./config.js`) plutôt que de découper le code en couche pure et couche IO. Ils exercent
ainsi le vrai code d'écriture, sans que le dépôt ne serve de bac à sable.

Un détail qui coûte cher à retrouver : `vi.hoisted` remonte **au-dessus des imports
statiques**, donc le chemin temporaire doit être calculé avec des imports dynamiques —
sinon il référence des liaisons pas encore initialisées.

---

## Points d'attention

- **Node 22 est requis par wrangler**, malgré son message d'erreur qui annonce v20. La CI
  l'utilise, `.nvmrc` épingle Node 24 en local et `package.json` déclare
  `engines.node: ">=22"` — les trois sont cohérents, mais **CI et poste de travail ne
  tournent pas sur la même version majeure**. Sur une machine en Node 20,
  les commandes wrangler (donc une grande partie de la TUI) échouent — la TUI elle-même,
  Ink et tsx, tourne pourtant sans problème, ce qui rend le diagnostic trompeur.
- **`.wrangler/` doit rester dans `.gitignore`** : c'est de l'état local. `checkConfig()`
  le vérifie.
- **Les placeholders `REMPLACER_PAR_L_ID`** dans `wrangler.toml` signalent un
  environnement déclaré mais sans base rattachée. `guardPlaceholder()` bloque les actions
  qui en dépendent.
- **`delete-branch-env` prend sa cible dans l'entrée `env` du workflow manuel**, pas dans
  `branch` : `branch` n'y désigne plus que la branche sur laquelle committer le retrait.
- **Le manifeste et le toml doivent rester cohérents.** Les deux actions d'environnement de
  branche les modifient ensemble et les committent ensemble ; les éditer à la main
  séparément est le moyen le plus simple de casser un déploiement.
- **Les runners wrangler et les actions ne sont pas testés** : les tests couvrent la
  manipulation de fichiers (`toml.ts`, `deploy-manifest.ts`) et les conventions
  (`config.ts`), pas l'enchaînement d'une action, qui appellerait le vrai wrangler.

## Voir aussi

Les décisions et leur justification sont dans `docs/architecture.md` ; la procédure
d'installation pas à pas dans `docs/setup.md` ; le chiffrage dans `docs/costs.md`.
