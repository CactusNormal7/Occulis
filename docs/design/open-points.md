# Occulis — Points ouverts

Volatile : à relire avant toute règle non couverte par [rules.md](rules.md). Un point listé ici est une vraie décision à soumettre au porteur du projet, pas à improviser. Les interprétations déjà encodées faute de décision sont dans [../implementation-notes.md](../implementation-notes.md).

## 3.3 Attaque à distance

- Est-ce que déclarer une attaque à distance consomme tout le tour de la pièce (elle ne peut ni bouger ni faire autre chose), ou est-ce une action combinable avec un déplacement ? Non tranché — identifié comme un risque de déséquilibre majeur (une pièce à distance qui agit gratuitement en plus de bouger serait strictement supérieure à une pièce de mêlée).
- LOS au moment de la déclaration vs au moment de la résolution d'une attaque à distance (un obstacle qui apparaît entre-temps bloque-t-il l'attaque déjà déclarée ?) — non tranché.
- Résolution de plusieurs attaques-zones qui se chevauchent sur la même pièce au même moment — non tranché (mort simple ? la première dans l'ordre de déclaration annule les autres ? cumul ?).

## 4. Pièges

- Point ouvert : confirmé implicitement lié au FOW général, mais jamais formalisé noir sur blanc si TOUS les pièges sont cachés par défaut ou si certains sont volontairement visibles (pièges de zone de contrôle vs pièges d'embuscade, par exemple).

## 5.3 Hauteur

- Point ouvert : la portée d'attaque à distance suit-elle une distance horizontale pure indépendante de la hauteur ? Fortement probable par cohérence avec le reste, mais jamais confirmé explicitement mot pour mot.
- Point ouvert : grimper est-il une capacité générique (toute pièce peut le faire) ou une capacité spécifique à certaines pièces seulement ? Non tranché ("on verra au fur et à mesure").

## 7. Déploiement

- Point ouvert, à noter pour le level design futur : voir [rules.md](rules.md) § 7 (LOS mutuelle des zones de déploiement, paramètre de carte).

## 10. Récapitulatif — points ouverts à trancher

### Mécaniques de jeu

1. Résolution de plusieurs attaques-zones qui se chevauchent sur la même pièce au même moment de résolution.
2. Une attaque à distance déclarée consomme-t-elle tout le tour de la pièce, ou est-elle combinable avec un déplacement le même tour ?
3. LOS au moment de la déclaration vs au moment de la résolution d'une attaque à distance différée.
4. ~~Règle anti-blocage/anti-répétition~~ — tranché en section 7.2 : triple répétition **et** compteur de coups sans capture, les deux automatiques. Seul le seuil du compteur reste à calibrer, ce qui suppose un roster. **Suspendu à l'implémentation** avec 7.1.
5. ~~Cases de déploiement : setup unique et fixe, ou choix parmi plusieurs emplacements ?~~ — tranché en section 7 : choix libre dans une zone par camp, définie par la carte.

### Verticalité / hauteur

6. Confirmation explicite que la portée d'attaque à distance est indépendante de la hauteur (fortement probable, jamais dit noir sur blanc).
7. Grimper : capacité générique à toutes les pièces, ou capacité spécifique à certaines pièces ?

### Design des pièces / capacités spéciales (mentionnées, jamais détaillées)

8. Téléporteurs / mécaniques de déport de ligne de vue.
9. Capacité de pousser une pièce adverse (interaction avec pièges, bords de carte, hauteur non définie).
10. Objets posables bloquant la LOS (différence avec les pièges à formaliser : durée de vie, visibilité, effet).
11. Confirmation explicite que les pièges suivent bien la règle générale de FOW (cachés par défaut) ou existe-t-il des pièges volontairement visibles ?

### Cadre général

12. Aucun roster concret de pièces n'a encore été esquissé — seul le principe directeur (différenciation par capacité/mouvement, pas par robustesse) a été acté. **Partiellement tranché** : la composition d'une équipe (1 pièce maîtresse, 3 pièces à capacité, 4 pions) est actée ; les types de pièces à capacité, et les chiffres de toutes, ne le sont pas.
13. **Rouvert — fin de partie.** L'échec et mat (7.1) et les nulles (7.2) sont retirés du moteur, et la capture (3.1) avec eux : seul l'abandon termine une partie aujourd'hui. Reste à décider dans quel ordre les remettre, et sous quelle forme la règle de mat doit revenir pour rester jouable avec de vraies portées de pièces — c'est-à-dire, très probablement, une fois un roster esquissé (point 12).
    - **À trancher avec le retour de la prise : l'identité des pièces à travers le fog** (ajouté le 2026-10-21). Chaque pièce adverse vue arrive avec un identifiant stable : un client modifié sait donc que « le pion revu ici est celui aperçu là-bas », ce qu'un joueur humain ne distingue pas entre deux pions identiques, et l'identifiant trahit l'ordre dans lequel l'adversaire a composé son équipe. Deux voies : l'accepter, ou donner à chaque joueur des identifiants propres à sa vue, renouvelés quand une pièce sort de vue (coûteux : mémoire fantôme, rejeu et animations reposent sur l'identifiant). Sans prise, l'enjeu reste faible ; avec elle, il touche aussi aux refus de coup (`unknown-piece` / `not-your-piece` diraient si une pièce cachée a disparu).
