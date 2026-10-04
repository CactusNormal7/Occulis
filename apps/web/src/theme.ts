/**
 * Tokens de direction artistique du rendu.
 *
 * Les **valeurs** de couleur ne vivent plus ici mais dans `@occulis/ui/tokens`, seule
 * source du projet, que la charte d'interface (`packages/ui`) partage avec le plateau. Ce
 * fichier les reprend et y ajoute ce qui n'appartient qu'au rendu PixiJS : métriques,
 * alphas, épaisseurs. La règle ESLint interdit toute couleur ailleurs que dans
 * `packages/ui/src/tokens.ts`.
 *
 * Code couleur acté (docs/design.md section 8.1), provisoire : le blanc porte la
 * géométrie, la couleur porte l'état de jeu. Le fog et le relief se lisent donc
 * par alpha et par épaisseur de trait, jamais par teinte — un trait coloré
 * signifie toujours une information de partie.
 */
import { BACKGROUND, CAMP, INK, STATE as STATE_TOKENS } from "@occulis/ui/tokens";

const WHITE = INK;

/** Doit rester synchronisé à la main avec le `background` de `index.html`. */
export { BACKGROUND };

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

/** Marquage de la pièce sélectionnée et de ce qu'elle peut faire ce tour-ci. */
export const SELECTION = {
  piece: STATE.selection,
  pieceWidth: 2.5,
  pieceFillAlpha: 0.12,
  destination: STATE.legalMove,
  destinationWidth: 1.5,
  destinationFillAlpha: 0.1,
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
