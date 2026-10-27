# Outillage et CI/CD — `tooling/infra`, `.github`

Comment un commit devient un environnement en ligne, et comment on crée ou supprime un
environnement de branche.

## Les quatre environnements

| Environnement | Domaine                    | Base D1                        | Déclenché par                                |
| ------------- | -------------------------- | ------------------------------ | -------------------------------------------- |
| local         | `wrangler dev`             | `occulis-local` (SQLite local) | manuel                                       |
| branche       | `occulis-<branche>.0kl.fr` | `occulis-<branche>`            | push sur une branche **listée au manifeste** |
| recette       | `occulis-staging.0kl.fr`   | `occulis-staging`              | push sur `staging`                           |
| production    | `occulis.0kl.fr`           | `occulis-prod`                 | push sur `main`                              |

**Une branche = un environnement complet** (client + Worker + DO + base), jamais un
preview du client seul : une branche qui touche `packages/core` change les règles et
serait sinon testée contre celles de `main`.

**Les branches hébergées sont sélectionnées explicitement**, pas déployées
automatiquement. Le mécanisme de sélection est le manifeste ci-dessous.

## `.github/deploy-environments.json` — le mécanisme de sélection

```json
{
  "main": { "wranglerEnv": "production", "d1Database": "occulis-prod" },
  "staging": { "wranglerEnv": "staging", "d1Database": "occulis-staging" },
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

Node (version lue dans `.nvmrc`), pnpm, `pnpm install --frozen-lockfile`, puis dans l'ordre :
`pnpm typecheck` → `pnpm lint` → `pnpm format:check` → `pnpm test` → `pnpm build`.

**Le format** est celui de Prettier (`.prettierrc.json`, largeur 100) : `pnpm format` réécrit,
`pnpm format:check` vérifie. `.prettierignore` exclut ce que git suit sans qu'on le formate
(fichiers générés, lockfile, manifeste réécrit par `pnpm infra`, `.design-sync/`, le voile
verrouillé). Le commit du reformatage initial est listé dans `.git-blame-ignore-revs`.

`pnpm -r test` n'exécute que les paquets déclarant un script `test` — aujourd'hui tous.
Ajouter des tests à un paquet suffit donc à les voir passer ici, **sans toucher au workflow**.

**Ce que `pnpm lint` exige** (`eslint.config.js`, **zéro avertissement** : `--max-warnings 0`) :
les règles recommandées de typescript-eslint ; sur les sources, trois règles qui lisent les
types — promesse ni attendue ni marquée `void`, promesse passée là où une fonction synchrone
est attendue, `switch` non exhaustif sur une union ; les règles des hooks React
(`rules-of-hooks`, `exhaustive-deps`, chaque exception justifiée en commentaire) ; les
frontières des CLAUDE.md de paquet (`core` n'importe rien, le protocole que `core`, les modules purs du
client ni Pixi ni React) ; et aucune couleur en dur hors de `tokens.ts`.

**La couverture** se mesure dans `pnpm test` même (`vitest run --coverage`) pour
`packages/core`, `packages/protocol` et les modules purs d'`apps/web` (liste dans son
`vitest.config.ts`) : sous le seuil, le test échoue. Les seuils sont ceux mesurés à leur
introduction, recalés le 2026-10-21 sur la mesure de vitest 4 (qui compte autrement, par
l'arbre syntaxique) : un plancher qui ne fait que monter. Les doublons iCloud `* 2.*` en
sont exclus, sans quoi ils compteraient à 0 %. Le serveur n'en a pas : ses suites
tournent dans workerd, où la couverture v8 ne s'applique pas, et ses Durable Objects sont
éprouvés par les tests d'intégration.

**Ce que `pnpm typecheck` lit.** Chaque paquet étend `tsconfig.base.json` (strict, et qui
exclut les doublons iCloud `* 2.*`). Les fichiers lancés par Node — configurations de Vite,
Vitest et tsup, scripts comme `apps/server/scripts/generate-schema.mts` — sont vérifiés par un
second projet, `tsconfig.node.json` à la racine (types de Node), étendu par
`apps/web`, `apps/server` et `packages/ui` : leur script `typecheck` enchaîne les deux.

### `target` — résoudre la branche

Lit le manifeste avec `jq` et expose deux sorties : `wrangler_env` et `d1_database`. Si la
branche n'y figure pas, les sorties sont vides et un `::notice::` l'annonce.

### `deploy` — le déploiement

Conditionné à `needs.target.outputs.wrangler_env != ''`. Utilise l'environnement GitHub
homonyme (`environment:`), ce qui permet d'y attacher des secrets et des règles de
protection. Son groupe de concurrence, `deploy-<env>`, est aussi celui des actions `deploy`
et `migrate` d'`infra.yml` : un push et un déploiement manuel ne migrent ni ne déploient
jamais le même environnement en même temps. Le `GITHUB_TOKEN` de ce workflow est en lecture
seule (`permissions: contents: read`). Trois étapes, **dans cet ordre** :

1. **Build du client** — `pnpm --filter @occulis/web build` en production,
   `build:local` (`--mode mockups`) partout ailleurs (recette, branches) : le bundle du jeu
   est identique, s'y ajoutent le labo de la refonte sous `/lab/` et les maquettes sous
   `/mockups/`, qui n'atteignent donc jamais la production. Le Worker sert
   `../web/dist` : le client doit exister avant le déploiement, et provenir du **même
   commit** que le serveur, sinon les deux n'ont pas le même `core`.
2. **Migrations D1** — `wrangler d1 migrations apply … --remote --env <env>`. Avant le
   déploiement : un Worker servi contre un schéma non migré échoue à la première requête.
3. **Déploiement** — `wrangler deploy --env <env>`. Le Worker part **minifié**, avec ses
   source maps (`minify`, `upload_source_maps` dans `wrangler.toml`, hérités par chaque
   environnement), et **Workers Logs** est actif (`[observability]`) : les journaux d'échec
   des Durable Objects et du ménage nocturne restent consultables après coup.

Secrets attendus : `CLOUDFLARE_API_TOKEN` et `CLOUDFLARE_ACCOUNT_ID`.

### Concurrence

Les vérifications redondantes d'une pull request sont annulées ; **un déploiement en cours
ne l'est pas** — d'où `cancel-in-progress` restreint à `pull_request`. Le job `deploy` porte
en plus le groupe `deploy-<env>`, partagé avec `deploy` et `migrate` d'`infra.yml`.

---

## `tooling/infra` — la TUI

Lancée par `pnpm infra`. Interface Ink (React dans le terminal) qui pilote wrangler, édite
`wrangler.toml` et le manifeste, et enchaîne les commandes git.

**Sans le menu** : `pnpm infra <id>` lance directement l'action d'identifiant `<id>`
(`runDirect()` dans `cli.tsx`), pourvu qu'elle soit marquée `direct` (`ActionDef.direct`) :
aujourd'hui `status`, `list`, `dev` et `login` — aucune qui crée, déploie ou pousse. Sinon la
commande refuse, liste les actions directes et sort en code 2 ; une action qui a journalisé
un échec sort en code 1. `pnpm local` est le raccourci de `pnpm infra dev`, « Lancer le
serveur en local ». Une action directe se termine d'elle-même au lieu de `process.exit` :
sortie en tube, un `exit` immédiat tronquerait ses derniers messages.

« Lancer le serveur en local » s'arrête à la première étape en échec ou interrompue (un
Ctrl+C pendant le build ne lance ni les migrations ni wrangler sur un dist partiel).
`runInherited()` et `runWranglerInherited()` rendent 130 pour un enfant tué par un signal,
qui n'a pas de code de sortie.

### Modules

| Fichier                                       | Rôle                                                                                                                          |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `tooling/infra/src/cli.tsx`                   | Point d'entrée : montage Ink, restauration du terminal, boucle des commandes interactives, action directe (`pnpm infra <id>`) |
| `tooling/infra/src/components/App.tsx`        | Menu, sélection d'environnement, saisie, exécution                                                                            |
| `tooling/infra/src/components/SelectList.tsx` | Liste sélectionnable (clavier et souris)                                                                                      |
| `tooling/infra/src/components/OutputPane.tsx` | Panneau de sortie en flux                                                                                                     |
| `tooling/infra/src/components/useMouse.ts`    | Suivi souris via séquences ANSI                                                                                               |
| `tooling/infra/src/components/theme.ts`       | Couleurs et préfixes par niveau de log                                                                                        |
| `tooling/infra/src/actions.ts`                | **Le catalogue des actions**                                                                                                  |
| `tooling/infra/src/config.ts`                 | Chemins, noms de bases, découverte des environnements                                                                         |
| `tooling/infra/src/toml.ts`                   | Lecture/écriture de `wrangler.toml`                                                                                           |
| `tooling/infra/src/deploy-manifest.ts`        | Lecture/écriture du manifeste de déploiement                                                                                  |
| `tooling/infra/src/git.ts`                    | Branche courante, commit ciblé, push                                                                                          |
| `tooling/infra/src/wrangler.ts`               | Exécution de processus et parsing de la sortie wrangler                                                                       |
| `tooling/infra/src/*.test.ts`                 | Tests de `config.ts`, `toml.ts` et `deploy-manifest.ts` (Vitest)                                                              |

### `config.ts` — chemins et conventions

| Fonction / constante                            | Rôle                                                                                                    |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `ROOT`, `SERVER_DIR`, `TOML`, `DEPLOY_MANIFEST` | Chemins absolus, dérivés de `import.meta.url`                                                           |
| `PLACEHOLDER`                                   | `"REMPLACER_PAR_L_ID"` — marque un `database_id` non renseigné                                          |
| `dbName()`                                      | Environnement → nom de base. Table fixe pour `local`/`staging`/`production`, sinon `occulis-<env>`      |
| `isBranchEnv()`                                 | Faux pour les trois environnements fixes, vrai pour tous les autres — donc pour tout ce qui est jetable |
| `listEnvNames()`                                | **Découvre** les environnements en lisant les en-têtes `[env.X]` du toml                                |
| `slugifyBranch()`                               | Nom de branche → nom d'environnement : minuscules, hors `[a-z0-9-]` → `-`, 55 caractères au plus        |
| `envFlag()`                                     | `[]` pour `local`, `["--env", env]` sinon                                                               |

`listEnvNames()` découvre dynamiquement plutôt que de maintenir une liste figée : tout
environnement de branche déjà créé apparaît sans intervention.

### `toml.ts` — édition de `wrangler.toml`

**Pas de bibliothèque TOML** : manipulation ligne à ligne, cohérente entre les quatre
fonctions.

| Fonction                 | Rôle                                                                                                                                |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| `envBlockExists()`       | Le bloc `[env.X]` est-il présent                                                                                                    |
| `appendEnvBlock()`       | Ajoute un bloc complet (route, assets, les trois DO `MATCH` / `QUEUE` / `SOCIAL`, D1, cron) sur le modèle exact des blocs existants |
| `removeEnvBlock()`       | Retire le bloc et tous ses sous-blocs, plus les lignes vides qui le précèdent. Inverse d'`appendEnvBlock()`                         |
| `patchDatabaseId()`      | Remplace `database_id` sous le bloc D1 de l'environnement visé                                                                      |
| `configuredDatabaseId()` | Lit ce `database_id`, ou `null`                                                                                                     |
| `blockHeader()` (privée) | `[[d1_databases]]` pour `local`, `[[env.X.d1_databases]]` sinon                                                                     |

`configuredDatabaseId()` ne juge **que l'environnement visé** : un placeholder resté sur la
production ne doit pas empêcher de travailler sur la recette.

### `deploy-manifest.ts` — édition du manifeste

Contrairement au toml, c'est du JSON réel : pas de manipulation ligne à ligne.

| Fonction                    | Rôle                                                                                                                                                          |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `upsertDeployEnvironment()` | Ajoute ou met à jour une entrée ; renvoie `"created"` ou `"updated"`                                                                                          |
| `listDeployEnvironments()`  | Le manifeste sous forme de liste `{ branch, wranglerEnv, d1Database }`                                                                                        |
| `findDeployEnvironment()`   | Résout une cible donnée **par nom de branche ou par slug wrangler** — les deux diffèrent dès que la branche contient un caractère normalisé (`/`, majuscule…) |
| `listBranchEnvNames()`      | Les environnements supprimables : union du toml et du manifeste, moins les fixes                                                                              |
| `removeDeployEnvironment()` | Retire l'entrée ; renvoie `false` si absente                                                                                                                  |

`listBranchEnvNames()` fait l'**union** des deux sources plutôt que de croire le seul
manifeste : un environnement à moitié défait (bloc toml sans entrée, ou l'inverse) reste
ainsi visible et réparable depuis la TUI.

### `git.ts`

| Fonction              | Rôle                                                                              |
| --------------------- | --------------------------------------------------------------------------------- |
| `currentBranch()`     | Nom de branche, ou `null` si HEAD détaché                                         |
| `pathsHaveChanges()`  | `git status --porcelain` restreint à des chemins                                  |
| `commitPaths()`       | Committe **uniquement** ces chemins (pathspec), quel que soit le reste de l'index |
| `pushCurrentBranch()` | `git push`, avec `-u origin <branche>` si aucun amont                             |

`commitPaths()` utilise un pathspec délibérément : **l'outil ne s'approprie jamais les
autres changements du dépôt.**

### `wrangler.ts` — exécution de processus

| Fonction                 | Rôle                                                                           |
| ------------------------ | ------------------------------------------------------------------------------ |
| `runStreaming()`         | Runner générique : streame chaque ligne, accumule stdout, peut alimenter stdin |
| `runWrangler()`          | `pnpm exec wrangler …` depuis `apps/server`, en flux                           |
| `runWranglerInherited()` | Pour les commandes exigeant un vrai TTY (login, `dev`, `tail`)                 |
| `runInherited()`         | Idem, commande quelconque                                                      |
| `listRemoteDatabases()`  | `wrangler d1 list --json`, parsé                                               |
| `remoteDatabaseId()`     | Nom de base → identifiant distant, ou `""`                                     |

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

| Action                                    | Ce qu'elle fait                                                                                                                                                                                              |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Statut                                    | Rapport de configuration, via `checkConfig()`                                                                                                                                                                |
| Lister les bases D1                       | `wrangler d1 list`                                                                                                                                                                                           |
| Créer une base distante                   | Crée la base et écrit son identifiant dans le toml                                                                                                                                                           |
| **Créer un environnement de branche**     | Voir ci-dessous — branche courante                                                                                                                                                                           |
| **Supprimer un environnement de branche** | Voir ci-dessous — **n'importe quelle cible, depuis n'importe quelle branche**                                                                                                                                |
| Appliquer les migrations                  | `wrangler d1 migrations apply`                                                                                                                                                                               |
| Lancer le serveur en local                | `build:local` du client, migrations locales, puis `wrangler dev` (interactive)                                                                                                                               |
| Déployer                                  | Typecheck, lint, format et tests (comme la CI), build du client (`build` en production, `build:local` ailleurs), migrations, puis `wrangler deploy --env …` — **la première étape en échec annule la suite** |
| Exécuter une requête SQL                  | `wrangler d1 execute` avec saisie libre                                                                                                                                                                      |
| Décrire une base                          | `wrangler d1 info`                                                                                                                                                                                           |
| Logs en direct                            | `wrangler tail` (interactive)                                                                                                                                                                                |
| Historique des déploiements               | `wrangler deployments list`                                                                                                                                                                                  |
| Connexion Cloudflare                      | `wrangler login` (interactive)                                                                                                                                                                               |

« Lancer le serveur en local » construit le client avec **`build:local` et non `build`** : le
Worker ne sert que `../web/dist`, et seul le build local y dépose les maquettes de
`docs/mockups/`, accessibles sous `/mockups`, et le labo de la refonte sous `/lab/` (voir
l'invariant 16 de [engine.md](engine.md)) — le serveur local sert donc les mêmes pages que
`pnpm dev`. « Déployer » choisit comme la CI : `build` en production — les maquettes n'y
partent jamais —, `build:local` sur la recette et les branches.

**Un échec de wrangler est toujours signalé** : `stream()` journalise en `fail` toute
commande qui sort avec un code non nul, et c'est un `fail` qui fait sortir `ci.ts` en
erreur, donc virer au rouge `infra.yml`. Un enfant tué par un signal (Ctrl+C, manque de
mémoire) n'a pas de code de sortie : `runStreaming()` le compte comme un échec (130).

Deux garde-fous transverses : `guardPlaceholder()` refuse d'agir tant que le
`database_id` de l'environnement visé est un placeholder ; `checkConfig()` signale les
placeholders restants et l'absence de `.wrangler/` dans `.gitignore`.

### « Créer un environnement de branche »

Sur la branche courante, dans cet ordre :

1. Refuse `main` et `staging` — ils ont un environnement fixe —, ainsi qu'une branche dont le
   slug désigne un environnement fixe (`production`, `local`) : `isBranchEnv()` ; et un slug
   déjà attribué à une autre branche, le slug n'étant pas bijectif.
2. `appendEnvBlock()` ajoute `[env.<slug>]` au toml (route `occulis-<slug>.0kl.fr`, le cron
   du ménage nocturne, `triggers` n'étant pas hérité, et `MAIL_TO_CONSOLE = "off"`).
3. Crée la base D1 si elle n'existe pas déjà, puis `patchDatabaseId()` inscrit son
   identifiant.
4. Applique les migrations en distant.
5. `upsertDeployEnvironment()` ajoute l'entrée au manifeste.
6. Committe **uniquement** `wrangler.toml` et le manifeste, puis pousse.

Le push déclenche la CI, qui applique les migrations puis déploie.

### « Supprimer un environnement de branche »

**La cible est explicite, jamais la branche courante** : l'action prend un environnement en
paramètre (`needsEnv` + `branchEnvsOnly`), désigné par son slug wrangler _ou_ par le nom de
sa branche. Un environnement reste donc supprimable après la fusion ou l'effacement de sa
branche — sans quoi il ne resterait plus qu'à le défaire à la main dans le dashboard.

`findDeployEnvironment()` résout la cible, puis `isBranchEnv()` refuse les trois
environnements fixes : viser `main` résout `production` et se fait rejeter. La confirmation
accepte indifféremment le slug ou le nom de branche.

**L'ordre est important** : le Worker se supprime via `--env`, qui lit encore son bloc dans
`wrangler.toml` — donc **avant** de retirer ce bloc. Ensuite seulement viennent la
suppression de la base, `removeEnvBlock()`, `removeDeployEnvironment()`, puis commit et
push. **Si Cloudflare refuse l'une des deux suppressions, l'action s'arrête avant de toucher
aux fichiers** — sauf quand wrangler répond que la ressource n'existe pas (`saysMissing()`) :
un environnement retiré du toml et du manifeste n'est plus listé nulle part, et ses
ressources resteraient orphelines.

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

| Fichier                   | Ce qu'il verrouille                                                                                                                                                                                                                                                 |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `config.test.ts`          | `dbName()`, `slugifyBranch()`, `envFlag()` et surtout **`isBranchEnv()`**, le prédicat qui empêche la suppression d'atteindre la production ou la recette                                                                                                           |
| `toml.test.ts`            | Le bloc généré est complet (route, assets, **chacun des trois DO**, D1, cron) ; `appendEnvBlock()` est idempotent ; **`removeEnvBlock()` annule exactement `appendEnvBlock()`** et ne mange pas le bloc suivant ; `patchDatabaseId()` n'écrit que sous le bloc visé |
| `deploy-manifest.test.ts` | La résolution d'une cible par nom de branche **ou** par slug ; viser `main` renvoie l'entrée `production` ; `listBranchEnvNames()` fait bien l'union toml ∪ manifeste                                                                                               |

Ces trois modules écrivent dans des fichiers dont le chemin vient de `config.ts` : les tests
détournent `TOML` et `DEPLOY_MANIFEST` vers des fichiers temporaires (`vi.mock` sur
`./config.js`) plutôt que de découper le code en couche pure et couche IO. Ils exercent
ainsi le vrai code d'écriture, sans que le dépôt ne serve de bac à sable.

Un détail qui coûte cher à retrouver : `vi.hoisted` remonte **au-dessus des imports
statiques**, donc le chemin temporaire doit être calculé avec des imports dynamiques —
sinon il référence des liaisons pas encore initialisées.

---

## Points d'attention

- **Une seule version de Node, celle de `.nvmrc` (24)** : la CI la lit (`node-version-file`)
  et `package.json` déclare `engines.node: ">=24"`, donc CI et poste de travail tournent sur
  la même version majeure. wrangler exige un Node récent, malgré un message d'erreur qui
  annonce v20. Sur une machine en Node 20,
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
