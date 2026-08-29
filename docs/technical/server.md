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
| `apps/server/src/index.ts` | Worker : routage, création de partie, service du client |
| `apps/server/src/match-do.ts` | `MatchDO` : le Durable Object de partie |
| `apps/server/src/protocol.ts` | Messages client/serveur et version de protocole |
| `apps/server/src/rulesets.ts` | Registre des rulesets par version |
| `apps/server/src/scenarios.ts` | Registre des scénarios de départ |
| `apps/server/src/env.d.ts` | Type des bindings : `DB`, `MATCH`, `ASSETS` |
| `apps/server/wrangler.toml` | Configuration et environnements |
| `apps/server/migrations/*.sql` | Schéma D1 |

---

## `index.ts` — le Worker

Le Worker **ne détient aucun état de partie**. Il authentifiera (pas encore fait), écrit
en D1, puis route vers le Durable Object.

| Route | Méthode | Traitement |
|---|---|---|
| `/api/matches` | `POST` | `createMatch()` |
| `/match/:id` | toute | `env.MATCH.get(env.MATCH.idFromName(matchId)).fetch(request)` |
| tout le reste | toute | `env.ASSETS.fetch(request)` — le client statique |

| Fonction | Emplacement | Rôle |
|---|---|---|
| `fetch()` (handler par défaut) | `apps/server/src/index.ts` | Routage |
| `createMatch()` | `apps/server/src/index.ts` | Crée l'identifiant, écrit la ligne `matches`, initialise le DO |

**`idFromName(matchId)`** est le point clé : deux joueurs de la même partie atteignent
forcément la même instance de DO, sans annuaire ni coordination.

`createMatch()` enchaîne : `crypto.randomUUID()` pour l'identifiant, un `INSERT` dans
`matches` (avec `CURRENT_RULESET_VERSION` et `DEFAULT_SCENARIO`), puis un `POST /init`
vers le DO pour y déposer la configuration. Il répond `{ matchId }`.

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

### Le cycle d'une action

```
webSocketMessage  ──►  play(action, ws)
                         │
                         ├─ load()                    état courant (cache ou rejeu)
                         ├─ applyAction(state, action) @occulis/core
                         │     └─ échec ──► send({ kind: "rejected", error })   ← à l'émetteur seul
                         ├─ observe() × 2              met à jour les deux mémoires
                         ├─ appendToLog(action)        INSERT dans match_actions
                         └─ broadcastViews()           un viewFor() par joueur
```

L'ordre compte : **le log est écrit avant la diffusion**. Un client ne voit donc jamais un
état que la source de vérité ignore.

`appendToLog()` utilise `state.turn` **après** application comme valeur de `seq` : la
première action porte `seq = 1`. La séquence est monotone et unique par partie, ce que la
clé primaire `(match_id, seq)` garantit.

### `load()` — la reconstruction par rejeu

Si `this.live` est en cache, elle le renvoie. Sinon :

1. `config()` relit la `MatchConfig` du stockage du DO.
2. `scenarioFor()` et `rulesetFor()` reconstruisent le plateau, les pièces et les règles
   **de la version figée à la création**.
3. `createGame()` reconstruit l'état initial, `observe()` les deux connaissances.
4. Toutes les lignes de `match_actions` sont relues `ORDER BY seq ASC` et rejouées par
   `applyAction()`.

Un rejeu qui échoue lève `Log corrompu pour <matchId>` — c'est volontairement fatal :
poursuivre sur un état divergent serait pire.

**Cette méthode n'est correcte que parce que `packages/core` est strictement
déterministe.** Un `Math.random` ou un `Date.now` glissé dans `core` la casserait
silencieusement, et la mémoire fantôme reconstruite ne correspondrait plus à celle que les
joueurs ont réellement eue.

---

## `protocol.ts`

```ts
const PROTOCOL_VERSION = 1

type ClientMessage =
  | { kind: "hello";  protocol: number }
  | { kind: "action"; action: Action }

type ServerMessage =
  | { kind: "view";              view: WireView }
  | { kind: "rejected";          error: ActionError }
  | { kind: "protocol-mismatch"; expected: number }
```

| Fonction | Emplacement | Rôle |
|---|---|---|
| `encodeView()` | `apps/server/src/protocol.ts` | `PlayerView` → `WireView` sérialisable |

**Pourquoi `WireView` existe** : `PlayerView.visible` est un `ReadonlySet`, et
`JSON.stringify` sérialise un `Set` en `{}`. `encodeView()` le convertit en tableau. Tout
futur client devra faire la conversion inverse avant de passer la vue au rendu — `Scene`
(`apps/web/src/scene.ts`) attend bien un `Set`.

**Pourquoi la version est négociée** : un client téléchargé (cible Electron) embarque un
vieux `core` et calcule donc les coups légaux avec de vieilles règles. Le serveur doit
pouvoir le refuser explicitement (`protocol-mismatch`, puis fermeture avec le code 4001)
plutôt que le laisser diverger en silence.

---

## `rulesets.ts` et `scenarios.ts` — les registres versionnés

| Fonction / constante | Emplacement | Rôle |
|---|---|---|
| `CURRENT_RULESET_VERSION` | `apps/server/src/rulesets.ts` | Version attribuée aux nouvelles parties — `"provisional-0"` |
| `rulesetFor()` | `apps/server/src/rulesets.ts` | Version → `Ruleset` ; **lève** si inconnue |
| `DEFAULT_SCENARIO` | `apps/server/src/scenarios.ts` | Scénario des nouvelles parties — `"demo-0"` |
| `scenarioFor()` | `apps/server/src/scenarios.ts` | Nom → `{ board, pieces }` ; **lève** si inconnu |

Le registre ne définit **aucun type de pièce lui-même** : il appelle
`provisionalRuleset()` de `@occulis/core` (`packages/core/src/pieces/roster.ts`). Client et
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

## Non implémenté

- **Aucune authentification.** `createMatch()` lit `playerA` et `playerB` dans le corps de
  la requête sans la moindre vérification. Aucune route ne crée de ligne dans `players` ni
  dans `users`.
- **Aucun matchmaking.** Le second Durable Object global décrit dans
  `docs/architecture.md` n'existe pas.
- **Aucun ELO, aucun historique, aucun classement, aucune liste d'amis** — les colonnes
  existent, rien ne les lit ni ne les écrit.
- **`matches.finished_at` et `matches.outcome` ne sont jamais renseignés** : rien ne clôt
  une partie en base quand `GameState.outcome` devient non nul.
- **Aucun test** dans `apps/server`, seul paquet du dépôt dans ce cas. Le workflow CI est
  prêt à les exécuter : `pnpm -r test` ne lance que les paquets déclarant un script `test`,
  en ajouter un suffira.
- **Aucun test d'hibernation**, alors que `CLAUDE.md` en demande un explicitement.
- **`VITE_SERVER_URL` n'existe nulle part dans le code**, contrairement à ce que
  `CLAUDE.md` laisse entendre. Sur le web, le client étant servi par le même Worker, une
  URL relative suffit. La contrainte « URL gravée dans le binaire » ne vaudra que pour la
  future distribution Electron, où le client n'est plus de même origine.
