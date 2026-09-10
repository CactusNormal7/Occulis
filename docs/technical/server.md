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
| `apps/server/src/queue-do.ts` | `QueueDO` : la file d'attente globale et les salons privés |
| `apps/server/src/match-setup.ts` | Création d'une partie : ligne D1, jetons de siège, init du DO |
| `apps/server/src/seating.ts` | **Pur** — jeton de siège → camp, et autorité de tour |
| `apps/server/src/auth/better-auth.ts` | La configuration Better Auth : hasher, schéma, débit, crochets |
| `apps/server/src/auth/routes.ts` | `/api/auth/me` et la délégation du reste à Better Auth |
| `apps/server/src/auth/password.ts` | PBKDF2 enchaîné et comparaison à temps constant, **branchés dans Better Auth** |
| `apps/server/src/auth/mail.ts` | Envoi des messages transactionnels par Resend |
| `apps/server/scripts/generate-schema.mts` | Recrache le schéma SQL attendu — hors du Worker |
| `apps/server/src/pairing.ts` | **Pur** — la file d'attente comme structure de données |
| `apps/server/src/rooms.ts` | **Pur** — les salons privés : table des codes, tirage, consommation |
| `packages/protocol/src/index.ts` | Messages client/serveur et version de protocole — **paquet partagé** |
| `apps/server/src/rulesets.ts` | Registre des rulesets par version |
| `apps/server/src/env.d.ts` | Type des bindings : `DB`, `MATCH`, `QUEUE`, `ASSETS`, `AUTH_SECRET`, `RESEND_API_KEY` |
| `apps/server/wrangler.toml` | Configuration et environnements |
| `apps/server/migrations/*.sql` | Schéma D1 |

---

## `index.ts` — le Worker

Le Worker **ne détient aucun état de partie**. Il authentifie, écrit en D1, puis route
vers le Durable Object.

L'instance Better Auth est construite **à chaque requête** : les bindings n'existent que
dans `fetch`, et son `baseURL` doit valoir l'origine par laquelle on est joint — sinon les
liens envoyés par courrier depuis un preview de branche ramèneraient en production.

| Route | Méthode | Traitement |
|---|---|---|
| `/api/auth/me` | toute | **Au projet** — le pseudo et l'état de vérification, ou `{ signedIn: false }` |
| `/api/auth/sign-up/email` | `POST` | Better Auth — crée un compte, et son profil via le crochet |
| `/api/auth/sign-in/email` | `POST` | Better Auth — ouvre une session |
| `/api/auth/sign-out` | `POST` | Better Auth — ferme la session |
| `/api/auth/request-password-reset` | `POST` | Better Auth — envoie le message de réinitialisation |
| `/api/auth/reset-password` | `POST` | Better Auth — consomme le jeton et change le mot de passe |
| `/api/auth/send-verification-email` | `POST` | Better Auth — renvoie le message de vérification |
| `/api/auth/verify-email` | `GET` | Better Auth — marque l'adresse vérifiée |
| tout le reste de `/api/auth/*` | toute | `auth.handler(request)` |
| `/api/matches` | `POST` | `createMatch()` — partie directe, hors file d'attente |
| `/api/queue` | WebSocket | `joinQueue()` — **401 sans session, 403 sans adresse vérifiée** |
| `/match/:id?seat=<jeton>` | WebSocket | `env.MATCH.get(env.MATCH.idFromName(matchId)).fetch(request)` |
| tout le reste | toute | `env.ASSETS.fetch(request)` — le client statique |

