# Occulis — Règles actées

C'est un document de game design : l'infrastructure est dans `docs/architecture.md`, le code dans `docs/technical/`.

> Numérotation d'origine de `docs/design.md` conservée dans les titres : « section 5.1 » désigne toujours le § 5.1, désormais dans le fichier indiqué par la [table de correspondance](../design.md).

Les points ouverts sont dans [open-points.md](open-points.md), les idées écartées dans [history.md](history.md).

## 1. Pitch

Un jeu de plateau tactique compétitif 1v1 en ligne, en vue isométrique 2D, en pixel art léger, mystique et cryptique (section 8.1 — l'intention de départ, « supra minimaliste, style traits, très chill », a été refondue à la demande du porteur du projet). Il reprend le squelette conceptuel des échecs — un roi à protéger, victoire par mat quand il n'a plus aucune parade — mais casse le plateau plat 8x8 au profit d'une carte à géométrie libre, avec hauteur, murs, ligne de vue (LOS) et fog of war façon Dofus/XCOM. Les pièces ont des capacités au-delà du simple mouvement échiquéen.

Nom du projet : Occulis (voir section 8 — nom retenu avec réserve documentée).

## 2. Piliers de design (non négociables, validés)

- Compétitif 1v1 direct, pas de leaderboard, pas de local multiplayer. (Un Elo existe — départ 1200, K = 32, parties de la file rapide seulement — pour situer un adversaire à l'annonce de la partie ; aucun classement n'en est tiré.)
- Info et calcul plutôt que réflexes : tour par tour alterné, temps de réflexion illimité pour l'instant. Seule l'absence est bornée : un joueur sans connexion pendant 30 s perd par forfait (un rechargement de page le rassoit à temps), et quitter une partie l'abandonne. Ce n'est PAS un jeu en temps réel malgré une confusion de vocabulaire en cours de discussion (voir section 6, itération sur le tour).
- Peu de règles, profondeur émergente — esprit échecs plutôt que tactics-RPG à kits de pouvoirs complexes. Chaque ajout de mécanique doit être pesé contre ce principe.
- Différenciation des pièces par capacité/mouvement, jamais par robustesse (pas de PV).
- DA minimaliste, dessin procédural en traits (pas de sprites bitmap), cohérent avec un rendu type Canvas/WebGL.
- Validation du fun prévue par beta avec vrais testeurs, pas par calibration solo.
- Vigilance sur les conflits de nom/marque (leçon tirée du rejet de "Lettris").

## 3. Règles de capture — état validé

- **Un tour, une action (décision du 2026-10-27).** À son tour, un joueur fait agir une seule pièce, qui se déplace **ou** utilise une capacité, jamais les deux. Cela vaut pour toutes les capacités.
- **On ne peut pas passer son tour (décision du 2026-10-27).** Chaque tour, une pièce se déplace ou utilise une capacité.

### 3.1 Attaque de mêlée (règle de base, toutes les pièces)

- Capture instantanée, façon échecs classiques : une pièce capture en **arrivant sur la case** d'une pièce adverse, pour toutes les pièces (précisé le 2026-10-27). Une pièce alliée bloque toujours : on n'entre jamais sur sa case.
- Choisi après avoir écarté un modèle 100% différé, jugé trop complexe (calcul de mat généralisé à chaque capture) et trop lent en rythme de jeu.
- **Suspendue à l'implémentation (décision de développement, la règle reste actée).** Aucune capture n'existe dans le moteur pour l'instant : une pièce ne peut simplement pas entrer sur la case d'une autre, alliée ou adverse. La décision est de reconstruire d'abord la géométrie du jeu — déplacement, blocage, ligne de vue — avant d'y reposer une règle de prise. La capture étant un déplacement, elle suit les règles de hauteur du déplacement (section 5.3). `canMeleeReach` reste codé et testé dans `packages/core`, mais il encode l'ancienne mêlée par adjacence et ne fait pas foi.

### 3.2 ~~Attaque à distance~~ — écartée le 2026-10-27

**Pas d'attaque à distance : toutes les captures se font en mêlée** (3.1). Le modèle différé et télégraphié qui la décrivait (zone déclarée, résolution au tour suivant, file par ordre de déclaration) est archivé avec la raison de son abandon dans [history.md](history.md), itération 6.

### 3.3 ~~Point ouvert non résolu~~

Sans objet depuis l'abandon de l'attaque à distance : voir [open-points.md](open-points.md) § 3.3, barrée.

## 4. Pièges

- Zone posée en anticipation, qui se déclenche soit au contact (marcher dessus), soit automatiquement après X tours si une pièce est dedans. Ce déclenchement différé suppose une **file de résolution différée**, qui n'est pas implémentée : l'attaque à distance qui l'aurait introduite est écartée (3.2).
- Cohérent avec le fog of war (voir section 5) — un piège caché suit la même logique que toute autre information hors LOS.
- Points ouverts : voir [open-points.md](open-points.md) § 4 et point 11.

## 5. Ligne de vue (LOS), hauteur, fog of war

### 5.1 Décision fondatrice

Le plateau n'est pas un simple array de valeurs (1 = mur, 2 = pièce...), mais une grille où chaque case est un objet de données incluant au minimum une hauteur. La LOS est calculée par raycast 2D classique (type Bresenham) entre l'émetteur et la cible, en comparant à chaque case traversée la hauteur de l'éventuel obstacle à la hauteur interpolée de la ligne de visée. Pas besoin de moteur 3D réel — un raycast 2D + comparaison de hauteur par case suffit à tout ce qui est décrit ci-dessous.

### 5.2 Distinction fondamentale : Visibilité ≠ Portée

- Visibilité (LOS) : détermine ce qui est affiché à l'écran du joueur. Une pièce hors LOS n'est même pas rendue (fog of war confirmé — voir 5.4).
- Portée : détermine ce qui peut être effectivement atteint/attaqué. Une pièce peut être vue sans être atteignable.
- Une pièce ne peut pas voir un élément derrière un mur, ni un élément positionné sur un mur (si elle-même n'est pas en hauteur). Si elle grimpe sur le mur, elle peut voir plus loin, mais toujours pas à travers un autre mur.
- **Une pièce occulte, comme aux échecs — tranché.** Une pièce coupe la ligne de vue _et_ la ligne de déplacement, sans distinction de camp : on ne voit pas derrière elle, on ne la traverse pas, on ne va pas sur sa case. Trois précisions actées avec la règle :
  - **Alliées comprises.** Si seules les pièces adverses occultaient, la ligne de vue cesserait d'être symétrique entre les deux camps — un joueur verrait l'autre sans être vu. C'est un invariant du moteur, il prime.
  - **Une pièce vaut un mur d'un niveau posé sur sa case.** L'occultation reste donc cohérente avec la hauteur : deux pièces au même niveau se masquent mutuellement ce qui est derrière elles, mais une pièce perchée voit par-dessus une pièce restée en contrebas. Une pièce occupe exactement la hauteur d'où elle regarde.
  - La pièce qui bloque reste, elle, parfaitement visible : elle n'occulte que ce qui est _derrière_ elle. **Précisé le 2026-10-21** : est visible toute pièce qui est le premier obstacle d'un regard porté dans la portée, même quand le regard direct vers sa propre case est coupé ailleurs (le tracé des lignes n'est pas transitif). Sans cela, l'ombre d'une pièce cachée trahissait sa place à qui recalculait sa vue.

### 5.3 Règles de hauteur (déplacement)

Réécrite le 2026-10-27, avec les décisions du porteur du projet.

- **Style de déplacement** : proche des échecs (lignes droites et diagonales), ou très courte portée.
- La hauteur n'affecte jamais la portée horizontale : elle affecte la LOS et le déplacement.
- **Un déplacement long ne comporte aucune montée, même d'un niveau.** Descendre est libre et sans limite ; un chemin à plat n'arrête pas le déplacement. Dès qu'un pas du chemin monterait, le mouvement s'arrête avant lui. Exemple : depuis une case de hauteur 8, une pièce peut aller sur une case de hauteur 6 si aucune case du chemin n'est plus haute que la précédente ; le chemin 8 → 5 → 6, qui remonte, est interdit. C'est déjà le comportement de `movement.ts`.
- **Grimper est une capacité de toutes les pièces** (décision du 2026-10-27, conforme au code). Monter d'un niveau coûte un déplacement complet par niveau, et nécessite d'être préalablement collé au mur/à la pente. Exemple : une pièce à côté d'un mur de hauteur 3 doit d'abord s'y coller, puis monter de 1, puis 1, puis 1 (plusieurs tours).
- **Capture d'une pièce sur une case plus haute (décision du 2026-10-27)** : la capture est un déplacement, elle suit donc exactement les règles ci-dessus — un déplacement long ne monte pas, grimper d'un niveau reste possible aux mêmes conditions. Une capture faite par une capacité est bornée par la portée et la ligne de vue de cette capacité. `canMeleeReach`, qui encode l'ancienne mêlée par adjacence, ne fait pas foi.
- **Retirés le 2026-10-27** : l'atteignabilité en mêlée entre cases adjacentes de hauteurs différentes, avec son asymétrie (la pièce haute atteignait la basse, pas l'inverse), et la conséquence « la hauteur protège contre les attaques à distance ». La capture se fait désormais en arrivant sur la case (3.1) et il n'y a plus d'attaque à distance (3.2) : ces deux règles n'ont plus d'objet.

### 5.4 Fog of war — confirmé

- Oui, fog of war actif : une pièce hors LOS n'est pas affichée au joueur adverse.
- Nécessite une distinction technique (pour plus tard, hors scope design) entre état réel du jeu (serveur autoritaire) et état "connu" par chaque joueur (dernière position vue, à afficher en style estompé/fantôme plutôt que simplement effacée).
- Implication straight : le serveur doit être autoritaire et ne jamais transmettre au client les données hors LOS de ce joueur (sans quoi le fog of war est contournable via les devtools navigateur).

### 5.5 Spectateurs — décision du porteur du projet

- Un ami peut regarder une partie en cours, **du côté de son ami et de ce côté seulement**, en direct : il reçoit exactement la vue du joueur suivi (sa LOS, ses fantômes), jamais la position complète ni la vue adverse. Ainsi un spectateur ne sait rien que le joueur ne sache déjà — il n'a aucun avantage à lui souffler.
- Réservé aux amis, et **désactivable** par chaque joueur (réglage du profil).
- Un joueur ne regarde jamais sa propre partie, ce qui lui montrerait la vue d'en face.
- Écartés : la vue complète en différé, et la vue complète réservée au replay.
- Limite assumée : un tiers ami **des deux** joueurs peut regarder chaque camp dans deux onglets et souffler la position de l'un à l'autre. La seule parade est le refus des spectateurs.

## 7. Déploiement et fin de partie

- Phase de déploiement : chaque joueur place ses pièces sur des cases prédéfinies avant le début de la partie.
- Le déploiement suit la règle générale de LOS : si les zones de déploiement des deux joueurs n'ont pas de ligne de vue mutuelle au départ (probable par design de carte), le déploiement est de facto caché à l'adversaire — pas de mécanique de dissimulation dédiée, ça découle naturellement du système de LOS/FOW déjà en place.
- **Tranché (porteur du projet) : un choix libre au sein d'une zone.** Chaque carte définit une zone de déploiement par camp ; chaque joueur y pose librement ses pièces, dans un temps limité (90 s — à l'échéance, son placement s'il est complet, sinon celui par défaut de la carte). Le déploiement des deux joueurs est simultané et caché par la seule LOS.
- **Composition d'équipe (porteur du projet, 2026-10-27) :** un roi, trois pièces à capacité, deux pièces de base (« pions »), soit six pièces. Elle remplace 1/3/4 pour des parties plus rapides, et reste ouverte à modification. Les quotas sont portés par le ruleset, donc versionnés par partie. Les types et capacités des trois pièces à capacité restent à définir (point ouvert 12) : il n'existe aujourd'hui qu'une pièce à capacité, l'éclaireur, que l'on peut donc prendre trois fois. **Le joueur compose lui-même son équipe** dans ces quotas, comme le fait déjà le constructeur d'équipe (décision du 2026-10-27).
- **Promotion (2026-10-27) :** seuls les pions se promeuvent, sur une case de promotion définie par la carte. La pièce obtenue sera décidée plus tard : une des pièces de l'équipe, ou une pièce spéciale plus forte encore. Ce que l'adversaire voit de la promotion n'est pas décidé (point ouvert 15).
- **Types adverses (2026-10-27) :** les types des pièces adverses sont connus avant la partie, jamais leurs positions. Le mécanisme de révélation n'est pas défini (point ouvert 16).
- **Cartes (2026-10-27) :** de taille similaire, avec moins de murs.
- Point ouvert, à noter pour le level design futur : chaque carte doit décider consciemment si les zones de déploiement des deux joueurs ont LOS mutuelle ou non — c'est un paramètre de conception de carte, pas une règle générale.
- Roi : gardé simple pour l'instant (mouvement/règles standards, pas de spécificité), avec possibilité d'évolution plus tard.
- Fin de partie : abandon possible, et égalité/nulle prévue "de la même manière qu'aux échecs, plus aucun coup possible sans attaque à part entière" — interprété comme un pat classique (aucun coup légal du tout, ni déplacement ni attaque). Point explicitement reporté par le porteur du projet : aucune décision prise sur une éventuelle règle anti-blocage/anti-répétition (équivalent de la règle des 50 coups aux échecs), pour éviter des parties qui tournent en rond sans jamais qu'aucun roi ne soit menacé.
- **Condition de victoire (2026-10-27) :** elle dépend du mode de jeu. Un mat est souhaité, mais n'est pas tranché (point ouvert 18).

### 7.1 Mise en échec et mat — « échecs strict », **suspendue**

> **État actuel : la règle est retirée du moteur.** À l'usage elle n'était pas jouable : combinée aux portées volontairement démesurées du roster provisoire (implementation-notes #14), elle mettait le roi en échec quasi permanent, supprimait tous ses coups légaux et déclenchait un mat immédiat. Décision du porteur du projet : **la retirer entièrement plutôt que la rafistoler**, et la reconstruire une fois la géométrie du jeu (portées, blocage, vision) stabilisée. Conséquences immédiates :
>
> - aucun coup n'est illégal au motif qu'il expose son propre roi ;
> - il n'y a plus ni échec, ni mat, ni pat, et la vue transmise ne porte plus de drapeau `check` ;
> - **plus aucune fin de partie automatique** : seul l'abandon termine une partie. Un joueur dont toutes les pièces seraient murées n'a plus que cette issue — cas très rare, accepté à ce stade ;
> - `PlayerView.legalActions` reste transmis, pour la raison énoncée en fin de section : le client ne peut toujours pas savoir quelles pièces invisibles barrent la route des siennes.
>
> Le raisonnement ci-dessous est conservé tel quel : c'est la décision de design, et le point de reprise quand la règle reviendra. Ce qui est écrit au présent décrit la règle visée, pas le moteur d'aujourd'hui.

Décision actée : **un coup qui laisse son propre roi capturable au tour suivant est illégal, exactement comme aux échecs — y compris quand la menace est hors de la ligne de vue de son auteur.**

Deux autres lectures avaient été posées et sont écartées :

- _Illégal seulement si la menace est visible._ Aucune fuite d'information, mais la légalité d'un coup dépendrait alors de la connaissance du joueur : `packages/core` aurait dû prendre un `PlayerKnowledge` en paramètre, et le mat serait devenu « aucune parade parmi les menaces connues » — une notion différente pour chaque camp.
- _Jamais illégal (capture du roi)._ La partie se termine à la capture effective du roi. Le plus simple, mais le pilier « victoire par mat » de la section 1 disparaît : il n'y aurait plus de mat, seulement des captures.

Conséquence assumée : le moteur peut refuser un coup à cause d'une menace que le joueur ne voit pas, ce qui lui apprend indirectement qu'elle existe. C'est le prix payé pour garder une notion de mat unique et symétrique. La vue transmise à un joueur porte donc un drapeau `check` pour son propre roi — jamais pour celui de l'adversaire, qui trahirait sa position.

Le mat en découle sans règle supplémentaire : plus aucun coup légal **et** roi menacé = mat ; plus aucun coup légal et roi hors de danger = pat.

Conséquence d'information, actée : **le serveur transmet à chaque joueur la liste de ses coups légaux.** Elle est calculée sur la position réelle, donc elle révèle d'un coup que des menaces invisibles le contraignent. C'est assumé pour deux raisons. D'abord, la même information s'obtient déjà en tâtonnant, puisqu'un coup refusé ne consomme pas de tour : la liste abaisse l'effort, pas le secret. Ensuite, sans elle l'interface est condamnée à mentir — un client qui ne voit qu'un camp ne peut ni deviner les menaces cachées, ni savoir qu'une pièce invisible barre la route d'un attaquant qu'il voit ; il proposerait donc des coups refusés et en cacherait d'acceptables.

### 7.2 Nulles anti-blocage — les deux règles, **suspendues**

> **État actuel : les deux règles sont retirées du moteur**, conséquence directe de 7.1. La nulle « coups sans capture » n'a plus de sens tant qu'aucune capture n'est possible — elle serait devenue une limite de tours déguisée, déclenchée dans toutes les parties. La triple répétition part avec elle, faute de fin de partie à laquelle se raccrocher. Elles reviendront avec la capture. Le raisonnement ci-dessous reste la décision de design.

Le point était explicitement reporté (« éviter des parties qui tournent en rond sans jamais qu'aucun roi ne soit menacé »). Décision actée : **les deux règles des échecs modernes, et toutes deux automatiques.**

- **Triple répétition** : la même position atteinte trois fois met fin à la partie. Une position, c'est la disposition des pièces _et_ le camp au trait ; les pièces y sont identifiées par leur camp et leur type, pas par leur identifiant — deux éclaireurs d'un même camp qui échangent leurs cases rendent bien la même position.
- **Coups sans capture** : au-delà d'un certain nombre d'actions sans qu'aucune pièce ne tombe, la partie est nulle. C'est cette règle qui couvre le vrai risque décrit plus haut, celui d'une partie qui tourne en rond en variant légèrement.

Automatiques et non proposées : deux joueurs obstinés pourraient sinon bloquer indéfiniment, ce qui est précisément ce qu'on cherche à empêcher.

Conséquence sous fog of war, assumée : la répétition porte sur la position **réelle**, tenue par le serveur. Un joueur peut donc voir tomber une nulle qu'il ne voyait pas venir, faute de connaître les positions adverses. L'alternative — une répétition mesurée sur ce que chaque joueur connaît — donnerait deux comptes différents et une règle non symétrique.

Le seuil de la seconde règle n'est **pas** un équilibrage : aucun roster n'est acté, donc aucune valeur ne peut l'être. La valeur encodée est un point de départ, isolé dans une constante.

## 8. Choix technique

- Stack retenue : rendu 2D isométrique via WebGL (probable PixiJS ou équivalent), en JavaScript/TypeScript. Pas Unity, pas de moteur 3D.
- Justification : la DA est un dessin procédural en traits (pas de sprites bitmap), la charge de calcul du jeu est négligeable (grille de quelques dizaines de cases, mise à jour au tour par tour, pas de temps réel), et le web offre nativement la portabilité (Steam via wrapper type Electron, desktop natif via Electron/Tauri, mobile via Capacitor) qu'un moteur bas niveau n'offre pas gratuitement.
- Rotation du plateau (isométrique, smooth) : jugée facile — c'est un recalcul de projection matricielle appliqué aux coordonnées logiques de chaque case/pièce, avec interpolation d'angle pour le smooth. Pas de rotation de sprites, du pur calcul géométrique cohérent avec un rendu procédural.
- Occlusion/fantôme de LOS (pièce partiellement cachée, ou visible en mémoire estompée) : reconnu comme un vrai morceau de développement (pattern connu en RTS/tactics — "fog of war memory"), nécessitant de séparer clairement état réel du jeu (serveur) et état "connu" par le joueur (dernière position vue). L'interaction avec la hauteur (occlusion partielle par un obstacle plus bas que la pièce) est identifiée comme le point le plus délicat, à traiter d'abord en pure logique/données avant de s'attaquer à l'habillage visuel.
- C++ : envisagé un temps pour la performance et la portabilité (Steam, mobile, app native), ces deux justifications ont été démontées (charge de calcul du jeu négligeable pour justifier du C++ ; le web est en réalité plus portable "gratuitement" que du C++ brut sur mobile/mutliplateforme). La vraie motivation identifiée était un objectif d'apprentissage du langage, assumé comme tel. Décision actée : le C++ est explicitement reporté à plus tard, sur un projet dédié plus petit et mieux adapté à l'apprentissage, découplé du développement d'Occulis. Possibilité d'un portage futur du moteur en C++ une fois le langage maîtrisé et le game design stabilisé — mais pas maintenant.
- Recommandation actée : séparer dès le début la logique de jeu (règles, calcul LOS, résolution des tours) du rendu (WebGL/PixiJS), pour faciliter un éventuel portage futur.

### 8.1 Direction artistique et caméra — décisions provisoires

Ces points ont été arrêtés lors de l'implémentation du moteur de rendu, puis la direction
artistique a été refondue à la demande du porteur du projet. Ils restent **provisoires**,
et sont consignés ici pour que le code ne soit pas la seule trace d'une décision de DA.

- **Direction : un pixel art léger, mystique et cryptique.** Inspirations données par le
  porteur du projet : _Animal Well_, _Helix: Descent n Ascent_, _Void Stranger_ et
  _Octopath Traveler_. On en retient : des pixels **visibles mais très fins** (un pixel du
  plateau couvre deux pixels physiques, quel que soit l'écran) ; des animations
  **jamais saccadées**, à la manière d'Octopath — la matière est en pixels, le mouvement et
  la lumière restent continus (glissements interpolés à chaque image, lueurs qui respirent,
  vignettage en pleine résolution par-dessus le plateau) ; des noirs profonds et un os, avec des lueurs saturées et rares, à la manière d'Helix et de Void Stranger ; et un
  décor cryptique qui ne veut rien dire — un sceau gravé sous le plateau qui tourne très
  lentement, des poussières en suspension. Ce qui a été écarté : le pixel art « gros
  grain », et toute animation par paliers.
- **Plusieurs propositions, comparées par le porteur du projet.** Trois thèmes coexistent,
  choisis depuis le menu et en pleine partie (bouton « Design ») : _Obsidienne_ (le noir de
  Void Stranger, neutre et sévère), _Reliquaire_ (le noir chaud d'Animal Well, or ancien,
  lucioles, sceau tournant) et _Astral_ (le ciel d'Helix, constellations, étoiles filantes,
  nuées). Retours du porteur ayant motivé cette étape : le fond doit être **plus noir et
  moins bleuté** que la première refonte (violet-noir, écartée) ; **la voûte d'étoiles est
  retenue** comme marqueur du ton cryptique et poétique, présente dans les trois ; **le sceau
  qui tourne autour du plateau reste à juger** — il n'est allumé que dans Reliquaire. Le
  choix entre les trois n'est pas tranché.
- **Chaque action s'anime comme dans un jeu d'action.** Rien n'apparaît ni ne disparaît
  d'un coup : la ligne de vue se **déploie** depuis les pièces en vague, case par case, et se
  retire d'un bloc ; le plateau monte du vide à l'entrée de la partie ; une pièce
  sélectionnée s'élève sous une colonne de lumière et ses destinations s'ouvrent en
  cascade ; un déplacement est un saut en arc suivi d'images rémanentes, qui retombe dans
  une onde et des étincelles ; un adversaire qui entre dans la vue se matérialise. Tout est
  coupé sous « mouvement réduit ». Ces animations ne lisent que la vue que le serveur a
  transmise : elles mettent en scène l'information, elles n'en révèlent aucune.
- **Une fenêtre qu'un clic ouvre se déplie.** Seules les fenêtres que le joueur ouvre
  par un clic s'animent ainsi — réglages, fenêtres modales, messages qui suivent un geste.
  Un cadre d'un pixel part d'un point et s'étire jusqu'aux bords de la fenêtre en la
  dévoilant, puis s'efface ; à la fermeture, il se replie vers ce point. Le point est **la
  souris** quand la fenêtre est posée à côté de ce qu'on a cliqué (les réglages sous
  l'engrenage), **le centre de la fenêtre** sinon (une modale au milieu de l'écran, un
  message dans son coin) ou quand on l'a ouverte au clavier. Le geste est volontairement
  minimal et court (220 ms). Trois propositions l'ont précédé, écartées par le porteur du
  projet : une nuée de petits carrés blancs éclose du centre (trop chaotique), un balayage de
  carrés depuis le coin le plus proche de la souris, puis un « œil qui s'ouvre » (un trait de
  lumière qui s'écarte en deux paupières tramées) — trop chargé. **Les écrans du parcours ne
  s'ouvrent pas ainsi** — menu principal, compte, attente, bandeau de partie, bandeau
  d'usurpation —, à sa demande : ce ne sont pas des fenêtres qu'on ouvre, et
  l'on y revient sans cesse. **Une exception : l'entrée dans la recherche ou la
  création d'une partie** passe sous le voile tramé du changement de thème (ci-dessous).
  Les pages entières gardent le fondu entre pages. Le design et la
  langue se règlent dans une petite fenêtre de **réglages**, ouverte par un engrenage à côté
  du lien vers le compte.
- **Le voile tramé est acté — ne pas y toucher.** Changer de thème fait passer sur l'écran un
  voile tramé (un pixel sur deux, couleur du vide) qui le balaie de gauche à droite en
  520 ms ; tout se repeint sous lui. Le porteur du projet l'a jugé **très bien : discret,
  bien que très visible**, et a demandé qu'on le garde tel quel et qu'il ne change jamais au
  détour d'une autre modification. C'est la référence des transitions : l'entrée dans la
  recherche ou la création d'une partie le reprend à l'identique (le menu bascule sur
  l'attente sous le voile). Sa feuille et ses durées sont verrouillées par un test
  (`apps/web/src/ui/veil.test.ts`) ; le changer demande son accord explicite.
- **Code couleur : le vide porte la matière, l'os porte la géométrie, les lueurs portent
  l'état de jeu.** Le terrain est fait de faces sombres et pleines, aux arêtes d'os ; le fog
  of war et la hauteur se lisent par la **valeur** (le dessus s'éclaircit avec la hauteur,
  une case hors de vue est assombrie et tramée un pixel sur deux), jamais par une teinte.
  La couleur est réservée à l'information de partie (camps, sélection, coups légaux,
  menace) : une lueur signifie toujours quelque chose. La contrainte est verrouillée
  mécaniquement — une règle ESLint interdit toute valeur de couleur hors de
  `packages/ui/src/tokens.ts`, seul détenteur du code couleur, que le rendu PixiJS
  (`apps/web/src/theme/theme.ts`) et la charte d'interface (`@occulis/ui`) partagent.
- **Faces pleines, et non plus filaire.** Le rendu filaire des débuts a été abandonné avec
  la refonte : les faces opaques rétablissent l'occlusion par surface (une pièce derrière
  un relief est cachée par une matière, plus seulement par l'ordre des traits), et c'est
  la lumière — face de falaise éclairée à gauche, d'ombre à droite — qui restitue le volume.
- **Une police pixel pour toute l'interface** (Tiny5, licence OFL), à des tailles multiples
  de 8 pour rester nette. Elle est servie par le client et préchargée avec le HTML : c'est la
  seule ressource que le premier écran attend, et il paraît directement dans cette police.
- **Rotation libre avec aimantation.** La rotation se fait au drag (bouton droit ou milieu),
  de façon continue, et s'aimante sur le quart de tour le plus proche au relâchement ; les
  flèches gauche/droite conservent le quart de tour direct. Conformément à la section 8, la
  rotation reste un recalcul de projection sur les coordonnées logiques : les quatre coins
  de chaque case sont projetés individuellement, ce qui garde le pavage jointif à n'importe
  quel angle intermédiaire.
- **Deux façons de jouer un coup, toutes deux provisoires.** À la souris : cliquer une de
  ses pièces la sélectionne et fait apparaître ses destinations légales, cliquer une
  destination l'y déplace, une pièce adverse n'est qu'un obstacle (la capture est retirée, 3.1). Au
  clavier : taper les coordonnées (`1,6 2,5` déplace, `abandon`
  abandonne) dans un champ HTML posé par-dessus le canevas. Aucune des deux n'est une décision d'interface arrêtée : ce sont des
  moyens d'exercer la logique déjà implémentée. La partie est **toujours arbitrée par le
  serveur** : il n'existe aucun mode local, et le client ne voit jamais que sa propre vue —
  conformément au pilier « pas de local multiplayer » de la section 2.
- **Le déplacement est animé, jamais instantané.** La pièce glisse d'une case à l'autre,
  hauteur comprise, avec départ et arrivée adoucis. L'action est appliquée à l'état
  immédiatement : seule la position à l'écran est interpolée, et le compte rendu du tour
  attend la fin du glissement.

- **On arrive sur un menu, pas sur une partie.** Le canevas reste masqué tant que le
  serveur n'a pas assis le joueur. Trois façons d'entrer en partie, toutes provisoires
  comme le reste de l'habillage : appariement rapide, création d'une partie qui rend un
  code de cinq caractères à transmettre, et entrée par ce code. Un code se lit à voix
  haute et se recopie à la main : son alphabet exclut les caractères que l'œil confond
  (`B I L O S Z 0 1 2 5 8`).
- **Caméra : zoom et déplacement.** Molette pour zoomer vers le curseur, drag gauche pour
  déplacer la vue. Le facteur de zoom vit dans la projection et non dans la transformation
  du conteneur de rendu, afin que l'épaisseur des traits reste constante à l'écran quel que
  soit le niveau de zoom — une arête reste large d'un seul pixel du plateau.

## 9. Nom du projet

Nom retenu : Occulis.

Historique de la recherche de nom : plusieurs pistes explorées et écartées consciemment —

- Mots du dictionnaire purs (Parallax, Prescience, Vantage, Zenith, Apex, Meridian) : écartés car mal référençables (collision avec l'usage existant du mot) et/ou incompréhensibles comme nom de marque.
- Contractions inventées explorées autour de plusieurs racines : vision/occlusion (Occulis, Occulate, Rooculus...), hauteur/vantage (Vantrook, Vantly...), anticipation/prescience (Prescynt, Rookseer, Augur...), référence échecs directe (Occumate, Rookline, Rookshade...).
- "Occulis" retenu par préférence explicite malgré une vérification de disponibilité qui a révélé un risque non négligeable : pas de collision directe (aucun jeu/app nommé exactement "Occulis" trouvé), mais une forte proximité phonétique et orthographique avec "Oculus" (marque Meta/VR très connue) et avec plusieurs jeux existants au nom proche (Oculux, Occulto, Occlude, Ocellus, Oculist). Risque identifié : confusion en recherche vocale/bouche-à-oreille, et dilution SEO face à des marques établies sur le même champ lexical.
- Ce risque a été signalé explicitement et le porteur du projet a choisi de conserver "Occulis" en connaissance de cause.
- Recherche de marque déposée formelle et de disponibilité de domaine (.com/.gg) non effectuée à ce stade — à faire avant tout dépôt de nom ou achat de domaine officiel.
