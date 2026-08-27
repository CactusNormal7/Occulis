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

| Donnée | Où |
|---|---|
| Partie en cours (plateau, tours, fog) | **Durable Object** |
| File de matchmaking | **Durable Object global** |
| Comptes, sessions, pseudos | **D1** |
| Log d'actions / replays | **D1** |
| Résultats, ELO, stats, classement | **D1** |
| Amis, invitations, parties privées | **D1** |
| Versions de ruleset | **D1** ou code versionné |
| Replays volumineux, assets | R2, le jour où ce sera nécessaire |

KV n'est pas retenu : cohérence à terme, donc jamais pour des données autoritaires.

### Le log d'actions est la source de vérité

`Action` (`packages/core/src/actions.ts`) est minuscule — `{ kind, pieceId, to, capture? }`,
une cinquantaine d'octets. Et `core` ne contient **aucune** source de non-déterminisme
(ni `Math.random`, ni `Date.now`, vérifié). Rejouer le log depuis la position initiale
reconstruit donc exactement l'état final, mémoire fantôme comprise.

**Règle d'architecture : D1 détient le log d'actions comme source de vérité ; tout le reste,
y compris l'état du Durable Object, est un cache reconstructible.** Conséquences directes :
une partie complète tient dans quelques kilo-octets, les replays sont gratuits (le log *est*
le replay), et un bug signalé se rejoue à l'identique.

## 4. Environnements

| Env | URL | Déclencheur | Base |
|---|---|---|---|
| Local | `localhost` | `pnpm dev` + `wrangler dev` | SQLite local, hors quota |
| Preview | `<branche>.beta.occulis.fr` | push sur toute branche | créée par la CI |
| Recette | `beta.occulis.fr` | merge sur `staging` | fixe |
| Prod | `occulis.fr` | push sur `main` | fixe |

**Une branche = un environnement complet** (client + Worker + DO + base), pas seulement un
preview du client. Une branche qui touche `packages/core` change les règles ; la tester contre
le backend de recette la testerait contre les règles de `main`. Le Worker servant aussi les
assets statiques, l'ensemble part du même commit — donc du même `core`.

La recette stable est distincte des previews de branche : le pilier « validation du fun par
beta avec de vrais testeurs » (design doc section 2) suppose une URL fixe sur un build intégré.

**Slug de branche :** nom complet normalisé, `/` → `-` (`feature/test2` → `feature-test2`).
Bijectif, donc sans collision. Le séparateur doit être un tiret et non un point : un certificat
wildcard `*.beta.occulis.fr` ne couvre qu'un seul niveau.

**Quotas :** 10 bases D1 sur le plan gratuit, dont 2 fixes → 8 branches simultanées. Les bases
locales ne comptent pas (`wrangler dev` écrit un fichier SQLite sur la machine du dev). Sur le
plan Workers Paid — retenu en section 6, et probablement obligatoire pour les Durable Objects —
cette limite est très supérieure et le plafond de 8 branches disparaît.

## 5. CI/CD

```
push (toute branche)
  └─ install → typecheck → lint → test → build
       └─ migrations D1 → deploy Worker → commente l'URL sur la PR

push main
  └─ mêmes gates → migrations → deploy prod

branche supprimée
  └─ destruction du Worker, du namespace DO et de la base
```

Les migrations D1 (dossier `migrations/`, `wrangler d1 migrations apply`) sont une étape de CI
à poser dès le départ, sinon les environnements divergent en schéma en quelques semaines.

Un workflow séparé, **sur tag**, buildera et signera les binaires Electron par OS.

L'URL du serveur est injectée au build (`VITE_SERVER_URL`) : elle est donc gravée dans le
binaire distribué. **L'URL de production doit être définitive avant le premier build public.**

## 6. Coûts

Plan **Workers Paid — 5 $/mois**, qui inclut 10 M de requêtes Worker, 1 M de requêtes Durable
Object, 400 K GB-s de durée DO, 1 Go de stockage DO, 25 Md de lignes D1 lues, 50 M écrites et
5 Go de stockage D1.

