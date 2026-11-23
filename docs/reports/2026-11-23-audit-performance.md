# Audit de performance

> État au **2026-11-23**, commit `92cece0` (branche `staging`). **Rapport seul** : aucun
> fichier de code n'a été modifié. Tâche Nota rattachée à OCC-80 (« Optimisation massive :
> travail de performance sur le site »).

Notation des tableaux, reprise de la [revue globale du 2026-10-20](2026-10-20-review-globale.md) :

- **Sév.** : critique / majeure / mineure.
- **G** : gain attendu, faible / moyen / élevé. **E** : effort, S / M / L.
- **Conf.** : certain (mesuré ou lu dans le code) / probable / à vérifier.

## Synthèse

Aucun constat critique : à l'échelle actuelle (plateau 9 × 9, 12 pièces, beta fermée), le
jeu tient. Trois points coûtent pourtant à chaque partie et grossiront avec elle :

1. **Le `MatchDO` rejoue tout le log après chaque hibernation** — en pratique avant presque
   chaque coup, puisqu'un joueur réfléchit plus longtemps que le délai d'éviction. Le coût
   d'un coup croît donc avec la longueur de la partie (§2.1).
2. **Le filtre d'échec domine le calcul des coups légaux** : ~85 % de `legalActions()`,
   appelé plusieurs fois par coup côté serveur (§1.1, §1.2).
3. **Le plateau Pixi est redessiné entièrement à chaque image**, 60 fois par seconde, même
   quand rien ne bouge (§3.1).

Côté réseau, le bundle est sain (Pixi chargé à part, assets immuables) ; le gain le plus net
est de ne livrer que la langue utilisée (§3.2).

## Méthode

- Lecture des chemins chauds : `packages/core` (LOS, fog, coups légaux, fin de partie),
  `apps/server/src/match-do.ts`, `apps/web/src/render/pixi/`, `apps/web/src/app/`.
- **Micro-benchmark** du moteur sous Node 24 (vitest, sans couverture), sur `breach-1` /
  `provisional-3` avec les équipes par défaut (12 pièces, 79 cases), et une partie aléatoire
  déterministe de 101 coups (nulle sans prise). Les valeurs absolues dépendent de la
  machine ; workerd tourne sur le même V8, les ordres de grandeur valent pour le serveur.
- **Build de production** de `apps/web` (`vite build`) avec source maps, ventilées par
  module source.
- Non mesuré : le rendu Pixi en conditions réelles (pas de GPU ni de serveur local dans
  l'environnement d'audit) ; les latences D1 en production. Les constats concernés sont
  marqués « probable ».

### Mesures du moteur

| Opération                                      |  Temps |
| ---------------------------------------------- | -----: |
| `legalActions` (position initiale, 34 coups)   | 1,4 ms |
| `isKingThreatened` (un appel)                  |  35 µs |
| `validateAction`                               |  90 µs |
| `applyAction`                                  | 113 µs |
| `visibleTilesFor` (6 pièces)                   | 380 µs |
| `fieldOfView` (une pièce)                      |  48 µs |
| `viewFor` (camp au trait)                      | 2,0 ms |
| `replayMemory`, 60 coups                       |  28 ms |
| `replayMemory`, 101 coups                      |  51 ms |
| `board.heightAt` × 1000                        |  45 µs |
| Vue de fin de partie sérialisée (`encodeView`) |  ~8 Ko |

## 1. Moteur de règles (`packages/core`)

| #   | Constat                                                                                                                                                                                                                                                                                                                                                                                    | Sév.    | G      | E   | Conf.   |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------- | ------ | --- | ------- |
| 1.1 | **Le filtre d'échec coûte ~85 % de `legalActions`.** Chaque coup candidat appelle `leavesKingExposed` → `isKingThreatened`, qui recopie l'occupation pour chaque pièce adverse (`new Set(occupied)`, `endgame.ts`) puis lance un parcours complet `reachableTiles` pour savoir si **une** case est atteinte (`PieceType.threatens`). 34 coups × 35 µs ≈ 1,2 ms sur 1,4 ms.                 | majeure | élevé  | M   | certain |
| 1.2 | **Les coups légaux sont calculés plusieurs fois par coup joué.** `applyAction` les parcourt pour la fin de partie (`hasLegalAction`), puis `viewFor` les recalcule en entier pour le camp au trait, et `validateAction` refait `destinationsFor` + le filtre d'échec pour le coup reçu. Le serveur en paie au moins deux générations complètes par coup, plus une par `hello`.             | mineure | moyen  | M   | certain |
| 1.3 | **Clés de case en chaînes partout.** `Board` indexe ses cases par `"x,y"` : `heightAt`, `getTile`, `contains` allouent une chaîne à chaque appel, dans les boucles les plus internes (raycast, BFS). Idem pour les ensembles d'occupation. Un index numérique (`x + y * largeur`) dans `Board` garderait l'API publique.                                                                   | mineure | moyen  | M   | certain |
| 1.4 | **`fieldOfView` lance deux raycasts par case hors de vue.** Un premier passage `canSee` sur tout le plateau, un second `blockingPiece` sur les cases non vues ; chacun reconstruit son tracé de Bresenham (`rasterizeLine` alloue un tableau d'objets). Fusionner les deux passages (un tracé, deux lectures) divise le travail par ~2 pour les cases masquées.                            | mineure | moyen  | S   | certain |
| 1.5 | **Copies linéaires à chaque coup.** `history` (`[...state.history, …]`), `journal` (`[...previous.journal, entry]`) et la table des répétitions (`new Map(previous.seen)`) sont recopiés à chaque coup : le rejeu est donc quadratique en mémoire allouée. Négligeable à 100 coups, à garder en tête si les parties s'allongent. L'immuabilité est voulue ; ne pas la casser pour ce gain. | mineure | faible | M   | certain |

Pistes, par ordre de rendement :

- **1.1** : une `threatens` qui s'arrête dès que la cible est atteinte (BFS bornée, ou test
  direct pour les profils en ligne droite), et une occupation « sans cette pièce » obtenue
  sans recopie (ensemble + clé exclue). Gain attendu : `legalActions` ÷ 3 à 5. Les tests
  d'échec et de mat (`endgame.test.ts`) couvrent déjà le comportement.
