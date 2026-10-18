# graphify

graphify construit une **carte des relations du dépôt** : fichiers, fonctions, classes et
sections de documentation, reliés par leurs imports, appels et renvois. Il sert surtout à
l'assistant de code (Claude Code) : au lieu d'ouvrir vingt fichiers pour savoir qui appelle
quoi, il interroge la carte et n'en reçoit que l'extrait utile. Pour un humain, son seul
produit directement utile est `graphify-out/graph.html`, la carte à explorer dans un
navigateur.

La carte est **locale à chaque machine** : `graphify-out/` n'est pas versionné. Chacun la
construit chez soi, et rien de ce qu'elle contient ne se commite.

## Ce qui est versionné, et pourquoi

| Fichier                           | Rôle                                                                                                                                                                                                                      |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CLAUDE.md`, section « graphify » | Demande à l'assistant d'interroger la carte avant de parcourir le code, et de la mettre à jour après une modification                                                                                                     |
| `.claude/CLAUDE.md`               | Déclare la commande `/graphify` à Claude Code                                                                                                                                                                             |
| `.claude/skills/graphify/`        | Le manuel de la commande `/graphify`, recopié depuis le paquet (version dans `.graphify_version`)                                                                                                                         |
| `.claude/settings.json`           | Deux rappels (_hooks_) : avant une recherche ou une lecture de fichier, ils signalent à l'assistant que la carte existe. Ils restent muets tant que `graphify-out/graph.json` n'existe pas, et ne demandent que `python3` |
| `.graphifyignore`                 | Ce que graphify ne lit pas. Il **remplace** `.gitignore` au lieu de s'y ajouter, d'où la reprise de ses lignes                                                                                                            |

`graphify-out/` est ignoré par git, comme ses sauvegardes datées. Il n'était pas raisonnable
de le versionner : plusieurs mégaoctets réécrits à chaque mise à jour, des conflits entre
branches sur `graph.json`, et des chemins propres à une machine (`.graphify_python`,
`.graphify_root`).

## Sur une nouvelle machine

Depuis la racine du dépôt, après l'installation du projet ([setup.md](setup.md), section 1).

**1. Installer l'outil.** Le paquet Python s'appelle `graphifyy`, avec deux _y_. Il installe
la commande `graphify`. Le plus simple est pipx (`brew install pipx` sur macOS) :

```bash
pipx install graphifyy
graphify --version     # 0.9.77 au moment où ces lignes sont écrites
```

**2. Construire la carte du code.** Cette étape lit le code sans aucun appel à une IA : elle
est gratuite et prend quelques instants.

```bash
graphify update .
```

Elle crée `graphify-out/` (`graph.json`, `graph.html`, `GRAPH_REPORT.md` et un cache). Dès
que `graph.json` existe, les rappels de `.claude/settings.json` s'activent.

**3. Facultatif : la carte complète.** L'étape 2 ne couvre que le code. Pour y ajouter la
documentation (`docs/`, les README) et les liens que seule une lecture du sens permet de
déduire, lancer dans Claude Code :

```
/graphify .
```

Cette étape-là **consomme des tokens** de la session : la première construction du projet,
le 2026-08-29, en a lu environ 570 000. Elle n'a d'intérêt que si l'on veut interroger la
documentation à travers la carte.

**4. Vérifier.**

```bash
graphify query "viewFor"       # doit rendre un extrait de carte, pas une erreur
open graphify-out/graph.html   # macOS ; xdg-open sous Linux
```

## Au quotidien

- **Après une modification de code** : `graphify update .`. La section « graphify » de
  `CLAUDE.md` demande à l'assistant de le faire lui-même. Ne relit que les fichiers changés.
- **Après une modification de documentation** : `/graphify --update` dans Claude Code, si
  l'étape 3 a été faite. Payant, comme elle.
- **Après une suppression importante de code**, `update` refuse d'écraser une carte qui
  aurait moins de nœuds que la précédente : relancer avec `--force`.
- **Savoir si la carte est périmée** : `GRAPH_REPORT.md` indique le commit dont elle est
  issue (« Built from commit ») ; le comparer à `git rev-parse HEAD`.
- Rien à commiter : `git status` ne doit jamais montrer `graphify-out/`.

Commandes d'interrogation, utiles aussi à la main :

| Commande                      | Rend                                                                       |
| ----------------------------- | -------------------------------------------------------------------------- |
| `graphify query "<question>"` | L'extrait de carte autour de la question                                   |
| `graphify path "<A>" "<B>"`   | Le plus court chemin entre deux éléments                                   |
| `graphify explain "<X>"`      | Un élément et ses voisins, en clair                                        |
| `graphify god-nodes`          | Les éléments les plus connectés, c'est-à-dire les pivots de l'architecture |
| `graphify affected "<X>"`     | Ce qui dépend de X, en remontant les liens                                 |

## Ce qu'il ne faut pas faire

- **Ne pas lancer `graphify claude install` (ni `graphify install`) dans le dépôt.** Ces
  commandes réécrivent `.claude/settings.json` et la section de `CLAUDE.md`, en y inscrivant
  le chemin absolu de l'exécutable de la machine. C'est ainsi qu'un chemin
  `/home/cactus/dev/Occulis/.venv/bin/graphify`, qui n'existe que sur une machine Linux,
  s'était retrouvé versionné. Si une mise à jour du manuel `.claude/skills/graphify/` est
  voulue (il est en 0.8.35, la commande en 0.9.77), la faire dans un commit à part et relire
  `git diff .claude/ CLAUDE.md` avant de commiter.
- **Ne pas forcer l'ajout de `graphify-out/`** (`git add -f`).
- Les crochets git de graphify (`graphify hook install`, qui met la carte à jour après chaque
  commit) sont une commodité personnelle : ils vivent dans `.git/hooks`, ne sont pas
  versionnés, et chacun est libre de les poser ou non. Le _merge driver_ de graphify est
  inutile ici, puisque `graph.json` n'est plus versionné.

## Mettre l'outil à jour

```bash
pipx upgrade graphifyy
graphify update .
```
