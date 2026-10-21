/**
 * Tokens de direction artistique du rendu.
 *
 * Les **valeurs** de couleur ne vivent pas ici mais dans `@occulis/ui/tokens`, seule
 * source du projet, que la charte d'interface (`packages/ui`) partage avec le plateau. Ce
 * fichier les reprend et y ajoute ce qui n'appartient qu'au rendu : métriques, alphas,
 * épaisseurs, durées, et ce que chaque thème allume ou éteint (sceau, lucioles, voûte).
 * La règle ESLint interdit toute couleur ailleurs que dans `packages/ui/src/tokens.ts`.
 *
 * Direction actée en docs/design.md 8.1, provisoire : un pixel art léger. La matière du
 * plateau est sombre et pleine, l'os en dessine les arêtes, et les lueurs (camps, état)
 * portent seules l'information de partie. Le fog et le relief se lisent par la valeur
 * et la trame, jamais par une teinte.
 *
 * Le thème est **choisi par le joueur** (`setLook()`), et lu à chaque image par
 * `look()` : basculer de thème en pleine partie ne demande aucun rechargement.
 *
 * Les épaisseurs sont en **pixels du plateau** (`view/pixel.ts`), jamais en pixels CSS :
 * un trait d'un pixel reste un pixel net à tout niveau de zoom.
 */
import { DEFAULT_THEME, THEMES, type Palette, type ThemeName } from "@occulis/ui/tokens";

export const METRICS = {
  tileWidth: 72,
  tileHeight: 36,
  /** Décalage vertical à l'écran d'un niveau de hauteur. */
  heightUnit: 22,
} as const;

/** Ce que chaque thème allume, au-delà de sa palette. */
interface Atmosphere {
  /** Le sceau gravé sous le plateau (`render/pixi/ground.ts`). */
  readonly sigil: boolean;
  /** Les particules en suspension : poussière d'os, lucioles qui luisent, ou rien. */
  readonly motes: "dust" | "fireflies" | "none";
  readonly moteCount: number;
  /** La voûte d'étoiles derrière le plateau (`render/pixi/sky.ts`). */
  readonly stars: number;
  /** Des segments entre étoiles voisines. */
  readonly constellations: boolean;
  /** Une étoile filante, de temps en temps. */
  readonly shootingStars: boolean;
  /** Des nuées tramées dans la couleur d'aura. */
  readonly nebula: boolean;
}

const ATMOSPHERES: Record<ThemeName, Atmosphere> = {
  obsidian: {
    sigil: false,
    motes: "dust",
    moteCount: 36,
    stars: 140,
    constellations: false,
    shootingStars: true,
    nebula: false,
  },
  reliquary: {
    sigil: true,
    motes: "fireflies",
    moteCount: 22,
    stars: 70,
    constellations: false,
    shootingStars: false,
    nebula: false,
  },
  astral: {
    sigil: false,
    motes: "none",
    moteCount: 0,
    stars: 260,
    constellations: true,
    shootingStars: true,
    nebula: true,
  },
};

