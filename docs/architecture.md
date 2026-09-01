# Occulis — Architecture technique

`docs/design.md` reste la référence de **game design**. Ce document couvre l'infrastructure :
hébergement, base de données, environnements, distribution. Il consigne les décisions
prises et, comme le design doc, les points encore ouverts.

Rien de ce qui suit n'est implémenté à ce jour : il n'existe ni serveur, ni base, ni CI.

## 1. Cible de distribution

L'objectif final est une **application téléchargeable** (Steam, desktop). C'était déjà la
justification du choix web en section 8 du design doc.

- **Electron plutôt que Tauri.** Tauri produit des binaires ~20x plus petits mais s'appuie
  sur la webview de l'OS — trois moteurs de rendu différents pour du WebGL. Electron embarque
  Chromium : ce qui est testé en dev est ce qui tourne chez le joueur. Sur un jeu distribué,
  la taille du binaire ne pèse rien face à la consistance de rendu.
- La DA (dessin procédural en traits, aucun sprite bitmap) rend le portage inhabituellement
  simple : pas de pipeline d'assets, pas de variantes de résolution.

### Conséquence : versionner les règles par partie

Une app téléchargeable est un client dont on ne contrôle plus la version. Or `packages/core`
est partagé entre client et serveur : un vieux client embarque un vieux `core` et affichera
comme légaux des coups que le serveur refuse.

Forcer la mise à jour règle le cas général (Steam le fait nativement, un compte le permet
ailleurs). Le résidu vient du pilier « temps de réflexion illimité » (design doc section 2) :
une partie peut durer des jours et traverser un déploiement.

**Décision : on versionne la partie, pas la connexion.** Une partie démarrée sous le ruleset
v3 se termine en v3. Le serveur garde plusieurs versions de règles chargeables — peu coûteux
puisque `core` est pur et sans dépendance.

## 2. Hébergement : Cloudflare Worker + Durable Objects

Un **Worker** est une fonction sans état exécutée à la requête. Un **Durable Object** est une
instance de classe que Cloudflare garde vivante, adressable par un nom unique, existant en un
seul exemplaire au monde, mono-threadée, avec un stockage attaché.

- **1 Durable Object = 1 partie.** Il détient le `GameState` et les deux `PlayerKnowledge`,
  et pousse à chaque socket son propre `viewFor()` — jamais l'état complet. Le fog n'est pas
  « appliqué » : il est structurel, un client ne peut pas recevoir ce que le DO ne lui envoie pas.
- **La sérialisation des tours est gratuite.** Un DO traite une requête à la fois : deux joueurs
  simultanés ne peuvent pas s'entrelacer. Aucun verrou à écrire.
- **L'hibernation** évacue le DO de la mémoire tout en gardant les WebSockets ouverts. Une partie
  peut dormir des jours sans consommer de processus, ce qui correspond exactement au pilier
  « temps de réflexion illimité ».
- **1 Durable Object global = la file de matchmaking.** Étant mono-threadé, il élimine par
  construction la course où deux joueurs sont appariés deux fois.

Alternative écartée : Node + Postgres sur Fly.io. Outillage plus standard et zéro lock-in, mais
des parties qui dorment longtemps et doivent survivre aux déploiements obligeraient à persister
chaque coup puis recharger à la demande — c'est-à-dire à réimplémenter un Durable Object à la main.

Coût assumé : le modèle est propriétaire. La surface concernée reste la coquille transport ;
`packages/core` n'en dépend pas et reste portable.

## 3. Base de données : D1

Un Durable Object **n'est pas une base de données** — c'est une alternative à un processus
serveur. Il n'existe aucune requête transversale à plusieurs DO : chaque objet est une île,
inatteignable sans connaître son nom. Tout ce qui doit être cherché, classé ou agrégé exige
donc une vraie base.