| Fonction | Emplacement | Rôle |
|---|---|---|
| `fetch()` (handler par défaut) | `apps/server/src/index.ts` | Routage |
| `scheduled()` (handler cron) | `apps/server/src/index.ts` | Ménage nocturne : sessions, vérifications, compteurs de débit |
| `buildAuth()` | `apps/server/src/auth/better-auth.ts` | Construit l'instance Better Auth autour des bindings |
| `currentAccount()` | `apps/server/src/auth/routes.ts` | Session → `{ userId, playerId, handle, emailVerified }` |
| `handleAuth()` | `apps/server/src/auth/routes.ts` | `/api/auth/me`, puis délégation |
| `sendLetter()` | `apps/server/src/auth/mail.ts` | Resend, ou journalisation sans clé |
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
positions traversées, pas seulement de la dernière. L'écrire ici, c'était une seconde
occasion de diverger de la règle.

Un rejeu qui échoue lève `Log corrompu pour <matchId> au coup <seq>` — volontairement fatal :
poursuivre sur un état divergent serait pire.

**Cette méthode n'est correcte que parce que `packages/core` est strictement
déterministe.** Un `Math.random` ou un `Date.now` glissé dans `core` la casserait
silencieusement, et la mémoire fantôme reconstruite ne correspondrait plus à celle que les
joueurs ont réellement eue.

---

## `queue-do.ts` — `QueueDO`

**Une seule instance pour tout le service** (`QUEUE_SINGLETON = "global"`). Son
mono-threading écarte le double appariement par construction : deux joueurs ne peuvent
pas être servis en même temps, donc aucun ne peut être apparié deux fois. Aucun verrou.

Elle porte **trois** façons d'entrer en partie, annoncées dans le `hello` :

| Intention | Ce que le serveur répond | Ce qu'il fait |
|---|---|---|
| `{ kind: "quick" }` | `waiting`, puis `matched` | Met en file, puis apparie les deux plus anciennes attentes |
| `{ kind: "host" }` | `hosting` avec un code | Ouvre un salon privé sous un code libre |
| `{ kind: "join", code }` | `matched`, ou `room-fault` | Consomme le salon désigné et crée la partie |

**Les trois passent par le même canal, et c'est délibéré.** Un joueur ne doit pouvoir
attendre qu'à un seul endroit : séparer les salons dans un second Durable Object
rouvrirait la course entre « être apparié » et « voir son salon rejoint », que le
mono-threading écarte tant que tout se décide au même endroit. Une intention reçue
efface donc la précédente (`forget()`), file d'attente **et** salons.

L'appariement et l'entrée par code aboutissent au même `seat()` : une partie créée par
`startMatch()`, un jeton par camp, et un `matched` envoyé à chacun. Dans un salon,
**l'hôte tient le camp A et l'arrivant le camp B**.

| Fonction | Emplacement | Rôle |
|---|---|---|
| `codeFrom()` | `apps/server/src/rooms.ts` | Octets tirés → code de 5 caractères |
| `normalizeCode()` | `apps/server/src/rooms.ts` | Saisie manuelle → code comparable (capitales, sans espaces) |
| `openRoom()` | `apps/server/src/rooms.ts` | Ouvre un salon, ou **rend son code à un hôte qui revient** |
| `takeRoom()` | `apps/server/src/rooms.ts` | Retire le salon apparié : il ne peut plus l'être une seconde fois |
| `closeRoom()` | `apps/server/src/rooms.ts` | Referme le salon d'une connexion partie |
| `freeCode()` | `apps/server/src/rooms.ts` | Premier tirage dont le code n'est pas déjà pris |

**L'alphabet des codes exclut les caractères confondables** (`B I L O S Z 0 1 2 5 8`) :
un code se lit à voix haute ou se recopie à la main, et `O` lu `0` coûte une partie
manquée. Cinq caractères sur 25 font ~9,7 millions de combinaisons.

**Un code n'est pas un secret.** Il ne donne accès qu'à un salon que son hôte vient
d'ouvrir et surveille, et il est consommé au premier arrivant. Le léger biais du modulo
dans `codeFrom()` est donc sans portée.