Hypothèses : ~60 actions par partie, 2 connexions WebSocket, ~50 requêtes Worker par session.
Arrondi à 100 requêtes DO par partie pour garder de la marge.

| Volume | Requêtes DO | Requêtes Worker | Lignes D1 écrites | Coût/mois |
|---|---|---|---|---|
| Dev + beta fermée (500 parties) | 50 K | 25 K | 28 K | **5 $** |
| 1 000 joueurs (20 K parties) | 2 M | 1 M | 1,1 M | **5,15 $** |
| 5 000 joueurs (50 K parties) | 5 M | 2,5 M | 2,75 M | **5,60 $** |
| 1 M de parties | 100 M | 50 M | 55 M | **~32 $** |

Le seul levier de coût réel est le **nombre de coups joués** (requêtes DO, 0,15 $/million).
Le reste est négligeable de plusieurs ordres de grandeur : écrire 55 M de lignes en D1 coûte
un demi-centime. Cloudflare ne facture pas l'egress.

### L'hibernation est une condition, pas une optimisation

Un Durable Object gardant un WebSocket ouvert sans hiberner occupe 128 Mo en permanence, soit
~10 800 GB-s par jour et par partie : les 400 K GB-s inclus partiraient en ~37 parties-jours.
Avec hibernation, une partie ne consomme que son temps de calcul réel (~0,6 GB-s), soit
~640 000 parties dans le forfait. **Facteur ~20 000.** Si l'implémentation du DO rate
l'hibernation, la facture explose sans signal préalable — à couvrir par un test.

### Non chiffré

Les tarifs de dépassement pour la **durée DO**, le **stockage DO** (>1 Go) et le **stockage D1**
(>5 Go) n'ont pas été relevés. Ils ne mordent qu'au dernier palier : 5 Go de D1 représentent
1 à 2 millions de parties d'historique au format log d'actions. Au-delà, archiver vers R2.

### Coûts hors hébergement

L'hébergement est le poste le moins cher de la sortie du jeu.

| Poste | Coût |
|---|---|
| Cloudflare | 60 $/an |
| Domaine | ~12 €/an |
| Compte développeur Apple (signature macOS) | 99 $/an |
| Certificat de signature Windows | ~100–400 $/an |
| Steam Direct | 100 $ une fois |

La signature de code coûte plus cher que les serveurs. Sur dépôt privé, surveiller les minutes
GitHub Actions (2 000/mois gratuites) : les 6 000 minutes de build du plan Cloudflare ne
couvrent que les builds lancés par Cloudflare.

## 7. Points ouverts

1. **Versionnement du protocole et du ruleset** — la décision de section 1 ci-dessus est actée
   mais ne figure pas dans les points ouverts du design doc. À y reporter.
2. **Rattachement des hostnames de branche.** Attacher `<slug>.beta.occulis.fr` à un Worker créé
   dynamiquement par la CI passe par un DNS wildcard et l'API Cloudflare. Mécanisme non vérifié
   en pratique — les custom domains sur previews ont beaucoup bougé chez Cloudflare.
3. **Seed des previews.** Une base neuve est vide : sans script de seed, un preview de branche
   est inutilisable pour tester. C'est le vrai travail caché de l'automatisation.
4. **Base par branche ou base partagée préfixée.** La seconde évite tout script de création et
   de nettoyage. Recommandation : commencer partagé, passer à la base par branche si l'équipe
   se marche dessus.
5. **Plan Cloudflare.** Le chiffrage de section 6 part du plan Workers Paid (5 $/mois), que les
   Durable Objects ont longtemps rendu obligatoire. À confirmer à la création du compte — c'est
   ce qui décide si le plafond de 8 branches simultanées de la section 4 s'applique ou non.
6. **Test d'hibernation.** Rien ne signale au développeur qu'un Durable Object n'hiberne pas :
   le jeu fonctionne à l'identique et seule la facture change (facteur ~20 000, section 6).
   À couvrir par un test dédié dès l'implémentation du DO.
7. **Domaine et marque.** `occulis.fr` n'a jamais été vérifié, ni en disponibilité ni en marque
   (design doc section 9). À régler avant de câbler des URLs.
