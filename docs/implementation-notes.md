# Notes d'implémentation — interprétations à valider

`docs/design.md` reste la référence de game design. Ce fichier ne fait que consigner
les choix qu'il a fallu encoder pour que `packages/core` tourne, alors que le design
doc ne les tranche pas explicitement. **Aucun n'est acté** : ils sont isolés et
faciles à changer, et doivent être confirmés ou corrigés avec le porteur du projet.

## Interprétations encodées

| # | Sujet | Choix encodé | Où |
|---|---|---|---|
| 1 | ~~Déclenchement de la capture de mêlée~~ | **Caduc** : il n'y a plus de capture du tout (design.md 3.1, suspendue). À rétablir quand elle reviendra — le choix « déclarée par le joueur, pas déduite du contact » reste le bon point de départ, l'automatisme rendant toute adjacence mortelle. | — |
| 2 | ~~Déplacement + capture dans le même tour~~ | **Caduc**, même raison. Une action ne fait plus que déplacer. | — |
| 3 | Passer son tour | Interdit. Une action doit déplacer la pièce ; rester sur place n'est pas un coup et retombe sur `unreachable`, la case de départ ne figurant pas parmi les destinations. | `actions.ts` — `destinationsFor` |
| 4 | Pièces bloquantes | Une pièce bloque le passage **et** la case d'arrivée, sans distinction de camp. C'est désormais ce mécanisme, et lui seul, qui interdit d'aller sur la case d'une pièce adverse (design.md 5.2). | `movement.ts` — `reachableTiles` |
| 5 | Pièces et LOS | Une pièce **occulte** la vue, comme un mur d'un niveau posé sur sa case (`PIECE_HEIGHT`) : deux pièces de même niveau se masquent ce qui est derrière elles, une pièce perchée voit par-dessus une pièce en contrebas. Acté en design.md 5.2 — ce n'est donc plus une interprétation, seule la valeur `PIECE_HEIGHT = EYE_HEIGHT` en est une. | `los.ts` — `hasLineOfSight` |
| 6 | Topologie de la grille | Ni 4 ni 8 voisins n'est acté. C'est donc un champ du profil de mouvement (`adjacency`), décidable pièce par pièce quand le roster existera. | `coord.ts`, `pieces/profiles.ts` |
| 7 | Métrique de portée de vision | Distance de Chebyshev, horizontale pure : la hauteur ne change que l'occultation, jamais la portée. Cohérent avec la section 5.3, mais à confirmer (point ouvert 6). | `los.ts` — `visibleFrom` |
| 8 | Coût de la descente | Descendre n'ajoute aucun coût, mais le pas horizontal coûte 1 comme les autres. « Libre, sans limite » est lu comme « sans pénalité de dénivelé ». | `movement.ts` |
| 9 | Grimper | Consomme le tour entier et part obligatoirement de la case de départ — on ne peut pas marcher puis grimper. Lecture directe de l'exemple du mur de hauteur 3 gravi en 3 tours. | `movement.ts` |
| 10 | Terrain et fog of war | Le relief est public (les deux joueurs connaissent la carte) ; seules les **pièces** sont masquées hors LOS. Le rendu estompe le terrain non visible sans le cacher. | `fog.ts`, `apps/web/src/scene/terrain.ts` |
| 11 | Hauteur du regard | Une pièce regarde depuis `hauteur_de_case + 1`, et un obstacle exactement à hauteur du regard bloque (comparaison `>=`). Sans quoi un mur de hauteur 1 se laisserait survoler du regard. | `los.ts` — `EYE_HEIGHT` |
| 12 | Lieu du roster | Les types de pièces sont désormais des **classes** (`pieces/piece-type.ts`) et les deux types provisoires — `Scout`, `Commander` — vivent dans `packages/core/src/pieces/roster/`. Le principe « aucun roster dans `core` » est donc infléchi : le comportement d'une pièce (vision, déplacement, frappe) est de la logique de jeu et doit être partagé par le client et le serveur, sinon il se duplique. `Ruleset` continue d'accepter n'importe quels types fournis par l'appelant, et `ConfigurablePieceType` permet toujours de définir une pièce par des données. Ces deux classes restent des supports de démo, pas du contenu. **Le même raisonnement a été étendu aux scénarios** (`core/src/scenarios/`) : le client dessine la carte sur laquelle le serveur calcule, et deux registres séparés avaient déjà commencé à diverger. | `pieces/roster/`, `scenarios/` |
| 13 | Saisie des coups | Deux entrées coexistent : sélection au clic (une pièce, puis une destination ou un adversaire adjacent) et saisie de coordonnées (`1,6 2,5`, `1,6 2,5 x 3,5`, `abandon`). Le clavier reste seul capable d'enchaîner déplacement et capture dans le même tour. Purement provisoire : c'est un moyen de jouer la logique déjà implémentée, pas une décision d'interface. | `apps/web/src/ui/command.ts`, `apps/web/src/game/selection.ts` |
| 14 | Portées du roster provisoire | `Scout` et `Commander` ont des portées de vision volontairement bien supérieures aux cartes de démonstration : sur celles-ci, seule l'occultation limite la vue. Choisi pour rendre LOS et déplacement observables, pas pour équilibrer quoi que ce soit. Une vérification de règle ne doit donc jamais s'appuyer sur ces valeurs. | `pieces/roster/` |
| 15 | Taille des cartes de test | Les fixtures de `apps/web` avaient dû être agrandies pour la règle « échecs strict » : sur une carte étriquée, un éclaireur à 6 pas mettait la maîtresse adverse en échec permanent et supprimait **tous** ses coups légaux. La règle étant retirée (design.md 7.1), la contrainte tombe — les fixtures restent larges parce que rien n'oblige à les réduire, plus parce qu'elles y sont tenues. C'est ce symptôme qui a motivé le retrait de la règle : l'écart entre les portées provisoires (#14) et la taille des cartes la rendait injouable. | `apps/web/src/game/*.test.ts` |
| 16 | Fantômes et hypothèse locale | En ligne, le client reconstruit une position depuis sa seule vue (`hypothesis.ts`), avec les **fantômes exclus** : un souvenir peut être périmé, et l'ériger en obstacle masquerait des coups réellement jouables. Cette hypothèse ne sert plus qu'à **la géométrie** — quelle pièce occupe telle case, à qui appartient-elle. La légalité n'en est plus déduite : elle arrive du serveur (`PlayerView.legalActions`), parce qu'une hypothèse se trompe dans les deux sens et qu'un plateau incomplet ne permet aucun verdict juste. | `apps/web/src/game/hypothesis.ts` |
| 17 | ~~Seuil de la nulle sans capture~~ | **Caduc** : les nulles anti-blocage sont retirées avec la capture (design.md 7.2, suspendue). La valeur retenue était `ACTIONS_WITHOUT_CAPTURE_LIMIT = 60`, soit 30 tours par camp, par analogie avec la règle des 50 coups — à reprendre telle quelle si la règle revient, aucun équilibrage ne s'y étant jamais adossé. | — |
| 18 | Suppression du jeu local | La démonstration hot-seat a été retirée sur demande explicite du porteur du projet : le client ne joue plus rien tout seul, et le canevas reste masqué tant que le serveur n'a pas assis le joueur. Cohérent avec le pilier « pas de local multiplayer » (design.md section 2), et avec l'autorité du serveur — une partie locale donne au client la position entière, donc un fog contournable. Conséquence : le basculement de point de vue (barre d'espace) disparaît, le serveur n'envoyant jamais la vue d'en face. | `apps/web/src/main.ts`, `apps/web/src/ui/flow.ts` |
| 19 | Salons privés et forme du code | « Créer une partie / en rejoindre une » a été lu comme une **partie privée désignée par un code**, et non comme deux libellés du même appariement — sinon les deux entrées feraient la même chose. L'appariement rapide est conservé à côté. Le code fait 5 caractères sur un alphabet de 25 sans caractères confondables ; il n'est **pas un secret** (il n'ouvre qu'un salon que son hôte surveille, et il est consommé au premier arrivant), et il n'expire pas tant que l'hôte tient sa connexion. L'hôte prend le camp A, l'arrivant le camp B. Rien de tout cela n'est acté : ni la durée de vie d'un salon, ni le fait qu'un salon privé exige lui aussi une adresse vérifiée — c'est le choix actuel, par uniformité avec la file. | `apps/server/src/rooms.ts`, `apps/server/src/queue-do.ts` |

## Décisions volontairement non implémentées

Ces mécaniques sont listées comme ouvertes dans `docs/design.md` section 10 et n'ont
reçu **aucune** implémentation, même partielle, pour ne pas figer un équilibrage :

- attaque à distance différée et sa file de résolution (points ouverts 1, 2, 3) ;
- pièges (points ouverts 11 et section 4) ;
- règle anti-répétition (point ouvert 4) ;
- phase de déploiement (point ouvert 5) ;
- roster de pièces (point ouvert 12) — `Ruleset` attend des types fournis par
  l'appelant ; les seuls qui existent sont des supports de test et les deux classes
  provisoires de la démo (voir l'interprétation 12).

La **détection du mat** y est revenue : implémentée sous « échecs strict », puis retirée
sur décision explicite du porteur du projet parce qu'elle n'était pas jouable avec les
portées du roster provisoire (`docs/design.md` section 7.1). Avec elle sont retirées la
**capture de mêlée** (section 3.1) et les **nulles anti-blocage** (section 7.2). Plus
aucune fin de partie automatique n'existe donc : seul l'abandon termine une partie, et
un joueur dont toutes les pièces seraient murées n'a plus que cette issue.

## Correctifs notables

- **Plafond PBKDF2 du runtime Workers.** Le hachage tournait à 210 000 itérations, au-delà
  des 100 000 que la bordure Cloudflare accepte : `deriveBits` y lève
  `NotSupportedError: Pbkdf2 failed…` (cloudflare/workerd#1346), donc **toute inscription
  et toute connexion rendaient 500 en recette**, alors que la suite de tests était verte.
  Le piège tient à ce que **le workerd local n'applique aucun plafond** — il accepte deux
  millions d'itérations — si bien que ni les tests d'intégration, qui inscrivent pourtant
  de vrais comptes, ni `wrangler dev` ne pouvaient reproduire l'échec. Les 600 000
  itérations recommandées par l'OWASP sont désormais atteintes en enchaînant six passes de
  100 000, chacune sous la limite, et un test de garde verrouille la valeur faute de
  pouvoir éprouver le comportement. **Conséquence générale, à retenir avant d'ajouter quoi
  que ce soit de coûteux dans le Worker : une suite verte dans workerd ne dit rien des
  limites de ressources de la bordure.**

- **Symétrie de la LOS.** Le tracé de Bresenham départage les diagonales selon le sens
  de parcours : `A→B` et `B→A` ne traversaient pas les mêmes cases, et `A` pouvait donc
  voir `B` sans être vu. Les extrémités sont désormais ordonnées de façon canonique
  avant le tracé, ce qui rend la LOS symétrique par construction (test dédié).
  L'occultation par les pièces la préserve : elle lit un ensemble de cases occupées,
  indifférent au sens de parcours, et n'y range jamais les deux extrémités — une pièce
  ne s'aveugle pas elle-même et n'empêche pas qu'on la voie. C'est aussi pourquoi les
  pièces **alliées** occultent : ne bloquer que les adverses rendrait la vue asymétrique
  entre les deux camps.