function lookOf(name: ThemeName) {
  const palette: Palette = THEMES[name];
  return {
    name,
    palette,
    atmosphere: ATMOSPHERES[name],
    geometry: {
      stroke: palette.ink,
      /** Le relief est public : hors LOS il est assombri et tramé, jamais masqué (implementation-notes #10). */
      alphaVisible: 0.42,
      alphaFogged: 0.16,
      /** Facteur appliqué aux arêtes des cases infranchissables, qui restent du relief lisible. */
      impassableFactor: 0.55,
      /** Atténuation des arêtes en profondeur : le lointain s'enfonce dans le vide. */
      depthFadeNear: 1,
      depthFadeFar: 0.55,
      widthTop: 1,
      widthCliff: 1,
      top: palette.terrain.top,
      peak: palette.terrain.peak,
      /** Hauteur à laquelle le dessus atteint `peak`. */
      peakHeight: 4,
      fog: palette.terrain.fog,
      /** Les deux faces d'une falaise : la lumière vient de la gauche de l'écran. */
      sideLight: palette.terrain.sideLight,
      sideShade: palette.terrain.sideShade,
      /** La trame posée sur une case hors de vue : un pixel sur deux, couleur du vide. */
      fogDither: palette.background,
      fogDitherAlpha: 0.7,
    },
    hover: {
      stroke: palette.ink,
      strokeWidth: 1,
      /** Longueur des branches du réticule, en fraction de l'arête. */
      reticle: 0.28,
      fill: palette.ink,
      fillAlpha: 0.07,
      /** Les falaises de la case survolée sont soulignées pour lire la colonne entière. */
      cliffAlpha: 0.45,
    },
    players: palette.camp,
    state: palette.state,
    selection: {
      piece: palette.state.selection,
      pieceWidth: 1,
      pieceFillAlpha: [0.1, 0.26] as const,
      destination: palette.state.legalMove,
      destinationWidth: 1,
      destinationStrokeAlpha: 0.55,
      destinationFillAlpha: [0.05, 0.16] as const,
      /** La gemme au centre d'une destination, en fraction de la case. */
      destinationGem: 0.16,
    },
    pieces: {
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
      shadow: palette.background,
      shadowAlpha: 0.6,
    },
    sigil: {
      stroke: palette.ink,
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
    },
  };
}

export type Look = ReturnType<typeof lookOf>;

const looks = new Map<ThemeName, Look>();
let active: ThemeName = DEFAULT_THEME;

/** Le thème en vigueur, tel que le rendu le lit à chaque image. */
export function look(): Look {
  let found = looks.get(active);
  if (found === undefined) {
    found = lookOf(active);
    looks.set(active, found);
  }
  return found;
}

export function setLook(name: ThemeName): void {
  active = name;
}

/**
 * Les durées des animations du plateau, en millisecondes. Une action se lit toujours en
 * trois temps — anticipation, mouvement, retombée —, comme dans un jeu d'action : rien
 * n'apparaît ni ne disparaît d'un coup.
 */
export const MOTION_FX = {
  /** La respiration des lueurs : une pulsation lente, jamais un clignotement. */
  breathMs: 3200,
  /** Ligne de vue : une case qui s'éclaire ou s'éteint, et le retard par case de distance à la pièce qui voit. */
  revealMs: 420,
  revealPerTileMs: 45,
  /** Une case qui s'éteint part plus vite, et sans vague : on perd la vue d'un bloc. */
  dimMs: 320,
  dimPerTileMs: 12,
  /** L'entrée du plateau : chaque case monte du vide, en vague du fond vers l'avant. */
  introMs: 620,
  introSpreadMs: 700,
  /** De combien de niveaux une case remonte à l'entrée du plateau. */
  introDepth: 2.2,
  /** Les destinations d'une pièce sélectionnée s'ouvrent en cascade, par distance. */
  cascadePerTileMs: 38,
  cascadeMs: 260,
  /** Le réticule de survol se referme sur la case. */
  hoverMs: 140,
  /** L'arc d'un déplacement, en niveaux de hauteur à mi-course. */
  hopHeight: 0.55,
  /** Les images rémanentes d'une pièce qui glisse, et leur retard l'une sur l'autre. */
  trail: 4,
  trailLagMs: 34,
  /** La retombée : onde au sol et étincelles. */
  landingMs: 620,
  sparks: 8,
  /** Une pièce adverse qui entre dans la vue se matérialise. */
  materializeMs: 520,
  /** Un adversaire qui sort de la vue se dissout sur son fantôme. */
  vanishMs: 480,
  /** Le trait revient au joueur : l'œil de ses pièces bat une fois, en vague du fond vers l'avant. */
  turnMs: 560,
  turnSpreadMs: 260,
  /** La sélection : la pièce choisie s'élève, et une colonne de lumière la désigne. */
  liftMs: 180,
  lift: 3,
} as const;