**D1** (SQLite managé, natif Workers) est retenu contre Postgres + Hyperdrive : pas de pooler
ni de fournisseur tiers, une base par environnement sans effort, et du SQL standard — donc un
coût de sortie faible si une migration devient nécessaire. La contrepartie (écrivain unique,
pas de types avancés) est sans effet à cette échelle.

### Répartition des données

| Donnée                                | Où                                |
| ------------------------------------- | --------------------------------- |
| Partie en cours (plateau, tours, fog) | **Durable Object**                |
| File de matchmaking                   | **Durable Object global**         |
| Comptes, sessions, pseudos            | **D1**                            |
| Log d'actions / replays               | **D1**                            |
| Résultats, ELO, stats, classement     | **D1**                            |
| Amis, invitations, parties privées    | **D1**                            |
| Versions de ruleset                   | **D1** ou code versionné          |
| Replays volumineux, assets            | R2, le jour où ce sera nécessaire |

KV n'est pas retenu : cohérence à terme, donc jamais pour des données autoritaires.

### Le log d'actions est la source de vérité

`Action` (`packages/core/src/actions.ts`) est minuscule — `{ kind, pieceId, to, capture? }`,
une cinquantaine d'octets. Et `core` ne contient **aucune** source de non-déterminisme
(ni `Math.random`, ni `Date.now`, vérifié). Rejouer le log depuis la position initiale
reconstruit donc exactement l'état final, mémoire fantôme comprise.

**Règle d'architecture : D1 détient le log d'actions comme source de vérité ; tout le reste,
y compris l'état du Durable Object, est un cache reconstructible.** Conséquences directes :
une partie complète tient dans quelques kilo-octets, les replays sont gratuits (le log _est_
le replay), et un bug signalé se rejoue à l'identique.

## 4. Environnements

La zone est **`0kl.fr`**, propriété du compte. `occulis.fr` n'a jamais été acquis et le nom
reste exposé au risque de marque signalé en section 9 du design doc ; les URLs ci-dessous ne
dépendent donc pas de son acquisition.

| Env     | URL                        | Déclencheur                           | Base                     | État |
| ------- | -------------------------- | ------------------------------------- | ------------------------ | ---- |
| Local   | `localhost`                | `pnpm dev` + `wrangler dev`           | SQLite local, hors quota | ✅   |
| Preview | `occulis-<branche>.0kl.fr` | push sur une branche **sélectionnée** | créée par la CI          | ✗    |
| Recette | `occulis-staging.0kl.fr`   | push sur `staging`                    | fixe                     | ✅   |
| Prod    | `occulis.0kl.fr`           | push sur `main`                       | fixe                     | ✅   |

**Schéma plat, un seul niveau sous la zone.** Le certificat universel de Cloudflare couvre
`0kl.fr` et `*.0kl.fr`, mais **pas** `*.*.0kl.fr`. Vérifié en pratique : `staging.0kl.fr`
répond, `staging.occulis.0kl.fr` non. Un sous-domaine imbriqué exigerait Advanced Certificate
Manager, payant — d'où le préfixe `occulis-`, qui garde un seul niveau tout en réservant un
espace de noms dans une zone susceptible d'héberger autre chose. La contrainte vaut à
l'identique pour les previews de branche.

Le rattachement se déclare dans `wrangler.toml`, pas dans le dashboard :

```toml
routes = [{ pattern = "occulis.0kl.fr", custom_domain = true }]
```

`custom_domain = true` fait créer l'enregistrement DNS et le rattachement par wrangler au
déploiement. Le token de la CI doit donc porter `Zone:Workers Routes:Edit` et `Zone:Zone:Read`
en plus des permissions Workers et D1.

**Une branche = un environnement complet** (client + Worker + DO + base), pas seulement un
preview du client. Une branche qui touche `packages/core` change les règles ; la tester contre
le backend de recette la testerait contre les règles de `main`. Le Worker servant aussi les
assets statiques, l'ensemble part du même commit — donc du même `core`.