**Deux purges, pour deux raisons distinctes.** Les attentes dont le socket a disparu sont
retirées avant tout appariement — `webSocketClose()` peut n'avoir jamais été appelé, et
apparier un joueur absent perdrait la partie créée pour lui. Les salons subissent la même
purge à l'entrée d'un joueur, **sauf celui de l'hôte qui parle** : une reconnexion arrive
avec une nouvelle `connectionId`, et lui donner un nouveau code périmerait celui qu'il
vient de transmettre.

**Refuser son propre code ne ferme pas le salon.** Le cas se produit avec deux onglets du
même compte ; le retrait n'a pas lieu, et l'hôte reste joignable.

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

### Better Auth, et ce que le projet garde

L'authentification est portée par **Better Auth**, configuré dans
`auth/better-auth.ts`. Elle tourne dans le Worker, sur la base D1 du projet : aucun tiers
ne détient l'identité et rien n'est facturé à l'utilisateur actif. Quatre écarts aux
réglages par défaut méritent d'être connus.

**Le hachage reste celui du projet.** `password.ts` est branché sur
`emailAndPassword.password.{hash,verify}`. Better Auth utiliserait scrypt sinon, ce qui
aurait imposé de réencoder chaque mot de passe existant.

PBKDF2-HMAC-SHA256 via WebCrypto. **Compromis assumé** : ni bcrypt ni argon2 ne sont
disponibles dans un Worker sans embarquer du WASM, et PBKDF2 résiste moins bien qu'argon2
à une attaque par GPU à coût CPU égal. La comparaison est à temps constant.

**Le runtime Workers plafonne PBKDF2 à 100 000 itérations par appel.** Au-delà,
`deriveBits` lève `NotSupportedError: Pbkdf2 failed: iteration counts above 100000 are
not supported` — une limite codée en dur pour qu'un Worker ne se serve pas de PBKDF2
comme d'un déni de service (cloudflare/workerd#1346). Le coût recommandé par l'OWASP
(600 000 pour SHA-256) est donc atteint en **enchaînant six passes de 100 000** : la
sortie d'une passe est l'entrée de la suivante, avec le même sel, si bien qu'aucune ne
peut être calculée avant la précédente. Compter environ 150 ms de CPU par connexion et
par inscription, ce qui **exige le plan Workers Paid** : les 10 ms de CPU du plan gratuit
ne suffisent à aucun hachage sérieux.

Le paramétrage est stocké **dans l'empreinte**
(`pbkdf2-sha256$<passes>x<itérations>$<sel>$<empreinte>`), ce qui permet de le durcir
plus tard sans invalider les mots de passe existants. `verifyPassword()` lit aussi la
forme d'avant le chaînage (`pbkdf2-sha256$<itérations>$…`), interprétée comme une passe
unique.

**Le workerd local n'applique pas ce plafond** — il accepte deux millions d'itérations
sans broncher. Ni les tests ni `wrangler dev` ne peuvent donc reproduire l'échec, et le
projet a été déployé une fois avec 210 000 itérations, suite verte, pour un 500 sur
chaque inscription et chaque connexion en recette. D'où le test de garde de
`password.test.ts`, qui verrouille la valeur au lieu d'éprouver le comportement.

**Le compte et le profil de jeu restent deux choses.** Better Auth possède `users` ;
`players` porte le pseudo affiché et l'ELO ; le lien est le champ `playerId`, déclaré en
`additionalFields` avec `input: false` — il est posé par le serveur, jamais accepté depuis
le corps d'une requête. Le crochet `databaseHooks.user.create.before` crée le profil
**avant** le compte : un pseudo déjà pris doit faire échouer l'inscription entière plutôt
que de laisser derrière lui un compte sans profil, que la file refuserait sans rien
expliquer.

**Les noms de colonnes sont ramenés au style du projet** (`email_verified`, `created_at`,
`user_id`…) par les blocs `fields`. Une seule échappe à la règle : `rate_limits.lastRequest`,
que la bibliothèque n'expose pas au renommage.