- **1.2** : laisser `viewFor` réutiliser une liste de coups déjà calculée (paramètre
  optionnel), et mémoriser `legalActions` par `GameState` (l'état est immuable, une
  `WeakMap` suffit). Aucun changement de règle.

## 2. Serveur (`apps/server`)

| #   | Constat                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Sév.    | G      | E   | Conf.      |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------ | --- | ---------- |
| 2.1 | **Rejeu complet du log à presque chaque coup.** Le cache `live` du `MatchDO` disparaît avec l'instance ; or un DO hibernable est évincé après quelques secondes sans évènement, et le battement de cœur est répondu par le runtime sans le réveiller (`setWebSocketAutoResponse`). Le coup suivant déclenche donc `rebuild()` : `SELECT` de tout `match_actions` en D1 (un aller-retour réseau) puis `replayMemory` (~0,5 ms CPU par coup déjà joué). Le coût d'un coup croît linéairement, celui d'une partie quadratiquement (~2,5 s CPU cumulées sur 100 coups). | majeure | élevé  | M   | probable   |
| 2.2 | **Travail redondant par message.** `deploying()` relit `config` puis `setup` et reconstruit le scénario à chaque coup ; `hello` reconstruit le `Board` (`scenario().board()`) pour l'envoyer ; `config()` est relu plusieurs fois par message. Le stockage du DO a son cache en mémoire, donc le coût est faible, mais il s'ajoute à 2.1 au réveil.                                                                                                                                                                                                                 | mineure | faible | S   | certain    |
| 2.3 | **Session Better Auth lue en D1 à chaque requête authentifiée.** `session.cookieCache` n'est pas activé (`auth/better-auth.ts`) : chaque appel à `/api/me/*`, `/api/friends/*`, au jumelage ou à la file passe par une requête D1 de session. Activer le cache signé (quelques minutes) l'éviterait, au prix d'une révocation moins immédiate — **décision à prendre**, l'usurpation d'une heure et le bannissement en dépendent.                                                                                                                                   | mineure | moyen  | S   | certain    |
| 2.4 | **`betterAuth()` est instancié à chaque requête** (`buildAuth` dans `index.ts`, à cause de l'origine et de la langue). Coût d'initialisation des greffons payé par requête. À mesurer avant de toucher : le gain dépend de la bibliothèque.                                                                                                                                                                                                                                                                                                                         | mineure | faible | M   | à vérifier |
| 2.5 | **Statistiques recalculées sur tout l'historique.** `readPlayerStats` (cartes de joueur à la création de partie, faits d'armes du profil) relit toutes les parties finies du joueur. Les index `matches_by_player_a/b` couvrent le filtre, pas le tri par `finished_at` ; sans effet à l'échelle d'une beta, à revoir au-delà de quelques centaines de parties par joueur.                                                                                                                                                                                          | mineure | faible | M   | certain    |
| 2.6 | **PBKDF2 : 6 × 100 000 itérations par connexion** (~100 ms CPU sous Node). Choix de sécurité assumé (STATE.md : il impose le plan Workers Paid). Rappel seulement : c'est le point le plus coûteux en CPU par requête, à surveiller si une attaque par force brute vise `/sign-in`.                                                                                                                                                                                                                                                                                 | info    | —      | —   | certain    |

