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
| `apps/server/src/auth/better-auth.ts` | La configuration Better Auth : hasher, schéma, débit, Google, crochets, gardes |
| `apps/server/src/auth/routes.ts` | `/api/auth/me` et la délégation du reste à Better Auth |
| `apps/server/src/auth/password.ts` | PBKDF2 enchaîné, comparaison à temps constant, **branchés dans Better Auth** ; contrôle des fuites (HIBP) |
| `apps/server/src/auth/handle.ts` | **Pur** — règles du pseudo : normalisation, caractères, noms réservés, pseudo dérivé, pseudo anonyme |
| `apps/server/src/auth/mail.ts` | Les courriers (HTML et texte) et leur envoi par Resend |
| `apps/server/src/me/routes.ts` | `/api/me/*` : la page de profil — gardes, puis profil, pseudo, sessions, parties |
| `apps/server/src/me/queries.ts` | Les requêtes D1 du profil, **toutes bornées au compte de la session** |
| `apps/server/src/admin/routes.ts` | `/api/admin/*` : garde de rôle, puis lectures et renommage du back-office |
| `apps/server/src/admin/queries.ts` | Les requêtes D1 du back-office : statistiques, parties, bilan d'un joueur, renommage ; `replayLog()` partagé avec le profil |
| `apps/server/src/admin/paging.ts` | **Pur** — pagination et filtres de liste |
| `packages/protocol/src/admin.ts` | Les réponses de `/api/admin/*` — **paquet partagé** |
| `packages/protocol/src/me.ts` | Les réponses de `/api/me/*` — **paquet partagé** |
| `apps/server/src/test-helpers.ts` | Outils des suites d'intégration (inscription, cookie, IP distinctes) |
| `apps/server/scripts/generate-schema.mts` | Recrache le schéma SQL attendu — hors du Worker |
| `apps/server/src/pairing.ts` | **Pur** — la file d'attente comme structure de données |
| `apps/server/src/rooms.ts` | **Pur** — les salons privés : table des codes, tirage, consommation |
| `packages/protocol/src/index.ts` | Messages client/serveur et version de protocole — **paquet partagé** |
| `apps/server/src/rulesets.ts` | Registre des rulesets par version |
| `apps/server/src/env.d.ts` | Type des bindings : `DB`, `MATCH`, `QUEUE`, `ASSETS`, `AUTH_SECRET`, `RESEND_API_KEY`, `GOOGLE_*`, `OAUTH_PROXY_*`… |
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
| `/.well-known/change-password` | toute | **302** vers `/profil/#securite` — l'adresse que les gestionnaires de mots de passe ouvrent pour « changer le mot de passe » |
| `/connexion`, `/inscription`, `/mot-de-passe-oublie`, `/reinitialiser` | `GET` | `pageFor()` — la page du jeu (`/`), dont l'îlot de compte lit le chemin ; liste explicite `ACCOUNT_PATHS`, pas de repli global |
| `/profil` | `GET` | `pageFor()` — la page `/profil/` |
| `/api/auth/me` | toute | **Au projet** — pseudo, adresse, état de vérification, `admin`, `impersonating`, `providers` ; sans session `{ signedIn: false, providers }` |
| `/api/auth/sign-up/email` | `POST` | Better Auth — crée un compte, et son profil via le crochet |
| `/api/auth/sign-in/social` | `POST` | Better Auth — rend l'adresse de consentement Google (`{ url }`) |
| `/api/auth/callback/google` | `GET` | Better Auth — retour de Google : crée ou lie le compte, ouvre la session, redirige |
| `/api/auth/link-social`, `/api/auth/unlink-account` | `POST` | Better Auth — lier ou délier Google depuis le profil ; la dernière méthode de connexion ne se délie pas |
| `/api/auth/change-password` | `POST` | Better Auth — mot de passe actuel exigé ; **ferme toujours les autres sessions** ; avis par courrier |
| `/api/auth/change-email` | `POST` | Better Auth — lien à l'**ancienne** adresse, puis vérification de la nouvelle |
| `/api/auth/delete-user` puis `GET /api/auth/delete-user/callback` | | Better Auth — lien par courrier, puis suppression ; le profil est anonymisé |
| `/api/auth/sign-in/email` | `POST` | Better Auth — ouvre une session |
| `/api/auth/sign-out` | `POST` | Better Auth — ferme la session |
| `/api/auth/request-password-reset` | `POST` | Better Auth — envoie le message de réinitialisation |
| `/api/auth/reset-password` | `POST` | Better Auth — consomme le jeton et change le mot de passe |
| `/api/auth/send-verification-email` | `POST` | Better Auth — renvoie le message de vérification |
| `/api/auth/verify-email` | `GET` | Better Auth — marque l'adresse vérifiée |
| `/api/auth/admin/*` | `GET`/`POST` | Greffon `admin` de Better Auth — comptes, rôles, suspensions, sessions ; **403 sans le rôle `admin`** |
| `/api/auth/update-user`, `/api/auth/admin/update-user` avec un `name` | `POST` | **400 `HANDLE_READONLY`** — le pseudo se change par `/api/me/handle` ou `/api/admin/players/:id/handle` |
| routes de compte de Better Auth (`ACCOUNT_MUTATIONS`) sous usurpation | `POST` | **403 `IMPERSONATION_READONLY`** |
| tout le reste de `/api/auth/*` | toute | `auth.handler(request)` |
| `/api/admin/*` | `GET`/`POST` | `handleAdmin()` — **401 sans session, 403 sans le rôle `admin`**, 403 sur un `POST` d'une autre origine |
| `/api/me`, `/api/me/*` | `GET`/`POST` | `handleMe()` — **401 sans session**, 403 sur un `POST` d'une autre origine **ou sous usurpation** |
| `/api/matches` | `POST` | `createMatch()` — partie directe, hors file d'attente |
| `/api/queue` | WebSocket | `joinQueue()` — **401 sans session, 403 sans adresse vérifiée** |
| `/api/auth/*`, `/api/admin/*`, `/api/me*`, `/api/queue` sans `AUTH_SECRET` | toute | **503** — garde-fou `hasAuthSecret()`, avant toute construction de Better Auth |
| `/match/:id?seat=<jeton>` | WebSocket | `env.MATCH.get(env.MATCH.idFromName(matchId)).fetch(request)` |
| tout le reste | toute | `env.ASSETS.fetch(request)` — le client statique |

