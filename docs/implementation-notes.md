# Notes d'implémentation — interprétations à valider

`docs/design.md` reste la référence de game design. Ce fichier ne fait que consigner
les choix qu'il a fallu encoder pour que `packages/core` tourne, alors que le design
doc ne les tranche pas explicitement. **Aucun n'est acté** : ils sont isolés et
faciles à changer, et doivent être confirmés ou corrigés avec le porteur du projet.

## Interprétations encodées

| # | Sujet | Choix encodé | Où |
|---|---|---|---|
| 1 | Déclenchement de la capture de mêlée | La capture est **déclarée** par le joueur, pas déclenchée automatiquement par le contact. Le design dit « se déplacer dans l'adjacence d'une pièce adverse, c'est immédiat » sans dire qui meurt ; l'automatisme rendrait toute adjacence mortelle et interdirait de se tenir à côté d'un adverse. | `actions.ts` — `Action.capture` |
| 2 | Déplacement + capture dans le même tour | Autorisés dans une seule action, comme aux échecs. `to` peut valoir la case de départ, ce qui permet aussi de frapper un adjacent sans bouger. | `actions.ts` |
| 3 | Passer son tour | Interdit. Une action doit déplacer la pièce ou capturer. | `actions.ts` — erreur `must-do-something` |
| 4 | Pièces bloquantes | Une pièce bloque le passage (aucune traversée, même alliée). Non dit dans le design mais nécessaire au calcul de déplacement. | `movement.ts` |
| 5 | Pièces et LOS | Une pièce **n'occulte pas** la vue : seul le relief le fait. | `los.ts` |
| 6 | Topologie de la grille | Ni 4 ni 8 voisins n'est acté. C'est donc un champ du profil de mouvement (`adjacency`), décidable pièce par pièce quand le roster existera. | `coord.ts`, `pieces/profiles.ts` |
| 7 | Métrique de portée de vision | Distance de Chebyshev, horizontale pure : la hauteur ne change que l'occultation, jamais la portée. Cohérent avec la section 5.3, mais à confirmer (point ouvert 6). | `los.ts` — `visibleFrom` |
| 8 | Coût de la descente | Descendre n'ajoute aucun coût, mais le pas horizontal coûte 1 comme les autres. « Libre, sans limite » est lu comme « sans pénalité de dénivelé ». | `movement.ts` |
| 9 | Grimper | Consomme le tour entier et part obligatoirement de la case de départ — on ne peut pas marcher puis grimper. Lecture directe de l'exemple du mur de hauteur 3 gravi en 3 tours. | `movement.ts` |
| 10 | Terrain et fog of war | Le relief est public (les deux joueurs connaissent la carte) ; seules les **pièces** sont masquées hors LOS. Le rendu estompe le terrain non visible sans le cacher. | `fog.ts`, `apps/web/src/scene/terrain.ts` |
| 11 | Hauteur du regard | Une pièce regarde depuis `hauteur_de_case + 1`, et un obstacle exactement à hauteur du regard bloque (comparaison `>=`). Sans quoi un mur de hauteur 1 se laisserait survoler du regard. | `los.ts` — `EYE_HEIGHT` |
| 12 | Lieu du roster | Les types de pièces sont désormais des **classes** (`pieces/piece-type.ts`) et les deux types provisoires — `Scout`, `Commander` — vivent dans `packages/core/src/pieces/roster/`. Le principe « aucun roster dans `core` » est donc infléchi : le comportement d'une pièce (vision, déplacement, frappe) est de la logique de jeu et doit être partagé par le client et le serveur, sinon il se duplique. `Ruleset` continue d'accepter n'importe quels types fournis par l'appelant, et `ConfigurablePieceType` permet toujours de définir une pièce par des données. Ces deux classes restent des supports de démo, pas du contenu. **Le même raisonnement a été étendu aux scénarios** (`core/src/scenarios/`) : le client dessine la carte sur laquelle le serveur calcule, et deux registres séparés avaient déjà commencé à diverger. | `pieces/roster/`, `scenarios/` |
| 13 | Saisie des coups | Deux entrées coexistent : sélection au clic (une pièce, puis une destination ou un adversaire adjacent) et saisie de coordonnées (`1,6 2,5`, `1,6 2,5 x 3,5`, `abandon`). Le clavier reste seul capable d'enchaîner déplacement et capture dans le même tour. Purement provisoire : c'est un moyen de jouer la logique déjà implémentée, pas une décision d'interface. | `apps/web/src/ui/command.ts`, `apps/web/src/game/selection.ts` |
| 14 | Portées du roster provisoire | `Scout` et `Commander` ont des portées de vision volontairement bien supérieures aux cartes de démonstration : sur celles-ci, seule l'occultation limite la vue. Choisi pour rendre LOS et déplacement observables, pas pour équilibrer quoi que ce soit. Une vérification de règle ne doit donc jamais s'appuyer sur ces valeurs. | `pieces/roster/` |
| 15 | Taille des cartes de test | Les fixtures de `apps/web` ont dû être agrandies en même temps que la règle « échecs strict » : sur une carte étriquée, un éclaireur à 6 pas met la maîtresse adverse en échec permanent, ce qui supprime **tous** ses coups légaux. Ce n'est pas la règle qui est en cause mais l'écart entre les portées provisoires et la taille des cartes de démo — symptôme direct de l'interprétation 14. La carte de démonstration réelle (10×8, coupée par l'arête) reste jouable. | `apps/web/src/game/*.test.ts` |
| 16 | Fantômes et hypothèse locale | En ligne, le client reconstruit une position depuis sa seule vue (`hypothesis.ts`), avec les **fantômes exclus** : un souvenir peut être périmé, et l'ériger en obstacle masquerait des coups réellement jouables. Cette hypothèse ne sert plus qu'à **la géométrie** — quelle pièce occupe telle case, à qui appartient-elle. La légalité n'en est plus déduite : elle arrive du serveur (`PlayerView.legalActions`), parce qu'une hypothèse se trompe dans les deux sens et qu'un plateau incomplet ne permet aucun verdict juste. | `apps/web/src/game/hypothesis.ts` |
| 17 | Seuil de la nulle sans capture | La règle est actée (design.md 7.2), pas sa valeur : `ACTIONS_WITHOUT_CAPTURE_LIMIT = 60`, soit 30 tours par camp. Choisi par analogie avec la règle des 50 coups des échecs, transposée en actions puisqu'ici un tour = une action. **Aucun équilibrage ne s'y adosse** — aucun roster n'est acté, donc aucune durée de partie typique n'est connue. Isolé dans une constante exportée pour être changé d'un seul endroit. | `packages/core/src/actions.ts` |
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

La **détection du mat** ne figure plus ici : elle est implémentée, sur une décision
explicite du porteur du projet (« échecs strict », `docs/design.md` section 7.1).

## Correctifs notables

- **Symétrie de la LOS.** Le tracé de Bresenham départage les diagonales selon le sens
  de parcours : `A→B` et `B→A` ne traversaient pas les mêmes cases, et `A` pouvait donc
  voir `B` sans être vu. Les extrémités sont désormais ordonnées de façon canonique
  avant le tracé, ce qui rend la LOS symétrique par construction (test dédié).
