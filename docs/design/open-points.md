# Occulis — Points ouverts

Volatile : à relire avant toute règle non couverte par [rules.md](rules.md). Un point listé ici est une vraie décision à soumettre au porteur du projet, pas à improviser. Les interprétations déjà encodées faute de décision sont dans [../implementation-notes.md](../implementation-notes.md).

## ~~3.3 Attaque à distance~~

Section sans objet depuis l'abandon de l'attaque à distance (décision du 2026-10-27, [rules.md](rules.md) § 3.2). Conservée barrée pour l'historique.

- ~~Est-ce que déclarer une attaque à distance consomme tout le tour de la pièce (elle ne peut ni bouger ni faire autre chose), ou est-ce une action combinable avec un déplacement ? Non tranché — identifié comme un risque de déséquilibre majeur (une pièce à distance qui agit gratuitement en plus de bouger serait strictement supérieure à une pièce de mêlée).~~
- ~~LOS au moment de la déclaration vs au moment de la résolution d'une attaque à distance (un obstacle qui apparaît entre-temps bloque-t-il l'attaque déjà déclarée ?) — non tranché.~~
- ~~Résolution de plusieurs attaques-zones qui se chevauchent sur la même pièce au même moment — non tranché (mort simple ? la première dans l'ordre de déclaration annule les autres ? cumul ?).~~

## 4. Pièges

- Point ouvert : confirmé implicitement lié au FOW général, mais jamais formalisé noir sur blanc si TOUS les pièges sont cachés par défaut ou si certains sont volontairement visibles (pièges de zone de contrôle vs pièges d'embuscade, par exemple).
- Le déclenchement différé (au contact ou après X tours) suppose une file de résolution différée, qui n'existe pas dans le moteur ([rules.md](rules.md) § 4).

## ~~5.3 Hauteur~~

Section tranchée ou sans objet le 2026-10-27 ([rules.md](rules.md) § 5.3). La capture sur une case plus haute, d'abord laissée ouverte (point 17), est tranchée le même jour.

- ~~Point ouvert : la portée d'attaque à distance suit-elle une distance horizontale pure indépendante de la hauteur ? Fortement probable par cohérence avec le reste, mais jamais confirmé explicitement mot pour mot.~~ — sans objet : plus d'attaque à distance.
- ~~Point ouvert : grimper est-il une capacité générique (toute pièce peut le faire) ou une capacité spécifique à certaines pièces seulement ? Non tranché ("on verra au fur et à mesure").~~ — tranché : capacité de toutes les pièces.

## 7. Déploiement

- Point ouvert, à noter pour le level design futur : voir [rules.md](rules.md) § 7 (LOS mutuelle des zones de déploiement, paramètre de carte).

## 10. Récapitulatif — points ouverts à trancher

### Mécaniques de jeu

1. ~~Résolution de plusieurs attaques-zones qui se chevauchent sur la même pièce au même moment de résolution.~~ — sans objet depuis l'abandon de l'attaque à distance (décision du 2026-10-27, [rules.md](rules.md) § 3.2).
2. ~~Une attaque à distance déclarée consomme-t-elle tout le tour de la pièce, ou est-elle combinable avec un déplacement le même tour ?~~ — sans objet depuis l'abandon de l'attaque à distance (décision du 2026-10-27, [rules.md](rules.md) § 3.2). Le principe général est par ailleurs tranché : une pièce se déplace **ou** utilise une capacité, jamais les deux ([rules.md](rules.md) § 3).
3. ~~LOS au moment de la déclaration vs au moment de la résolution d'une attaque à distance différée.~~ — sans objet depuis l'abandon de l'attaque à distance (décision du 2026-10-27, [rules.md](rules.md) § 3.2).
4. ~~Règle anti-blocage/anti-répétition~~ — tranché en section 7.2 : triple répétition **et** compteur de coups sans capture, les deux automatiques. Seul le seuil du compteur reste à calibrer, ce qui suppose un roster. **Suspendu à l'implémentation** avec 7.1.
5. ~~Cases de déploiement : setup unique et fixe, ou choix parmi plusieurs emplacements ?~~ — tranché en section 7 : choix libre dans une zone par camp, définie par la carte.

### Verticalité / hauteur

6. ~~Confirmation explicite que la portée d'attaque à distance est indépendante de la hauteur (fortement probable, jamais dit noir sur blanc).~~ — sans objet depuis l'abandon de l'attaque à distance (décision du 2026-10-27, [rules.md](rules.md) § 3.2).
7. ~~Grimper : capacité générique à toutes les pièces, ou capacité spécifique à certaines pièces ?~~ — tranché le 2026-10-27 : capacité de toutes les pièces ([rules.md](rules.md) § 5.3).

### Design des pièces / capacités spéciales (mentionnées, jamais détaillées)

8. Téléporteurs / mécaniques de déport de ligne de vue. Toujours ouvert.
9. Capacité de pousser une pièce adverse (interaction avec pièges, bords de carte, hauteur non définie). Toujours ouvert.
10. Objets posables bloquant la LOS (différence avec les pièges à formaliser : durée de vie, visibilité, effet). **Précisé le 2026-10-27 pour les murs créés par une capacité** (la capacité elle-même reste une idée) : traités comme des pièces ; posé hors de la LOS de l'adversaire, un mur lui reste invisible jusqu'à ce qu'il puisse l'apercevoir normalement (orientation du porteur, à confirmer à l'implémentation). Le reste (durée de vie, hauteur, cases occupées, portée de pose, nombre maximal, exceptions à la règle « une pièce bloque ») **se décidera à la création de la capacité** : inutile de le spécifier avant.
11. Confirmation explicite que les pièges suivent bien la règle générale de FOW (cachés par défaut) ou existe-t-il des pièges volontairement visibles ? Toujours ouvert.

### Cadre général

12. Aucun roster concret de pièces n'a encore été esquissé — seul le principe directeur (différenciation par capacité/mouvement, pas par robustesse) a été acté. **Partiellement tranché** : la composition d'une équipe est actée — 1 roi, 3 pièces à capacité, 2 pions depuis le 2026-10-27 (avant : 1/3/4), ouverte à modification ; le style de déplacement aussi (proche des échecs ou très courte portée, [rules.md](rules.md) § 5.3). Restent ouverts : les types et capacités des 3 pièces à capacité, et les chiffres de toutes — « ça dépendra », selon le porteur du projet (2026-10-27).
13. **Rouvert — fin de partie.** L'échec et mat (7.1) et les nulles (7.2) sont retirés du moteur, et la capture (3.1) avec eux : seul l'abandon termine une partie aujourd'hui. Reste à décider dans quel ordre les remettre, et sous quelle forme la règle de mat doit revenir pour rester jouable avec de vraies portées de pièces — c'est-à-dire, très probablement, une fois un roster esquissé (point 12).
    - **À trancher avec le retour de la prise : l'identité des pièces à travers le fog** (ajouté le 2026-10-21). Chaque pièce adverse vue arrive avec un identifiant stable : un client modifié sait donc que « le pion revu ici est celui aperçu là-bas », ce qu'un joueur humain ne distingue pas entre deux pions identiques, et l'identifiant trahit l'ordre dans lequel l'adversaire a composé son équipe. Deux voies : l'accepter, ou donner à chaque joueur des identifiants propres à sa vue, renouvelés quand une pièce sort de vue (coûteux : mémoire fantôme, rejeu et animations reposent sur l'identifiant). Sans prise, l'enjeu reste faible ; avec elle, il touche aussi aux refus de coup (`unknown-piece` / `not-your-piece` diraient si une pièce cachée a disparu).

### Ajoutés le 2026-10-27

14. ~~Composition d'équipe : qui choisit quelles pièces — composition imposée, ou choisie dans un pool ?~~ — tranché le 2026-10-27 : le joueur compose son équipe dans les quotas, comme le fait déjà le constructeur d'équipe ([rules.md](rules.md) § 7).
15. Promotion : seuls les pions se promeuvent, sur une case définie par la carte (acté). Ouverts : la pièce obtenue — à décider plus tard, une des pièces de l'équipe ou une pièce spéciale plus forte encore — et ce que l'adversaire voit de la promotion.
16. Types des pièces adverses : connus avant la partie, jamais leurs positions (acté). Ouvert : le mécanisme de révélation.
17. ~~Capture d'une pièce sur une case plus haute.~~ — tranché le 2026-10-27 : la capture est un déplacement et suit ses règles de hauteur ; par une capacité, elle est bornée par la portée et la ligne de vue de celle-ci ([rules.md](rules.md) § 5.3).
18. Condition de victoire selon le mode de jeu. Un mat est souhaité, non tranché (lié au point 13).
19. Symétrie de la LOS contre portée de vision propre à chaque pièce : la LOS est symétrique par construction, mais deux pièces de portées de vision différentes ne se voient pas mutuellement à la même distance. Faut-il l'accepter, ou imposer une portée commune ?
