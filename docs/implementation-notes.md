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
| 12 | Lieu du roster | Les types de pièces sont désormais des **classes** (`pieces/piece-type.ts`) et les deux types provisoires — `Scout`, `Commander` — vivent dans `packages/core/src/pieces/roster/`. Le principe « aucun roster dans `core` » est donc infléchi : le comportement d'une pièce (vision, déplacement, frappe) est de la logique de jeu et doit être partagé par le client et le serveur, sinon il se duplique. `Ruleset` continue d'accepter n'importe quels types fournis par l'appelant, et `ConfigurablePieceType` permet toujours de définir une pièce par des données. Ces deux classes restent des supports de démo, pas du contenu. | `pieces/roster/` |
| 13 | Saisie des coups | Deux entrées coexistent : sélection au clic (une pièce, puis une destination ou un adversaire adjacent) et saisie de coordonnées (`1,6 2,5`, `1,6 2,5 x 3,5`, `abandon`). Le clavier reste seul capable d'enchaîner déplacement et capture dans le même tour. Purement provisoire : c'est un moyen de jouer la logique déjà implémentée, pas une décision d'interface. | `apps/web/src/ui/command.ts`, `apps/web/src/game/selection.ts` |
| 14 | Portées du roster provisoire | `Scout` et `Commander` ont des portées de vision volontairement bien supérieures aux cartes de démonstration : sur celles-ci, seule l'occultation limite la vue. Choisi pour rendre LOS et déplacement observables, pas pour équilibrer quoi que ce soit. Une vérification de règle ne doit donc jamais s'appuyer sur ces valeurs. | `pieces/roster/` |

## Décisions volontairement non implémentées

Ces mécaniques sont listées comme ouvertes dans `docs/design.md` section 10 et n'ont
reçu **aucune** implémentation, même partielle, pour ne pas figer un équilibrage :

- attaque à distance différée et sa file de résolution (points ouverts 1, 2, 3) ;
- pièges (points ouverts 11 et section 4) ;
- règle anti-répétition (point ouvert 4) ;
- phase de déploiement (point ouvert 5) ;
- roster de pièces (point ouvert 12) — `Ruleset` attend des types fournis par
  l'appelant ; les seuls qui existent sont des supports de test et les deux classes
  provisoires de la démo (voir l'interprétation 12) ;
- détection du mat. Seuls la capture de la pièce maîtresse, l'abandon et le pat sont
  implémentés. Le mat suppose de savoir si un coup laissant sa propre pièce maîtresse
  en prise est illégal — question qui n'a pas de réponse évidente sous fog of war,
  puisqu'un joueur peut ignorer la menace. À trancher avant d'aller plus loin.

## Correctifs notables

- **Symétrie de la LOS.** Le tracé de Bresenham départage les diagonales selon le sens
  de parcours : `A→B` et `B→A` ne traversaient pas les mêmes cases, et `A` pouvait donc
  voir `B` sans être vu. Les extrémités sont désormais ordonnées de façon canonique
  avant le tracé, ce qui rend la LOS symétrique par construction (test dédié).
