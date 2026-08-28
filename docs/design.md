# Occulis — Document de conception (récapitulatif d'itération)

Ce document est une synthèse d'une session de brainstorming critique. Il capture l'état des décisions prises, les décisions encore ouvertes, et l'historique des itérations pour éviter de revalider des idées déjà écartées. Aucun code, aucune architecture technique définitive n'a été produit à ce stade — c'est un document de game design.

## 1. Pitch

Un jeu de plateau tactique compétitif 1v1 en ligne, en vue isométrique 2D, à l'esthétique minimaliste filaire ("supra minimaliste, style traits, très chill"). Il reprend le squelette conceptuel des échecs — une pièce maîtresse (roi) à protéger, victoire par mat quand elle n'a plus aucune parade — mais casse le plateau plat 8x8 au profit d'une carte à géométrie libre, avec hauteur, murs, ligne de vue (LOS) et fog of war façon Dofus/XCOM. Les pièces ont des capacités au-delà du simple mouvement échiquéen.

Nom du projet : Occulis (voir section 8 — nom retenu avec réserve documentée).

## 2. Piliers de design (non négociables, validés)

- Compétitif 1v1 direct, pas de leaderboard, pas de local multiplayer.
- Info et calcul plutôt que réflexes : tour par tour alterné, temps de réflexion illimité pour l'instant. Ce n'est PAS un jeu en temps réel malgré une confusion de vocabulaire en cours de discussion (voir section 6, itération sur le tour).
- Peu de règles, profondeur émergente — esprit échecs plutôt que tactics-RPG à kits de pouvoirs complexes. Chaque ajout de mécanique doit être pesé contre ce principe.
- Différenciation des pièces par capacité/mouvement, jamais par robustesse (pas de PV).
- DA minimaliste, dessin procédural en traits (pas de sprites bitmap), cohérent avec un rendu type Canvas/WebGL.
- Validation du fun prévue par beta avec vrais testeurs, pas par calibration solo.
- Vigilance sur les conflits de nom/marque (leçon tirée du rejet de "Lettris").

## 3. Règles de capture — état validé

### 3.1 Attaque de mêlée (règle de base, toutes les pièces)

- Capture instantanée, façon échecs classiques : si une pièce se déplace dans la portée/adjacence d'une pièce adverse (ou l'inverse), c'est immédiat, pas de délai.
- Choisi après avoir écarté un modèle 100% différé, jugé trop complexe (calcul de mat généralisé à chaque capture) et trop lent en rythme de jeu.

### 3.2 Attaque à distance (capacité spéciale, certaines pièces seulement)

- Réservée à des pièces spécifiques (pas une règle générale).
- Fonctionne sur un modèle différé/télégraphié : l'attaquant déclare une zone d'attaque à son tour, elle se résout au tour suivant de l'attaquant (donc après un tour complet de l'adversaire).
- La cible doit se déplacer hors de la zone pour survivre, OU l'attaquant peut être tué avant résolution — dans ce cas l'attaque est annulée.
- La résolution suit un ordre de priorité basé sur l'instant de déclaration (queue) : si une attaque A est déclarée avant une attaque B, et que A permet de tuer l'auteur de B avant que B ne résolve, B est annulée.
- Cible = zone fixe, PAS une cible mobile qui suit la pièce (tranché explicitement).

### 3.3 Point ouvert non résolu