| Fonction | Emplacement | Rôle |
|---|---|---|
| `fetch()` (handler par défaut) | `apps/server/src/index.ts` | Routage |
| `hasAuthSecret()` | `apps/server/src/index.ts` | Vrai si `AUTH_SECRET` fait au moins 32 caractères ; sinon l'authentification et la file répondent 503 |
| `scheduled()` (handler cron) | `apps/server/src/index.ts` | Ménage nocturne : sessions, vérifications, compteurs de débit, profils orphelins |
| `pageFor()` | `apps/server/src/index.ts` | Chemin de parcours de compte ou `/profil` → page à servir, sinon `undefined` |
| `buildAuth()` | `apps/server/src/auth/better-auth.ts` | Construit l'instance Better Auth autour des bindings |
| `currentAccount()` | `apps/server/src/auth/routes.ts` | Session → `{ userId, playerId, handle, email, emailVerified, admin, impersonating }` |
| `isImpersonated()` | `apps/server/src/auth/better-auth.ts` | Vrai si la session porte un `impersonatedBy` non vide |
| `availableProviders()`, `hasGoogle()` | `apps/server/src/auth/better-auth.ts` | `["google"]` si les deux secrets Google sont posés, sinon `[]` |
| `handleMe()` | `apps/server/src/me/routes.ts` | Gardes, puis routage de `/api/me/*` |
| `isAdmin()` | `apps/server/src/auth/better-auth.ts` | Vrai si la colonne `role` contient `admin` (Better Auth y range plusieurs rôles séparés par des virgules) |
| `handleAdmin()` | `apps/server/src/admin/routes.ts` | Garde de rôle, puis routage de `/api/admin/*` |
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
expliquer. Il distingue deux cas par `ctx.path` (`isProviderSignUp()`) :

- **formulaire** (`claimHandle()`) : le pseudo passe `checkHandle()`, et un pseudo invalide
  ou pris fait échouer l'inscription (`HANDLE_LENGTH`, `HANDLE_CHARSET`,
  `HANDLE_RESERVED`, `HANDLE_TAKEN`) ;
- **retour de Google** (`/callback/:id`, `claimDerivedHandle()`) : le pseudo est **dérivé du
  nom Google** — `handleCandidates()` le nettoie, puis essaie `nom`, `nom-2`… `nom-9`, puis
  deux suffixes aléatoires ; un compte Google ne doit jamais échouer pour un pseudo qu'il
  n'a pas choisi, et le joueur le change depuis son profil.

Dans les deux cas, `users.name` reçoit **la même valeur normalisée** que `players.handle`.
Si l'inscription échoue entre le profil et le compte (une course sur l'adresse), le profil
orphelin est ramassé par le ménage nocturne.

`databaseHooks.user.delete.before` **anonymise le profil** d'un compte supprimé, par le
joueur comme par un administrateur : `players.handle` devient `anonymousHandle()`
(`supprimé-<12 caractères de l'identifiant>`). Le profil survit, parce que les logs de
parties le référencent et doivent rester rejouables pour l'adversaire. Le préfixe est
réservé, donc personne ne peut se faire passer pour un compte supprimé.

`databaseHooks.account.create.after` envoie un **avis par courrier** quand un fournisseur
est ajouté à un compte existant depuis plus d'une minute (liaison automatique ou depuis le
profil) : c'est une nouvelle porte d'entrée sur le compte.

