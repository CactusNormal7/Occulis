# Audit de refonte technique

> État au **2026-10-18**, commit `50fa50d` (branche `feature/technicalReview`). Tâche OCC-94,
> recoupe OCC-41. **Rapport seul : aucun code n'a été modifié.** Les propositions de la
> section 7 restent des propositions tant qu'elles ne sont pas validées.

Cadre retenu avec le porteur du projet le 2026-10-18 :

- périmètre de la refonte : tout le monorepo, **`apps/web` d'abord**, puis `apps/server`, puis les paquets ;
- **pas de gel** : lots courts au fil de l'eau ; la migration #41 attend que la direction graphique (OCC-89/90) soit figée, pour ne pas migrer deux fois ;
- « propre » se mesure par un **ESLint plus strict** et une **couverture de tests** ;
- les commentaires s'adressent à **un autre développeur** : il connaît TypeScript et Cloudflare, pas Occulis.

Notation : **R** = risque du changement (faible / moyen / élevé), **G** = gain (faible / moyen / élevé).
Les lignes citées valent pour le commit ci-dessus. Les fichiers `* 2.*` (doublons iCloud, voir N1) sont ignorés partout.

---

## 0. Synthèse

### Lots recommandés, dans l'ordre

| #   | Lot                                                                                   | Section   | R      | G      | Prérequis                 |
| --- | ------------------------------------------------------------------------------------- | --------- | ------ | ------ | ------------------------- |
| 0   | Sortir le dépôt d'iCloud, ignorer `* 2.*` dans tsc/eslint                             | N1, N2    | faible | élevé  | —                         |
| 1   | E2E Playwright (étape 2), sans toucher au comportement                                | 5         | faible | élevé  | 0                         |
| 2   | Outillage : ESLint typé + `react-hooks` + frontières de couches, couverture Vitest    | N3, N4    | faible | élevé  | 1                         |
| 3   | Node 24 partout, `vitest-pool-workers` à jour                                         | N5, N6    | moyen  | élevé  | —                         |
| 4   | Web — `net/http.ts` unique, hooks d'action et montage d'îlots partagés                | 3.1       | faible | moyen  | 1                         |
| 5   | Web — `main.ts` découpé en contrôleurs                                                | 1.1       | moyen  | élevé  | 1, 4                      |
| 6   | Web — profil (`App.tsx`, `Friends.tsx`), compte, admin découpés par vue               | 1.2–1.6   | faible | moyen  | 4                         |
| 7   | Web — rendu : timeline de scène pure, primitives partagées Pixi/Canvas 2D             | 1.5, 3.1  | moyen  | moyen  | 1                         |
| 8   | Web — réorganisation des dossiers en `git mv`                                         | O1        | faible | moyen  | 5–7                       |
| 9   | Bornes partagées et types REST dans `@occulis/protocol`                               | 2, O3     | faible | moyen  | —                         |
| 10  | Serveur — helpers HTTP, `matches/` (repo, rejeu, masquage), SQL dédupliqué            | 3.2, O2   | moyen  | élevé  | 1                         |
| 11  | Serveur — `MatchDO` et `QueueDO` : règles extraites en modules purs                   | 1.7, 1.10 | élevé  | élevé  | 1, 10                     |
| 12  | Serveur — `better-auth.ts`, `social/` découpés                                        | 1.8, 1.9  | moyen  | moyen  | 1                         |
| 13  | Paquets — exports morts, `Showcase`/`lab` hors export principal, `MatchMemory` à part | 3.3, O5   | faible | faible | 2                         |
| 14  | Migration #41 vers `@occulis/ui` (menu, attente, bandeau, réglages)                   | 4         | moyen  | élevé  | direction graphique figée |
| 15  | Documentation : incohérences corrigées                                                | O9        | faible | moyen  | —                         |

### Invariants : où ils en sont

| Invariant                     | État                                                                                                                                                                                                                                                                                                                                                    | Où                                                                                                                                                                              |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fog appliqué à la source      | **Tenu.** Tout envoi passe par `viewFor` (`match-do.ts:514-522`) ; le spectateur reçoit `spectatorView`, sans coups légaux (`:43-45`) ; rien ne part pendant le déploiement (`:492-509`, `:256`). La position complète ne sort que par le replay admin (`admin/queries.ts:199-210`), gardé côté serveur (`admin/routes.ts:25-26,57-59`).                | Écart mineur : `readMatch` admin ne vérifie pas que la partie est finie (`admin/queries.ts:128-139`), donc un admin qui joue peut voir la position vivante de sa propre partie. |
| `core` déterministe           | **Tenu.** Aucun `Math.random`, `Date`, `performance`, `crypto` ni minuterie hors tests.                                                                                                                                                                                                                                                                 | —                                                                                                                                                                               |
| Log D1 = source de vérité     | **Partiel.** Les coups se rejouent depuis D1 (`match-do.ts:559-585`), mais `load()` lit `setup` dans le **stockage du DO** (`:564`) et non dans `matches.setup` ; `config`, équipes verrouillées, échéance et absences ne vivent que dans le DO.                                                                                                        | A2, A4                                                                                                                                                                          |
| Règles versionnées par partie | **Tenu pour le ruleset** (`match-setup.ts:33,45` → `matches.ruleset_version`). **Pas pour le scénario** : `scenarioFor(name)` lit la carte d'aujourd'hui (`match-do.ts:541,563`, `admin/queries.ts:173`).                                                                                                                                               | A8                                                                                                                                                                              |
| DO hiberne                    | **Tenu.** `ctx.acceptWebSocket` dans les trois DO (`match-do.ts:137,153`, `queue-do.ts:61`, `social-do.ts:58`), identité par tags, minuteries par alarme, seul `MatchDO.live` en mémoire, reconstructible. **Aucun test n'évince le DO** pour vérifier la reconstruction : les tests le déduisent indirectement (`match-do.integration.test.ts:16-21`). | Proposé en 6.2                                                                                                                                                                  |
| Une seule source de couleur   | **Tenu** par la règle ESLint (`eslint.config.js:33-66`) et les tests de feuille. Deux familles de variables CSS coexistent toutefois dans la page du jeu (`--ink`… de `ui/palette.ts` et `--occ-*`) : elles dérivent toutes deux de `tokens.ts`, mais à fusionner avec #41.                                                                             | 4                                                                                                                                                                               |

---

## 0bis. Anomalies trouvées en route (hors refonte)

Corriger ces points **change le comportement**. Ils sortent donc du cadre « aucun changement
visible » et appellent une décision explicite, puis une PR chacun. Tous ont été vérifiés
dans le code, pas seulement rapportés.

| #   | Où                                                                 | Constat                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Proposition                                                                                                                                                                       | R      | G         |
| --- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | --------- |
| A1  | `apps/server/src/index.ts:85-87,245-249`, `match-setup.ts:60-71`   | **`POST /api/matches` n'exige aucun compte.** N'importe qui nomme deux identifiants de joueurs, reçoit les deux jetons de siège et crée des lignes `players`. Les identifiants réels se trouvent facilement (`MeMatchSummary.opponentId`, recherche d'amis). Effets : faits d'armes gagnés par forfait contre une victime (`feats/stats.ts:36-42` compte toute partie finie) ; `GET /api/me/current-match` (`me/routes.ts:64-75`) renvoie la victime vers la fausse partie ; spam de `players` que la purge nocturne conserve. `server.md:1322` et `setup.md:183` le notent « à surveiller » sans ces effets. Aucun appelant dans le client (les salons privés passent par `QueueDO`) ; seules trois suites d'intégration du serveur s'en servent (`match-do`, `social`, `admin`). | Retirer la route du Worker public et faire appeler `startMatch()` directement par les tests ; à défaut, la réserver au rôle `admin`.                                              | moyen  | **élevé** |
| A2  | `match-do.ts:436-447`                                              | `commit()` pose `this.live = advanced.value` **avant** `appendToLog`. Si l'`INSERT` échoue, le DO continue sur un état que D1 n'a pas. Après hibernation, le rejeu est décalé d'un coup et `load()` lève « Corrupted log » : la partie est perdue. L'ordre actuel est voulu (les _input gates_ ne couvrent pas les `await` D1, et c'est lui qui empêche deux coups de se valider contre le même état), donc l'inverser ne corrige rien.                                                                                                                                                                                                                                                                                                                                            | Garder l'ordre, mais en cas d'échec remettre `this.live = null` et répondre une erreur ; sérialiser les commits (chaîne de promesses ou `blockConcurrencyWhile`).                 | moyen  | élevé     |
| A3  | `match-do.ts:168,201-203,424`                                      | Les messages entrants sont **castés, jamais validés** (`JSON.parse(raw) as ClientMessage`). `coordKey` étant `` `${x},${y}` ``, `{"to":{"x":"1","y":"2"}}` passe `validateAction` ; les coordonnées en chaînes, champs en trop compris, sont écrites dans l'état puis dans D1 (`:459`) et rejouées telles quelles. Même cast dans `queue-do.ts:67,92` (`normalizeCode` lève si `code` n'est pas une chaîne) et `social-do.ts:38-47,65`.                                                                                                                                                                                                                                                                                                                                            | Analyseur dans `@occulis/protocol` (O3) qui reconstruit un objet canonique (entiers sûrs, `pieceId` chaîne, `player` client ignoré) ; journaliser l'objet canonique, pas le brut. | moyen  | élevé     |
| A4  | `match-do.ts:396-399` ; `recordOutcome`                            | `setup` est écrit dans le stockage du DO avant `matches.setup`. Si l'`UPDATE` D1 échoue, la partie se joue depuis les pièces déployées, mais les replays admin et profil repartent des pièces par défaut du scénario. De même, si `recordOutcome` échoue, la ligne reste `finished_at IS NULL` pour toujours, et `forfeitAbsent` ne la répare pas (`:311`).                                                                                                                                                                                                                                                                                                                                                                                                                        | Écrire D1 d'abord, ou rendre `load()` dépendant de D1 seul ; réessayer `recordOutcome` à l'alarme suivante.                                                                       | moyen  | moyen     |
| A5  | `queue-do.ts:310-312`                                              | `send()` n'a pas de try/catch, contrairement à `match-do.ts:526-532` et `social-do.ts:177-183`. Dans `seat()` (`:263-272`), une socket en fermeture interrompt la boucle : l'autre joueur ne reçoit jamais `matched`, il est déjà retiré de la file et perd par forfait.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Même enveloppe `try/catch` que les deux autres DO.                                                                                                                                | faible | moyen     |
| A6  | `apps/web/src/profile/Friends.tsx:513`                             | `useMessages()` est à droite d'un `??` : le hook n'est appelé que si le pseudo manque. C'est une violation des règles des hooks, qui fait planter React si la condition change entre deux rendus.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Appeler `useMessages()` en tête de composant. `react-hooks` (N3) l'aurait signalé.                                                                                                | faible | moyen     |
| A7  | `tooling/infra/src/actions.ts:359-362`                             | L'action « deploy » ne vérifie pas le code de retour du build client : migrations et `wrangler deploy` partent sur un `apps/web/dist` périmé ou partiel. C'est aussi le chemin de `infra.yml`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Tester `code !== 0` comme pour les étapes précédentes (`:355-357`).                                                                                                               | faible | moyen     |
| A8  | `match-do.ts:541,563`, `admin/queries.ts:173`, `me/presets.ts:151` | **Le scénario n'est pas versionné** : modifier `ridge` modifie les parties en cours et les anciens replays. C'est un trou dans l'invariant « règles versionnées par partie ».                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Décision d'architecture : versionner les scénarios avec le ruleset, ou figer la carte dans `matches`. À inscrire en section 7 d'`architecture.md` si ce n'est pas tranché.        | —      | élevé     |
| A9  | `apps/web/src/main.ts:443-448`                                     | Quitter une partie en cours passe par `confirm()` natif, alors que la charte impose un `Dialog`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Avec #41 : `Dialog danger`. Côté E2E, gérer `page.on('dialog')` d'ici là.                                                                                                         | faible | faible    |
| A10 | `apps/web/src/profile/Friends.tsx:148-150,194,564`                 | Recherche et messages plus anciens chargés hors `useLoad`, et `<EmptyState>{m.loading}` affiché dans la vue : c'est contraire à la règle du premier rendu (CLAUDE.md, « jamais d'état chargement dans une vue »).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Ressources déclarées, ou transition explicite. Change ce qu'on voit pendant le chargement.                                                                                        | faible | faible    |