- Est-ce que déclarer une attaque à distance consomme tout le tour de la pièce (elle ne peut ni bouger ni faire autre chose), ou est-ce une action combinable avec un déplacement ? Non tranché — identifié comme un risque de déséquilibre majeur (une pièce à distance qui agit gratuitement en plus de bouger serait strictement supérieure à une pièce de mêlée).
- LOS au moment de la déclaration vs au moment de la résolution d'une attaque à distance (un obstacle qui apparaît entre-temps bloque-t-il l'attaque déjà déclarée ?) — non tranché.
- Résolution de plusieurs attaques-zones qui se chevauchent sur la même pièce au même moment — non tranché (mort simple ? la première dans l'ordre de déclaration annule les autres ? cumul ?).

## 4. Pièges

- Fonctionnement identique au modèle d'attaque différée : zone posée en anticipation, se déclenche soit au contact (marcher dessus), soit automatiquement après X tours si une pièce est dedans.
- Cohérent avec le fog of war (voir section 5) — un piège caché suit la même logique que toute autre information hors LOS.
- Point ouvert : confirmé implicitement lié au FOW général, mais jamais formalisé noir sur blanc si TOUS les pièges sont cachés par défaut ou si certains sont volontairement visibles (pièges de zone de contrôle vs pièges d'embuscade, par exemple).

## 5. Ligne de vue (LOS), hauteur, fog of war

### 5.1 Décision fondatrice

Le plateau n'est pas un simple array de valeurs (1 = mur, 2 = pièce...), mais une grille où chaque case est un objet de données incluant au minimum une hauteur. La LOS est calculée par raycast 2D classique (type Bresenham) entre l'émetteur et la cible, en comparant à chaque case traversée la hauteur de l'éventuel obstacle à la hauteur interpolée de la ligne de visée. Pas besoin de moteur 3D réel — un raycast 2D + comparaison de hauteur par case suffit à tout ce qui est décrit ci-dessous.

### 5.2 Distinction fondamentale : Visibilité ≠ Portée

- Visibilité (LOS) : détermine ce qui est affiché à l'écran du joueur. Une pièce hors LOS n'est même pas rendue (fog of war confirmé — voir 5.4).
- Portée : détermine ce qui peut être effectivement atteint/attaqué. Une pièce peut être vue sans être atteignable.
- Une tour ne peut pas voir un élément derrière un mur, ni un élément positionné sur un mur (si elle-même n'est pas en hauteur). Si elle grimpe sur le mur, elle peut voir plus loin, mais toujours pas à travers un autre mur.

### 5.3 Règles de hauteur (mêlée / adjacence)

- La hauteur n'affecte jamais la portée horizontale à distance — elle affecte uniquement (a) la LOS et (b) l'atteignabilité en mêlée par adjacence.
- Monter d'un niveau de hauteur = coûte un déplacement complet par niveau, et nécessite d'être préalablement collé au mur/à la pente. Exemple : une pièce à côté d'un mur de hauteur 3 doit d'abord s'y coller, puis monter de 1, puis 1, puis 1 (plusieurs tours).
- Descendre = libre, sans limite, dans le même tour.
- Deux cases adjacentes de hauteurs différentes peuvent toujours s'atteindre mutuellement en mêlée (l'écart se comble par la règle de montée/descente ci-dessus).
- Si l'écart est de 2 niveaux ou plus avec un palier intermédiaire, l'asymétrie apparaît : la pièce en hauteur peut atteindre la pièce basse (elle peut descendre librement), mais l'inverse n'est pas vrai dans le même tour (montée limitée à 1 niveau/tour).
- Conséquence de gameplay explicitement actée : la hauteur protège contre les attaques à distance, mais pas contre une attaque de mêlée en adjacence directe — "plus haut" n'est donc pas synonyme de "totalement safe", nuance à documenter clairement dans le rulebook final pour éviter toute confusion en cours de développement.
- Point ouvert : la portée d'attaque à distance suit-elle une distance horizontale pure indépendante de la hauteur ? Fortement probable par cohérence avec le reste, mais jamais confirmé explicitement mot pour mot.
- Point ouvert : grimper est-il une capacité générique (toute pièce peut le faire) ou une capacité spécifique à certaines pièces seulement ? Non tranché ("on verra au fur et à mesure").

### 5.4 Fog of war — confirmé

- Oui, fog of war actif : une pièce hors LOS n'est pas affichée au joueur adverse.
- Nécessite une distinction technique (pour plus tard, hors scope design) entre état réel du jeu (serveur autoritaire) et état "connu" par chaque joueur (dernière position vue, à afficher en style estompé/fantôme plutôt que simplement effacée).
- Implication straight : le serveur doit être autoritaire et ne jamais transmettre au client les données hors LOS de ce joueur (sans quoi le fog of war est contournable via les devtools navigateur).

## 6. Historique des itérations sur le tour et la capture (pour ne pas revalider ce qui a été écarté)

Cette section documente le cheminement, volontairement, pour éviter de reproposer des idées déjà explorées et abandonnées.

1. Itération 1 : attaque instantanée façon échecs pure, sans mécanique de délai. Point de départ implicite.
2. Itération 2 : proposition d'un système d'attaque entièrement différée façon "cast time" — déclarée à un tour, résolue au tour suivant, pour toutes les attaques. Écarté : rend une attaque isolée quasi toujours évitable (il suffit de bouger), et généralise la complexité de calcul de "mat" à chaque capture du jeu, pas seulement à la pièce maîtresse. Risque de parties très lentes.
3. Itération 3 : proposition de "plusieurs pièces peuvent agir par tour" / système de points d'action, comme solution au problème de l'itération 2. Écarté comme solution principale — identifié comme une rustine plutôt qu'une vraie résolution, avec un risque de snowball offensif (alpha strike imparable) si l'économie d'action n'est pas très finement équilibrée.
4. Itération 4 : clarification que "temps réel" ne signifiait pas simultané, mais un tour alterné classique avec révélation séquentielle des sous-actions (déplacement puis action, révélées au fur et à mesure plutôt qu'en bloc à la fin du tour). Ceci a été validé — ça règle le problème de lisibilité sans introduire de vrai netcode temps réel ni d'avantage de réflexe/ping.
5. Itération 5 (état actuel) : retour à une capture de mêlée instantanée façon échecs pour toutes les pièces (résout le problème de l'itération 2), et conservation du modèle différé/télégraphié mais uniquement comme capacité spéciale réservée à l'attaque à distance de certaines pièces. C'est l'état validé actuellement (voir section 3).

Un seul déplacement/action par pièce par tour reste la règle de base actée, précisément pour éviter les parties trop rapides ou interminables (contrainte fixée dès le début de la conversation, jamais remise en cause depuis, malgré la tentation de l'itération 3).

## 7. Déploiement et fin de partie

- Phase de déploiement : chaque joueur place ses pièces sur des cases prédéfinies avant le début de la partie.
- Le déploiement suit la règle générale de LOS : si les zones de déploiement des deux joueurs n'ont pas de ligne de vue mutuelle au départ (probable par design de carte), le déploiement est de facto caché à l'adversaire — pas de mécanique de dissimulation dédiée, ça découle naturellement du système de LOS/FOW déjà en place.
- Point ouvert : les cases de déploiement sont-elles fixes et uniques (zéro décision, comme aux échecs), ou un choix parmi plusieurs emplacements possibles au sein d'une zone (vraie micro-décision stratégique) ? Non tranché.
- Point ouvert, à noter pour le level design futur : chaque carte doit décider consciemment si les zones de déploiement des deux joueurs ont LOS mutuelle ou non — c'est un paramètre de conception de carte, pas une règle générale.
- Roi (pièce maîtresse) : gardé simple pour l'instant (mouvement/règles standards, pas de spécificité), avec possibilité d'évolution plus tard.
- Fin de partie : abandon possible, et égalité/nulle prévue "de la même manière qu'aux échecs, plus aucun coup possible sans attaque à part entière" — interprété comme un pat classique (aucun coup légal du tout, ni déplacement ni attaque). Point explicitement reporté par le porteur du projet : aucune décision prise sur une éventuelle règle anti-blocage/anti-répétition (équivalent de la règle des 50 coups aux échecs), pour éviter des parties qui tournent en rond sans jamais qu'aucune pièce maîtresse ne soit menacée.

## 8. Choix technique

- Stack retenue : rendu 2D isométrique via WebGL (probable PixiJS ou équivalent), en JavaScript/TypeScript. Pas Unity, pas de moteur 3D.
- Justification : la DA est un dessin procédural en traits (pas de sprites bitmap), la charge de calcul du jeu est négligeable (grille de quelques dizaines de cases, mise à jour au tour par tour, pas de temps réel), et le web offre nativement la portabilité (Steam via wrapper type Electron, desktop natif via Electron/Tauri, mobile via Capacitor) qu'un moteur bas niveau n'offre pas gratuitement.
- Rotation du plateau (isométrique, smooth) : jugée facile — c'est un recalcul de projection matricielle appliqué aux coordonnées logiques de chaque case/pièce, avec interpolation d'angle pour le smooth. Pas de rotation de sprites, du pur calcul géométrique cohérent avec un rendu procédural.
- Occlusion/fantôme de LOS (pièce partiellement cachée, ou visible en mémoire estompée) : reconnu comme un vrai morceau de développement (pattern connu en RTS/tactics — "fog of war memory"), nécessitant de séparer clairement état réel du jeu (serveur) et état "connu" par le joueur (dernière position vue). L'interaction avec la hauteur (occlusion partielle par un obstacle plus bas que la pièce) est identifiée comme le point le plus délicat, à traiter d'abord en pure logique/données avant de s'attaquer à l'habillage visuel.
- C++ : envisagé un temps pour la performance et la portabilité (Steam, mobile, app native), ces deux justifications ont été démontées (charge de calcul du jeu négligeable pour justifier du C++ ; le web est en réalité plus portable "gratuitement" que du C++ brut sur mobile/mutliplateforme). La vraie motivation identifiée était un objectif d'apprentissage du langage, assumé comme tel. Décision actée : le C++ est explicitement reporté à plus tard, sur un projet dédié plus petit et mieux adapté à l'apprentissage, découplé du développement d'Occulis. Possibilité d'un portage futur du moteur en C++ une fois le langage maîtrisé et le game design stabilisé — mais pas maintenant.
- Recommandation actée : séparer dès le début la logique de jeu (règles, calcul LOS, résolution des tours) du rendu (WebGL/PixiJS), pour faciliter un éventuel portage futur.

### 8.1 Direction artistique et caméra — décisions provisoires

Ces quatre points ont été arrêtés lors de l'implémentation du moteur de rendu. Ils sont
explicitement **provisoires** : aucun design system n'est encore posé, et le porteur du
projet a indiqué que le code couleur évoluerait. Ils sont consignés ici pour que le code
ne soit pas la seule trace d'une décision de DA.

- **Code couleur : le blanc porte la géométrie, la couleur porte l'état de jeu.** Tout le
  terrain est blanc ; le fog of war, la hauteur et l'infranchissabilité se lisent par alpha
  et par épaisseur de trait, jamais par teinte. La couleur est réservée à l'information de
  partie (camps, et plus tard sélection, coups légaux, menace). Conséquence directe : un
  trait coloré signifie toujours quelque chose. La contrainte est verrouillée
  mécaniquement — une règle ESLint interdit toute valeur de couleur hors de
  `apps/web/src/theme.ts`, seul détenteur du code couleur.
- **Rendu filaire par défaut, sans remplissage.** Les faces des cases ne sont pas remplies ;
  seule la case survolée reçoit un aplat blanc de faible opacité. En l'absence de surfaces
  opaques, le volume est restitué par une atténuation des traits en profondeur. Le
  remplissage existe comme token à opacité nulle : repasser à des faces opaques, et
  retrouver une occlusion par surface, ne demande que de relever cette valeur.
- **Rotation libre avec aimantation.** La rotation se fait au drag (bouton droit ou milieu),
  de façon continue, et s'aimante sur le quart de tour le plus proche au relâchement ; les
  flèches gauche/droite conservent le quart de tour direct. Conformément à la section 8, la
  rotation reste un recalcul de projection sur les coordonnées logiques : les quatre coins
  de chaque case sont projetés individuellement, ce qui garde le pavage jointif à n'importe
  quel angle intermédiaire.
- **Caméra : zoom et déplacement.** Molette pour zoomer vers le curseur, drag gauche pour
  déplacer la vue. Le facteur de zoom vit dans la projection et non dans la transformation
  du conteneur de rendu, afin que l'épaisseur des traits reste constante à l'écran quel que
  soit le niveau de zoom — exigence propre à une DA filaire.


## 9. Nom du projet

Nom retenu : Occulis.

Historique de la recherche de nom : plusieurs pistes explorées et écartées consciemment —

- Mots du dictionnaire purs (Parallax, Prescience, Vantage, Zenith, Apex, Meridian) : écartés car mal référençables (collision avec l'usage existant du mot) et/ou incompréhensibles comme nom de marque.
- Contractions inventées explorées autour de plusieurs racines : vision/occlusion (Occulis, Occulate, Rooculus...), hauteur/vantage (Vantrook, Vantly...), anticipation/prescience (Prescynt, Rookseer, Augur...), référence échecs directe (Occumate, Rookline, Rookshade...).
- "Occulis" retenu par préférence explicite malgré une vérification de disponibilité qui a révélé un risque non négligeable : pas de collision directe (aucun jeu/app nommé exactement "Occulis" trouvé), mais une forte proximité phonétique et orthographique avec "Oculus" (marque Meta/VR très connue) et avec plusieurs jeux existants au nom proche (Oculux, Occulto, Occlude, Ocellus, Oculist). Risque identifié : confusion en recherche vocale/bouche-à-oreille, et dilution SEO face à des marques établies sur le même champ lexical.
- Ce risque a été signalé explicitement et le porteur du projet a choisi de conserver "Occulis" en connaissance de cause.
- Recherche de marque déposée formelle et de disponibilité de domaine (.com/.gg) non effectuée à ce stade — à faire avant tout dépôt de nom ou achat de domaine officiel.

## 10. Récapitulatif — points ouverts à trancher (à date de ce document)

### Mécaniques de jeu

1. Résolution de plusieurs attaques-zones qui se chevauchent sur la même pièce au même moment de résolution.
2. Une attaque à distance déclarée consomme-t-elle tout le tour de la pièce, ou est-elle combinable avec un déplacement le même tour ?
3. LOS au moment de la déclaration vs au moment de la résolution d'une attaque à distance différée.
4. Règle anti-blocage/anti-répétition en plus du pat classique (reporté).
5. Cases de déploiement : setup unique et fixe, ou choix parmi plusieurs emplacements ?

### Verticalité / hauteur

6. Confirmation explicite que la portée d'attaque à distance est indépendante de la hauteur (fortement probable, jamais dit noir sur blanc).
7. Grimper : capacité générique à toutes les pièces, ou capacité spécifique à certaines pièces ?

### Design des pièces / capacités spéciales (mentionnées, jamais détaillées)

8. Téléporteurs / mécaniques de déport de ligne de vue.
9. Capacité de pousser une pièce adverse (interaction avec pièges, bords de carte, hauteur non définie).
10. Objets posables bloquant la LOS (différence avec les pièges à formaliser : durée de vie, visibilité, effet).
11. Confirmation explicite que les pièges suivent bien la règle générale de FOW (cachés par défaut) ou existe-t-il des pièges volontairement visibles ?

### Cadre général

12. Aucun roster concret de pièces n'a encore été esquissé — seul le principe directeur (différenciation par capacité/mouvement, pas par robustesse) a été acté.

Document généré à partir d'une session de brainstorming critique. Objectif : servir de point de reprise fidèle pour la suite du développement (design detaillé, puis implémentation) sans perdre le fil des décisions déjà prises ni revalider des pistes déjà explorées et écartées.