**Les noms de colonnes sont ramenés au style du projet** (`email_verified`, `created_at`,
`user_id`…) par les blocs `fields`. Une seule échappe à la règle : `rate_limits.lastRequest`,
que la bibliothèque n'expose pas au renommage.

**Le schéma n'est jamais écrit à la main.** `pnpm --filter @occulis/server auth:schema`
rejoue d'abord les migrations existantes dans une base en mémoire, puis recrache **le
delta** attendu (`ALTER TABLE …`, rien si le schéma est à jour) ; il est recopié tel quel
dans une nouvelle migration. Le rejouer à chaque greffon ajouté (OAuth, 2FA) ou champ
supplémentaire.

**Le greffon `admin` est branché** (`plugins: [admin(…)]`) : il ajoute `role`, `banned`,
`ban_reason` et `ban_expires` à `users`, `impersonated_by` à `sessions`, et les routes
`/api/auth/admin/*`. Ses noms de champs sont ramenés au style du projet par son option
`schema`, comme pour les tables. Un compte suspendu voit ses sessions révoquées et ne
peut plus en ouvrir — donc plus entrer dans la file. Voir « `admin/` » plus bas.

**Le pseudo est en lecture seule pour les routes de Better Auth.** Il vit deux fois —
`users.name` pour la bibliothèque, `players.handle` pour le jeu, qui en tient l'unicité —
et `/update-user` comme `/admin/update-user` n'écriraient que le premier. Le crochet
`hooks.before` (`createAuthMiddleware`) refuse donc tout `name` sur ces deux chemins
(400, `HANDLE_READONLY`). Le pseudo ne change que par **deux routes**, qui écrivent les
deux tables dans le même lot : `POST /api/me/handle` (le joueur, au plus une fois par
30 jours) et `POST /api/admin/players/:id/handle` (un administrateur).

**Le crochet `hooks.before` porte trois autres gardes :**

- **usurpation = lecture seule** : sur les routes de `ACCOUNT_MUTATIONS` (`/change-password`,
  `/change-email`, `/delete-user` et son rappel, `/link-social`, `/unlink-account`,
  `/revoke-*`, `/update-user`, `/set-password`), une session marquée `impersonatedBy` reçoit
  403 `IMPERSONATION_READONLY`. Un administrateur qui usurpe voit ce que voit le joueur, il
  ne change rien à son compte ;
- **mots de passe ayant fuité** : sur `/sign-up/email`, `/change-password` et
  `/reset-password`, le nouveau mot de passe passe `breachedPassword()` (`password.ts`) —
  k-anonymat, seuls 5 caractères de l'empreinte SHA-1 partent chez Have I Been Pwned, avec
  `Add-Padding`. Refus : 400 `PASSWORD_COMPROMISED`. **Échoue ouvert** : une panne du service
  (2 s au plus) laisse passer, c'est pourquoi le greffon `haveIBeenPwned` de Better Auth,
  qui échoue fermé, n'est pas utilisé. `PASSWORD_BREACH_CHECK=off` coupe le contrôle (tests) ;
- **changer de mot de passe ferme toujours les autres sessions** : le crochet force
  `revokeOtherSessions: true`, quoi que demande le client.

`hooks.after` envoie l'avis « votre mot de passe a changé » après un `/change-password`
réussi.

### Google

`socialProviders.google`, **activé seulement si `GOOGLE_CLIENT_ID` et `GOOGLE_CLIENT_SECRET`
sont posés** (`hasGoogle()`) ; sinon `/api/auth/me` rend `providers: []` et le client
masque le bouton. `prompt: "select_account"` : toujours proposer le choix du compte, pour
qu'un poste partagé ne connecte pas d'office avec le compte Google d'un autre. Procédure de
création du client dans `docs/setup.md` section 7.

**Liaison automatique** (`account.accountLinking.enabled`) : se connecter avec Google sur
une adresse qui a déjà un compte rattache Google à ce compte. Deux garde-fous de la
bibliothèque, et c'est pour eux que Google n'est **pas** déclaré en `trustedProviders` (ce
qui les lèverait) :

- Google doit affirmer l'adresse vérifiée (`email_verified`) ;
- le compte local doit l'être aussi (`requireLocalEmailVerified`, par défaut). Sans lui,
  quelqu'un pourrait inscrire votre adresse avec son propre mot de passe, et récupérer
  votre compte le jour où vous arriveriez par Google. Le retour porte alors
  `?error=account_not_linked`, que le client explique.

Un compte Google sans mot de passe en obtient un **par le lien de réinitialisation** : 
`/reset-password` crée le compte `credential` absent (vérifié dans la 1.7.3). La preuve de
possession de l'adresse est le courrier, ce que la seule session ne prouve pas.

