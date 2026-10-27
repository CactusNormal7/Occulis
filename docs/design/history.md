# Occulis — Historique des itérations

À lire seulement avant de reproposer une règle de tour ou de capture. Règles actées : [rules.md](rules.md).

## 6. Historique des itérations sur le tour et la capture (pour ne pas revalider ce qui a été écarté)

Cette section documente le cheminement, volontairement, pour éviter de reproposer des idées déjà explorées et abandonnées.

1. Itération 1 : attaque instantanée façon échecs pure, sans mécanique de délai. Point de départ implicite.
2. Itération 2 : proposition d'un système d'attaque entièrement différée façon "cast time" — déclarée à un tour, résolue au tour suivant, pour toutes les attaques. Écarté : rend une attaque isolée quasi toujours évitable (il suffit de bouger), et généralise la complexité de calcul de "mat" à chaque capture du jeu, pas seulement au roi. Risque de parties très lentes.
3. Itération 3 : proposition de "plusieurs pièces peuvent agir par tour" / système de points d'action, comme solution au problème de l'itération 2. Écarté comme solution principale — identifié comme une rustine plutôt qu'une vraie résolution, avec un risque de snowball offensif (alpha strike imparable) si l'économie d'action n'est pas très finement équilibrée.
4. Itération 4 : clarification que "temps réel" ne signifiait pas simultané, mais un tour alterné classique avec révélation séquentielle des sous-actions (déplacement puis action, révélées au fur et à mesure plutôt qu'en bloc à la fin du tour). Ceci a été validé — ça règle le problème de lisibilité sans introduire de vrai netcode temps réel ni d'avantage de réflexe/ping.
5. Itération 5 : retour à une capture de mêlée instantanée façon échecs pour toutes les pièces (résout le problème de l'itération 2), et conservation du modèle différé/télégraphié mais uniquement comme capacité spéciale réservée à l'attaque à distance de certaines pièces. C'était l'état validé jusqu'au 2026-10-27.
6. Itération 6 (2026-10-27, état actuel) : **l'attaque à distance est écartée.** Toutes les captures se font en mêlée, en arrivant sur la case de la pièce adverse ([rules.md](rules.md) § 3.1). Le modèle abandonné, conservé ici pour ne pas le reproposer sans raison :
   - réservé à des pièces spécifiques, pas une règle générale ;
   - différé et télégraphié : l'attaquant déclare une zone à son tour, elle se résout à son tour suivant, donc après un tour complet de l'adversaire ;
   - la cible survit en sortant de la zone, ou en tuant l'attaquant avant la résolution, ce qui annule l'attaque ;
   - les attaques se résolvent dans l'ordre de leur déclaration (file) : si A, déclarée avant B, tue l'auteur de B avant que B ne résolve, B est annulée ;
   - la cible est une zone fixe, pas une pièce suivie.

   Raison de l'abandon, donnée par le porteur du projet : retirer l'attaque à distance supprime la zone déclarée, sa résolution différée et ses questions de LOS et de chevauchement. Tombent avec elle les points ouverts 1, 2, 3 et 6 et les sections 3.3 et 5.3. Conséquence : la file de résolution différée n'a plus de raison d'exister pour l'attaque ; les pièges, s'ils gardent un déclenchement différé, devront l'introduire eux-mêmes ([rules.md](rules.md) § 4).

Un seul déplacement/action par pièce par tour reste la règle de base actée, précisément pour éviter les parties trop rapides ou interminables (contrainte fixée dès le début de la conversation, jamais remise en cause depuis, malgré la tentation de l'itération 3). **Précisée le 2026-10-27** : à chaque tour, une seule pièce agit, et elle se déplace **ou** utilise une capacité, jamais les deux ([rules.md](rules.md) § 3).

Document généré à partir d'une session de brainstorming critique. Objectif : servir de point de reprise fidèle pour la suite du développement (design detaillé, puis implémentation) sans perdre le fil des décisions déjà prises ni revalider des pistes déjà explorées et écartées.