La recette stable est distincte des previews de branche : le pilier « validation du fun par
beta avec de vrais testeurs » (design doc section 2) suppose une URL fixe sur un build intégré.

**Slug de branche :** nom complet normalisé, `/` → `-` (`feature/test2` → `feature-test2`,
donc `occulis-feature-test2.0kl.fr`). Bijectif, donc sans collision. Le séparateur est un tiret
et jamais un point, pour la raison de certificat ci-dessus.

### Sélection des branches hébergées

**Toutes les branches ne sont pas hébergées.** L'ensemble des branches déployées en recette est
choisi explicitement : on doit pouvoir en ajouter une et en retirer une autre à volonté, sans
que la population d'environnements dérive avec le nombre de branches ouvertes.

**Le mécanisme n'est pas arrêté** et reste à trancher (point ouvert 3). Plusieurs formes le
permettraient — un label sur la PR, un manifeste versionné dans le dépôt, un déclenchement
manuel du workflow, une convention de nommage — et le choix entre elles n'a aucune conséquence
sur le reste de l'architecture. Seule la propriété compte : **la liste est décidée, pas subie.**

Conséquence directe : la contrainte de quota ci-dessous cesse d'être un risque. La population
d'environnements est bornée par décision et non par la croissance du dépôt, ce qui rend aussi
la base par branche (point ouvert 5) nettement plus tenable qu'un modèle automatique.

**Quotas :** 10 bases D1 sur le plan gratuit, dont 2 fixes → 8 branches simultanées. Les bases
locales ne comptent pas (`wrangler dev` écrit un fichier SQLite sur la machine du dev). Sur le
plan Workers Paid — retenu en section 6, et probablement obligatoire pour les Durable Objects —
cette limite est très supérieure et le plafond de 8 branches disparaît.

## 5. CI/CD

Implémentée dans `.github/workflows/ci.yml`, en trois jobs.

```
push (toute branche) ou pull request
  └─ checks : install → typecheck → lint → test → build

push uniquement
  └─ target : résout la branche dans .github/deploy-environments.json
       └─ deploy (si et seulement si la branche y figure) :
            build du client → migrations D1 → wrangler deploy
```

**Le manifeste `.github/deploy-environments.json` est la liste des branches hébergées.**
Une branche absente passe la CI mais n'est pas déployée — c'est le mécanisme de sélection
de la section 4, sous une forme que la CI peut lire et que `pnpm infra` pourra écrire.

```json
{ "main": { "wranglerEnv": "production", "d1Database": "occulis-prod" } }
```

Ajouter un environnement de branche est donc additif : une entrée dans le manifeste, un bloc
`[env.<nom>]` dans `wrangler.toml`, une base D1. Aucun changement du workflow.

Points de conception à ne pas défaire :

- **Les migrations D1 précèdent le déploiement.** Un Worker servi contre un schéma non migré
  échoue à la première requête. Sans cette étape en CI, les environnements divergent en
  schéma en quelques semaines.
- **Le client est rebuildé dans le job de déploiement**, à partir du même commit que le
  serveur. Client et serveur doivent embarquer le même `core`, sinon l'UI calcule les coups
  légaux avec des règles que le serveur refuse.
- **L'annulation de job est restreinte aux pull requests.** Annuler un déploiement en cours
  laisserait un environnement à moitié migré.
- Le job de déploiement déclare un `environment:` GitHub, ce qui permettra d'exiger une
  approbation manuelle sur la production sans toucher au workflow.

Un workflow séparé, **sur tag**, buildera et signera les binaires Electron par OS.

