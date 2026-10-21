# Occulis — Historique des itérations

À lire seulement avant de reproposer une règle de tour ou de capture. Règles actées : [rules.md](rules.md).

## 6. Historique des itérations sur le tour et la capture (pour ne pas revalider ce qui a été écarté)

Cette section documente le cheminement, volontairement, pour éviter de reproposer des idées déjà explorées et abandonnées.

1. Itération 1 : attaque instantanée façon échecs pure, sans mécanique de délai. Point de départ implicite.
2. Itération 2 : proposition d'un système d'attaque entièrement différée façon "cast time" — déclarée à un tour, résolue au tour suivant, pour toutes les attaques. Écarté : rend une attaque isolée quasi toujours évitable (il suffit de bouger), et généralise la complexité de calcul de "mat" à chaque capture du jeu, pas seulement à la pièce maîtresse. Risque de parties très lentes.
3. Itération 3 : proposition de "plusieurs pièces peuvent agir par tour" / système de points d'action, comme solution au problème de l'itération 2. Écarté comme solution principale — identifié comme une rustine plutôt qu'une vraie résolution, avec un risque de snowball offensif (alpha strike imparable) si l'économie d'action n'est pas très finement équilibrée.
4. Itération 4 : clarification que "temps réel" ne signifiait pas simultané, mais un tour alterné classique avec révélation séquentielle des sous-actions (déplacement puis action, révélées au fur et à mesure plutôt qu'en bloc à la fin du tour). Ceci a été validé — ça règle le problème de lisibilité sans introduire de vrai netcode temps réel ni d'avantage de réflexe/ping.
5. Itération 5 (état actuel) : retour à une capture de mêlée instantanée façon échecs pour toutes les pièces (résout le problème de l'itération 2), et conservation du modèle différé/télégraphié mais uniquement comme capacité spéciale réservée à l'attaque à distance de certaines pièces. C'est l'état validé actuellement (voir section 3).

Un seul déplacement/action par pièce par tour reste la règle de base actée, précisément pour éviter les parties trop rapides ou interminables (contrainte fixée dès le début de la conversation, jamais remise en cause depuis, malgré la tentation de l'itération 3).

Document généré à partir d'une session de brainstorming critique. Objectif : servir de point de reprise fidèle pour la suite du développement (design detaillé, puis implémentation) sans perdre le fil des décisions déjà prises ni revalider des pistes déjà explorées et écartées.
