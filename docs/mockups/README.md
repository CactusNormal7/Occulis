# Maquettes des écrans

Cinq écrans dessinés pour donner une lecture concrète de la direction artistique. Ouvrir
[`index.html`](index.html) — ou n'importe quel fichier de ce dossier — directement depuis le disque : ce sont des
pages autonomes, sans serveur, sans dépendance et sans étape de build. Elles ne font partie ni du workspace pnpm,
ni de la CI.

| Écran | Fichier | Phase |
| --- | --- | --- |
| Menu principal | [`menu.html`](menu.html) | avant partie |
| Recherche d'adversaire | [`matchmaking.html`](matchmaking.html) | avant partie |
| Déploiement | [`deploiement.html`](deploiement.html) | avant partie |
| Partie en cours | [`partie.html`](partie.html) | en partie |
| Fin de partie | [`fin-de-partie.html`](fin-de-partie.html) | en partie |

`mockup.js` et `mockup.css` portent la projection isométrique, les glyphes de pièces et les particules communes.

## Ce que ces fichiers ne sont pas

**Ni une spécification d'interface, ni une source de vérité.** Le *pourquoi* des décisions de DA reste dans
[`../design.md`](../design.md) section 8.1, et le code couleur fait foi dans `apps/web/src/theme.ts` — seul
fichier du client autorisé à contenir une valeur de couleur. `mockup.css` recopie ces valeurs pour rester
autonome ; en cas de divergence, c'est `theme.ts` qui a raison et la maquette qui se corrige.

**Ni le rendu réel.** Le client dessine en traits procéduraux dans PixiJS ; ces maquettes dessinent en SVG. La
projection, les métriques (`tileWidth` 72, `tileHeight` 36, `heightUnit` 22) et le code couleur sont repris à
l'identique, mais la dérive est inévitable à mesure que le moteur évolue. Pour juger un écran de jeu avec
fidélité, la référence reste le client lui-même lancé sur un scénario figé — pas ce dossier.

## Ce que les maquettes encodent

Les écrans reprennent des règles déjà actées, pour que la maquette reste discutable sur le fond :

- **Brouillard de guerre avec mémoire** (design.md 5.4) — le relief hors LOS est estompé et jamais masqué
  (implementation-notes #10) ; une pièce mémorisée hors LOS apparaît en fantôme.
- **Hauteur et falaises** (design.md 5.3) — les cases hautes sont des colonnes dont seules les arêtes face caméra
  sont tracées.
- **Attaque à distance télégraphiée** (design.md 3.2) — la zone déclarée est visible en pointillés corail, avec
  des particules qui convergent vers l'intérieur : la charge se lit comme en cours, et se résoudra au tour suivant.
- **Déploiement caché par la LOS** (design.md 7) — la zone adverse est rendue quasi invisible sans mécanique de
  dissimulation dédiée, ce qui découle du système de LOS.
- **Saisie clavier par coordonnées** (design.md 8.1) — conservée à l'écran, puisqu'elle reste seule capable
  d'enchaîner déplacement et capture dans le même tour.

Les points listés comme ouverts en section 10 du design doc ne sont pas tranchés ici : les valeurs de roster
affichées (`×1`, `×2`, portées) sont du remplissage d'illustration, aucun équilibrage ne doit s'appuyer dessus.

## Proposition non actée : la silhouette des pièces

Les pièces dessinées ici **ne correspondent pas** à ce que rend le client aujourd'hui (une tige surmontée d'un
losange, cf. les tokens `PIECES` de `theme.ts`). C'est une proposition, soumise et pas encore validée.

Chaque pièce est un **socle au sol** — un losange inscrit dans la case, qui ancre la pièce et marque
l'occupation — surmonté d'une structure dont la **silhouette porte le type** :

- **Roi** — mât haut, deux contreforts, couronné d'un anneau ouvert. Présence verticale maximale.
- **Commandant** — mât moyen barré d'une traverse en losange plat, chevron plein au sommet.
- **Éclaireur** — mât court et penché, chevron ouvert. La plus légère des trois.

L'intention est que le rôle se lise à la forme et jamais à la taille : aucune pièce n'a de robustesse à exprimer,
la différenciation se fait par capacité et mouvement (design.md pilier 2). Tant que cette proposition n'est pas
actée, `theme.ts` et le moteur restent inchangés, et rien dans ce dossier ne fait autorité sur le sujet.

## Origine

Ces écrans ont d'abord été composés sur un canvas Claude (artifact de type Design), puis réécrits ici en pages
autonomes pour qu'ils vivent dans le dépôt sans dépendre d'un runtime externe.
