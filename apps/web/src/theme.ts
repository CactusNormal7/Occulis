/**
 * Tokens de direction artistique du rendu.
 *
 * Les **valeurs** de couleur ne vivent pas ici mais dans `@occulis/ui/tokens`, seule
 * source du projet, que la charte d'interface (`packages/ui`) partage avec le plateau. Ce
 * fichier les reprend et y ajoute ce qui n'appartient qu'au rendu : métriques, alphas,
 * épaisseurs. La règle ESLint interdit toute couleur ailleurs que dans
 * `packages/ui/src/tokens.ts`.
 *
 * Direction actée en docs/design.md 8.1, provisoire : un pixel art léger. La matière du
 * plateau est sombre et pleine, l'os en dessine les arêtes, et les lueurs (camps, état)
 * portent seules l'information de partie. Le fog et le relief se lisent par la valeur
 * et la trame, jamais par une teinte.
 *
 * Les épaisseurs sont en **pixels du plateau** (`view/pixel.ts`), jamais en pixels CSS :
 * un trait d'un pixel reste un pixel net à tout niveau de zoom.
 */
import { BACKGROUND, CAMP, INK, STATE as STATE_TOKENS, TERRAIN } from "@occulis/ui/tokens";

export { BACKGROUND };

export const METRICS = {
  tileWidth: 72,
  tileHeight: 36,
  /** Décalage vertical à l'écran d'un niveau de hauteur. */
  heightUnit: 22,
} as const;

export const GEOMETRY = {
  stroke: INK,
  /** Le relief est public : hors LOS il est assombri et tramé, jamais masqué (implementation-notes #10). */
  alphaVisible: 0.5,
  alphaFogged: 0.2,
  /** Facteur appliqué aux arêtes des cases infranchissables, qui restent du relief lisible. */
  impassableFactor: 0.55,
  /** Atténuation des arêtes en profondeur : le lointain s'enfonce dans le vide. */
  depthFadeNear: 1,
  depthFadeFar: 0.55,
  widthTop: 1,
  widthCliff: 1,
  /** Le dessus d'une case vue, du sol (`top`) au plus haut relief (`peak`). */
  top: TERRAIN.top,
  peak: TERRAIN.peak,
  /** Hauteur à laquelle le dessus atteint `peak`. */
  peakHeight: 4,
  fog: TERRAIN.fog,
  /** Les deux faces d'une falaise : la lumière vient de la gauche de l'écran. */
  sideLight: TERRAIN.sideLight,
  sideShade: TERRAIN.sideShade,
  /** La trame posée sur une case hors de vue : un pixel sur deux, couleur du vide. */
  fogDither: BACKGROUND,
  fogDitherAlpha: 0.7,
} as const;

/** Le survol : un réticule aux quatre coins de la case, et un voile d'os à peine posé. */
export const HOVER = {
  stroke: INK,
  strokeWidth: 1,
  /** Longueur des branches du réticule, en fraction de l'arête. */
  reticle: 0.28,
  fill: INK,
  fillAlpha: 0.07,
  /** Les falaises de la case survolée sont soulignées pour lire la colonne entière. */
  cliffAlpha: 0.45,
} as const;

/** Couleurs de camp — provisoires, le code couleur définitif reste à arrêter. */
export const PLAYERS = {
  A: CAMP.A,
  B: CAMP.B,
} as const;

/**
 * Code couleur d'état. Distinct des couleurs de camp par construction : une case
 * mise en avant ne doit jamais se confondre avec une pièce.
 */
export const STATE = {
  selection: STATE_TOKENS.selection,
  legalMove: STATE_TOKENS.legalMove,
  /** Réservé : grimper consomme le tour entier et mériterait un marquage propre. */
  climb: STATE_TOKENS.climb,
  threat: STATE_TOKENS.threat,
} as const;

/**
 * Marquage de la pièce sélectionnée et de ce qu'elle peut faire ce tour-ci. Les
 * lueurs respirent (`breathMs`) entre leurs deux alphas : c'est le seul élément du
 * plateau qui bouge sans qu'on l'ait touché, et il désigne ce qu'on attend du joueur.
 */
export const SELECTION = {
  piece: STATE.selection,
  pieceWidth: 1,
  pieceFillAlpha: [0.1, 0.26],
  destination: STATE.legalMove,
  destinationWidth: 1,
  destinationStrokeAlpha: 0.55,
  destinationFillAlpha: [0.05, 0.16],
  /** La gemme au centre d'une destination, en fraction de la case. */
  destinationGem: 0.16,
  breathMs: 3200,
} as const;

export const PIECES = {
  alphaVisible: 1,
  /** Fantômes : pièce mémorisée mais actuellement hors LOS (design.md 5.4). */
  alphaGhost: 0.4,
  strokeWidth: 1,
  /** Hauteur de l'obélisque, en multiples de `heightUnit`. */
  bodyRatio: 1.1,
  /** Demi-largeur à la base de l'obélisque, en multiples de `tileWidth`. */
  bodyRatioWidth: 0.095,
  /** Demi-largeur de l'œil flottant, en multiples de `tileWidth`. */
  headRatio: 0.12,
  /** L'écart entre l'obélisque et l'œil, en pixels du plateau. */
  float: 2,
  /** Les deux faces de l'obélisque : la couleur du camp, enfoncée dans le vide. */
  faceLight: 0.45,
  faceShade: 0.72,
  shadow: BACKGROUND,
  shadowAlpha: 0.6,
} as const;

/**
 * Le sceau gravé dans le vide sous le plateau : deux cercles concentriques, des
 * graduations et des glyphes, qui tournent très lentement. Il n'est visible qu'autour
 * du plateau — les cases, pleines, le recouvrent — et suit la rotation de la caméra,
 * puisqu'il est posé dans le plan du sol.
 */
export const SIGIL = {
  stroke: INK,
  alpha: 0.11,
  glyphAlpha: 0.2,
  /** Marge entre le bord du plateau et le premier cercle, en cases. */
  margin: 0.9,
  ring: 0.55,
  ticks: 48,
  glyphs: 8,
  /** Sous le sol : le sceau est une gravure, pas un objet posé. */
  height: -0.4,
  /** Radians par seconde. */
  speed: 0.018,
} as const;

/** Les poussières en suspension (`view/ambient.ts`). */
export const MOTES = {
  color: INK,
  count: 56,
  seed: 1717,
} as const;
