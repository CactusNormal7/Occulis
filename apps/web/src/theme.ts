/**
 * Tokens de direction artistique.
 *
 * C'est le SEUL fichier du client autorisé à contenir une valeur de couleur ;
 * la contrainte est verrouillée mécaniquement dans `eslint.config.js`.
 *
 * Code couleur acté (docs/design.md section 8.1), provisoire : le blanc porte la
 * géométrie, la couleur porte l'état de jeu. Le fog et le relief se lisent donc
 * par alpha et par épaisseur de trait, jamais par teinte — un trait coloré
 * signifie toujours une information de partie.
 */

const WHITE = 0xffffff;

/** Doit rester synchronisé à la main avec le `background` de `index.html`. */
export const BACKGROUND = 0x0d0f12;

export const METRICS = {
  tileWidth: 72,
  tileHeight: 36,
  /** Décalage vertical à l'écran d'un niveau de hauteur. */
  heightUnit: 22,
} as const;

export const GEOMETRY = {
  stroke: WHITE,
  /** Le relief est public : hors LOS il est estompé, jamais masqué (implementation-notes #10). */
  alphaVisible: 0.92,
  alphaFogged: 0.3,
  /** Facteur appliqué aux cases infranchissables, qui restent du relief lisible. */
  impassableFactor: 0.45,
  /**
   * Atténuation en profondeur. En filaire pur, aucune face opaque ne masque les
   * traits situés derrière un relief : c'est ce dégradé qui restitue le volume.
   */
  depthFadeNear: 1,
  depthFadeFar: 0.65,
  widthTop: 1,
  widthCliff: 1,
  /**
   * Faces transparentes : le rendu est filaire par défaut. Repasser à des faces
   * opaques — et retrouver une occlusion par surface — ne demande que de relever
   * cet alpha : la géométrie des faces est déjà émise et triée par profondeur.
   */
  fill: WHITE,
  fillAlpha: 0,
} as const;

export const HOVER = {
  fill: WHITE,
  fillAlpha: 0.14,
  stroke: WHITE,
  strokeWidth: 2,
  /** Les falaises de la case survolée sont soulignées pour lire la colonne entière. */
  cliffAlpha: 0.7,
} as const;

/** Couleurs de camp — provisoires, le code couleur définitif reste à arrêter. */
export const PLAYERS = {
  A: 0x74d3c4,
  B: 0xe0785f,
} as const;

/**
 * Emplacements réservés du code couleur d'état. Aucun n'est consommé à ce stade :
 * ni la sélection ni l'affichage des coups légaux ne sont implémentés.
 */
export const STATE = {
  selection: 0xf5d76e,
  legalMove: 0x74d3c4,
  climb: 0x9b8cf0,
  threat: 0xe0785f,
} as const;

export const PIECES = {
  alphaVisible: 1,
  /** Fantômes : pièce mémorisée mais actuellement hors LOS (design.md 5.4). */
  alphaGhost: 0.28,
  strokeWidth: 1.5,
  /** Hauteur de la tige, en multiples de `heightUnit`. */
  stemRatio: 1.1,
  /** Demi-largeur de la tête, en multiples de `tileWidth`. */
  headRatio: 0.18,
} as const;