**Le schéma n'est jamais écrit à la main.** `pnpm --filter @occulis/server auth:schema`
recrache le DDL attendu ; il est recopié tel quel dans une migration. Le rejouer à chaque
greffon ajouté (OAuth, 2FA) ou champ supplémentaire.

### La session

Le cookie est `__Secure-occulis.session_token`, en `HttpOnly`, `Secure` et `SameSite=Lax`.
Le préfixe `__Secure-` n'est pas décoratif : un navigateur refuse un cookie qui le porte et
n'arrive pas par HTTPS. Better Auth l'ajoute dès que les cookies sécurisés sont actifs,
donc partout sauf sur un `wrangler dev` en clair.

**Le jeton est stocké en clair en base**, là où l'implémentation précédente n'en gardait
que le SHA-256. C'est une régression sur cet axe, et elle est compensée : le cookie porte
`<jeton>.<signature>`, la signature dépend d'`AUTH_SECRET` qui n'est pas en base, et une
session ouverte avec le seul jeton lu en base est refusée — c'est vérifié par un test.
Sept jours d'inactivité, `updateAge` repoussant l'échéance chaque jour d'usage.

**`AUTH_SECRET` est donc ce qui tient toute la construction.** Sans lui Better Auth refuse
de démarrer ; le changer déconnecte tout le monde ; le divulguer permet de forger n'importe
quelle session.

### La limitation de débit

En base (`rate_limits`), et non en mémoire : une isolate Worker ne survit pas d'une requête
à l'autre, un compteur mémoire ne limiterait donc rien. Cent requêtes par minute par
défaut, et trois règles plus serrées : cinq connexions par minute, cinq inscriptions par
heure, trois demandes de réinitialisation par heure.

Le comptage se fait **par adresse IP, lue dans `CF-Connecting-IP`**, que la bordure
Cloudflare écrase — contrairement à `X-Forwarded-For`, elle ne se falsifie donc pas pour
se donner un seau neuf. Better Auth **valide** que l'en-tête contient une vraie adresse :
une valeur qui n'en est pas une le fait retomber sur un seau unique partagé, en journalisant
un avertissement. C'est le piège des tests, qui doivent fournir de vraies IPv4.

### Ce que le serveur ne dit pas

`/api/auth/sign-in/email` répond exactement la même chose à une adresse inconnue qu'à un
mot de passe faux, et `/api/auth/request-password-reset` répond `200` que l'adresse existe
ou non. Distinguer les deux dirait à un inconnu quelles adresses sont inscrites.

### L'origine est vérifiée

Better Auth refuse `403 MISSING_OR_NULL_ORIGIN` sur les routes qui changent l'état quand
l'en-tête `Origin` manque — une protection CSRF que l'implémentation précédente n'avait
pas, elle ne comptait que sur `SameSite`. Un navigateur pose cet en-tête de lui-même.
**C'est le point à traiter pour Electron** : un client qui n'est plus de même origine devra
être déclaré en `trustedOrigins` (`docs/architecture.md` section 7).

### La vérification d'adresse

Exigée pour **entrer dans la file d'attente**, pas pour se connecter (`joinQueue()`, 403).
Un compte reste utilisable tant que le message n'est pas arrivé, mais le jeu apparié —
celui qui porte le classement et qu'un compte jetable viendrait polluer — ne s'ouvre
qu'une fois l'adresse prouvée.

### L'envoi des messages

`mail.ts`, par Resend : un Worker n'a pas de socket sortant, seulement `fetch`, et
MailChannels a fermé son offre gratuite aux Workers en 2024. **Sans `RESEND_API_KEY`, les
messages sont journalisés au lieu d'être émis**, lien compris — c'est ce qui rend les
parcours traversables en local et en test sans compte Resend. Un échec d'envoi est
journalisé sans être propagé : le compte existe, un second message peut être demandé.

