# Le serveur — `apps/server`

Worker Cloudflare + Durable Objects + base D1. **Squelette fonctionnel mais non
branché** : le code ci-dessous est complet et cohérent, mais aucun client ne l'appelle
encore (voir « L'état réel du câblage » dans [README.md](README.md)).

## Répartition des responsabilités

```
   Worker (index.ts)                Durable Object (match-do.ts)         D1
   ─────────────────                ────────────────────────────         ──
   sans état                        1 instance = 1 partie                matches
   route les requêtes               détient GameState + 2 PlayerKnowledge match_actions
   écrit la ligne `matches`         applique les actions                 players
   sert le client via ASSETS        envoie à chacun son viewFor()        users
```

Trois principes, actés dans `docs/architecture.md` :

- **1 Durable Object = 1 partie.** Il détient le `GameState` et les deux
  `PlayerKnowledge`, et envoie à chaque joueur **son propre** `viewFor()`. Le fog est
  donc structurel : un client ne peut pas recevoir ce que le DO ne lui envoie pas.
- **Le DO est mono-threadé**, donc la sérialisation des tours est acquise. **Ne pas
  ajouter de verrous.**
- **Le log d'actions en D1 est la source de vérité ; l'état du DO n'est qu'un cache
  reconstructible.** Cela dépend entièrement de l'invariant de déterminisme de
  `packages/core`.

## Fichiers

| Fichier | Rôle |
|---|---|
| `apps/server/src/index.ts` | Worker : routage et service du client |
| `apps/server/src/match-do.ts` | `MatchDO` : le Durable Object de partie |
| `apps/server/src/queue-do.ts` | `QueueDO` : la file d'attente globale de matchmaking |
| `apps/server/src/match-setup.ts` | Création d'une partie : ligne D1, jetons de siège, init du DO |
| `apps/server/src/seating.ts` | **Pur** — jeton de siège → camp, et autorité de tour |
| `apps/server/src/auth/routes.ts` | Les routes `/api/auth/*` |
| `apps/server/src/auth/accounts.ts` | Comptes, profils et sessions en D1 |
| `apps/server/src/auth/password.ts` | PBKDF2, jetons de session, comparaison à temps constant |
| `apps/server/src/auth/cookie.ts` | **Pur** — lecture et fabrication du cookie de session |
| `apps/server/src/pairing.ts` | **Pur** — la file d'attente comme structure de données |
| `packages/protocol/src/index.ts` | Messages client/serveur et version de protocole — **paquet partagé** |
| `apps/server/src/rulesets.ts` | Registre des rulesets par version |
| `apps/server/src/env.d.ts` | Type des bindings : `DB`, `MATCH`, `QUEUE`, `ASSETS` |
| `apps/server/wrangler.toml` | Configuration et environnements |
| `apps/server/migrations/*.sql` | Schéma D1 |

---

## `index.ts` — le Worker

Le Worker **ne détient aucun état de partie**. Il authentifiera (pas encore fait), écrit
en D1, puis route vers le Durable Object.

| Route | Méthode | Traitement |
|---|---|---|
| `/api/auth/register` | `POST` | Crée un compte **et** son profil de jeu, ouvre une session |
| `/api/auth/login` | `POST` | Ouvre une session |
| `/api/auth/logout` | `POST` | Ferme la session et efface le cookie |
| `/api/auth/me` | toute | Le pseudo du joueur connecté, ou `{ signedIn: false }` |
| `/api/matches` | `POST` | `createMatch()` — partie directe, hors file d'attente |
| `/api/queue` | WebSocket | `joinQueue()` — **401 sans session** |
| `/match/:id?seat=<jeton>` | WebSocket | `env.MATCH.get(env.MATCH.idFromName(matchId)).fetch(request)` |
| tout le reste | toute | `env.ASSETS.fetch(request)` — le client statique |

| Fonction | Emplacement | Rôle |
|---|---|---|
| `fetch()` (handler par défaut) | `apps/server/src/index.ts` | Routage |
| `createMatch()` | `apps/server/src/index.ts` | Lit `playerA`/`playerB`, délègue à `startMatch()` |
| `startMatch()` | `apps/server/src/match-setup.ts` | Identifiant, jetons de siège, ligne `matches`, `POST /init` |

**`idFromName(matchId)`** est le point clé : deux joueurs de la même partie atteignent
forcément la même instance de DO, sans annuaire ni coordination.

`startMatch()` enchaîne : `crypto.randomUUID()` pour l'identifiant **et pour chacun des
deux jetons de siège**, `ensurePlayers()` — un `INSERT OR IGNORE` dans `players`, **bouchon
en attendant l'authentification** : sans lui la contrainte de clé étrangère de `matches`
fait échouer toute création de partie, ce qu'aucun test unitaire ne voyait — un `INSERT`
dans `matches` (avec `CURRENT_RULESET_VERSION` et
`DEFAULT_SCENARIO`), puis un `POST /init` vers le DO pour y déposer la configuration.
Il répond `{ matchId, seats }`.

`crypto.randomUUID()` et `Date.now()` sont utilisés **ici, dans le Worker** — pas dans
`packages/core`. L'invariant de déterminisme ne porte que sur `core` : l'identifiant et
l'horodatage sont figés en base à la création, puis rejoués à l'identique.

**Le client est servi par le même Worker**, via le binding `ASSETS` pointant sur
`apps/web/dist`. Client et serveur partent donc du même commit, donc du même `core`
(`docs/architecture.md` section 4). Cela a un corollaire utile : sur le web, le client et
l'API sont **de même origine**, une URL relative suffit.

---

## `match-do.ts` — `MatchDO`

Étend `DurableObject<Env>`. Champ privé `live: Live | null`, avec
`Live = { state: GameState; knowledge: Record<PlayerId, PlayerKnowledge> }`.

| Méthode | Visibilité | Rôle |
|---|---|---|
| `fetch()` | publique | `/init` ; sinon négociation WebSocket |
| `webSocketMessage()` | publique | Aiguille `hello` et `action` |
| `play()` | privée | Applique une action, journalise, rediffuse |
| `appendToLog()` | privée | `INSERT` dans `match_actions` |
| `broadcastViews()` | privée | Envoie à chaque joueur son `viewFor()` |
| `send()` | privée | Sérialise un `ServerMessage` |
| `config()` | privée | Relit `MatchConfig` depuis le stockage du DO ; **lève** si absente |
| `load()` | privée | Reconstruit l'état en rejouant le log |

### L'hibernation — le point de coût

```ts
this.ctx.acceptWebSocket(pair[1], [player]);
```

`acceptWebSocket()` — et **non** `server.accept()` — est ce qui autorise l'hibernation.
Sans lui, le DO reste en mémoire tant que le socket est ouvert, pour un coût **~20 000
fois supérieur** et aucune différence fonctionnelle (`docs/costs.md`). C'est le piège le
plus coûteux de tout le projet.

Le second argument est une **étiquette** (`[player]`, donc `"A"` ou `"B"`) : c'est elle
qui permet à `broadcastViews()` de retrouver les sockets d'un joueur donné via
`this.ctx.getWebSockets(player)`, sans conserver de référence en mémoire — ce qui serait
incompatible avec l'hibernation.

`fetch()` refuse une requête sans `?player=A|B` (400) ou sans en-tête
`Upgrade: websocket` (426).

### Le siège : à qui parle-t-on ?

Se connecter à une partie exige un **jeton de siège**, tiré à la création et connu des
seuls deux joueurs (`?seat=<jeton>`). `seatFor()` (`seating.ts`, pur) le traduit en camp ;
un jeton inconnu, vide ou absent reçoit un `403` et **aucune vue**.

Ce n'est pas de l'authentification : ça n'identifie personne. Mais c'est ce qui rend le fog
of war structurel — sans jeton, on n'obtient la vue d'aucun des deux camps. Auparavant un
client annonçait `?player=A` et pouvait donc demander la vue de son adversaire.

Le camp est ensuite porté par un **tag de socket**, posé à l'acceptation : c'est la seule
donnée liée à la connexion que l'expéditeur ne contrôle pas, et la seule qui survive à
l'hibernation.

### L'autorité de tour

`denyOutOfTurn()` (`seating.ts`, pur) refuse toute action venue d'un autre camp que celui
au trait. C'est la moitié de la règle que `core` ne peut pas tenir : `applyAction()` vérifie
que la pièce appartient au joueur **au trait**, pas que l'expéditeur est ce joueur-là.
Sans ce refus, B jouerait les pièces de A ; et comme `core` désigne le vainqueur d'un
abandon par `opponentOf(activePlayer)`, un abandon hors tour couronnerait le mauvais camp.

### Le cycle d'une action

```
webSocketMessage  ──►  play(action, player, ws)
                         │
                         ├─ load()                     état courant (cache ou rejeu)
                         ├─ denyOutOfTurn(...)          seating.ts
                         │     └─ refus ──► send({ kind: "rejected", error })  ← à l'émetteur seul
                         ├─ advanceMemory(live, action) @occulis/core
                         │     └─ échec ──► send({ kind: "rejected", error })  ← à l'émetteur seul
                         ├─ appendToLog(action, seq)    INSERT dans match_actions
                         ├─ recordOutcome()             si la partie s'achève : UPDATE matches
                         └─ broadcastViews()            un viewFor() par joueur
```

L'ordre compte : **le log est écrit avant la diffusion**. Un client ne voit donc jamais un
état que la source de vérité ignore.

`seq` est l'index du coup dans `state.history` **avant** application : la première action
porte `seq = 0`. Il ne dépend donc plus de `turn` — deux notions qui coïncident aujourd'hui
mais qu'une règle à résolution différée (`docs/design.md` section 3.2) séparerait. La
séquence est monotone et unique par partie, ce que la clé primaire `(match_id, seq)`
garantit.

### `load()` — la reconstruction par rejeu

Si `this.live` est en cache, elle le renvoie. Sinon :

1. `config()` relit la `MatchConfig` du stockage du DO.
2. `scenarioFor()` et `rulesetFor()` reconstruisent le plateau, les pièces et les règles
   **de la version figée à la création**.
3. `createGame()` reconstruit l'état initial.
4. Toutes les lignes de `match_actions` sont relues `ORDER BY seq ASC` et passées à
   `replayMemory()` (`@occulis/core`), qui rejoue la position **et** fait avancer la
   mémoire fantôme des deux joueurs à chaque coup.

`replayMemory()` vit dans `core` et non ici : la mémoire fantôme dépend de toutes les
positions traversées, pas seulement de la dernière, et le client tient exactement la même
chose en hot-seat. Écrire la boucle des deux côtés, c'était deux occasions de diverger.

Un rejeu qui échoue lève `Log corrompu pour <matchId> au coup <seq>` — volontairement fatal :
poursuivre sur un état divergent serait pire.

**Cette méthode n'est correcte que parce que `packages/core` est strictement
déterministe.** Un `Math.random` ou un `Date.now` glissé dans `core` la casserait
silencieusement, et la mémoire fantôme reconstruite ne correspondrait plus à celle que les
joueurs ont réellement eue.

---

## `auth/` — comptes et sessions

**Deux garanties distinctes, à ne pas confondre :**

| Question | Répondue par | Où |
|---|---|---|
| Qui êtes-vous ? | Le cookie de session | `auth/`, résolu dans le Worker |
| Quel camp jouez-vous ? | Le jeton de siège | `seating.ts`, résolu dans le `MatchDO` |

La seconde ne dépend pas de la première : une partie reste jouable par qui détient le
jeton, ce qui laisse ouverte la possibilité d'une partie privée sans compte.

**L'identité passée à la file d'attente vient du cookie, jamais de la requête.** Le
Worker résout le compte, puis réécrit `?player=<id>` dans l'URL transmise au `QueueDO`.
Un Durable Object n'est pas routable de l'extérieur : ce que le Worker y écrit est donc
hors de portée du client — un `?player=` envoyé par le navigateur est simplement écrasé.

### Le mot de passe

PBKDF2-HMAC-SHA256, 210 000 itérations, via WebCrypto. **Compromis assumé** : ni bcrypt
ni argon2 ne sont disponibles dans un Worker sans embarquer du WASM, et PBKDF2 résiste
moins bien qu'argon2 à une attaque par GPU à coût CPU égal. Le nombre d'itérations est
stocké **dans l'empreinte** (`pbkdf2-sha256$<iterations>$<sel>$<empreinte>`), ce qui
permet de l'augmenter plus tard sans invalider les mots de passe existants.

La comparaison est à temps constant : comparer octet par octet avec sortie anticipée
laisse fuiter, par la durée, le nombre d'octets corrects.

Compter : un hachage coûte environ 150 ms de CPU. Sans conséquence sur le plan payant
(limite de 30 s), mais c'est le coût de chaque connexion et de chaque inscription.

### La session

Le cookie porte 256 bits d'aléa. **Seul son SHA-256 est stocké en base** : une fuite de
D1 ne permet donc pas de se faire passer pour un utilisateur connecté. `HttpOnly`,
`Secure` et `SameSite=Lax` ne sont optionnels ni l'un ni l'autre — le jeton vaut un mot
de passe tant qu'il vit.

### Ce que le serveur ne dit pas

`/api/auth/login` répond exactement la même chose à une adresse inconnue qu'à un mot de
passe faux. Distinguer les deux dirait à un inconnu quelles adresses sont inscrites.

## `@occulis/protocol` — le protocole partagé

Il vit dans `packages/protocol` et non dans `apps/server` : `apps/web` doit parler
exactement le même protocole, et deux définitions séparées auraient dérivé au premier
ajout. Le paquet ne contient que des types et la conversion de sérialisation — aucune
règle de jeu (elle vit dans `@occulis/core`), aucun transport (il vit dans chaque app).

```ts
const PROTOCOL_VERSION = 2

type ClientMessage =
  | { kind: "hello";  protocol: number }
  | { kind: "action"; action: Action }

type Rejection = ActionError | SeatDenial

type ServerMessage =
  | { kind: "welcome";           player: PlayerId }
  | { kind: "view";              view: WireView }
  | { kind: "rejected";          error: Rejection }
  | { kind: "protocol-mismatch"; expected: number }

type QueueServerMessage =
  | { kind: "waiting" }
  | { kind: "matched";           matchId: string; player: PlayerId; seat: string }
  | { kind: "protocol-mismatch"; expected: number }
```

| Fonction | Emplacement | Rôle |
|---|---|---|
| `encodeView()` | `apps/server/src/protocol.ts` | `PlayerView` → `WireView` sérialisable |
| `decodeView()` | `apps/server/src/protocol.ts` | `WireView` → `PlayerView`, côté client |

**Pourquoi `WireView` existe** : `PlayerView.visible` est un `ReadonlySet`, et
`JSON.stringify` sérialise un `Set` en `{}`. `encodeView()` le convertit en tableau,
`decodeView()` le reconstruit — `Scene` (`apps/web/src/scene/scene.ts`) attend bien un
`Set`, et un client qui oublierait la conversion inverse afficherait un fog vide, donc
tout le plateau.

**`welcome`** dit au client de quel camp il tient le siège. Il ne le sait pas autrement :
c'est le jeton qui le détermine, et le serveur seul le résout.

**Pourquoi la version est négociée** : un client téléchargé (cible Electron) embarque un
vieux `core` et calcule donc les coups légaux avec de vieilles règles. Le serveur doit
pouvoir le refuser explicitement (`protocol-mismatch`, puis fermeture avec le code 4001)
plutôt que le laisser diverger en silence.

---

## `rulesets.ts` — le registre versionné

| Fonction / constante | Emplacement | Rôle |
|---|---|---|
| `CURRENT_RULESET_VERSION` | `apps/server/src/rulesets.ts` | Version attribuée aux nouvelles parties — `"provisional-0"` |
| `rulesetFor()` | `apps/server/src/rulesets.ts` | Version → `Ruleset` ; **lève** si inconnue |
| `DEFAULT_SCENARIO` | `apps/server/src/scenarios.ts` | Scénario des nouvelles parties — `"demo-0"` |
| `scenarioFor()` | `apps/server/src/scenarios.ts` | Nom → `{ board, pieces }` ; **lève** si inconnu |

Le registre ne définit **aucun type de pièce lui-même** : il appelle
`provisionalRuleset()` de `@occulis/core` (`packages/core/src/pieces/roster/`). Client et
serveur doivent appliquer exactement les mêmes règles, donc une seule définition — voir
[core.md](core.md), section `pieces/`.

**Les règles sont versionnées par partie, pas par connexion.** Une partie démarrée sous un
ruleset s'y termine, y compris à travers un déploiement — le pilier « temps de réflexion
illimité » implique des parties qui traversent les mises en production. Conséquence
directe : **les anciennes versions doivent rester chargeables ici indéfiniment**. Ne jamais
retirer une entrée du registre tant qu'une partie peut la référencer.

**Attention** : ni le roster ni les cartes ne sont actés (`docs/design.md` points ouverts 5
et 12). Le roster provisoire et le scénario de démonstration existent pour que le squelette
tourne. **Ce n'est pas du contenu de jeu, et il ne faut bâtir aucun équilibrage dessus.**

---

## Le schéma D1

Un DO n'est pas une base : aucune requête transversale entre DO n'est possible. Tout ce
qui se cherche, se classe ou s'agrège va donc en D1.

### `migrations/0001_init.sql`

| Table | Rôle | Points notables |
|---|---|---|
| `players` | Profil de jeu | `handle` unique, `elo` défaut 1200 |
| `matches` | Une partie | `ruleset_version` **figée à la création** ; index par joueur et date |
| `match_actions` | Un enregistrement par coup | `PRIMARY KEY (match_id, seq)` ; `action` est l'`Action` de `@occulis/core` sérialisée |

`match_actions` est **la source de vérité**. Rejouer ses lignes reconstruit l'état exact,
mémoire fantôme comprise.

### `migrations/0002_users.sql`

| Table | Rôle |
|---|---|
| `users` | Identité et authentification : `email` unique, `password_hash`, `player_id` |

`users` est distincte de `players` : un compte **possède** un profil de jeu. La table pose
le support ; **l'authentification n'est pas branchée**.

---

### `migrations/0003_sessions.sql`

`sessions (token_hash, user_id, created_at, expires_at)`. **Seule l'empreinte du jeton**
y figure. Deux index : par utilisateur, et par expiration pour la purge qui reste à
écrire.

## `wrangler.toml` — bindings et environnements

Bindings (type dans `apps/server/src/env.d.ts`) :

| Binding | Type | Rôle |
|---|---|---|
| `DB` | `D1Database` | La base |
| `MATCH` | `DurableObjectNamespace` | Les parties |
| `ASSETS` | `Fetcher` | Le client statique, servi depuis `../web/dist` |

Environnements déclarés : le bloc par défaut (`local`), puis `[env.staging]`,
`[env.production]`, et un bloc par environnement de branche créé — aujourd'hui
`[env.feature-engine]`.

Deux contraintes à connaître avant de toucher aux domaines :

- **`custom_domain = true`** fait créer par wrangler l'enregistrement DNS et le
  rattachement : rien à cliquer dans le tableau de bord. Le token de la CI doit porter
  `Zone:Workers Routes:Edit` et `Zone:Zone:Read` en plus des permissions Workers/D1.
- **Un seul niveau sous la zone**, délibérément. Le certificat universel de Cloudflare
  couvre `0kl.fr` et `*.0kl.fr`, mais **pas** `*.*.0kl.fr`. Un nom du type
  `staging.occulis.0kl.fr` exigerait Advanced Certificate Manager, payant — d'où
  `occulis-staging.0kl.fr` et non `staging.occulis.0kl.fr`.

**Les bindings ne sont pas hérités par les environnements nommés** : toute commande visant
`staging` ou `production` doit porter `--env`, sinon wrangler ne lit que la configuration
par défaut et ne voit qu'`occulis-local`. C'est ce que produit `envFlag()`
(`tooling/infra/src/config.ts`).

---

## Les tests

28 tests, dont 17 **dans workerd** via `@cloudflare/vitest-pool-workers` : `pnpm --filter
@occulis/server test`.

| Fichier | Où | Ce qui est verrouillé |
|---|---|---|
| `seating.test.ts` | Node | Jeton → camp, refus d'un jeton inconnu ou vide, autorité de tour |
| `pairing.test.ts` | Node | File d'attente, remplacement d'une attente en double, appariement du plus ancien |
| `match-do.integration.test.ts` | workerd | 403 sans jeton, une vue par camp sans fuite, refus hors tour, coup appliqué + écrit au log + diffusé, clôture en base, refus de protocole |
| `queue-do.integration.test.ts` | workerd | Deux joueurs appariés sur une même partie avec des sièges distincts, partie réellement joignable, **401 sans session et sur identité forgée dans l'URL** |
| `auth/auth.integration.test.ts` | workerd | Inscription, session reconnue, jeton inventé refusé, attributs du cookie, mot de passe faux, **réponses indiscernables entre adresse inconnue et mot de passe faux**, unicité, mot de passe trop court, déconnexion |

**Les tests d'intégration sont aussi le test d'hibernation** que `CLAUDE.md` réclame :
`webSocketMessage()` et `webSocketClose()` ne sont appelés que sur un socket accepté par
`ctx.acceptWebSocket()`. Passer à `server.accept()` — la variante qui empêche
l'hibernation et multiplie le coût par ~20 000 — ferait taire ces gestionnaires et
échouer tout le fichier.

Deux choses ont été trouvées en exécutant le vrai runtime, qu'aucun test unitaire ne
voyait : la contrainte de clé étrangère de `matches` qui faisait échouer toute création de
partie, et l'absence de `webSocketClose()` sur `MatchDO`, qui levait une exception non
rattrapée à **chaque** déconnexion.

`vitest.config.ts` lit les vraies migrations (`readD1Migrations`) et les applique à la base
de test : le schéma testé ne peut pas dériver de celui qui est déployé. `isolatedStorage`
est désactivé — cette version du pool ne sait pas isoler un DO adossé à SQLite — sans
conséquence, chaque test créant sa propre partie sous un identifiant tiré au hasard.

`compatibility_flags = ["nodejs_compat"]` est exigé par le pool. Le drapeau ne fait
qu'ajouter des API Node disponibles ; le Worker n'en utilise aucune.

## Invariants à ne pas casser

1. **`acceptWebSocket()`, jamais `accept()`.** Sinon le DO n'hiberne plus et le coût
   explose (~20 000×).
2. **Aucun verrou dans le DO.** Il est mono-threadé ; la sérialisation est acquise.
3. **Écrire le log avant de diffuser.** Sinon un client peut voir un état que la source de
   vérité ignore.
4. **Ne jamais retirer une version du registre de rulesets** tant qu'une partie peut la
   référencer.
5. **Ne jamais envoyer autre chose qu'un `viewFor()` par joueur.** Envoyer le `GameState`
   complet et masquer côté client rendrait le fog contournable via les devtools.
6. **Le déterminisme de `packages/core` est une dépendance dure de `load()`.**
7. **Tout DO qui accepte des sockets hibernables définit `webSocketClose()`.** Sans lui,
   le runtime lève une exception non rattrapée à chaque déconnexion.

## Non implémenté

- **Aucune limitation de débit sur `/api/auth/login`.** Rien n'empêche une attaque par
  force brute autrement que par le coût du PBKDF2. À traiter **avant toute mise en ligne
  publique**.
- **Aucune vérification d'adresse électronique et aucune réinitialisation de mot de
  passe.** Un compte dont le mot de passe est perdu l'est aussi.
- **Aucune purge des sessions expirées.** Elles sont refusées à la lecture (`expires_at`),
  mais rien ne les supprime : la table croît indéfiniment. L'index `sessions_by_expiry`
  est là pour le balayage qui viendra.
- **`POST /api/matches` n'exige aucun compte** et crée au besoin des lignes `players`
  sans compte associé (`ensurePlayers`), pour qu'une partie privée ou un test démarre
  sans inscription. Ce n'est pas un chemin d'inscription — ces lignes n'ont ni mot de
  passe ni moyen de se connecter — mais c'est une porte ouverte à surveiller.
- **Aucun ELO, aucun classement, aucune liste d'amis** — les colonnes existent, rien ne
  les lit.
- **Aucune reprise de file après hibernation du `QueueDO`.** Les attentes dont le socket a
  disparu sont purgées à l'appariement suivant, pas activement.
- **Les tests tournent sur une compatibility date plus ancienne que la production.** Le
  workerd embarqué par le pool plafonne à `2024-12-30` alors que `wrangler.toml` demande
  `2026-08-27` ; miniflare le signale et retombe sur la sienne. Sans conséquence pour ce
  qui est testé — WebSockets, DO, D1 sont stables de longue date — mais un comportement
  introduit par une date récente ne serait pas couvert.
- **`VITE_SERVER_URL` n'existe nulle part dans le code**, contrairement à ce que
  `CLAUDE.md` laisse entendre. Sur le web, le client étant servi par le même Worker, une
  URL relative suffit. La contrainte « URL gravée dans le binaire » ne vaudra que pour la
  future distribution Electron, où le client n'est plus de même origine.
