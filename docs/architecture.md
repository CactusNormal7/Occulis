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
| Preview | `<branche>.beta.occulis.fr` | push sur une branche **sélectionnée** | créée par la CI |
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

```
push (toute branche)
  └─ install → typecheck → lint → test → build
       └─ si la branche est sélectionnée pour la recette :
            migrations D1 → deploy Worker → commente l'URL sur la PR

push main
  └─ mêmes gates → migrations → deploy prod

branche supprimée, ou retirée de la sélection
  └─ destruction du Worker, du namespace DO et de la base
```

Les migrations D1 (dossier `migrations/`, `wrangler d1 migrations apply`) sont une étape de CI
à poser dès le départ, sinon les environnements divergent en schéma en quelques semaines.

Un workflow séparé, **sur tag**, buildera et signera les binaires Electron par OS.

L'URL du serveur est injectée au build (`VITE_SERVER_URL`) : elle est donc gravée dans le
binaire distribué. **L'URL de production doit être définitive avant le premier build public.**

## 6. Coûts

Chiffrage détaillé dans [costs.md](costs.md). En résumé : plan **Workers Paid à 5 $/mois**,
qui couvre tout jusqu'à ~50 000 parties par mois ; ~32 $/mois à un million de parties. Le seul
levier de coût réel est le nombre de coups joués (requêtes Durable Object).

**L'hibernation des DO y est une condition, pas une optimisation** — un DO qui n'hiberne pas
consomme ~20 000 fois plus, sans aucun signal fonctionnel. Voir costs.md.

## 7. Points ouverts

1. **Versionnement du protocole et du ruleset** — la décision de section 1 ci-dessus est actée
   mais ne figure pas dans les points ouverts du design doc. À y reporter.
2. **Rattachement des hostnames de branche.** Attacher `<slug>.beta.occulis.fr` à un Worker créé
   dynamiquement par la CI passe par un DNS wildcard et l'API Cloudflare. Mécanisme non vérifié
   en pratique — les custom domains sur previews ont beaucoup bougé chez Cloudflare.
3. **Mécanisme de sélection des branches hébergées.** La propriété est actée en section 4 —
   la liste est décidée, pas subie — mais la forme reste ouverte : label sur la PR, manifeste
   versionné, déclenchement manuel, convention de nommage. Sans conséquence sur le reste de
   l'architecture, donc décidable tard, mais à trancher avant d'écrire le workflow.
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
8. **Domaine et marque.** `occulis.fr` n'a jamais été vérifié, ni en disponibilité ni en marque
   (design doc section 9). À régler avant de câbler des URLs.
