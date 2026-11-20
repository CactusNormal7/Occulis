# packages/core

- `packages/core` — logique de jeu pure (règles, plateau, hauteur, calcul de LOS, résolution des tours). **Aucune dépendance de rendu.** Testée avec Vitest.

Invariants (déterminisme, log source de vérité, règles versionnées, hibernation, fog structurel) : [docs/architecture.md](../../docs/architecture.md#invariants). **Pas de `Math.random`, `Date.now` ni horloge ici.**

Séparation logique/rendu actée dès le départ (design 8) pour permettre un éventuel portage moteur ; C++ explicitement reporté.

## Règles de ce paquet

- Toute nouvelle règle de gameplay implémentée dans `packages/core` doit correspondre à une décision déjà actée dans `docs/design.md`. Si elle correspond à un point ouvert (section 10), demander avant d'implémenter plutôt que de choisir une interprétation arbitraire — plusieurs points (ex: attaque à distance combinable avec un déplacement, résolution des zones qui se chevauchent) ont un impact direct sur l'équilibrage.
- La LOS est calculée par raycast 2D (`packages/core/src/los.ts`, type Bresenham) avec comparaison de hauteur interpolée case par case — pas de moteur 3D. Voir docs/design.md section 5.1 pour le raisonnement.
- Grille : coordonnées entières `{x, y}` + hauteur de case séparée (`Tile.height`), jamais un simple array de valeurs numériques (cf. décision fondatrice section 5.1).
- Différenciation des pièces par capacité/mouvement, jamais par points de vie/robustesse.

## Modules

- `coord.ts` — coordonnées, clés de hachage, adjacence (`orthogonal` / `octile`), distances.
- `board.ts` — `Tile` (hauteur + franchissabilité) et `Board` immuable. Un **mur est une case haute**, jamais un flag ; une case absente est hors-carte. `Board.fromAscii` construit un plateau depuis une carte texte (pratique en test).
- `pieces/` — **un type de pièce = une classe**.
  - `piece.ts` — `Piece`, l'enregistrement de données d'une pièce en jeu (identité, camp, position). Volontairement inerte et sérialisable : c'est lui qui traverse le réseau et que le log d'actions rejoue.
  - `piece-type.ts` — `PieceType`, classe abstraite qui porte le comportement (déplacement, vision, frappe) et sert de point d'extension par héritage. Elle seule y vit ; toute classe concrète a son propre fichier.
  - `configurable-piece-type.ts` — `ConfigurablePieceType`, pour un type décrit par des données plutôt que par une classe.
  - `roster/` — **une classe par fichier** (`scout.ts`, `commander.ts`, `pawn.ts`), assemblées par `index.ts` ; les chiffres d'avant `provisional-3` sont figés en données dans `legacy.ts`. **Provisoires** : elles donnent un lieu unique aux définitions que le client, le serveur et les tests partagent. Aucun roster n'est acté (design.md point ouvert 12) et rien ne doit s'équilibrer dessus. Leurs portées sont volontairement généreuses (implementation-notes 14) : une vérification de règle ne doit jamais s'appuyer dessus.
  - `ruleset.ts` — `Ruleset`, table `kind` → `PieceType` d'une partie, fournie par l'appelant et versionnée par partie. Il porte aussi les **règles du moteur** (`EngineRules` : prise, échec, nulles) : une partie se rejoue toujours avec les siennes.
- `los.ts` — raycast et LOS, **géométrie seule** : ce qu'une pièce voit réellement est défini par son type (`PieceType.canSee` / `fieldOfView`), jamais recalculé ailleurs à partir d'une portée brute. **Une pièce occulte la vue** comme un mur d'un niveau posé sur sa case ; l'occupation lui est passée en paramètre, il ne consulte aucun état de partie. La LOS est **symétrique par construction** (l'ordre des extrémités est canonicalisé avant le tracé de Bresenham, et les extrémités n'occultent jamais) ; ne pas casser cette propriété — c'est aussi pourquoi les pièces alliées occultent au même titre que les adverses.
- `movement.ts` — cases atteignables, prise à l'arrivée comprise (`capturable`), avec les règles de verticalité de la section 5.3.
- `state.ts` / `actions.ts` — état de partie immuable, génération des coups légaux, application d'une action. `GameState.history` porte le log des coups joués (et la pièce prise), et `replay` le rejoue. Les erreurs sont retournées via `Result`, jamais levées. **Une prise se fait en arrivant sur la case adverse**, sans champ dans l'action ; une pièce alliée bloque toujours.
- `endgame.ts` — échec, mat, pat et nulles (« échecs strict », design 7.1 et 7.2). Ne connaît aucun type de pièce : il demande seulement `PieceType.threatens()`. **Une pièce qui prend autrement qu'elle ne bouge redéfinit `capturesFrom()`, rien d'autre.** Tout est gouverné par `ruleset.rules` : les parties `provisional-0..2` n'ont ni prise ni fin automatique.
- `fog.ts` — état _connu_ de chaque joueur (mémoire fantôme) et `viewFor`, qui produit la vue transmissible sans aucune donnée hors LOS. C'est ce que le serveur envoie. `MatchMemory` (`startMemory` / `advanceMemory` / `replayMemory`) y assemble une position et les deux connaissances : la mémoire fantôme dépend de **toutes** les positions traversées, donc reconstruire une partie depuis son log doit faire avancer la connaissance à chaque coup — le serveur et le client s'en servent tous les deux. La vue porte aussi le **journal** du joueur, les **compositions** des deux camps et le compteur sans prise, pour l'ATH.
- `journal.ts` — un coup **tel qu'un joueur l'a vu** (`journalEntryFor()`) : complet pour ses coups, réduit à ce que sa LOS a montré pour ceux de l'adversaire ; une prise subie est toujours connue.
- `team.ts` — le déploiement : validation d'une équipe (quotas du ruleset, zone de la carte), pièces de départ aux identifiants déterministes, transposition d'une équipe du camp A au camp B.
- `rulesets/` — le registre des rulesets par version (`rulesetFor()`), partagé par le client et le serveur.
- `scenarios/` — positions de départ, une par fichier, assemblées par `index.ts`. **Provisoires** comme le roster. Une partie **fige sa carte à sa création** (`ScenarioSnapshot`, `matches.map`) et l'envoie au client dans `welcome` : retoucher une carte du registre ne change ni les parties en cours ni les replays. Aucune carte n'est actée (design.md point ouvert 5).
- `testing.ts` — fabriques de scénarios pour les tests uniquement.

Détail fonction par fonction : [docs/technical/core.md](../../docs/technical/core.md).