## `@occulis/protocol` — le protocole partagé

Il vit dans `packages/protocol` et non dans `apps/server` : `apps/web` doit parler
exactement le même protocole, et deux définitions séparées auraient dérivé au premier
ajout. Le paquet ne contient que des types et la conversion de sérialisation — aucune
règle de jeu (elle vit dans `@occulis/core`), aucun transport (il vit dans chaque app).

```ts
const PROTOCOL_VERSION = 4

type ClientMessage =
  | { kind: "hello";  protocol: number }
  | { kind: "action"; action: Action }

type Rejection = ActionError | SeatDenial

type ServerMessage =
  | { kind: "welcome";           player: PlayerId }
  | { kind: "view";              view: WireView }
  | { kind: "rejected";          error: Rejection }
  | { kind: "protocol-mismatch"; expected: number }

type QueueIntent =
  | { kind: "quick" }
  | { kind: "host" }
  | { kind: "join"; code: string }

type QueueClientMessage = { kind: "hello"; protocol: number; intent: QueueIntent }

type RoomFault = { code: "unknown" } | { code: "own" }

type QueueServerMessage =
  | { kind: "waiting" }
  | { kind: "hosting";           code: string }
  | { kind: "room-fault";        fault: RoomFault }
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

La version est passée de 3 à 4 avec le retrait de la capture et de la règle d'échec
(`docs/design.md` sections 3.1 et 7.1) : `Action` a perdu son champ `capture` et `WireView`
son drapeau `check`. Un client resté en 3 enverrait des coups d'une forme que le serveur ne
comprend plus — la négociation le refuse explicitement plutôt que de le laisser diverger.

**`legalActions`** accompagne chaque vue : le client ne peut pas les recalculer, ne voyant
qu'un camp, et sans eux son interface propose des coups que le serveur refuse. Un refus
**ne rediffuse aucune vue** — les deux branches de refus de `MatchDO.play` sortent avant
`broadcastViews` — donc un client qui appliquerait le coup de son côté resterait
désynchronisé jusqu'à sa reconnexion. C'est pourquoi le client n'applique plus rien
(`docs/technical/engine.md`, `game/online-match.ts`).

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

### `migrations/0002_users.sql` et `0003_sessions.sql`

Le premier état des comptes et des sessions, **entièrement remplacé par `0004`**. Gardés
tels quels : une migration jouée ne se réécrit pas.

---

### `migrations/0004_better_auth.sql`

Le passage à Better Auth. Le DDL des cinq tables est **généré** (`auth:schema`), pas écrit
à la main : la bibliothèque émet ses requêtes sur ces noms exacts.

| Table | Rôle |
|---|---|
| `users` | Identité : `email` unique, `email_verified`, `name`, et `player_id` vers le profil |
| `accounts` | Un moyen d'authentification par ligne. Le mot de passe vit ici, sous `provider_id = 'credential'` — c'est aussi là qu'atterriront les fournisseurs OAuth |
| `sessions` | `token` (en clair), `expires_at`, `user_id` |
| `verifications` | Jetons de vérification d'adresse et de réinitialisation |
| `rate_limits` | Compteurs de débit. `lastRequest` garde sa casse, non configurable |

Trois choses à savoir sur cette migration :

- **Les comptes existants sont repris**, leur empreinte PBKDF2 déménageant vers `accounts`.
  Elle reste vérifiable puisque le hasher du projet est branché dans la configuration.
- **Les sessions existantes sont perdues** : elles ne stockaient que l'empreinte du jeton,
  quand Better Auth a besoin du jeton. Chacun se reconnecte une fois.
- **Les horodatages changent de représentation.** Le schéma précédent comptait en
  millisecondes ; Better Auth écrit du **texte ISO 8601**. La migration convertit avec
  `strftime('%Y-%m-%dT%H:%M:%fZ', ms / 1000.0, 'unixepoch')`, et un test verrouille le
  format produit. C'est le piège de ce schéma : SQLite classe tout entier avant tout texte,
  donc comparer une échéance à un nombre de millisecondes est **toujours faux**, sans rien
  signaler. Le ménage nocturne compare des chaînes ISO pour cette raison.

## `wrangler.toml` — bindings et environnements

Bindings (type dans `apps/server/src/env.d.ts`) :

| Binding | Type | Rôle |
|---|---|---|
| `DB` | `D1Database` | La base |
| `AUTH_SECRET` | `string` (secret) | Signe les cookies de session. **À provisionner par environnement** |
| `RESEND_API_KEY` | `string` (secret, optionnel) | Sans elle, les messages sont journalisés |
| `MAIL_FROM` | `string` (optionnel) | Expéditeur affiché |
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

50 tests, dont 29 **dans workerd** via `@cloudflare/vitest-pool-workers` : `pnpm --filter
@occulis/server test`.

| Fichier | Où | Ce qui est verrouillé |
|---|---|---|
| `seating.test.ts` | Node | Jeton → camp, refus d'un jeton inconnu ou vide, autorité de tour |
| `pairing.test.ts` | Node | File d'attente, remplacement d'une attente en double, appariement du plus ancien |
| `rooms.test.ts` | Node | Codes sans caractères confondables et déterministes, saisie normalisée, salon rendu à l'hôte qui revient, salon consommé une seule fois, code libre au tirage suivant |
| `match-do.integration.test.ts` | workerd | 403 sans jeton, une vue par camp sans fuite, refus hors tour, coup appliqué + écrit au log + diffusé, clôture en base, refus de protocole |
| `queue-do.integration.test.ts` | workerd | Deux joueurs appariés sur une même partie avec des sièges distincts, partie réellement joignable, **401 sans session et sur identité forgée dans l'URL**, salon privé apparié par son code (casse et espaces pardonnés, hôte en A), salon consommé une seule fois, refus d'un code inconnu et de son propre code |
| `auth/password.test.ts` | workerd | **Plafond de 100 000 itérations par passe jamais dépassé**, coût effectif conforme à l'OWASP, aller-retour hachage/vérification, salage, paramétrage inscrit dans l'empreinte, lecture de la forme d'avant le chaînage, empreinte illisible rejetée sans lever |
| `auth/auth.integration.test.ts` | workerd | Inscription et profil créés ensemble, session reconnue, jeton inventé refusé, attributs du cookie, **jeton lu en base insuffisant pour ouvrir une session**, mot de passe faux, **réponses indiscernables entre adresse inconnue et mot de passe faux**, adresse et pseudo uniques **sans compte orphelin**, mot de passe trop court, déconnexion, **limitation de débit**, **réinitialisation de bout en bout**, **file fermée sans adresse vérifiée** |
| `maintenance.integration.test.ts` | workerd | Purge des sessions périmées, des vérifications expirées et des compteurs retombés, et **format de conversion des horodatages de la migration** |

**Les tests d'intégration sont aussi le test d'hibernation** que `CLAUDE.md` réclame :
`webSocketMessage()` et `webSocketClose()` ne sont appelés que sur un socket accepté par
`ctx.acceptWebSocket()`. Passer à `server.accept()` — la variante qui empêche
l'hibernation et multiplie le coût par ~20 000 — ferait taire ces gestionnaires et
échouer tout le fichier.

Quatre choses ont été trouvées en exécutant le vrai runtime, qu'aucun test unitaire ne
voyait : la contrainte de clé étrangère de `matches` qui faisait échouer toute création de
partie ; l'absence de `webSocketClose()` sur `MatchDO`, qui levait une exception non
rattrapée à **chaque** déconnexion ; le ménage nocturne qui ne supprimait rien, ses
échéances étant comparées à un nombre quand la base contient du texte ISO ; et la route de
réinitialisation, qui répondait `404` sous son ancien nom `/forget-password` — le test qui
la couvrait comparait deux statuts égaux, et deux `404` le satisfaisaient. Il exige
désormais `200`.

`vitest.config.ts` lit les vraies migrations (`readD1Migrations`) et les applique à la base
de test : le schéma testé ne peut pas dériver de celui qui est déployé. `isolatedStorage`
est désactivé — cette version du pool ne sait pas isoler un DO adossé à SQLite — sans
conséquence, chaque test créant sa propre partie sous un identifiant tiré au hasard.

Il crée aussi `apps/web/dist` s'il manque : le pool fait lire `wrangler.toml` par wrangler,
qui refuse de démarrer quand le dossier d'`[assets]` est absent. Ce dossier vient du build
du client, qui ne précède pas les tests — ni en CI (`typecheck → lint → test → build`), ni
sur un dépôt fraîchement cloné. Aucun test ne sert d'asset : il n'a qu'à exister.

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
8. **Le schéma des tables Better Auth est généré, jamais édité.** `auth:schema` fait foi ;
   une colonne renommée à la main casse silencieusement les requêtes de la bibliothèque.
9. **Les échéances en base sont du texte ISO 8601.** Les comparer à un nombre de
   millisecondes est toujours faux et ne signale rien.

## Non implémenté

- **Aucun fournisseur OAuth.** La table `accounts` est prête à en recevoir et Better Auth
  les porte ; rien n'est configuré. C'est le prochain pas décidé (`docs/architecture.md`
  section 7).
- **Aucune authentification à deux facteurs**, bien que le greffon existe.
- **`trustedOrigins` n'est pas configuré.** Sans lui, un client Electron — qui n'est plus
  de même origine — se verra refuser les routes qui changent l'état.
- **Le corps de réponse de Better Auth expose `id` et `playerId`** à l'inscription et à la
  connexion, là où `/api/auth/me` s'en garde. Ce sont les identifiants du compte qui les
  reçoit, mais c'est un écart à l'intention initiale des routes du projet.
- **La signature de `sendLetter()` ignore les rebonds.** Un envoi refusé par Resend est
  journalisé, sans que personne ne l'apprenne.
- **`POST /api/matches` n'exige aucun compte** et crée au besoin des lignes `players`
  sans compte associé (`ensurePlayers`), pour qu'une partie privée ou un test démarre
  sans inscription. Ce n'est pas un chemin d'inscription — ces lignes n'ont ni mot de
  passe ni moyen de se connecter — mais c'est une porte ouverte à surveiller.
- **Aucun ELO, aucun classement, aucune liste d'amis** — les colonnes existent, rien ne
  les lit.
- **Aucune reprise de file après hibernation du `QueueDO`.** Les attentes dont le socket a
  disparu sont purgées à l'appariement suivant, pas activement. Les salons privés suivent
  la même règle : un salon dont l'hôte est parti n'est retiré qu'à la prochaine entrée.
- **Un salon privé n'expire pas de lui-même.** Tant que son hôte tient le socket ouvert,
  le code reste valable sans limite de durée.
- **Les tests tournent sur une compatibility date plus ancienne que la production.** Le
  workerd embarqué par le pool plafonne à `2024-12-30` alors que `wrangler.toml` demande
  `2026-08-27` ; miniflare le signale et retombe sur la sienne. Sans conséquence pour ce
  qui est testé — WebSockets, DO, D1 sont stables de longue date — mais un comportement
  introduit par une date récente ne serait pas couvert.
- **`VITE_SERVER_URL` n'existe nulle part dans le code**, contrairement à ce que
  `CLAUDE.md` laisse entendre. Sur le web, le client étant servi par le même Worker, une
  URL relative suffit. La contrainte « URL gravée dans le binaire » ne vaudra que pour la
  future distribution Electron, où le client n'est plus de même origine.