**`.github/workflows/infra.yml`**, à déclenchement manuel (`workflow_dispatch`), exécute à
distance les mêmes actions que `pnpm infra` (`src/actions.ts`, via la variante non interactive
`src/ci.ts`) : créer/supprimer un environnement de branche, migrer, déployer, interroger une
base. Objectif : piloter les environnements depuis un navigateur ou un téléphone, sans poste
local allumé, sans dupliquer la logique ni les garde-fous de l'outil. `dev`, `tail` et `login`
en sont exclus (ils exigent un vrai terminal). Ce n'est pas le mécanisme de sélection des
branches hébergées de la section 4 — celui-ci reste le manifeste versionné — mais un accès
distant à l'outillage qui l'édite.

`VITE_SERVER_URL` n'est aujourd'hui lue nulle part : le Worker servant à la fois les assets
et l'API, le client web tape sa propre origine. Elle ne redeviendra nécessaire que pour le
build Electron, où elle sera **gravée dans le binaire distribué** — l'URL de production doit
donc être définitive avant le premier build public.

## 6. Coûts

Chiffrage détaillé dans [costs.md](costs.md). En résumé : plan **Workers Paid à 5 $/mois**,
qui couvre tout jusqu'à ~50 000 parties par mois ; ~32 $/mois à un million de parties. Le seul
levier de coût réel est le nombre de coups joués (requêtes Durable Object).

**L'hibernation des DO y est une condition, pas une optimisation** — un DO qui n'hiberne pas
consomme ~20 000 fois plus, sans aucun signal fonctionnel. Voir costs.md.

## 7. Points ouverts

1. **Versionnement du protocole et du ruleset** — la décision de section 1 ci-dessus est actée
   mais ne figure pas dans les points ouverts du design doc. À y reporter.
2. **Rattachement des hostnames de branche — mécanisme trouvé, reste à généraliser.** La
   production utilise `routes = [{ pattern = …, custom_domain = true }]`, que wrangler applique
   lui-même au déploiement : ni DNS wildcard ni appel à l'API Cloudflare. Reste à générer ce
   bloc par branche, ce qui relève du point 3. La recette n'est pas encore rattachée et se
   déploie sur son URL `workers.dev`.
3. **Sélection des branches hébergées — arrêté et outillé.** La liste est le manifeste
   versionné `.github/deploy-environments.json`, que la CI lit. `pnpm infra` l'édite dans les
   deux sens (« Créer / Supprimer un environnement de branche ») : création ou destruction du
   même geste du bloc `[env.<nom>]` du toml, de la base D1 et de l'entrée du manifeste, puis
   commit et push de `wrangler.toml` et du manifeste. Reste à traiter séparément : le seed des
   bases (point 4) et la vérification bout en bout de l'attache d'URL (point 2).
4. **Seed des previews.** Une base neuve est vide : sans script de seed, un preview de branche
   est inutilisable pour tester. C'est le vrai travail caché de l'automatisation.
5. **Base par branche ou base partagée préfixée.** La seconde évite tout script de création et
   de nettoyage. Recommandation : commencer partagé, passer à la base par branche si l'équipe
   se marche dessus.
6. **Plan Cloudflare.** Le chiffrage de section 6 part du plan Workers Paid (5 $/mois), que les
   Durable Objects ont longtemps rendu obligatoire. À confirmer à la création du compte — c'est
   ce qui décide si le plafond de 8 branches simultanées de la section 4 s'applique ou non — étant
   entendu que la sélection explicite des branches le rend de toute façon peu contraignant.
7. **Test d'hibernation.** Rien ne signale au développeur qu'un Durable Object n'hiberne pas :
   le jeu fonctionne à l'identique et seule la facture change (facteur ~20 000, section 6).
   À couvrir par un test dédié dès l'implémentation du DO.
8. **Marque.** Les environnements vivent sous `0kl.fr`, donc plus aucune URL ne dépend
   d'`occulis.fr`. Mais le risque de marque sur le **nom** « Occulis » lui-même (proximité avec
   Oculus, design doc section 9) reste entier et n'a jamais été vérifié — il porte sur le nom du
   jeu, pas sur le domaine, et se paierait au renommage.