Pistes pour **2.1**, compatibles avec les invariants (`docs/architecture.md` : le log D1 reste
la source de vérité, l'état du DO reste reconstructible) :

- **Copie locale du log** dans le stockage SQLite du DO, écrite après l'insertion D1 :
  supprime l'aller-retour D1 au réveil. D1 n'est relu qu'en cas d'écart (`resyncFromLog`).
- **Instantané** de `MatchMemory` sérialisé dans le stockage du DO, avec le `seq` qu'il
  couvre : le réveil ne rejoue que les coups postérieurs. Exige une sérialisation de
  `GameState` / `PlayerKnowledge` (Sets, Maps) et une invalidation quand le ruleset ou la
  carte figée diffère ; plus lourd, mais rend le coût d'un coup constant.
- À défaut, 1.1 et 1.2 réduisent déjà le coût du rejeu.

Avant de trancher, **vérifier en production** la fréquence réelle des `rebuild()` (un
`console.log` structuré dans `rebuild`, lu dans Workers Logs) : l'hypothèse « presque chaque
coup » repose sur le délai d'éviction documenté de Cloudflare, pas sur une mesure.

## 3. Client (`apps/web`)

| #   | Constat                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Sév.    | G      | E   | Conf.    |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------ | --- | -------- |
| 3.1 | **Redessin complet à chaque image, sans test de changement.** Le ticker de `render/pixi/board.ts` appelle `Scene.render` à chaque frame : `sky`, `ground`, `world`, `overlay` et `ambient` sont vidés (`Graphics.clear()`) puis reconstruits, ce qui refait la triangulation de toute la géométrie 60 fois par seconde, ciel et nuages compris. Même sous `prefers-reduced-motion`, où le temps est figé, le travail est refait à l'identique. Effet attendu : CPU et batterie sur portable, images perdues sur machine modeste. | majeure | élevé  | M   | probable |
| 3.2 | **Les deux langues sont livrées à toutes les pages.** `@occulis/i18n` importe statiquement `en` et `fr` (`CATALOGUE`) ; ils pèsent ~75 Ko minifiés sur les 214 Ko du bloc partagé (`ReplayBoard…js`, 79 Ko gzip), préchargé par le jeu, le profil et le back-office. Charger la langue active seule (import dynamique de l'autre au changement) retire environ un sixième du JavaScript initial.                                                                                                                                 | mineure | moyen  | M   | certain  |
| 3.3 | **Un seul bloc partagé pour trois pages.** Le bloc `ReplayBoard…js` réunit runtime Vue, i18n, composants `@occulis/ui`, rejeu et morceaux du back-office (`apps/web/src/admin`, ~5 Ko) ; sa CSS (45 Ko) est chargée par la page du jeu alors qu'elle sert surtout au profil. Un découpage `manualChunks` (vendor Vue / i18n / ui) améliorerait le cache entre déploiements et allégerait la page du jeu.                                                                                                                         | mineure | faible | S   | certain  |
| 3.4 | **Bonnes pratiques déjà en place**, à conserver : Pixi chargé à la demande (`board-…js`, 257 Ko, hors menu) ; renderer WebGPU en bloc séparé ; assets `immutable` d'un an (`public/_headers`) ; `DesignSystem` (298 Ko) isolé dans le back-office ; vue de partie de ~8 Ko par message ; `requestAnimationFrame` seulement à la demande dans le rejeu et la pose d'équipe.                                                                                                                                                       | —       | —      | —   | certain  |

Pistes pour **3.1** :

- **Rendu à la demande** : arrêter le ticker (`app.ticker.stop()` puis `app.render()` sur
  évènement) quand ni la caméra, ni une animation, ni le survol n'ont changé ; le garder en
  marche seulement pendant une transition. Sous `prefers-reduced-motion`, ne rendre que sur
  changement.
- **Couches statiques mises en cache** : le terrain ne change qu'avec la caméra et la vue ;
  le reconstruire seulement alors (ou le passer en `cacheAsTexture`), et ne redessiner chaque
  image que les couches animées.
- **Mesurer d'abord** : un enregistrement « Performance » de Chrome pendant une partie, avant
  et après, pour chiffrer le temps de script par image.

## 4. Site vitrine (`apps/site`)

Rien de notable : images en AVIF/WebP à deux tailles (≤ 36 Ko), polices WOFF2 sous-ensemble
latin (≤ 13 Ko), animations suspendues hors écran (`IntersectionObserver`) et onglet caché
(`visibilitychange`), `prefers-reduced-motion` respecté.

## 5. Ordre proposé

| Ordre | Constats                     | Pourquoi d'abord                                                                      |
| ----: | ---------------------------- | ------------------------------------------------------------------------------------- |
|     1 | 1.1, 1.2                     | Petit périmètre, couvert par les tests, profite au serveur, au rejeu et au client.    |
|     2 | 3.1                          | Le gain le plus visible pour le joueur ; mesurer avant / après.                       |
|     3 | 2.1                          | Mesurer d'abord la fréquence des `rebuild()` en production, puis copie locale du log. |
|     4 | 3.2, 3.3                     | Poids initial des pages.                                                              |
|     5 | 2.3                          | Demande une décision (révocation moins immédiate).                                    |
|     — | 1.3, 1.4, 1.5, 2.2, 2.4, 2.5 | Au fil de l'eau, ou quand l'échelle l'exige.                                          |