**Le proxy OAuth des environnements de branche** (`oauthProxyPlugin()`). Google exige des
adresses de retour exactes, sans joker ; chaque branche a son domaine. Le greffon
`oAuthProxy` fait revenir Google par la recette, qui renvoie le profil **chiffré** à la
branche (`/callback/google/oauth-proxy`, charge utile valable 60 s). Il n'est branché que si
`OAUTH_PROXY_URL` (l'URL de la recette) et `OAUTH_PROXY_SECRET` (32 caractères au moins)
sont posés, **sur la recette et sur chaque branche** — la recette y reconnaît sa propre URL
et ne proxifie pas ses propres connexions. Ni la production ni le local ne le portent :
leur adresse de retour est déclarée chez Google. Le secret est **dédié** : une fuite côté
branche ne permet pas de signer des sessions de recette, ce que permettrait le partage
d'`AUTH_SECRET`.

### Les règles du pseudo — `handle.ts`

| Fonction | Rôle |
|---|---|
| `normalizeHandle()` | NFKC, trim, espaces internes réduits à un seul |
| `checkHandle()` | `{ ok, handle }` ou `{ ok: false, code }` : 2 à 24 caractères (code points) ; lettres, chiffres, diacritiques, `_ . -` et espace ; **pas** de contrôle, d'invisible, de bidi (U+202E), de symbole ni d'emoji ; pas deux diacritiques empilés ; ni nom réservé (`admin`, `moderateur`, `occulis`… comparés sans casse, accents ni séparateurs), ni préfixe `supprime` |
| `handleCandidates()` | Les pseudos à essayer pour un compte Google, tous valides |
| `anonymousHandle()` | Le pseudo d'un profil dont le compte est supprimé |

L'unicité est **insensible à la casse** : index `players_handle_nocase` (migration 0006),
en plus de la contrainte `UNIQUE` d'origine. Les pseudos existants de plus de 24 caractères
ne sont pas revalidés ; la règle s'applique au prochain changement.

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

**`AUTH_SECRET` est donc ce qui tient toute la construction.** Sans lui, Better Auth ne
refuse **pas** de démarrer dans un Worker : il ne reconnaît la production qu'à `NODE_ENV`,
absent ici, et retombe en silence sur son secret par défaut, qui est public. C'est
`hasAuthSecret()` (`index.ts`) qui ferme la porte : sans secret d'au moins 32 caractères,
`/api/auth/*` et `/api/queue` répondent 503, le client statique et les parties restent
servis — vérifié par un test. Le changer déconnecte tout le monde ; le divulguer permet de forger n'importe
quelle session.

### La limitation de débit

En base (`rate_limits`), et non en mémoire : une isolate Worker ne survit pas d'une requête
à l'autre, un compteur mémoire ne limiterait donc rien. Cent requêtes par minute par
défaut, et des règles plus serrées : cinq connexions par minute, cinq inscriptions par
heure, trois demandes de réinitialisation par heure (`/request-password-reset`), dix
réinitialisations, cinq renvois de vérification, cinq changements d'adresse et trois
demandes de suppression par heure, cinq changements de mot de passe par quart d'heure,
vingt départs vers Google par minute, dix liaisons par heure.

**La règle de réinitialisation a longtemps été morte** : elle portait sur
`/forget-password`, renommée `/request-password-reset` en 1.7, et la route retombait sur
la limite générale. Un test verrouille désormais le 429. Les routes `/api/me/*` ne passent
pas par ce limiteur ; le seul geste qui y compte, le changement de pseudo, est borné par
son délai de 30 jours.

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

Six courriers, chacun en **HTML et en texte** (`compose()`) : vérification, réinitialisation,
confirmation de changement d'adresse (à l'ancienne), suppression, avis de mot de passe
changé, avis de fournisseur lié. Le gabarit (`html()`) est fait de tableaux et de styles en
ligne — ce que les clients de messagerie savent rendre — sans image : la marque est un
mot-symbole en texte. Les couleurs viennent de `@occulis/ui/tokens`, **précomposées sur le
fond** par `hexColor()` (Outlook et d'autres ignorent `rgb(… / alpha)`). Toute valeur venue
de l'extérieur est échappée (`escapeHtml()`), lien compris. `MAIL_REPLY_TO`, s'il est posé,
devient l'en-tête `reply_to`.

Envoi par Resend : un Worker n'a pas de socket sortant, seulement `fetch`, et
MailChannels a fermé son offre gratuite aux Workers en 2024. **Sans `RESEND_API_KEY`, les
messages sont journalisés au lieu d'être émis**, lien compris — c'est ce qui rend les
parcours traversables en local et en test sans compte Resend. Un échec d'envoi est
journalisé sans être propagé : le compte existe, un second message peut être demandé. Le
corps de la réponse de Resend est journalisé avec le statut, parce que c'est lui qui dit
pourquoi l'envoi est refusé (domaine non vérifié, expéditeur non autorisé, clé révoquée) —
visible par `wrangler tail --env <env>`.

**En déployé, la clé n'est pas facultative en pratique** : la file d'attente et les salons
privés passent tous deux par `/api/queue`, qui exige une adresse vérifiée. Sans message
reçu, aucun joueur ne peut entrer en partie.

## `admin/` — le back-office

Le back-office se partage en deux familles de routes, selon qui possède la donnée :

| Préfixe | Porté par | Couvre |
|---|---|---|
| `/api/auth/admin/*` | Greffon `admin` de Better Auth | Le **compte** : liste et recherche, fiche, création, adresse et vérification, rôle, suspension (motif, durée), mot de passe, sessions, suppression, **usurpation** |
| `/api/admin/*` | `admin/routes.ts`, le projet | Ce que Better Auth ignore : **statistiques**, **parties**, **bilan d'un joueur**, et le **pseudo**, qui vit dans les deux mondes |

**La garde de rôle est faite côté serveur, à chaque appel.** `handleAdmin()` résout la
session depuis le cookie et exige `isAdmin(user.role)` avant toute route ; le greffon
porte son propre contrôle, indépendant. Le lien du menu et la vérification faite par la
page `/admin/` ne sont qu'une politesse d'affichage. Un `POST` sur `/api/admin/*` doit en
plus venir de la même origine (`Origin`), comme Better Auth l'exige pour ses routes.

Le premier administrateur se nomme à la main, par une requête sur la base de
l'environnement (`docs/setup.md` section 7) ; les suivants, depuis le back-office.

| Route | Méthode | Fonction | Réponse |
|---|---|---|---|
| `/api/admin/stats` | `GET` | `readStats()` | `AdminStats` — comptes, vérifiés, suspendus, admins, profils, parties, en cours, coups, et les deux compteurs sur 7 jours |
| `/api/admin/matches?player=&status=&limit=&offset=` | `GET` | `listMatches()` | `AdminMatchPage` — les parties, les plus récentes d'abord, avec les deux pseudos et le nombre de coups, et le total filtré |
| `/api/admin/matches/:id` | `GET` | `readMatch()` | `AdminMatchDetail` — la partie, son log **rejoué**, et une image de la position par coup (`frames`) |
| `/api/admin/players/:id` | `GET` | `readPlayer()` | `AdminPlayer` — profil, compte lié s'il existe, bilan victoires/défaites/en cours |
| `/api/admin/players/:id/handle` | `POST` | `renamePlayer()` | `{ handle }`, ou 400 (`HANDLE_LENGTH`, `HANDLE_CHARSET`, `HANDLE_RESERVED` — `checkHandle()`), 422 `HANDLE_TAKEN`, 404 |

Quelques points de fonctionnement :

- **`parsePage()` borne la taille de page à 100** (25 par défaut) : une page démesurée
  ferait lire toute la table à chaque appel. `parseMatchFilter()` n'accepte que les
  statuts `ongoing` et `finished`.
- **`listMatches()` partage son filtre** (`MATCH_FILTER`, paramètres `?1`/`?2`) entre la
  page et le décompte, pour que la pagination ne mente pas.
- **`readStats()` compare chaque seuil dans le format de sa colonne** : texte ISO pour
  `users.created_at`, millisecondes pour `matches.started_at` — le piège déjà décrit pour
  le ménage nocturne.
- **`readPlayer()` rapporte le vainqueur au joueur par le siège** :
  `json_extract(outcome, '$.winner')` donne `A` ou `B`, et `player_a` joue toujours `A`.
- **`readMatch()` rejoue le log avec `core`** par `replayLog()` (`createGame`,
  `startMemory`, `advanceMemory`), comme `MatchDO.load()` ; `replayLog()` prend la
  fonction qui tire une image d'une position, ce qui le rend partagé avec le profil. Deux usages : attribuer chaque coup à son camp
  — l'`Action` sérialisée ne nomme pas son auteur — et produire les **images** du rejeu
  (`frameOf()`) : `frames[0]` est la position de départ, `frames[n + 1]` celle qui suit le
  coup `n`, chacune avec **toutes** les pièces et les cases que chaque camp voyait alors.
  Passer par la mémoire de brouillard plutôt que par `replay` seul est ce qui donne ces
  lignes de vue. Si le rejeu échoue — log corrompu, ruleset retiré du registre — le log est
  rendu quand même, les images s'arrêtent au coup fautif, le camp passe à `null`, et
  `replayError` dit pourquoi.
- **Ces images sont exactement ce que le serveur refuse à un joueur** : la position
  complète, pièces hors LOS comprises. Elles ne sortent que derrière la garde de rôle, et
  un administrateur qui joue une partie en cours pourrait s'en servir — c'est une
  confiance accordée au rôle, pas une garantie du protocole.
- **`renamePlayer()` écrit `players.handle` et `users.name` dans un même `batch`**, que D1
  exécute en transaction : un pseudo pris laisse les deux tables intactes.

### L'usurpation

`POST /api/auth/admin/impersonate-user` ouvre une session **au nom du joueur** : le cookie
de session est remplacé par celui d'une session neuve, marquée `impersonated_by` avec
l'identifiant de l'administrateur, et la session de ce dernier est mise de côté dans un
cookie signé (`occulis.admin_session`). `POST /api/auth/admin/stop-impersonating` supprime
la session d'emprunt et rend la sienne à l'administrateur. Trois garde-fous :

- **une heure au plus** (`impersonationSessionDuration`) : une session d'emprunt oubliée
  tombe d'elle-même ;
- **jamais un autre administrateur** — réglage par défaut du greffon, verrouillé par un
  test ;
- **toujours visible** : `currentAccount()` lit `session.impersonatedBy`, `/api/auth/me`
  le rend en `impersonating`, et le client affiche un bandeau sur tous ses écrans.

Pendant l'usurpation, **tout ce qui lit l'identité lit celle du joueur** : la file d'attente,
les salons, et le back-office lui-même, qui se ferme (403) faute de rôle. C'est voulu — c'est
ce qui permet de reproduire ce qu'il voit — mais tout coup joué l'est en son nom.

## `me/` — la page de profil

Le pendant du back-office, pour **son propre** compte. Deux familles, comme pour l'admin :
tout ce qui touche au compte passe par Better Auth (mot de passe, adresse, Google,
suppression — voir le tableau des routes) ; le projet ne porte que ce que la bibliothèque
ignore, sous `/api/me/`.

**Trois gardes, posées à l'entrée de `handleMe()` pour toutes les routes :**

1. **l'identité vient de la session.** Aucune route ne prend d'identifiant de compte ou de
   joueur, et **chaque requête de `me/queries.ts` reprend celui de la session dans sa
   clause `WHERE`** : une partie, une session ou un profil d'autrui répond « introuvable »,
   exactement comme une ligne qui n'existe pas ;
2. **un `POST` doit venir de la même origine** (`Origin`), comme pour l'admin ;
3. **une session d'emprunt est en lecture seule** : tout `POST` y reçoit 403
   `IMPERSONATION_READONLY` — le même refus que `hooks.before` oppose aux routes de compte
   de Better Auth.

| Route | Méthode | Fonction | Réponse |
|---|---|---|---|
| `/api/me` | `GET` | `readProfileRow()` | `MeProfile` — pseudo, adresse, vérification, date d'inscription, prochain changement de pseudo, mot de passe défini ou non, fournisseurs liés et proposés, usurpation, bilan |
| `/api/me/handle` | `POST` | `changeHandle()` | `{ handle, nextHandleChangeAt }`, ou 400 (`checkHandle()`, `HANDLE_UNCHANGED`), 422 `HANDLE_TAKEN`, 429 `HANDLE_COOLDOWN` |
| `/api/me/sessions` | `GET` | `listSessions()` | `MeSession[]` — **sans jeton** : la session se désigne par son identifiant de ligne |
| `/api/me/sessions/:id/revoke` | `POST` | `revokeSession()` | `{ revoked: 1 }`, ou 404 si la session n'est pas à vous |
| `/api/me/sessions/revoke-others` | `POST` | `revokeOtherSessions()` | `{ revoked: n }` |
| `/api/me/matches?limit=&offset=` | `GET` | `listMyMatches()` | `MeMatchPage` — vos parties, votre camp, le pseudo adverse, le résultat de votre point de vue |
| `/api/me/matches/:id` | `GET` | `readMyMatch()` | `MeMatchDetail`, **409 `MATCH_ONGOING`** pour une partie en cours, 404 si elle n'est pas à vous |

Quelques points de fonctionnement :

- **Le délai de pseudo (`HANDLE_COOLDOWN_MS`, 30 jours) est vérifié dans l'écriture
  elle-même** (`UPDATE … WHERE handle_changed_at IS NULL OR handle_changed_at <= ?`), pas
  seulement lu avant : deux requêtes simultanées ne passent pas toutes les deux. La
  seconde instruction du lot ne touche `users.name` que si la première a écrit le nouveau
  pseudo. Le renommage par un administrateur ne touche pas `handle_changed_at`.
- **Les sessions ne passent pas par `/api/auth/list-sessions`**, qui rend les jetons au
  JavaScript de la page. `listSessions()` lit `sessions` directement et n'en sort que
  l'identifiant, les dates, l'agent, l'IP et le marqueur d'usurpation.
- **Le replay est vu de votre camp seulement.** `readMyMatch()` rejoue le log par
  `replayLog()`, mais chaque image est `viewFor(state, knowledge[seat])` — exactement ce
  que le `MatchDO` vous avait envoyé : vos pièces, les pièces adverses dans votre ligne de
  vue, vos fantômes. Les coups adverses du log sont rendus avec `action: null` (sauf un
  abandon) : ils nomment la pièce et sa destination, donc révéleraient des positions que
  vous n'avez jamais vues. Une partie **en cours** est refusée : le replay resservirait la
  vue courante hors du siège. Révéler toute la partie une fois finie serait une décision
  de design, non tranchée.

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

### `migrations/0005_admin.sql`

Le greffon `admin`. Les cinq `ALTER TABLE` sont **générés** par `auth:schema` (`role`,
`banned`, `ban_reason`, `ban_expires` sur `users` ; `impersonated_by` sur `sessions`).
S'y ajoute une reprise : les comptes existants prennent le rôle `user`, celui que Better
Auth donne aux nouveaux. **Aucun administrateur n'est désigné par la migration.**

### `migrations/0006_handles.sql`

Écrite à la main — elle ne touche que `players`, que Better Auth ignore. Elle ajoute
`players.handle_changed_at` (millisecondes, `NULL` pour un pseudo jamais changé) et l'index
`players_handle_nocase` (`handle COLLATE NOCASE`), qui rend l'unicité insensible à la casse.

**Les pseudos qui ne diffèrent que par la casse sont départagés avant l'index**, sans quoi
sa création échouerait et la migration bloquerait le déploiement : le plus ancien garde son
pseudo, les autres reçoivent `-<6 caractères de leur identifiant>`, et `users.name` suit.
C'est arrivé sur la base locale du porteur du projet (`Cactus` / `cactus`). Leur
`handle_changed_at` reste `NULL` : ils peuvent changer de pseudo aussitôt.

## `wrangler.toml` — bindings et environnements

Bindings (type dans `apps/server/src/env.d.ts`) :

| Binding | Type | Rôle |
|---|---|---|
| `DB` | `D1Database` | La base |
| `AUTH_SECRET` | `string` (secret) | Signe les cookies de session. **À provisionner par environnement** |
| `RESEND_API_KEY` | `string` (secret) | Sans elle, les messages sont journalisés — donc aucune adresse vérifiable en déployé |
| `MAIL_FROM` | `string` (optionnel) | Expéditeur affiché |
| `MAIL_REPLY_TO` | `string` (optionnel) | Adresse de réponse des courriers |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | `string` (secrets, optionnels) | Le client OAuth Google ; sans les deux, Google n'est pas proposé |
| `OAUTH_PROXY_URL`, `OAUTH_PROXY_SECRET` | `string` (secrets, optionnels) | Le proxy OAuth : posés sur la recette **et** les branches, jamais en production ni en local |
| `PASSWORD_BREACH_CHECK` | `string` (optionnel) | `off` coupe le contrôle des fuites (tests, poste hors ligne) |
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

111 tests, dont 86 **dans workerd** via `@cloudflare/vitest-pool-workers` : `pnpm --filter
@occulis/server test`.

| Fichier | Où | Ce qui est verrouillé |
|---|---|---|
| `seating.test.ts` | Node | Jeton → camp, refus d'un jeton inconnu ou vide, autorité de tour |
| `pairing.test.ts` | Node | File d'attente, remplacement d'une attente en double, appariement du plus ancien |
| `rooms.test.ts` | Node | Codes sans caractères confondables et déterministes, saisie normalisée, salon rendu à l'hôte qui revient, salon consommé une seule fois, code libre au tirage suivant |
| `match-do.integration.test.ts` | workerd | 403 sans jeton, une vue par camp sans fuite, refus hors tour, coup appliqué + écrit au log + diffusé, clôture en base, refus de protocole |
| `queue-do.integration.test.ts` | workerd | Deux joueurs appariés sur une même partie avec des sièges distincts, partie réellement joignable, **401 sans session et sur identité forgée dans l'URL**, salon privé apparié par son code (casse et espaces pardonnés, hôte en A), salon consommé une seule fois, refus d'un code inconnu et de son propre code |
| `auth/password.test.ts` | workerd | **Plafond de 100 000 itérations par passe jamais dépassé**, coût effectif conforme à l'OWASP, aller-retour hachage/vérification, salage, paramétrage inscrit dans l'empreinte, lecture de la forme d'avant le chaînage, empreinte illisible rejetée sans lever ; **contrôle des fuites : seul le préfixe part**, leurres ignorés, **service en panne laissé passer** |
| `auth/handle.test.ts` | workerd | Normalisation NFKC, longueur en code points, écritures non latines, **refus des invisibles et du bidi**, symboles, emoji et diacritiques empilés, **noms réservés sous toutes leurs formes**, pseudo dérivé (nettoyage, suffixes, repli), profil anonymisé imprenable |
| `auth/mail.test.ts` | workerd | Lien présent en texte et en HTML, **échappé**, aucune couleur transparente ni propriété CSS, **valeur utilisateur échappée** |
| `auth/auth.integration.test.ts` | workerd | Inscription et profil créés ensemble, session reconnue, jeton inventé refusé, attributs du cookie, **jeton lu en base insuffisant pour ouvrir une session**, mot de passe faux, **réponses indiscernables entre adresse inconnue et mot de passe faux**, adresse et pseudo uniques **sans compte orphelin**, mot de passe trop court, déconnexion, **limitation de débit**, **réinitialisation de bout en bout**, **file fermée sans adresse vérifiée** |
| `admin/paging.test.ts` | Node | Taille de page bornée, décalage négatif refusé, valeur illisible ignorée, statut inconnu écarté |
| `me/me.integration.test.ts` | workerd | **401 sans session**, profil du seul compte de la session, pseudo changé dans les deux tables **puis délai imposé**, **collision insensible à la casse**, nom réservé, bidi, **`POST` d'une autre origine refusé**, pseudo normalisé et réservé à l'inscription, **sessions listées sans jeton**, **révocation refusée sur la session d'un autre compte**, fermeture des autres sessions, **changement de mot de passe qui ferme les autres sessions même sans le demander**, **replay refusé en cours (409) et à un tiers (404)**, **replay où une pièce adverse n'apparaît que sur une case vue**, résultat de chaque point de vue, **usurpation : profil lisible, sept routes de compte refusées**, **suppression par le lien puis profil anonymisé**, **limite des demandes de réinitialisation**, `/.well-known/change-password` |
| `admin/admin.integration.test.ts` | workerd | **401 anonyme et 403 joueur ordinaire, sur nos routes comme sur celles du greffon**, `admin` dans `/api/auth/me`, **`POST` d'une autre origine refusé**, **usurpation signalée par `/api/auth/me`, back-office fermé pendant, session rendue à l'arrêt**, **usurpation d'un administrateur refusée**, liste des comptes avec rôle et `playerId`, **suspension qui ferme les sessions et la connexion**, puis levée, **renommage refusé par les routes de Better Auth**, parties filtrées par joueur et paginées, log rejoué avec son camp, une image par coup où chaque camp voit ses pièces, **bilan correct quel que soit le siège**, **renommage des deux tables d'un geste, intactes sur un pseudo pris** |
| `maintenance.integration.test.ts` | workerd | Purge des sessions périmées, des vérifications expirées et des compteurs retombés, **des seuls profils orphelins anciens sans partie**, et **format de conversion des horodatages de la migration** |

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

Les outils communs des suites (inscription, cookie, IP distinctes) vivent dans
`test-helpers.ts`, pas dans un fichier de test : importer un fichier de test depuis un autre
y rattache ses `describe`, et la suite d'origine se retrouvait vide. `vitest.config.ts`
pose `PASSWORD_BREACH_CHECK=off` : aucun appel sortant depuis la suite.

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
10. **Le pseudo s'écrit dans les deux tables à la fois.** `users.name` et
    `players.handle` ne changent que par `renamePlayer()` (admin) et `changeHandle()`
    (joueur), et à la création par le crochet d'inscription ; le crochet qui refuse `name`
    sur les routes de Better Auth en est la garde. Tout pseudo passe `checkHandle()`.
11. **Toute route `/api/admin/*` passe par la garde de rôle de `handleAdmin()`.** Une
    route ajoutée hors de ce préfixe ne la reçoit pas.
12. **Toute requête de `me/queries.ts` est bornée par l'identifiant de la session.** Jamais
    par le seul identifiant venu de l'URL.
13. **Une session d'emprunt ne modifie pas le compte.** Une route de compte ajoutée à
    Better Auth (un greffon) doit rejoindre `ACCOUNT_MUTATIONS`, une route `/api/me/*` en
    `POST` hérite de la garde de `handleMe()`.
14. **Le replay joueur ne contient que la vue de son siège.** Jamais `frameOf()` (la
    position complète du back-office), jamais le coup adverse détaillé.
15. **Google n'est pas un `trustedProvider`.** L'y déclarer lèverait les deux garde-fous de
    la liaison automatique, dont celui qui empêche la capture d'un compte par une adresse
    inscrite d'avance.

## Non implémenté

- **Google est le seul fournisseur.** Discord, Apple ou Steam restent ouverts
  (`docs/architecture.md` section 7) ; un fournisseur ajouté reprend la même liaison et le
  même pseudo dérivé.
- **Pas de clés d'accès (passkeys)**, bien que Better Auth ait un greffon : ce serait le
  pas suivant pour les gestionnaires de mots de passe.
- **Aucune authentification à deux facteurs**, bien que le greffon existe — elle serait
  pourtant la bienvenue sur les comptes administrateurs.
- **Aucun journal des actions d'administration.** Qui a suspendu ou renommé qui n'est
  consigné nulle part. Seule l'usurpation laisse une trace, `sessions.impersonated_by`, et
  elle disparaît avec la session.
- **`trustedOrigins` n'est pas configuré.** Sans lui, un client Electron — qui n'est plus
  de même origine — se verra refuser les routes qui changent l'état.
- **Le corps de réponse de Better Auth expose `id`, `playerId` et le jeton brut** à
  l'inscription, à la connexion et au changement de mot de passe (inutilisable sans la
  signature du cookie), là où `/api/auth/me` s'en garde. Ce sont les identifiants du compte qui les
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