---

## 1. Fichiers et composants trop longs ou à responsabilités multiples

### 1.1 `apps/web/src/main.ts` (724 lignes) — R moyen, G élevé

Son en-tête dit qu'il « câble les modules, n'en implémente aucun ». En réalité, il porte tout
l'état mutable du client (une vingtaine de `let`, `:68-103`) et une bonne part de ses règles.

| Lignes  | Responsabilité                                                                                                                          |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 57-66   | Amorçage : préchargements (`whoAmI`, amis, `currentMatch`), thème, langue                                                               |
| 105-129 | Câblage des réglages ; `go()` décide aussi de leur disponibilité (`:128`)                                                               |
| 136-185 | Envoi d'un coup, adoption d'une vue serveur, départ d'une partie                                                                        |
| 191-275 | Gestionnaires de partie : rechargement des presets (`:194-205`), règle de reprise du compte à rebours (`:226-228`)                      |
| 277-300 | S'asseoir, regarder (délai de 6 s)                                                                                                      |
| 302-363 | Social : rendu des amis, course contre une échéance, table de réactions `onSocial` (`:322-347`)                                         |
| 365-470 | Carte des 29 éléments du shell et gestionnaires de file (proposition, expiration, siège, version périmée)                               |
| 472-510 | URL d'arrivée ; rappels du panneau d'amis appelant `social/api` directement                                                             |
| 512-541 | Montage des îlots React, leur état (`found`, `deploying`, `teamsOpen`, déclarés en `:522-524` alors que `leave()` s'en sert dès `:180`) |
| 549-626 | Reprise de partie, identité, îlot de compte, rendu au changement de langue, console                                                     |
| 634-702 | Chargement paresseux du plateau, clics de case → sélection, boucle de frame, préchauffage                                               |

**Découpage proposé** (sous `apps/web/src/app/`, nom provisoire) :

| Module                 | Contenu                                                                                                                  |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `dom.ts`               | `element()` et les cartes d'ids aujourd'hui inlinées (`:365-396`, `:480-486`, `:612-620`)                                |
| `match-controller.ts`  | partie, canal, `pending`, sélection, animation, survol, caméra ; `play`, `adopt`, `handlersFor`, `sit`, `watch`, `leave` |
| `queue-controller.ts`  | `onSeek`, gestionnaires de `joinQueue`, `found`                                                                          |
| `social-controller.ts` | état social, `syncSocial`, `onSocial`, rappels du panneau, ami défié                                                     |
| `islands.ts`           | les trois montages, l'état de leurs props, `showIslands`                                                                 |
| `identity.ts`          | `refresh`, `resume`, `showAccount`, avis d'arrivée                                                                       |
| `board-host.ts`        | `ensureBoard`, `prewarmBoard`, construction de l'entrée de frame                                                         |

`main.ts` redevient la composition (~80 lignes). Les règles qu'il contient partent en modules purs (section 2).

### 1.2 `apps/web/src/profile/App.tsx` (729 lignes) — R faible, G moyen

| Lignes  | Contenu                                                                           | Destination                                              |
| ------- | --------------------------------------------------------------------------------- | -------------------------------------------------------- |
| 67-178  | App / Page / WithFriends / Frame / Gate (`App` identique à `admin/App.tsx:16-37`) | `profile/Frame.tsx` + partie commune `load/PageRoot.tsx` |
| 180-308 | Vue compte, `VerifyBanner`                                                        | `profile/account/AccountView.tsx`                        |
| 310-458 | `useEditor`, éditeurs pseudo / adresse / mot de passe                             | `profile/account/editors.tsx`                            |
| 460-503 | `GoogleSetting`                                                                   | `profile/account/security.tsx`                           |
| 510-556 | `FeatsCard` (règle de bascule `:517-519` → modèle pur)                            | `profile/account/FeatsCard.tsx`                          |
| 559-682 | `SpectatorsCard`, `Sessions`, `DangerZone`                                        | un fichier chacun                                        |
| 686-729 | Historique et replay                                                              | `profile/matches.tsx`                                    |

### 1.3 `apps/web/src/profile/Friends.tsx` (632 lignes) — R faible, G moyen

| Lignes  | Contenu                                                                               | Destination                      |
| ------- | ------------------------------------------------------------------------------------- | -------------------------------- |
| 48-140  | Contexte, `SocialProvider` (ouvre le WebSocket `:96`, déclenche les toasts), `useAct` | `profile/social-context.tsx`     |
| 144-406 | `FriendsView`, `SearchCard`, `FriendList`, `Requests`, `Blocked`                      | `profile/friends/list.tsx`       |
| 410-517 | Fiche d'un ami et replay                                                              | `profile/friends/FriendView.tsx` |
| 521-620 | Chat                                                                                  | `profile/friends/ChatView.tsx`   |
| 623-632 | `withMessage`, `merged` (purs)                                                        | `social/model.ts`, avec tests    |

### 1.4 `apps/web/src/account/AccountApp.tsx` (459 lignes) — R faible, G moyen

Routage popstate (`:52-90`), `useSubmission` (`:102-133`), quatre formulaires (`:135-407`),
`GoogleEntry` / `NoticeLine` / `RouteLink` (`:409-459`). Le bloc de props du champ adresse
est copié quatre fois (`:164-178`, `:226-240`, `:311-325`, `:375-385`), et les `passwordrules`
trois fois (`:266`, `:395`, `profile/App.tsx:434`).
**Découpage** : `account/forms/{SignIn,Register,Forgot,Reset}.tsx`, `account/fields.tsx`
(`EmailField`, `NewPasswordField` règles comprises), `account/useSubmission.ts`.

### 1.5 `apps/web/src/scene/scene.ts` (459 lignes) — R moyen, G moyen

| Lignes  | Contenu                                                                                                                                                 | Destination                                   |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| 98-110  | Fabrique de la texture de trame (dupliquée dans `canvas/paint.ts:43-68`)                                                                                | `scene/dither.ts`, partagé                    |
| 137-156 | `occupantsOf` : vue → occupants (pur à `look()` près)                                                                                                   | `view/occupants.ts`, couleur en paramètre     |
| 242-303 | `track()` : machine à états d'événements et de temps (relief, apparitions et disparitions ennemies, pulsation du tour, sélection, survol, atterrissage) | `view/scene-timeline.ts`, **pur et testable** |
| 314-447 | `drawWorld` : rangs de profondeur, intro, matérialisation, traînées, fantômes, tri du peintre                                                           | reste dans `scene.ts`                         |

### 1.6 Autres fichiers du client

| Fichier                    | Constat                                                                                                                                                                                                                                                                 | Proposition                                                                                  | R      | G      |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ------ | ------ |
| `admin/views.tsx` (383)    | Cinq écrans dans un fichier : Overview `:48-89`, UserList `:93-159`, UserDetail `:161-291` (presse-papiers inline `:185-190`, sessions dupliquées de `profile/App.tsx:589-645`), ProfileCard `:295-312` (doublon de `profile/parts.tsx:32-48`), PlayerDetail, MatchList | `admin/views/{Overview,Users,UserDetail,PlayerDetail,MatchList}.tsx` + `RecordStats` partagé | faible | moyen  |
| `admin/actions.tsx` (267)  | Hooks `useAct`/`useGo` (`:21-38`, `useAct` doublé dans `Friends.tsx:132`), dispatcher `QuickActions`, quatre dialogues ; validation en dur `:240`                                                                                                                       | `admin/hooks.ts`, `admin/QuickActions.tsx`, `admin/dialogs/*.tsx`                            | faible | faible |
| `teams/TeamsApp.tsx` (246) | Liste + éditeur ; `maxLength={32}` (`:232`) = `NAME_MAX` serveur ; importe `profile/api` et `profile/resources`, donc la page du jeu dépend du profil                                                                                                                   | `teams/PresetList.tsx`, `teams/PresetEditor.tsx`, `presets/api.ts` partagé                   | faible | moyen  |
| `ui/shell.ts` (205)        | Visibilité des écrans, coalescence du voile, contenu de l'attente, identité → menu (`playable` `:181` = `main.ts:303,351`)                                                                                                                                              | Garder la visibilité ; le reste suit #41                                                     | faible | faible |
| `ui/console.ts` (185)      | Ligne d'état, lecture de case, compte-rendu (reflow forcé `:84-88`), **règles d'envoi** (spectateur, coup en attente, `:124-156`), analyse de commande                                                                                                                  | Règles vers `game/turn-gate.ts` pur et testé ; rendu vers `MatchBanner` avec #41             | faible | moyen  |
| `canvas/paint.ts` (217)    | Trame, primitives, terrain (dupliqué de `scene/terrain.ts:47-74`), silhouette (dupliquée de `scene/pieces.ts:65-106`)                                                                                                                                                   | `view/silhouette.ts`, `view/tile-shading.ts`, consommés par les deux peintres                | moyen  | moyen  |
| `theme.ts` (227)           | Métriques, atmosphère, `look`, singleton du thème actif, `MOTION_FX` ; `view/camera.ts:3` (pur) importe `METRICS` d'ici                                                                                                                                                 | `theme/{metrics,look,motion}.ts`                                                             | faible | faible |
| `vite.config.ts` (181)     | Maquettes, `criticalHead`, entrées, alias, redirection du labo ; **jamais typé-vérifié** (`tsconfig` n'inclut que `src`)                                                                                                                                                | `tooling/vite/{mockups,lab,critical}.ts`, inclus dans un typecheck (O6)                      | faible | faible |

### 1.7 `apps/server/src/match-do.ts` (596 lignes) — R **élevé**, G élevé

| Lignes  | Responsabilité                                                  |
| ------- | --------------------------------------------------------------- |
| 34-86   | Aides spectateur, type de config, constantes de temps           |
| 105-140 | Routes internes `/init`, `/seat`, `/watch`                      |
| 142-236 | Connexion, absences, dispatch, négociation `hello`, déconnexion |
| 242-282 | Spectateurs                                                     |
| 290-346 | Alarme : échéance du déploiement, choix du forfait              |
| 357-412 | Phase de déploiement                                            |
| 414-490 | Contrôle du tour, commit, écritures D1 (dont le SQL Elo)        |
| 492-524 | Mise en forme des messages                                      |
| 534-596 | Accès au stockage, rejeu, `locksFor`, `cardOf`                  |

**Découpage proposé** :

- `match/timers.ts` (pur) : `nextAlarm({deploying, deadline, absences})`, `dueForfeit(absences, now, connected)` ;
- `match/deployment.ts` (pur) : `lockTeam(...)` → `Rejection | {locked, complete}`, `locksFor` ;
- `match/messages.ts` (pur) : `deploymentMessage`, `viewsFor(memory)`, `spectatorView` ;
- `matches/store.ts` (D1) : `appendAction`, `writeSetup`, `recordOutcome`, `readLog`, partagés avec admin et me ;
- `matches/start.ts` : `initialState(scenario, rulesetVersion, setup)`, aujourd'hui dupliqué (`match-do.ts:562-565`, `admin/queries.ts:173-176`).

`MatchDO` ne garde que tags, dispatch et alarme. Risque élevé, parce que les invariants y vivent : lot à faire **après** l'E2E et avec un test d'éviction (6.2).

### 1.8 `apps/server/src/auth/better-auth.ts` (457 lignes) — R moyen, G moyen

Un _before-hook_ réunit quatre règles sans lien (pseudo en lecture seule `:73-78`, usurpation
en lecture seule `:84-89`, mots de passe ayant fuité `:91-97`, révocation des sessions
`:102-104`). Le reste : courriers, sessions, correspondance de schéma, limites de débit
(`:195-216`), création de profil et pseudo (`:252-263`, `:365-402`), anonymisation qui
touche au social (`:264-286`), rôles et usurpation, Google et proxy OAuth.
**Découpage** : `auth/policies.ts` (pur), `auth/schema-map.ts`, `auth/rate-limits.ts`,
`auth/roles.ts`, `auth/providers.ts`, `players/repo.ts`. Garder la signature
`buildAuth(env, origin, locale)`, dont dépend `scripts/generate-schema.mts:26`.

### 1.9 Autres fichiers du serveur

| Fichier                   | Constat                                                                                                                                                                                                                                                   | Proposition                                                                                                                  | R      | G      |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------ | ------ |
| `social/queries.ts` (437) | Relations, aperçu + mapping pur (`liveMatch` `:187-198`), recherche, demandes, blocages, fiche, messages, spectateur, oubli                                                                                                                               | `social/{friends-repo,messages-repo,watch-repo}.ts`, `social/overview.ts` pur                                                | moyen  | moyen  |
| `index.ts` (249)          | Pages, garde `AUTH_SECRET` dont la liste de routes se maintient **à la main** (`:54-70`), chaîne de gestionnaires, montées en WebSocket, SQL de purge (`:110-132`), `createMatch` ; garde « compte vérifié » triplée (`:174-183`, `:203-205`, `:222-224`) | `routes/pages.ts`, `maintenance.ts`, `realtime/routes.ts` + `requireVerifiedAccount()` ; chaque routeur déclare ses préfixes | moyen  | moyen  |
| `me/queries.ts` (296)     | Pseudo, profil, bilan, sessions, historique, partie en cours, replay ; **le masquage des coups adverses** (`:249-252`) est une règle de fog enfouie dans une requête                                                                                      | `me/sessions.ts`, `me/handle.ts`, `matches/history.ts`, `matches/redact.ts` **pur et testé**                                 | moyen  | élevé  |
| `admin/queries.ts` (292)  | Statistiques, colonnes de partie, `replayLog` (utilisé par me), `readLog`, frames, joueur, renommage. `me/` dépend ainsi de `admin/` (`me/queries.ts:14-15`), et `social/` de la pagination admin (`social/routes.ts:4`)                                  | `matches/{repo,replay}.ts`, `http/paging.ts` ; `admin/` garde stats, joueur, renommage                                       | moyen  | moyen  |
| `social-do.ts` (217)      | Routage, présence, relais, cycle de vie des défis, API cliente utilisée par les routes REST                                                                                                                                                               | `social/client.ts` (`callSocial`, `pushTo`, `openSocial`) ; règles de défi dans `social/challenges.ts` pur                   | moyen  | moyen  |
| `social/routes.ts` (213)  | Une fonction de 150 lignes dispatchant sur des regex ; triplet « annuler, annuler, pousser » répété au blocage et à la rupture (`:91-93`, `:123-125`)                                                                                                     | `onRelationCut(env, a, b)` ; table de routes                                                                                 | faible | faible |
| `auth/mail.ts` (201)      | Transport, lettres, mise en page, échappement                                                                                                                                                                                                             | `mail/{transport,letters,layout}.ts`                                                                                         | faible | faible |
| `me/presets.ts` (185)     | Repo, mapping, validation pure (`:148-177`) ; `toPreset` revalide chaque ligne lue sans le dire                                                                                                                                                           | `presets/validate.ts`                                                                                                        | faible | faible |

### 1.10 `apps/server/src/queue-do.ts` (318 lignes) — R **élevé**, G élevé

Les règles sont déjà dans des modules purs (`pairing.ts`, `rooms.ts`, `proposals.ts`), mais
le séquencement et les envois restent mêlés. **Proposition** : un réducteur pur
`step(state, event) → {state, sends[], seat?}` testable sans workerd, `startMatch` restant
le seul effet. Les fautes de `join` (code inconnu, son propre code, `:154-166`) vont dans
`rooms.ts`. **À conserver absolument** : la sauvegarde de l'état avant `await startMatch`
(`:197-205`), qui empêche le double appariement.

### 1.11 Paquets

| Fichier                                      | Constat                                                                                                                                                                                                       | Proposition                                                                                                                 | R                             | G      |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ----------------------------- | ------ |
| `packages/core/src/fog.ts` (198)             | Modèle de connaissance (`observe` `:62`), vue transmissible (`viewFor` `:114`) et orchestration `MatchMemory` (`:154-198`) ; `visibleTilesFor(board, state, …)` reçoit `board` alors que `state.board` existe | `MatchMemory` dans son module                                                                                               | faible                        | faible |
| `packages/core/src/actions.ts`               | `applyAction` cherche la pièce deux fois (`:81` via `validateAction`, puis `:107`)                                                                                                                            | Laisser : coût négligeable, lisibilité correcte                                                                             | —                             | —      |
| `packages/core/src/team.ts`                  | `parseTeam` (`:117`) est un analyseur de format réseau ; `MAX_ENTRIES` est déclaré après usage (`:133`)                                                                                                       | `parseTeam` vers `protocol/parse.ts` (O3)                                                                                   | faible                        | faible |
| `packages/ui/src/tokens.ts` (488)            | Données, maths de couleur, sérialisation CSS, propositions du labo (`:299-475`) ; alphas en dur dans `paletteVariables` (`~:232-238`) hors `INK_ALPHA`                                                        | Découper **en restant l'unique fichier de couleur** : sections ou sous-modules non colorés (sérialisation) importés par lui | moyen                         | faible |
| `packages/ui/src/components/`                | 31 fichiers à plat, plusieurs composants par fichier (`TopBar` + `Wordmark` + `ProgressBar`, `Table` + `List` + `Pager`, `Dialog` + `Note`)                                                                   | Un composant par fichier, regroupés comme dans `.design-sync/docs`                                                          | moyen (synchro Claude Design) | faible |
| `tooling/infra/src/actions.ts` (447)         | Catalogue plat de 12 actions ; création de base D1 copiée (`:137-147`, `:178-188`), commit + push copiés (`:204-219`, `:268-288`)                                                                             | Helpers `ensureDatabase`, `commitManifest`                                                                                  | faible                        | faible |
| `tooling/infra/src/components/App.tsx` (254) | Machine à états de menu, liste d'environnements, lancement ; assertions non nulles (`:129`, `:147`, `:232`)                                                                                                   | Réducteur pur testé                                                                                                         | faible                        | faible |

---

## 2. Logique métier mêlée à l'affichage ou au transport

| #    | Où                                                                                      | Constat                                                                                                                                                                                                                                                                                                                                                                                                                          | Proposition                                                                                    | R      | G      |
| ---- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------ | ------ |
| 2.1  | `main.ts:303`, `main.ts:351`, `ui/shell.ts:181`                                         | « Ce compte peut-il jouer ? » (`signedIn && emailVerified !== false`) écrit trois fois                                                                                                                                                                                                                                                                                                                                           | `canPlay(identity)` à côté d'`Identity` (`net/auth.ts`)                                        | faible | moyen  |
| 2.2  | `main.ts:226-228`, `:409-411`                                                           | Reprise du compte à rebours ; conservation du premier `remainingMs`/`receivedAt`                                                                                                                                                                                                                                                                                                                                                 | Fonctions pures dans `prepare/model.ts`                                                        | faible | moyen  |
| 2.3  | `main.ts:322-342`                                                                       | `onSocial` décide (s'asseoir sauf si déjà en partie, notifier un refus ou un défi entrant)                                                                                                                                                                                                                                                                                                                                       | `social/model.ts` : fonction pure rendant des effets                                           | faible | moyen  |
| 2.4  | `main.ts:128`, `:443-448`, `:194-205`                                                   | Disponibilité des réglages selon l'étape ; quitter = abandonner ; fusion des presets dans les props                                                                                                                                                                                                                                                                                                                              | `settingsAvailable(stage)` dans `ui/flow.ts` ; le reste dans les contrôleurs                   | faible | faible |
| 2.5  | client ↔ serveur                                                                        | **Bornes dupliquées** : pseudo 2/24 (`AccountApp.tsx:250-251`, `admin/actions.tsx:240`, `profile/App.tsx:349-352` ↔ `auth/handle.ts:13-14`) ; chat 500 (`Friends.tsx:611` ↔ `social/chat.ts:6`) ; vitrine 3 (`profile/App.tsx:517-519` ↔ `feats/catalog.ts:49`) ; nom de preset 32 (`TeamsApp.tsx:232` ↔ `me/presets.ts:22`) ; recherche 2 (`Friends.tsx:190,203`) ; taille de page 25 (`admin/api.ts:43` ↔ `admin/paging.ts:6`) | Constantes dans `@occulis/protocol`                                                            | faible | moyen  |
| 2.6  | `prepare/Deployment.tsx:106`, `team/placement-canvas.ts:128`, `match-do.ts:158,496,589` | Adversaire calculé à la main                                                                                                                                                                                                                                                                                                                                                                                                     | `opponentOf` de `@occulis/core`                                                                | faible | faible |
| 2.7  | `profile/Friends.tsx:222,231,536-559,623-632`                                           | Correctifs optimistes de relation, marquage lu, fusion du fil                                                                                                                                                                                                                                                                                                                                                                    | `social/model.ts`, testé                                                                       | faible | moyen  |
| 2.8  | `game/online-match.ts:88`                                                               | `viewFor(_player)` ignore son argument                                                                                                                                                                                                                                                                                                                                                                                           | Getter `view`                                                                                  | faible | faible |
| 2.9  | `team/placement-canvas.ts:4`, `profile/parts.tsx:21-23`, `profile/*` ← `admin/model.ts` | Replay, mise à l'échelle et formatage partagés **logés dans `admin/`**                                                                                                                                                                                                                                                                                                                                                           | `replay/`, `format.ts` (O1)                                                                    | faible | moyen  |
| 2.10 | `match-do.ts:290-320`, `:421-429`, `:486-487`, `:159-161`, `:401-409`                   | Choix du forfait, estampillage de l'abandon et contrôle du tour, repli Elo et score (tout ce qui n'est pas « A gagne » vaut 0, donc une future nulle serait mal comptée), début du décompte d'absence                                                                                                                                                                                                                            | `authorize(action, seat, state)` dans `seating.ts` ; `match/timers.ts` ; score par `rating.ts` | moyen  | élevé  |
| 2.11 | `match-do.ts:486,595`, `me/queries.ts:57`, `feats/stats.ts:44`                          | `1200` en dur alors qu'`INITIAL_RATING` existe sans être utilisé (`rating.ts:11`)                                                                                                                                                                                                                                                                                                                                                | Utiliser la constante                                                                          | faible | faible |
| 2.12 | `queue-do.ts:116-118,131-135` ; `social-do.ts:87-91,147-160`                            | Règles de file (une proposition par joueur, salon conservé à la purge) et de défi (dernière socket fermée → défis annulés, ordre des vérifications à l'acceptation)                                                                                                                                                                                                                                                              | Réducteur pur (1.10), `social/challenges.ts`                                                   | moyen  | moyen  |
| 2.13 | `me/queries.ts:249-252`                                                                 | **Masquage du replay** (règle de fog) dans une requête                                                                                                                                                                                                                                                                                                                                                                           | `matches/redact.ts` pur, avec test « aucun coup adverse sauf l'abandon »                       | faible | élevé  |
| 2.14 | `social/queries.ts:196` ↔ `social/relations.ts:93`                                      | Règle « pas mon propre adversaire » écrite deux fois                                                                                                                                                                                                                                                                                                                                                                             | Une seule, dans `decideWatch`                                                                  | faible | faible |
| 2.15 | `index.ts:110-132`                                                                      | Rétention et définition d'un orphelin codées en dur dans le SQL du cron                                                                                                                                                                                                                                                                                                                                                          | `maintenance.ts` avec constantes nommées                                                       | faible | faible |

---

## 3. Code dupliqué, code mort, dépendances

### 3.1 Client

| Doublon                                                                                         | Où                                                                                                                                                                                                                                                                                                        | Proposition                                                                                | R      | G      |
| ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------ | ------ |
| Quatre enveloppes `fetch`                                                                       | `admin/api.ts:46-59`, `profile/api.ts:21-39`, `social/api.ts:24-44`, `net/auth.ts:157-188` (et `Outcome` importé via `admin/api.ts`)                                                                                                                                                                      | `net/http.ts` : `request<T>(path, init, describeError)` ; `Outcome` depuis `load/cache.ts` | faible | moyen  |
| Renvoi de vérification, demande de réinitialisation                                             | `net/auth.ts:91,99` ↔ `profile/api.ts:60,66`                                                                                                                                                                                                                                                              | Une seule fonction chacun                                                                  | faible | faible |
| Cinq hooks « occupé / erreur / notifier »                                                       | `admin/actions.tsx:21`, `Friends.tsx:132`, `profile/App.tsx:311`, `AccountApp.tsx:102`, et inline dans `TeamsApp.tsx:195-215`, `App.tsx:463-483,562-570`                                                                                                                                                  | Un `useAction` partagé (ou dans `@occulis/ui` s'il est générique)                          | faible | moyen  |
| Amorçage de page                                                                                | `admin/main.tsx` ≡ `profile/main.tsx` ; `admin/App.tsx:16-37` ≡ `profile/App.tsx:67-88`                                                                                                                                                                                                                   | `load/PageRoot.tsx`                                                                        | faible | faible |
| Quatre montages d'îlots                                                                         | `account/mount.tsx`, `prepare/mount.tsx:12-20` (×2), `teams/mount.tsx`                                                                                                                                                                                                                                    | `mountIsland(host, Component)`                                                             | faible | faible |
| Bilan, sessions, écran de replay                                                                | `profile/parts.tsx:32-48` ↔ `admin/views.tsx:295-312` ; `profile/App.tsx:589-645` ↔ `admin/views.tsx:251-285` ; `profile/parts.tsx:158-203` ↔ `admin/MatchDetail.tsx:44-154`                                                                                                                              | Composants partagés sous `replay/`                                                         | faible | moyen  |
| Hôte de plateau Canvas 2D                                                                       | `team/placement-canvas.ts:44-123` ↔ `admin/replay-canvas.ts:34-90`                                                                                                                                                                                                                                        | `render/canvas2d/host.ts`                                                                  | moyen  | moyen  |
| Trame, silhouette, ombrage                                                                      | voir 1.5 et 1.6                                                                                                                                                                                                                                                                                           | `view/silhouette.ts`, `view/tile-shading.ts`, `scene/dither.ts`                            | moyen  | moyen  |
| Boîtes englobantes, différence de coups                                                         | `view/camera.ts:39-54`, `admin/replay.ts:72-125` ; `game/movement-diff.ts:25` ↔ `admin/replay.ts:28`                                                                                                                                                                                                      | Une fonction chacune                                                                       | faible | faible |
| Clés de coordonnées à la main                                                                   | `sameCoord` (`scene/scene.ts:131`, `input/controls.ts:66`) ; `` `${x},${y}` `` (`canvas/paint.ts:123`, `placement-canvas.ts:125-131`, `replay-canvas.ts:105`) ; `view/reveal.ts:62` **analyse** ce format                                                                                                 | `coordEquals`, `coordKey`, `parseCoordKey` de `core`                                       | faible | moyen  |
| `prefers-reduced-motion` ×4, création du voile ×2, arrêt d'usurpation ×3, paires de rotation ×3 | `ui/veil.ts:19`, `scene/board.ts:43`, `placement-canvas.ts:177`, `replay-canvas.ts:176` ; `ui/veil.ts:32-34` ↔ `admin/design/Motion.tsx:113-116` ; `main.ts:451-454`, `profile/App.tsx:161`, `admin/App.tsx:87` ; `TeamBuilder.tsx:184-185`, `profile/parts.tsx:196-197`, `admin/MatchDetail.tsx:145-146` | Helpers partagés (le voile lui-même n'est pas modifié)                                     | faible | faible |
| Formatage échoué dans `admin/model.ts`                                                          | `formatDate`, `shortAgent`, `winRate` utilisés par le profil                                                                                                                                                                                                                                              | `src/format.ts`                                                                            | faible | faible |

### 3.2 Serveur

| Doublon                                            | Où                                                                                                                                                                                                                                                                                                                                                                                                                                          | Proposition                                                                                                                                                                                                                                 | R      | G      |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------ |
| Contrôle d'origine, session relue                  | `auth/guard.ts:19-22` ↔ `admin/routes.ts:53-59`                                                                                                                                                                                                                                                                                                                                                                                             | Réutiliser `guardCaller`                                                                                                                                                                                                                    | faible | moyen  |
| Garde « compte vérifié », trois formats de réponse | `index.ts:174-183,203-205,222-224`, `social/routes.ts:54`                                                                                                                                                                                                                                                                                                                                                                                   | `requireVerifiedAccount()`                                                                                                                                                                                                                  | faible | moyen  |
| Réponses d'erreur hétérogènes                      | texte anglais (`index.ts`, `me/routes.ts:135`, `social/routes.ts:117`), **texte français** (`admin/routes.ts:46,54,58-59,70,76`, contraire à la convention), JSON `{code}` ailleurs                                                                                                                                                                                                                                                         | `http.ts` : `json`, `fail(code)`, `notFound`, `readBody` ; une table code → statut au lieu de trois (`me/routes.ts:138-148`, `social/routes.ts:195-212`, `admin/routes.ts:71`). Le texte des réponses change, donc à confirmer côté client. | moyen  | moyen  |
| `request.json().catch(() => ({}))` ×9              | `me/routes.ts`, `social/routes.ts`, `admin/routes.ts`                                                                                                                                                                                                                                                                                                                                                                                       | `readBody()`                                                                                                                                                                                                                                | faible | faible |
| SQL répété                                         | bilan (`me/queries.ts:75-81` ↔ `admin/queries.ts:219-227`) ; `CASE` d'ami (`social/queries.ts:83,123,131`) ; suppression des demandes (`:267-269` ↔ `:299-301`) ; lecture du log (`match-do.ts:567-571`, `admin/queries.ts:131,194-197`) ; pseudo + vitrine (`cards.ts:11-14` ↔ `me/feats.ts:7-10`) ; pseudo écrit dans `players` et `users` (`me/queries.ts:121-134` ↔ `admin/queries.ts:266-271`) ; `String(cause).includes("UNIQUE")` ×3 | Fonctions de repo uniques                                                                                                                                                                                                                   | moyen  | moyen  |
| Mapping et aides                                   | pièce → frame (`admin/queries.ts:201-207` ↔ `me/queries.ts:258-264`) ; « quel camp suis-je » ×4 ; JSON sûr ×3 (`cards.ts:24-31`, `me/feats.ts:36-43`, `me/presets.ts:179-185`) ; `hello` + version ×4 (`match-do.ts:177-182,247-251`, `queue-do.ts:77-81`, `social-do.ts:67-71`)                                                                                                                                                            | Aides communes                                                                                                                                                                                                                              | faible | moyen  |
| **Deux rejeux**                                    | `MatchDO.load` passe par `replayMemory` (`match-do.ts:573`) ; `replayLog` boucle sur `advanceMemory` (`admin/queries.ts:178-186`)                                                                                                                                                                                                                                                                                                           | Un seul chemin (`matches/replay.ts`) au-dessus de `replayMemory`, frames en option                                                                                                                                                          | moyen  | élevé  |

### 3.3 Code mort (vérifié par recherche dans tout le dépôt)

| Paquet          | Exports sans appelant de production                                                                                                                                                                                                                                                                                                                                                                                                                     | Proposition                                                                                                                                               |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web`      | `ui/theme-choice.ts:22` `nextTheme` (aucun appelant) ; `view/reveal.ts:56` `settling`, `team/model.ts:143` `isComplete`, `admin/model.ts:178` `initials` (doublon de `@occulis/ui`) : tests seuls ; exportés mais internes : `formatCoord`, `VERIFIED_PATH`, `AUTO_SEND_MS`, `slotAt`, `boardRadius`, `cleanDoc`                                                                                                                                        | Supprimer ou désexporter                                                                                                                                  |
| `apps/server`   | `rulesets.ts` (réexport de 6 lignes, contourné par `me/presets.ts:1-9`) ; une trentaine d'exports internes (`INITIAL_RATING`, `K_FACTOR`, `proposalOf`, `MIN_HANDLE_LENGTH`, …)                                                                                                                                                                                                                                                                         | Supprimer `rulesets.ts` ; désexporter                                                                                                                     |
| `packages/core` | Inutilisés : `parseCoordKey`, `manhattanDistance`, `commanderOf` (+ getter `isCommander`), `PieceProfile`. Tests seuls : `replay`, `visibleFrom`, `canMeleeReach`, `PieceType.canStrike` (mêlée retirée), `emptyKnowledge`, `visibleTilesFor`, `translateTeam`, `rasterizeLine`                                                                                                                                                                         | **Prudence** : capture et fin de partie reviendront (point ouvert 13). Retirer de `index.ts` ce qui n'a aucun appelant ; garder ce que les tests exercent |
| `packages/ui`   | Inutilisés hors de la charte : `Icon` (le composant), `ICON_NAMES`, `LocaleProvider`, `useLocale`, `ToastStack`, `Wordmark`, `DefinitionList` ; **`Skeleton`** et sa section CSS (`styles.css:878`) vont contre la règle « ni squelette » ; `Showcase` (8 composants, ~260 lignes de CSS `styles.css:1697-1958`) sert au seul back-office mais part dans l'export principal ; les propositions du labo fuient par `export *` de `tokens` (`index.ts:6`) | Supprimer `Skeleton` ; O5 pour le reste. Les composants inutilisés restent s'ils font partie de la charte synchronisée                                    |
| `packages/i18n` | `prepare.deploy.loadPreset` jamais référencé (contrôle par échantillon)                                                                                                                                                                                                                                                                                                                                                                                 | Supprimer ; ajouter un test « clés utilisées » plus tard                                                                                                  |

### 3.4 Dépendances

- Toutes les dépendances déclarées sont utilisées ; aucune n'est utilisée sans être déclarée (hors `node:fs` dans `packages/ui`, qui marche parce que vitest charge les types Node).
- `apps/server → @occulis/ui` pour **six couleurs** (`auth/mail.ts:2`, via `@occulis/ui/tokens`, sans import React) : légitime au vu de la règle des couleurs, mais lourd (O4).
- **`@cloudflare/vitest-pool-workers@0.5.41`** tire wrangler 3.100 et miniflare 3.20241230 (`pnpm-lock.yaml`), alors que dev et déploiement utilisent wrangler 4.127 et `compatibility_date = "2026-08-27"`. Les 179 tests serveur tournent donc sur un workerd de fin 2024 (N6). Le contournement `isolatedStorage: false` (`vitest.config.ts:30-34`) en découle.
- Deux Vite : 6.4 pour le build web, 5.4 dans vitest. Asymétries cosmétiques : vitest `^2.1.8`/`^2.1.9`, `@types/react`, `@types/node ^22`. La racine duplique `wrangler` et `@cloudflare/workers-types`.

---

## 4. Écrans pas encore migrés vers `@occulis/ui` (tâche #41)

Tous sont en DOM natif, stylés par `apps/web/src/ui/ui.css` (**968 lignes** : `.panel`,
`.primary`, `.quiet`, `.friend*`, `.settings__*`, `.waiting-orbit`, règles par `#id`, et
une règle globale `button:not([class*="occ-"])`).

| Écran                     | Balisage / code                                                     | Remplacement sur la charte                                                                                                                                     | Manque à la charte    |
| ------------------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| Amorçage                  | `index.html:91-93` (`occ-progress` brut)                            | `ProgressBar`                                                                                                                                                  | —                     |
| Bandeau d'usurpation      | `index.html:26-30`, `shell.ts:191-192`                              | `Banner icon="impersonate"` + `Button variant="danger"`, comme `profile/App.tsx:157-168`                                                                       | —                     |
| Coin du compte, engrenage | `index.html:35-56` (SVG inline)                                     | `IconButton`, `TopBar` `end`                                                                                                                                   | icône `settings`      |
| Réglages                  | `index.html:60-84`, `ui/settings.ts`                                | `SettingList` / `SettingRow`, `Segmented` (thèmes), `LocaleSwitch`                                                                                             | **popover non modal** |
| Menu                      | `index.html:102-170`, `shell.ts`                                    | `Wordmark`, `Card`, `ChoiceList` / `ChoiceRow` ou `Button variant="primary"`, `TextField` + `Button` (code), `Banner` (renvoi), `FormMessage` (`#menu-notice`) | —                     |
| Panneau d'amis du menu    | `index.html:152-162`, `ui/friends-panel.ts:35-85` (`createElement`) | `List` / `ListRow`, `Person`, `Badge`, `Button size="sm"`, `EmptyState`                                                                                        | —                     |
| Attente                   | `index.html:173-183`                                                | `Card`, `IconButton icon="copy"`, `Button` discret, `FormMessage`                                                                                              | **orbite d'attente**  |
| Bandeau de partie         | `index.html:204-223`, `ui/console.ts`                               | `Toolbar` / `ToolbarText`, `TextField`, `FormMessage`, `Note`, `Button` discret                                                                                | —                     |
| Quitter la partie         | `confirm()` (`main.ts:446`)                                         | `Dialog` `danger`                                                                                                                                              | —                     |
| **Voile**                 | `ui/veil.ts`, `ui/veil.css`                                         | **Hors périmètre** : geste verrouillé par le porteur du projet (`veil.test.ts`)                                                                                | —                     |

À faire en même temps (relevé d'OCC-41) :

- n'en garder qu'**une famille** de propriétés CSS (`--ink`… de `ui/palette.ts` contre `--occ-*`) ;
- garder `ui/flow.ts` pur et testé, et les champs natifs (focus, saisie) de la console ;
- resynchroniser Claude Design si des composants s'ajoutent.

Restes de style hors charte :

- les blocs `<style>` de `index.html:10-12`, `admin/index.html`, `profile/index.html` et `lab/index.html` (marges et débordement seulement) ;
- les `style={{}}` inline de `admin/ReplayBoard.tsx:52`, `team/TeamBuilder.tsx:181`, `admin/shared.tsx:39`, `admin/design/Foundations.tsx` et `admin/design/Motion.tsx:92`.

**R moyen, G élevé.** Ce lot est bloqué par la direction graphique (OCC-89/90).

---

## 5. Sélecteurs stables pour l'E2E

### 5.1 L'existant

- **Aucun `data-testid`** dans le dépôt, aucun crochet global, aucune configuration Playwright. Le canevas Pixi (`scene/board.ts:41`) n'a ni rôle ni nom.
- Le **DOM natif** de `index.html` a des ids et des libellés corrects : `#play-quick`, `#play-host`, `#join-code` (`<label for>`), `#play-join`, `#waiting-cancel`, `#command-input` (« Move »), `#leave-match`, `#account-signout`, `#settings-toggle`.
- Les **formulaires de compte** (`AccountApp.tsx`) ont des ids de formulaire et des champs étiquetés : `getByLabel` fonctionne, les boutons d'envoi ont un texte, les liens sont de vrais `<a href>`.
- **Jouer un coup sans pixel** : `#command-input` accepte `1,6 2,5` et `abandon` / `resign` (`ui/command.ts:27`) ; il n'y a pas de bouton d'envoi, il faut appuyer sur Entrée. Le résultat s'affiche dans `#command-log[data-state=ok|ko]`, le tour dans `#status[data-yours]`.
- Seuls états exposés en attributs : `#status[data-yours]`, `#command-log[data-state]`, `li.friend[data-online]`, `html[data-theme]`, `[data-theme-choice]`, `[data-locale]`.

### 5.2 Les manques

| #   | Où                                                                                                       | Constat                                                                                                                                                                               | Proposition                                                                               | R      | G      |
| --- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------ | ------ |
| 5.a | `packages/ui/src/components/Dialog.tsx:84-97`                                                            | Pas d'`aria-labelledby` : `getByRole('dialog', { name })` ne trouve pas la fenêtre de partie trouvée                                                                                  | Relier le titre                                                                           | faible | moyen  |
| 5.b | `team/TeamBuilder.tsx:70,82,125,184-185` ; `profile/parts.tsx:196-197` ; `admin/MatchDetail.tsx:145-146` | Noms ambigus : chaque sélecteur de type de slot porte `m.slot.choose` ; le retrait d'un slot et « Reset » partagent `m.actions.reset` ; les deux rotations partagent `m.board.rotate` | Libellés uniques (« Rotate left/right », « Remove slot N »)                               | faible | moyen  |
| 5.c | `ui/friends-panel.ts`, `profile/Friends.tsx`                                                             | « Challenge », « Messages », « Remove » répétés à chaque ligne sans id                                                                                                                | Limiter par ligne (`li` filtré par pseudo), ou `data-testid="friend-row"` + `data-handle` | faible | moyen  |
| 5.d | `ui/shell.ts:132`                                                                                        | L'écran courant ne se lit que par `hidden` sur `#screen-*`                                                                                                                            | `document.body.dataset.stage = stage.kind`                                                | faible | moyen  |
| 5.e | `team/TeamBuilder.tsx:181`                                                                               | Placer une pièce exige un clic au pixel sur le canevas                                                                                                                                | Utiliser « Auto-fill » / « Defaults » dans l'E2E ; pas de crochet nécessaire              | —      | —      |
| 5.f | `#waiting-code`, `#waiting-copy`                                                                         | `<p>` nu ; le texte du bouton est posé par script sans `data-i18n`                                                                                                                    | Lire par id ; i18n du bouton avec #41                                                     | faible | faible |
| 5.g | `profile/Friends.tsx:612`                                                                                | `aria-label` du chat = son placeholder, qui change sous usurpation                                                                                                                    | Libellé fixe                                                                              | faible | faible |

### 5.3 Ce que l'étape 2 devra prévoir (sans changer le code de production)

- **Démarrage** : les trois étapes de `pnpm local` en direct pour le `webServer` de Playwright : `build:local`, `wrangler d1 migrations apply occulis-local --local`, `wrangler dev`. L'état est persisté **hors iCloud** (`--persist-to`).
- **`AUTH_SECRET`** (≥ 32 caractères) obligatoire, faute de quoi tout répond 503 (`index.ts:54-70`) ; ainsi que **`PASSWORD_BREACH_CHECK=off`**, pour ne pas appeler HIBP.
- **Vérification d'adresse** : il n'existe pas de boîte de réception locale (sans `RESEND_API_KEY`, le courrier ne va qu'à la console). On vérifie donc par `wrangler d1 execute … "UPDATE users SET email_verified=1 …"`, comme `test-helpers.ts:82-84`. Sans `cookieCache`, l'effet est immédiat.
- **Limites de débit** toujours actives et persistées : inscription 5/h, connexion 5/min. Il faut purger `rate_limits` avant la suite et donner un `CF-Connecting-IP` distinct par contexte (à vérifier : `wrangler dev` peut réécrire l'en-tête).
- **Cookies** `Secure` sur `http://localhost` : Chromium les accepte, WebKit peut-être pas. On part sur Chromium seul.
- **Fog vérifié sur les trames WebSocket** (`page.on('websocket')` → `framereceived`) : on contrôle que les vues reçues par A ne contiennent aucune pièce de B hors de sa LOS. Cela prouve que le fog est appliqué **à la source**, sans aucun crochet côté client.
- **Temps** : acceptation 15 s, déploiement 90 s (raccourci si les deux camps verrouillent), forfait d'absence 30 s. Le salon privé saute la proposition.

---

## 6. Zones qui méritent un commentaire « pourquoi »

### 6.1 Commentaires à ajouter

| Où                                                                                     | Ce qu'il faut expliquer                                                                                                                                                                                                                                            |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `packages/protocol/src/index.ts:90`, `match-do.ts:177-193`                             | **Ordre des messages** dont dépend le client. Joueur : `hello` → `welcome` → `spectators` → (`deployment` → `deployment-update`* → `view`) ou `view`. Spectateur : `hello` → `watching` → `view`*. Chaque `hello` rediffuse les vues à tous.                       |
| `match-do.ts:436-447`                                                                  | Pourquoi `live` avance **avant** les `await` (les _input gates_ ne couvrent pas D1), et ce qui se passe si l'écriture échoue (A2).                                                                                                                                 |
| `match-do.ts:549-552`                                                                  | La phase est **implicite**, déduite de la présence de `setup`.                                                                                                                                                                                                     |
| `match-do.ts:290-302`                                                                  | Alarme unique : pourquoi `deploying()` est revérifié après `start()`, et pourquoi l'échéance est recomparée (alarme en avance, en retard, ou restée d'une absence).                                                                                                |
| `match-do.ts:559-565`                                                                  | `setup` est lu dans le stockage du DO et non dans D1 (A4).                                                                                                                                                                                                         |
| `queue-do.ts:197-205`, `:150-169`                                                      | Sauvegarder l'état **avant** `await startMatch` : c'est ce qui empêche réellement le double appariement.                                                                                                                                                           |
| `queue-do.ts:105-110,192`                                                              | Comportement des propositions quand l'alarme dérive (`expire` en `<= now`, `remainingMs` recalculé à chaque envoi).                                                                                                                                                |
| `social-do.ts:35`                                                                      | `player` réécrit à chaque requête : un DO ne retrouve pas son nom depuis son id.                                                                                                                                                                                   |
| `me/routes.ts:64-75`                                                                   | Reconnexion : la session débloque le jeton de siège par un appel interne au DO, et l'usurpation en est exclue.                                                                                                                                                     |
| `me/queries.ts:249-252`                                                                | Pourquoi un abandon adverse reste visible quand les autres coups adverses sont masqués.                                                                                                                                                                            |
| `index.ts:54-70`                                                                       | Cette liste de routes doit refléter les préfixes de chaque routeur (ou disparaître, 1.9).                                                                                                                                                                          |
| `packages/core/src/los.ts:104-105`                                                     | L'interpolation `eyeFrom + ((eyeTo - eyeFrom) * i) / lastStep` **multiplie avant de diviser** pour rester exacte sur les entiers, ce qui rend fiable la comparaison `>=`. La « simplifier » en `(d / lastStep) * i` casserait sans bruit les murs à hauteur d'œil. |
| `packages/core/src/los.ts:91`                                                          | `lastStep <= 1` : deux cases adjacentes se voient toujours, quelle que soit la différence de hauteur.                                                                                                                                                              |
| `packages/core/src/fog.ts:67-81,127-128`                                               | `remembered` garde aussi les ennemis visibles maintenant, d'où le filtre `seenNow` dans `viewFor` ; `lastSeenTurn` vient de `state.turn`, que l'abandon n'incrémente pas.                                                                                          |
| `apps/web/src/net/channel.ts:74-76`                                                    | `send` **perd** le message pendant une reconnexion ; un coup tapé à ce moment disparaît, et `pending` ne se vide qu'au renvoi d'une vue.                                                                                                                           |
| `apps/web/src/game/online-match.ts:99-104`                                             | `validateAction` local s'exécute sur l'hypothèse optimiste ; le chemin de la console contourne `legalActions`.                                                                                                                                                     |
| `apps/web/src/scene/scene.ts:233,261,292-299,347-350,380-384`                          | Seuils d'intro (0,4 / 0,55 / 0,7), bascule intro / apparition, atterrissage détecté sur un changement de `pieceId` (deux coups de suite d'une même pièce sauteraient l'atterrissage), triple origine du flash.                                                     |
| `apps/web/src/view/iso.ts:66-72,139-142`                                               | Formule isométrique 2:1, et pourquoi `x + y` sert de clé de profondeur.                                                                                                                                                                                            |
| `apps/web/src/view/camera.ts:130-141`                                                  | Lissage `min(1, delta/SETTLE_MS)` dépendant de la cadence ; angle non borné par `turn()` mais ramené par `lerpAngle`.                                                                                                                                              |
| `view/effects.ts:44`, `view/ambient.ts:158`, `view/reveal.ts:62`, `view/picking.ts:43` | Constantes de hachage (`12.9898`, `78.233`, `7919`, deux générateurs pseudo-aléatoires différents) ; dépendance au format de `coordKey` ; tri de toutes les cases à chaque `pointermove`.                                                                          |
| `ui/console.ts:86`, `prepare/clock.ts:15`, `team/placement-canvas.ts:50-53`            | Reflow forcé `void element.offsetWidth` ; dépendance booléenne `[remaining <= 0]` ; double rotation pour le camp B.                                                                                                                                                |

### 6.2 Test à ajouter avec le lot `MatchDO`

Aucun test n'évince le DO. Il en faut un qui remette `instance.live = null` via `runInDurableObject`, joue un coup, et vérifie que les vues sont identiques à celles qu'aurait produites un DO jamais endormi. C'est la preuve directe de « log D1 = source de vérité » et de la reconstruction après hibernation.

### 6.3 Commentaires et docs périmés

| Où                                                                                 | Écrit                                                   | Réalité                                                     |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------- | ----------------------------------------------------------- |
| `apps/web/index.html:201-203`                                                      | « enchaîner déplacement et capture »                    | la capture est retirée                                      |
| `input/controls.ts:15`                                                             | « seul module du client qui écoute des événements »     | shell, réglages et console écoutent aussi                   |
| `view/animation.ts:6-8`                                                            | « l'action est appliquée à l'état immédiatement »       | ce n'est plus vrai                                          |
| `account/mount.tsx:7`                                                              | « seul écran du jeu en React »                          | il y a quatre îlots                                         |
| `team/TeamBuilder.tsx:25`                                                          | `deployment/`                                           | le dossier s'appelle `prepare/`                             |
| `game/hypothesis.ts:23-24`, `game/selection.ts:34`, `core/pieces/piece-type.ts:43` | menaces, attaquants, « sa capture met fin à la partie » | règles retirées                                             |
| `CLAUDE.md:15`                                                                     | `src/iso.ts`                                            | `src/view/iso.ts`                                           |
| migrations `0002`, `0003`                                                          | « l'authentification n'est pas encore branchée »        | historique, à laisser (les migrations ne se réécrivent pas) |

---

## 7. Propositions de structure

Chaque proposition donne : **constat → changement → bénéfice → coût → impact sur les
invariants → nécessaire ou optionnelle**. Les déplacements se font en `git mv` sans
modifier le contenu, dans un commit séparé de toute retouche.

### Nécessaires (prérequis de la refonte)

**N1. Sortir le dépôt d'iCloud** — R faible, G élevé

- **Constat** :
  - le dépôt vit sur le Bureau synchronisé, qui produit 458 doublons `* 2.*`, dont 75 dans des dossiers sources ;
  - `tsc` les compile (vérifié avec `--listFilesOnly`), `eslint .` les lint, et l'`import.meta.glob` eager du design system (`admin/design/sources.ts:35-46`) les **importe** avant de les filtrer ;
  - on trouve aussi `.git/index 2`, environ 25 000 copies dans `node_modules`, et des copies des WAL SQLite de `.wrangler/state`, ce qui risque de corrompre la D1 locale ;
  - un doublon dans `migrations/` serait appliqué comme une vraie migration ;
  - le dépôt est aussi accessible sous deux casses (`Dev` / `dev`).
- **Changement** : déplacer le clone hors de `~/Desktop` et `~/Documents`, ou exclure le dossier de la synchronisation, puis supprimer les doublons.
- **Bénéfice** : supprime toute une famille de faux positifs et d'état corrompu.
- **Coût** : quelques minutes, et rouvrir l'IDE et les sessions.
- **Invariants** : aucun impact.

**N2. Ignorer `* 2.*` en attendant N1** — R faible, G moyen. Ajouter `**/* 2.*` aux `ignores` d'ESLint et des `exclude` aux tsconfig. Transitoire.

**N3. ESLint plus strict** (décidé) — R faible, G élevé

- **Constat** :
  - seul `recommended` est actif, sans règle typée ;
  - aucun `eslint-plugin-react-hooks`, alors qu'il aurait attrapé A6 et `tooling/infra/src/components/App.tsx:66-73` ;
  - `no-unused-vars` n'est qu'un avertissement, et la CI ne fixe pas `--max-warnings 0`.
- **Changement** :
  - `typescript-eslint` en mode _type-checked_ (`no-floating-promises`, `no-misused-promises`, `switch-exhaustiveness-check`) ;
  - `react-hooks` (`rules-of-hooks`, `exhaustive-deps`) ;
  - **frontières de couches** par `no-restricted-imports` : `view/`, `game/`, `net/session.ts`, `ui/flow.ts`, `load/cache.ts` sans `pixi.js` ni DOM ; `packages/core` sans rien d'autre ; `team/` et `profile/` sans import d'`admin/` (après O1) ;
  - `--max-warnings 0` en CI.
- **Bénéfice** : les conventions de CLAUDE.md deviennent mécaniques.
- **Coût** : de quelques dizaines à une centaine de corrections, à traiter règle par règle ; le linting typé ralentit `pnpm lint`.
- **Invariants** : il en renforce plusieurs, pureté des modules et `core` sans dépendance.

**N4. Couverture de tests** (décidé) — R faible, G moyen

- **Constat** : aucune mesure ; tous les tests sont colocalisés `*.test.ts`, sans configuration vitest commune.
- **Changement** :
  - `@vitest/coverage-v8` ;
  - seuils **par dossier pur** : `packages/core` haut (~90 %), `apps/web/src/{view,game,ui/flow.ts,load}` et les modules purs du serveur (`seating`, `pairing`, `rooms`, `proposals`, `rating`, `social/relations`…) moyen ;
  - rapport en CI, échec sous le seuil ;
  - aucun seuil sur le code Pixi ni sur les DO, que l'E2E couvre.
- **Bénéfice** : on voit ce que la refonte découvre.
- **Coût** : faible ; les seuils se fixent au niveau actuel puis montent.
- **Invariants** : aucun impact.

**N5. Node 24 partout** — R faible, G moyen. `.nvmrc` dit 24 et le README affirme que « wrangler refuse Node 22 », mais la CI tourne en Node 22 (`ci.yml:25,90`, `infra.yml:79`), `engines` dit `>=22` et `@types/node` est en `^22`. Le changement : aligner sur 24, ou corriger le README si l'affirmation est fausse.

**N6. `@cloudflare/vitest-pool-workers` à jour** — R moyen, G élevé. La suite serveur doit tourner sur le runtime qu'on déploie (3.4). La montée de version peut casser des tests, et il faut probablement revoir `isolatedStorage: false`. Elle **renforce** la confiance dans les tests d'hibernation et de rejeu.

### Optionnelles

**O1. Arborescence de `apps/web/src`** — R faible (`git mv`), G moyen

- **Constat** :
  - `team/` (constructeur) et `teams/` (presets) ne diffèrent que d'une lettre ;
  - `canvas/` et `scene/` sont deux rendus ;
  - `src/i18n/` porte le nom du paquet qu'il enveloppe ;
  - `ui/` mélange modules purs (`flow`, `command`, `messages`), DOM et CSS ;
  - le social est éparpillé en quatre endroits ;
  - replay et formatage partagés vivent dans `admin/` ;
  - `theme.ts` est à la racine et `theme-choice.ts` / `palette.ts` dans `ui/`.
- **Changement** :

  | Avant                                             | Après                                                     |
  | ------------------------------------------------- | --------------------------------------------------------- |
  | `team/`, `teams/`                                 | `team-builder/`, `presets/`                               |
  | `canvas/`, `scene/`                               | `render/canvas2d/`, `render/pixi/`                        |
  | replay et formatage dans `admin/`                 | `replay/`, `format.ts`                                    |
  | `src/i18n/`                                       | `locale/`                                                 |
  | `ui/`                                             | `screens/` (DOM) et pur réparti dans `game/` et `ui/flow` |
  | `theme.ts`, `ui/theme-choice.ts`, `ui/palette.ts` | `theme/`                                                  |

- **Bénéfice** : le dossier dit la dépendance, comme le veut CLAUDE.md.
- **Coût** : conflits avec les branches en cours, et `engine.md` à mettre à jour dans le même commit.
- **Invariants** : aucun impact.

**O2. Arborescence de `apps/server/src`** — R moyen, G moyen. `http/` (réponses, corps, gardes, pagination), `matches/` (store, rejeu, historique, masquage, démarrage), `realtime/` (montées en WebSocket), avec les DO dans `do/`. Bénéfice : `me/` et `social/` ne dépendent plus d'`admin/`. `server.md` est à réécrire en conséquence. Aucun impact sur les invariants si les DO ne changent pas de classe exportée (`wrangler.toml`).

**O3. `@occulis/protocol` complet** — R moyen, G élevé

- **Constat** :
  - rien n'est validé à l'exécution (A3) ;
  - la réponse `/api/auth/me` est redéclarée côté client (`net/auth.ts:12-23`) ;
  - les réponses REST ponctuelles (`{relation}`, `{revoked}`…) sont typées inline côté client ;
  - les codes d'erreur ne sont typés nulle part ;
  - `PlayerCard.feats` est un `string[]` sans lien avec le catalogue ;
  - des doublons existent : `AdminFramePiece` / `MeFramePiece`, `AdminPlayer.record` / `MeRecord`, `matched` dans deux unions, `protocol-mismatch` ×3.
- **Changement** :
  - `parse.ts` sans dépendance (`parseClientMessage`, `parseQueueClientMessage`, `parseSocialClientMessage`, `parseAction`, `parseTeam` venu de core) ;
  - les bornes partagées (2.5) ;
  - les types REST et les codes d'erreur ;
  - les doublons fusionnés.
- **Coût** : moyen.
- **Invariants** : l'invariant du log D1 en sort renforcé, puisque seul un objet canonique est journalisé. **Changement de comportement** sur les entrées malformées, à décider avec A3.

**O4. Tokens sans React pour le serveur** — R faible, G faible. Le serveur dépend du paquet UI React pour six couleurs. Deux options : un paquet `@occulis/tokens`, ou garder le sous-chemin `@occulis/ui/tokens` en documentant qu'il n'importe rien. `tokens.ts` resterait l'unique source de couleur : la règle ESLint et les tests suivent le fichier. **Recommandation : ne rien faire** tant que ça ne gêne pas.

**O5. `@occulis/ui` allégé** — R moyen (synchro Claude Design), G faible

- `Showcase` passe sur un sous-chemin `@occulis/ui/showcase`, avec son CSS à part.
- Les propositions du labo sortent de `export *` de `tokens`.
- Les sous-chemins `./lab` et `./lab.css`, sans consommateur, sont supprimés.
- tsup (`pnpm -r build`) ne sert qu'à la synchro Claude Design (`.design-sync/config.json:6-7`) : il passe en `build:dist` hors CI.
- Deux dossiers « previews » coexistent : `packages/ui/previews/`, le labo, typé ; et `.design-sync/previews/`, les histoires, **jamais typé**. Il faut les renommer ou le documenter.

**O6. Configuration partagée** — R faible, G moyen

- **Constat** :
  - `tsconfig.base.json` existe, mais `outDir` / `rootDir` sont répétés dans des paquets qui n'émettent rien ;
  - ne sont typés par personne : `apps/web/vite.config.ts`, `apps/web/lab/`, `apps/server/vitest.config.ts`, `scripts/generate-schema.mts`, `packages/ui/tsup.config.ts`, `.design-sync/previews/` ;
  - il n'y a qu'une configuration vitest, celle du serveur.
- **Changement** :
  - `tsconfig.node.json` pour les fichiers de configuration ;
  - inclusion des dossiers oubliés ;
  - `vitest.workspace.ts` à la racine, qui permet aussi la couverture globale de N4.
- **Invariants** : aucun impact.

**O7. Prettier vérifié en CI** — R faible, G faible. 258 des 524 fichiers suivis ne passent pas `prettier --check`, `graphify-out/` compris. Il faudrait un `.prettierignore`, puis **un seul commit de reformatage isolé** (à ignorer par `git blame` via `.git-blame-ignore-revs`), puis `format:check` en CI. Le coût est surtout un diff massif, sans impact sur les invariants.

**O8. `graphify-out/` et `.claude/`** — R faible, G moyen. **Fait le 2026-10-18** (option « tout ignorer ») : `graphify-out/` sort de git, le hook au chemin Linux est retiré, l'usage est décrit dans [graphify.md](graphify.md).

- **Constat** :
  - `graphify-out/` pèse 9,6 Mo suivis (234 fichiers), caches compris ;
  - il contient des chemins propres à une machine (`.graphify_python` → `/home/cactus/...`, `.graphify_root`) ;
  - la consigne « lancer `graphify update .` après modification » garantit du bruit dans chaque diff ;
  - le premier hook de `.claude/settings.json` appelle `/home/cactus/dev/Occulis/.venv/bin/graphify`, un chemin Linux absent sur ce Mac.
- **Changement** : sortir les caches de git (ou tout `graphify-out/`, régénéré localement) et corriger le chemin du hook.

**O9. Documentation** — R faible, G moyen

Corrections **nécessaires** :

- CLAUDE.md : `:17` « Pas de backend écrit à ce jour » et `:48` « le matchmaking et l'authentification non » contredisent `:13` et `:88` ; `:35` oublie `ui.md` ; « une quarantaine de briques » ; `roster/` sans `pawn.ts` ; `:15` `src/iso.ts`.
- `docs/architecture.md:7` : « ni serveur, ni base, ni CI ».
- `docs/technical/core.md:522-525` liste 9 codes `ActionError` alors qu'il y en a 4 (`actions.ts:23-27`).
- `apps/server/src/protocol.ts` et `apps/server/src/scenarios.ts` n'existent plus (`core.md:149,528,630`, `server.md:1017-1018`).
- Le démarrage du README (`:26-29`) saute les migrations : il faut renvoyer à `pnpm local`.
- L'introduction d'`implementation-notes.md` dit ne porter que sur `core`, alors que les notes 19 à 31 portent sur le serveur et le client.
- `tooling/infra/README.md` donne `pnpm run ci -- <action>`, contredit par `infra.yml:90-92`.

Propositions **optionnelles** :

- une fiche `docs/technical/i18n.md`, aujourd'hui noyée dans `engine.md`, et le paquet ajouté à l'« Organisation » du README ;
- découper `engine.md` (1 660 lignes) et `server.md` (1 346) par dossier, en suivant O1 et O2 ;
- `docs/refactor-audit.md` (ce fichier) à archiver ou supprimer une fois la refonte faite ;
- noms des maquettes en anglais (`partie.html`…), cosmétique.

**O10. Schéma et migrations** — R moyen, G moyen

- **Constat** :
  - `0004_better_auth.sql` se dit générée, mais elle est retouchée à la main : migration de données `:81-109`, index `:114,117`. C'est contraire à la règle de CLAUDE.md ;
  - `users.player_id` a perdu sa clé étrangère (`0002:11` → `0004:26`) et n'est pas unique, donc deux comptes pourraient partager un profil ;
  - rien ne garantit un seul preset par défaut ;
  - les clés étrangères de `0008` n'ont pas d'`ON DELETE` (la suppression se fait à la main) ;
  - les horodatages mélangent texte ISO (Better Auth) et millisecondes ;
  - le `UNIQUE` sensible à la casse de `players.handle` est redondant avec l'index insensible de `0006`.
- **Changement** :
  - documenter dans 0004 ce qui est généré ;
  - nouvelles migrations : index unique partiel `users(player_id) WHERE player_id IS NOT NULL`, et `team_presets(player_id) WHERE is_default = 1`.
- **Invariants** : aucun impact. **Ça change le schéma**, donc décision à part (0bis).

---

## 8. Décisions demandées

| #   | Question                                                                                                                  | Ma recommandation                                                                                     |
| --- | ------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| D1  | Corriger A1 (`POST /api/matches`) maintenant, hors refonte ?                                                              | **Oui, en premier** : supprimer la route ou la réserver à `admin` ou au local                         |
| D2  | Corriger A2 à A7 (robustesse DO, validation, hook, déploiement infra) en PR séparées avant ou pendant la refonte ?        | Oui, chacune en PR dédiée, A3 avec O3 ; après l'E2E pour A2 et A4                                     |
| D3  | A8 : versionner les scénarios avec la partie ?                                                                            | À trancher, c'est un choix d'architecture ; je propose de figer la carte dans `matches` à la création |
| D4  | N1 : déplacer le dépôt hors d'iCloud ?                                                                                    | Oui, avant l'E2E (la D1 locale y est exposée)                                                         |
| D5  | N5 : Node 24 en CI, ou correction du README ?                                                                             | Node 24                                                                                               |
| D6  | O1 et O2 : réorganiser les dossiers ?                                                                                     | O1 oui, après les découpages de `main.ts` ; O2 avec le lot `matches/`                                 |
| D7  | O3 : validation des messages à l'exécution dans `@occulis/protocol` ?                                                     | Oui, lié à A3                                                                                         |
| D8  | O5 et O6 : allègement de la charte, configuration partagée ?                                                              | O6 oui ; O5 plus tard, à cause de la synchro Claude Design                                            |
| D9  | O7 : reformatage Prettier global ?                                                                                        | Oui, mais seul et en dernier, pour ne pas polluer les autres PR                                       |
| D10 | O8 : sortir `graphify-out/` de git ?                                                                                      | Au moins les caches                                                                                   |
| D11 | O10 : nouvelles migrations d'intégrité ?                                                                                  | Oui, après D1                                                                                         |
| D12 | Étape 2 : Playwright, Chromium seul, fog contrôlé sur les trames WebSocket, état de test dans un répertoire hors iCloud ? | Oui ; je n'ai pas d'avis contraire à Playwright                                                       |

### Réponses du porteur du projet (2026-10-18)

| #           | Réponse                                                                                                                                                                                                                                                   |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1          | Oui                                                                                                                                                                                                                                                       |
| D2          | Oui, une PR par anomalie                                                                                                                                                                                                                                  |
| D3          | Figer la carte dans la partie à sa création — **fait** (`matches.map`, `welcome.board`, protocole 7)                                                                                                                                                      |
| D4          | « Il y est déjà » — à clarifier : `~/Desktop` est bien synchronisé par iCloud                                                                                                                                                                             |
| D5          | CI en Node 24                                                                                                                                                                                                                                             |
| D6, D7, D11 | Oui — D7 fait (`parse.ts`), D11 fait (migration 0010)                                                                                                                                                                                                     |
| D8          | Configuration partagée : oui. Allègement de `@occulis/ui` : plus tard                                                                                                                                                                                     |
| D9          | Oui, tout reformater avec Prettier (`pnpm format`, qui existe déjà)                                                                                                                                                                                       |
| D10         | Tout `graphify-out/` hors de git — fait, voir O8                                                                                                                                                                                                          |
| D12         | **Pas d'E2E pour l'instant.** Les lots de l'étape 3 ne reposent donc que sur les tests unitaires, le typecheck, le lint et une vérification manuelle ; ceux qui touchent `MatchDO`, `QueueDO` et `main.ts` attendent d'avoir des tests unitaires ou l'E2E |
