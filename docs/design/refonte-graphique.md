# Refonte graphique — propositions (2026-10-18)

> **Statut : propositions, rien n'est intégré.** Aucun écran du jeu, du profil ni du
> back-office n'importe ce qui est décrit ici. Tout vit dans un labo isolé, à valider avant
> toute intégration. Les décisions de DA actées restent celles de
> [`design.md` section 8.1](../design.md) — notamment **le voile tramé, verrouillé**, qui
> n'est touché par aucune de ces propositions.

## Où regarder

|                          | Commande     | Adresse                      |
| ------------------------ | ------------ | ---------------------------- |
| Serveur de développement | `pnpm dev`   | `http://localhost:5173/lab/` |
| Serveur local complet    | `pnpm local` | `http://localhost:8787/lab/` |

La page porte une barre de réglages (thème, intensité, tempo, paramètres du papier) qui fait
**exactement ce que fera la surcharge du back-office** : poser des propriétés `--occ-*` et un
`data-motion` sur `<html>`, à chaud. Les réglages sont gardés dans le navigateur
(`localStorage`, clé `occulis.lab`), nulle part ailleurs. Le build de production
(`pnpm build`, donc la CI et tout déploiement) n'embarque pas la page.

| Fichier                                         | Rôle                                                                                                                                                          |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/ui/src/tokens.ts`, bloc `PROPOSED`    | Les tokens proposés, valeurs par défaut                                                                                                                       |
| `packages/ui/src/generated/proposed-tokens.css` | Leur feuille, **générée** (`pnpm --filter @occulis/ui tokens`), lue par le seul labo                                                                          |
| `packages/ui/src/lab/`                          | Les composants proposés, sous-chemin `@occulis/ui/lab` (hors de l'entrée principale, donc hors du jeu, du back-office et de la synchronisation Claude Design) |
| `packages/ui/previews/`                         | La page d'aperçus et ses données factices                                                                                                                     |
| `apps/web/lab/`                                 | La coquille HTML que Vite sert sous `/lab/`                                                                                                                   |

---

## 1. Tokens et mouvement

### Structure : trois étages

1. **Les valeurs** — `tokens.ts`, en nombres (ms, px) : ce que lisent le CSS généré _et_ le
   JavaScript (PixiJS, animations tracées). Ce sont les **valeurs par défaut** d'une future
   surcharge.
2. **Les rôles** — les propriétés que les feuilles lisent : `--occ-dur-window`,
   `--occ-ease-sweep`, `--occ-paper`, `--occ-dist-hop`… Un rôle coloré n'est **jamais une
   valeur** mais un renvoi au thème (`--occ-paper: var(--occ-ink)`), pour qu'un changement de
   thème le suive. Aucune couleur nouvelle n'a été nécessaire : le papier est l'os, ses points
   sont le vide.
3. **Les boutons** — trois propriétés seulement, la surface d'une surcharge :

| Bouton                   | Défaut               | Effet                                                                     |
| ------------------------ | -------------------- | ------------------------------------------------------------------------- |
| `--occ-tempo`            | `1`                  | Multiplie **toutes** les `--occ-dur-*` (`calc(250ms * var(--occ-tempo))`) |
| `--occ-motion-amplitude` | `1` / `0.4` / `0`    | Multiplie toutes les distances `--occ-dist-*`                             |
| `--occ-motion-loop`      | `running` / `paused` | `animation-play-state` de toute boucle décorative                         |

Les deux derniers sont posés par le **niveau d'intensité**, `data-motion` sur la racine :

| Niveau          | Amplitude | Boucles | Glyphes brouillés | Usage                                                                                          |
| --------------- | --------- | ------- | ----------------- | ---------------------------------------------------------------------------------------------- |
| `full` (défaut) | 1         | oui     | oui               | Tout : arcs, rémanences, frises qui frémissent                                                 |
| `calm`          | 0,4       | non     | non               | Distances courtes, aucune boucle, un glyphe cède sa lettre sans se brouiller                   |
| `still`         | 0         | non     | non               | Rien ne se déplace ; les changements passent en fondu. **Imposé par `prefers-reduced-motion`** |

Une animation JavaScript ne lit jamais une durée en dur : `readMotion()` lit les boutons sur
la racine, `durationMs(role, motion)` rend la durée du rôle, tempo compris, et `easing(css)`
évalue une courbe des tokens en fonction (la même courbe pour une transition CSS et un saut
tracé dans PixiJS).

### Tokens ajoutés

| Groupe         | Tokens                                                                                                                                                                             | Propriétés                                  |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| Espacement     | `space` 10 / 12 / 16 (40, 48, 64 px)                                                                                                                                               | `--occ-space-10…16`                         |
| Interligne     | `leading` tight 1,25 · base 1,5 · loose 1,75                                                                                                                                       | `--occ-leading-*`                           |
| Durées (ms)    | `tick` 70 · `fast` 150 · `window` 220 · `base` 250 · `slow` 420 · `screen` 520 · `decode` 900 · `hold` 700 · `resorb` 600 · `breath` 3200 · `wave` 45 / case · `cascade` 38 / case | `--occ-dur-*` (× tempo)                     |
| Courbes        | `out` (= `MOTION.ease`) · `in` · `inOut` · `sweep`                                                                                                                                 | `--occ-ease-*`                              |
| Distances (px) | `rise` 8 · `lift` 3 · `hop` 14                                                                                                                                                     | `--occ-dist-*` (× amplitude)                |
| Rémanences     | `trail.count` 3 · `trail.lag` 0,09                                                                                                                                                 | JS seulement                                |
| Intensité      | `motion.full / calm / still`                                                                                                                                                       | `--occ-motion-level`, `-amplitude`, `-loop` |
| Glyphes        | `cipher.unit` 1 px · `stroke` 1 px · `flicker` 1400 ms                                                                                                                             | `--occ-cipher-*`, `--occ-dur-flicker`       |
| Papier         | `paper.grid` 8 px · `dot` 2 px · `speed` 900 px/s · `resorb` `dither`                                                                                                              | `--occ-paper-*`                             |

`window` (220 ms) et `screen` (520 ms) recopient les valeurs actuelles de `revealWindow()` et
du voile tramé pour que la grammaire soit complète ; **ni l'un ni l'autre ne les lit** — le
voile est verrouillé par `veil.test.ts`.

### Ce que la structure permet, et ce qu'elle ne fait pas encore

- **Surcharge globale ou par compte** : poser les boutons, les rôles ou `data-motion` sur
  `:root`. Aucun composant du labo n'a de valeur figée, et un test vérifie que chaque durée
  passe par le tempo, chaque distance par l'amplitude, chaque boucle par `--occ-motion-loop`.
- **Limite connue** : les rôles dérivés (`--occ-dur-*`, `--occ-paper`) sont calculés **sur
  `:root`**. Une surcharge posée sur un sous-arbre (un seul panneau) ne les recalcule pas ;
  elle devrait redéclarer les rôles. La surcharge demandée (globale ou par compte) vise la
  racine, donc n'est pas concernée.
- **Rien n'est construit** côté back-office ni D1 — volontairement.

### Dette existante à migrer le jour de l'intégration

Des durées sont encore écrites en dur hors des tokens : `OPEN_MS` / `CLOSE_MS`
(`window-reveal.ts`), `VEIL_MS` (`veil.ts`, **verrouillé**), une dizaine de littéraux dans
`styles.css` (`100ms`, `120ms`, `0.2s`, `0.22s`, `0.16s`, `0.4s`, `1.4s`, scintillement
`4.7s` / `6.1s`), et la table `MOTION_FX` du plateau (`packages/board/src/theme.ts`). Le
`prefers-reduced-motion` actuel de `styles.css` ramène **toutes** les durées à 0,01 ms, fondus
compris, alors que la proposition garde des fondus courts sous `still` (voir questions).

---

## 2. Caractères cryptiques

Un alphabet inventé, au trait d'un pixel, dans une case de 9 × 11 pas, pour toute direction.
Les glyphes sont **générés** (pur, déterministe, sans aléa) puis filtrés (d'un seul tenant,
ni trop simples ni trop chargés), si bien que l'alphabet décodable est fixe d'une session à
l'autre.

### Trois directions

| Direction                    | Principe                                                                                          | Glyphes | Forces                                                                  | Faiblesses                                             |
| ---------------------------- | ------------------------------------------------------------------------------------------------- | ------- | ----------------------------------------------------------------------- | ------------------------------------------------------ |
| **A · Treillis** (`lattice`) | Un fragment du cube isométrique d'une case : arêtes du dessus, du dessous, verticales, pentes 2:1 | 448     | La plus cohérente avec le plateau ; se lit comme de l'architecture      | Certains glyphes se ressemblent par symétrie           |
| **B · Stèles** (`stele`)     | Un fût vertical, des encoches à trois hauteurs, à plat ou à la pente iso                          | 286     | La hauteur comme écriture ; la plus lisible en ligne, proche de l'ogham | Le fût commun uniformise une ligne ; moins « Occulis » |
| **C · Orbites** (`orbit`)    | Des étoiles reliées sur une grille 3 × 3, parfois un œil cranté au centre                         | 348     | Écho de la voûte et du nom                                              | La plus aérienne, la moins lisible petite              |

### Le composant

- `CipherText` — une chaîne chiffrée, figée (`cipher` / `plain`) ou animée (`decode` :
  glyphes → lettres ; `encode` : l'inverse). Chaque caractère est une case qui superpose sa
  lettre et son glyphe : **la largeur ne change jamais**, seule l'opacité bascule. De gauche à
  droite avec un léger désordre ; chaque caractère se brouille quelques pas, puis montre **son
  vrai glyphe pendant un pas** avant de céder la lettre — c'est ce qui rend un alphabet
  décodable apprenable. Le texte réel est **toujours** dans l'arbre d'accessibilité ; les
  glyphes sont `aria-hidden`.
- `CipherFrieze` — une frise sans texte (bordure, chargement, couronne), entièrement
  `aria-hidden`, dont un glyphe frémit de temps à autre. Arrêtée en `calm` et `still`.
- `Glyph` — un glyphe seul, `currentColor`, net (`crispEdges`, trait non mis à l'échelle).

Sous `calm`, les glyphes cèdent leur lettre sans se brouiller ; sous `still`, toute la chaîne
passe en un fondu.

### Décodable ou non — à trancher

| Option        | Ce que c'est                                                                     | Pour                                                                                                                                    | Contre                                                                                                                                                    |
| ------------- | -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Décodable** | Substitution fixe : une lettre = un glyphe, partout                              | Une couche de « lore » pour les curieux ; la mise en scène (vrai glyphe avant la lettre) l'enseigne ; un message caché devient possible | Une fois cassé, le mystère s'évente ; tout texte chiffré devient lisible, donc doit être _écrit_ (pas de faux texte) ; 36 glyphes à rendre bien distincts |
| **Ornement**  | Un glyphe tiré de la position et d'une graine ; deux « E » ne se ressemblent pas | Aucun risque de contresens ; on peut chiffrer n'importe quoi                                                                            | Pure texture : l'œil finit par le savoir et ne regarde plus                                                                                               |
| _Hybride_     | Décodable pour les titres et les inscriptions, ornement pour les frises          | Le meilleur des deux                                                                                                                    | Deux régimes à expliquer et à tenir                                                                                                                       |

Le labo bascule de l'un à l'autre (« Decodable / Ornament »).

### Où, et à quelle fréquence

| Emplacement                 | Usage proposé                                                                         | Fréquence                                                                        |
| --------------------------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Mot-symbole, titres d'écran | Se déchiffre **une fois par session**, puis reste lisible                             | Rare                                                                             |
| Chargements, file d'attente | Couronne ou frise qui frémit ; le statut se déchiffre à l'arrivée                     | Le temps de l'attente                                                            |
| Transitions                 | Le titre du nouvel écran arrive chiffré et se déchiffre sous le papier qui se résorbe | À chaque seuil                                                                   |
| Bordures                    | Frise très estompée le long d'un cadre (fenêtre de partie trouvée, fin de partie)     | Ponctuelle                                                                       |
| Survol                      | Le libellé se brouille 250 ms                                                         | **Déconseillé** au-delà de quelques liens : c'est l'usage qui lasse le plus vite |

Règle de rareté proposée : **au plus un événement cryptique visible à la fois**, jamais à côté
d'une information de partie qui change (minuteur, tour, vue). Un glyphe ne porte **jamais** une
information nécessaire — ni un code de salon, ni un pseudo, ni un minuteur.

---

## 3. Inversion « papier millimétré »

Une zone où le thème s'inverse — l'os devient le fond, le vide un quadrillage de points — qui
se propage depuis un point, tient, puis se résorbe. Dessin par un **shader WebGL** sur un
calque `aria-hidden`, sans clic : à chaque image il ne reçoit que le front et la part dissoute,
rien ne touche la mise en page. Sans WebGL, rien ne s'affiche (décoratif). C'est la forme que
prendrait l'effet sur le plateau : le même fragment en filtre PixiJS.

- **Propagation circulaire** : le front avance case de quadrillage par case de quadrillage
  (comme la ligne de vue), précédé d'une bande tramée un pixel sur deux — le bord est un voile,
  pas une arête.
- **Contour d'une zone du plateau** : chaque case éclot en losange depuis son centre, dans
  l'ordre de sa **distance mesurée dans la zone** (le front contourne un mur, longe un couloir).
  La zone est passée au shader en texture d'une case par texel.
- **Disparition** (`--occ-paper-resorb`), au choix dans la section du labo comme dans sa barre
  de réglages : `dither` — **partout à la fois**, une trame de Bayer 4 × 4 qui s'éteint, le
  geste du voile tramé ; `recede` — **anti-propagation**, le front repart à la même vitesse et
  se résorbe dans le point cliqué (dans une zone : les cases les plus lointaines s'éteignent
  d'abord, jusqu'à la case de départ) ; `none` — reste posée.
- **Paramètres en tokens** : vitesse (`--occ-paper-speed`), pas du quadrillage, taille des
  points, tenue (`--occ-dur-hold`), résorption (`--occ-dur-resorb`) — les durées suivent le
  tempo. `onCovered` signale l'instant où tout est couvert (pour basculer un écran dessous).
- **Sous `still`** : aucune propagation, l'inversion entière paraît et repart en fondu.

### Deux modes de fusion — à trancher

| Mode                                                      | Effet                                                       | Pour                                                         | Contre                                                                                                                         |
| --------------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `cover`                                                   | Papier opaque par-dessus                                    | Sûr pour les couleurs ; idéal en transition                  | Cache ce qui est dessous                                                                                                       |
| `invert`                                                  | `mix-blend-mode: difference` : ce qui est dessous s'inverse | Vraie inversion, le texte d'os devient noir et reste lisible | **Les lueurs prennent leur complémentaire** : une pièce teal se lirait orange — contraire à « la couleur porte l'information » |
| _(non prototypé)_ `backdrop-filter: invert() grayscale()` | Inversion de la seule valeur                                | Pas de couleur trompeuse                                     | Perd toute couleur dans la zone ; coût du filtre                                                                               |

### Usages possibles (non intégrés au gameplay)

- **Transition d'écran** : partie trouvée → déploiement → partie (prototype 2). Le plus sûr.
- **Révélation par le fog** : une zone qui sort du fog s'inverse un instant avant de se poser.
  Attention : le fog se lit **par la valeur** (design.md 8.1) ; une inversion durable sur le
  plateau en renverserait la lecture. Seulement en éclair.
- **Sort / capacité** : la zone d'effet d'une capacité, le jour où un roster existe (point
  ouvert 12) — l'effet « suivre une zone » est fait pour ça.
- **Fin de partie** : l'inversion part du roi vaincu et couvre le plateau.

---

## 4. Animations de l'interface

Priorités : **P0** structure le vocabulaire, à faire en premier ; **P1** attendu à
l'intégration ; **P2** finition.

| Écran / composant               | Intention, en une phrase                                                                                                                                       | Priorité | État                                                               |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------ |
| **Plateau — sélection**         | La pièce s'élève et ses destinations s'ouvrent en cascade depuis elle.                                                                                         | P0       | Existe en PixiJS ; **prototype 1**                                 |
| **Plateau — déplacement**       | Un saut en arc avec rémanences, une onde à la retombée : le coup se voit, puis s'efface.                                                                       | P0       | Existe ; **prototype 1**                                           |
| **Fog et ligne de vue**         | La vue se déploie en vague depuis la pièce qui voit et se retire d'un bloc ; un adversaire perdu laisse un fantôme pointillé.                                  | P0       | Existe ; **prototype 1**                                           |
| Plateau — adversaire qui paraît | Il se matérialise à l'instant où la vague l'atteint, jamais avant.                                                                                             | P0       | **Prototype 1**                                                    |
| Silhouettes par rôle            | Le rôle se lit à la forme seule — œil (roi), losange et pointe (capacité), mât penché (pion).                                                                  | P0       | **Prototype 1** (légende) ; provisoire, roster non acté            |
| Plateau — attaque               | Un trait d'os relie l'attaquant à la cible, puis une inversion papier éclair sur la case.                                                                      | P1       | Non prototypé : la capture est retirée du moteur (point ouvert 13) |
| Plateau — attaque différée      | Un glyphe se pose sur la case visée et se déchiffre à la résolution.                                                                                           | P2       | Sans objet : attaque à distance écartée le 2026-10-27              |
| Tour qui revient                | L'œil des pièces bat une fois, en vague du fond vers l'avant.                                                                                                  | P1       | Existe en PixiJS                                                   |
| Entrée du plateau               | Le plateau monte du vide, case par case.                                                                                                                       | P2       | Existe                                                             |
| **Transitions d'écran**         | Partie trouvée → déploiement → partie passent sous le papier, qui part du geste et se résorbe en trame ; le reste garde le voile acté et le fondu entre pages. | P0       | **Prototype 2**                                                    |
| **File d'attente**              | Une couronne de glyphes tourne très lentement autour d'un œil qui respire ; trouvé, elle se referme et le statut se déchiffre.                                 | P0       | **Prototype 3**                                                    |
| Partie trouvée (15 s)           | L'anneau se vide ; à l'acceptation, le papier part du bouton.                                                                                                  | P1       | Prototype 2 en couvre la sortie                                    |
| Salons privés                   | Le code de cinq caractères se pose lettre à lettre depuis ses glyphes, une seule fois — il reste lisible et copiable dès la première image.                    | P2       | —                                                                  |
| Menu                            | Le mot-symbole se déchiffre à la première visite de la session ; les entrées ne bougent pas.                                                                   | P1       | —                                                                  |
| Déploiement                     | Une pièce posée se matérialise dans sa case ; la zone de pose respire.                                                                                         | P1       | —                                                                  |
| Chat, messages privés           | Un message arrive d'un fondu et d'une montée de `--occ-dist-rise` ; « en train d'écrire » = trois glyphes qui frémissent.                                      | P2       | —                                                                  |
| Amis — présence                 | Le point « en ligne » respire lentement (boucle, arrêtée en `calm`).                                                                                           | P2       | —                                                                  |
| Profil, historique              | Le replay réutilise la chorégraphie du plateau, au tempo du lecteur.                                                                                           | P1       | —                                                                  |
| Fenêtres, toasts                | Inchangés : `revealWindow()` acté.                                                                                                                             | —        | Existe                                                             |
| Fin de partie                   | L'inversion papier part du roi vaincu ; le résultat se déchiffre.                                                                                              | P1       | —                                                                  |

Les trois prototypes retenus fixent le vocabulaire que les autres reprennent : **le coup**
(sélection, saut, vague, matérialisation, fantôme), **le seuil** (papier + déchiffrement),
**l'attente** (couronne, œil, déchiffrement). La chorégraphie du coup est en fonctions pures
du temps (`src/lab/choreography.ts` : `hopAt`, `trailAt`, `waveDelayMs`), portables telles
quelles dans `apps/web/src/view/`.

---

## Questions ouvertes

1. **Direction des glyphes** : A, B, C — ou un mélange (A pour les titres, C pour les
   ornements) ?
2. **Décodable, ornement, ou hybride** (tableau du chantier 2).
3. **Rareté** : la règle « un événement cryptique à la fois » convient-elle ? Le survol
   chiffré est-il à écarter d'emblée ?
4. **Papier : `cover` ou `invert`** — et l'inversion a-t-elle sa place sur le plateau en
   partie, sachant qu'elle renverse la lecture du fog par la valeur ?
5. **Disparition par défaut** : `dither` (partout à la fois, cohérent avec le voile), `recede`
   (retour vers le clic) ou `none` ? Et la même pour tous les usages, ou une par usage (par
   exemple `recede` pour un sort, `dither` pour une transition d'écran) ?
6. **Quadrillage** : en espace écran (retenu) ou aligné sur les axes du plateau ? Aligné, le pas
   vertical tombe à la moitié de l'horizontal et les points entre deux pixels : la trame devient
   serrée et irrégulière. Il faudrait un pas propre au plateau.
7. **Mouvement réduit** : le réglage du système est-il un **plafond** (proposé : il impose
   `still` par-dessus un choix explicite) ou une valeur par défaut que le joueur peut relever ?
   Et sous `still`, garde-t-on des **fondus courts** (proposé ; l'opacité n'est pas du
   mouvement) alors que `styles.css` les coupe aujourd'hui tous ?
8. **« Un écran paraît d'un seul tenant »** (CLAUDE.md) : un titre qui arrive chiffré puis se
   déchiffre est-il compatible ? Le texte est présent dès la première image (glyphes, et lecteur
   d'écran), mais lisible un instant plus tard.
9. **Seuil papier et voile** : le voile reste tel quel pour le thème et l'entrée en recherche ;
   le papier prend-il partie trouvée → déploiement → partie, ou le voile doit-il rester
   l'unique transition entre écrans ?
10. **Surcharge par compte** : quels boutons exposer (proposé : tempo et intensité seulement,
    les rôles réservés au back-office global), avec quelles bornes, et le niveau d'intensité
    d'un compte prime-t-il sur le réglage du système ?
11. **Trait blanc ou faces pleines** : le brief parle de « traits blancs sur fond sombre » ; la
    DA actée (8.1) a quitté le filaire pour des faces pleines aux arêtes d'os. Les prototypes
    gardent les faces pleines pour le terrain et le trait pour les pièces et les glyphes —
    à confirmer.
12. **Silhouettes par rôle** : provisoires tant que le roster ne l'est pas (point ouvert 12) ;
    la forme « œil / losange-pointe / mât penché » suffit-elle à distinguer trois rôles d'un
    coup d'œil, à la taille du plateau ?
