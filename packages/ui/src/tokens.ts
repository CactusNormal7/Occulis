/**
 * Les tokens de la charte d'Occulis — **seule source** des valeurs de couleur du projet.
 *
 * Direction artistique « liturgie du vide » (docs/design.md 8.1) : un pixel art léger
 * et cryptique. Trois matières seulement :
 * - **le vide** (`BACKGROUND`, `SURFACE`, `TERRAIN`) : des noirs violacés, profonds, qui
 *   portent la matière du plateau et des panneaux ;
 * - **l'os** (`INK`) : un blanc cassé, chaud, qui porte la géométrie et le texte. La
 *   hiérarchie se lit à son alpha, jamais à un gris ;
 * - **les lueurs** (`CAMP`, `STATE`) : des teintes saturées et rares, réservées à
 *   l'information de partie (un camp, une sélection, un coup légal, une menace). Une
 *   lueur signifie toujours quelque chose.
 *
 * Deux consommateurs, deux formats :
 * - `apps/web/src/theme.ts` (PixiJS) reprend les entiers 0xRRGGBB ;
 * - les composants de ce paquet lisent les propriétés CSS `--occ-*` de
 *   `generated/tokens.css`, produit depuis ce fichier par `pnpm --filter @occulis/ui
 *   tokens` et verrouillé par un test : il ne se modifie jamais à la main.
 *
 * Une règle ESLint interdit toute valeur de couleur ailleurs, client comme paquet.
 */

/** Le vide, partout : plateau, écrans, back-office. */
export const BACKGROUND = 0x08070e;

/** Le fond des panneaux, un cran au-dessus du vide. */
export const SURFACE = 0x110e1f;

/** L'os — géométrie, texte, traits d'interface. */
export const INK = 0xeee6d2;

/**
 * La matière du plateau : les faces pleines des cases. Le dessus s'éclaircit avec la
 * hauteur (`top` → `peak`) ; les falaises ont une face éclairée et une face d'ombre, la
 * lumière venant de la gauche. `fog` est le dessus d'une case hors de vue : plus sombre,
 * et tramé par-dessus.
 */
export const TERRAIN = {
  top: 0x1f1a38,
  peak: 0x3a3166,
  fog: 0x110e20,
  sideLight: 0x17132c,
  sideShade: 0x0d0b1a,
} as const;

/** Couleurs de camp — provisoires, le code couleur définitif reste à arrêter. */
export const CAMP = {
  A: 0x7cf0d8,
  B: 0xff5c88,
} as const;

/**
 * Code couleur d'état. Distinct des couleurs de camp par construction : une case mise
 * en avant ne doit jamais se confondre avec une pièce.
 */
export const STATE = {
  selection: 0xffd27a,
  legalMove: 0x8e9cff,
  /** Réservé : grimper consomme le tour entier et mériterait un marquage propre. */
  climb: 0xc49bff,
  threat: 0xff5c88,
} as const;

/**
 * Les opacités de l'os, du plus présent au plus discret. L'interface n'a pas d'autre
 * moyen de hiérarchiser : pas de gris, seulement de l'os plus ou moins posé.
 */
export const INK_ALPHA = {
  soft: 0.62,
  dim: 0.4,
  faint: 0.22,
  line: 0.12,
  ghost: 0.06,
} as const;

/** Le voile des panneaux posés sur le plateau : la surface, à peine transparente. */
export const PANEL_ALPHA = 0.9;

export const FONT = {
  /**
   * Tiny5 (SIL OFL), une police pixel dessinée sur une grille de 8 : elle n'est nette
   * qu'à un multiple de 8 px, d'où l'échelle ci-dessous. Servie par `apps/web` sous
   * `/fonts/` et préchargée par le bloc critique (`critical.ts`), pour que le premier
   * écran paraisse directement dans sa police.
   */
  pixel: '"Tiny5", ui-monospace, "SF Mono", Menlo, Consolas, monospace',
  /**
   * Monospace système : les courriers, qui ne chargent aucune police, et les données
   * longues où la lisibilité prime sur la matière.
   */
  mono: 'ui-monospace, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
  /** Multiples de 8 seulement : un pixel de la police reste un nombre entier de pixels. */
  size: { xs: 16, sm: 16, md: 16, lg: 16, xl: 24, xxl: 32, display: 48 },
  /** L'interlettrage des capitales — titres, libellés, boutons. */
  caps: "0.12em",
  wordmark: "0.5em",
} as const;

/** Une échelle de 4 en 4 : tout écart d'interface en est un multiple. */
export const SPACE = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32 } as const;

export const MOTION = {
  /**
   * Départ franc, arrivée amortie : la courbe de toutes les entrées. Le pixel est
   * visible, le mouvement jamais saccadé — rien ne s'anime par paliers.
   */
  ease: "cubic-bezier(0.2, 0.7, 0.2, 1)",
  fast: "150ms",
  base: "250ms",
  slow: "420ms",
  /** La respiration des lueurs : une pulsation lente, jamais un clignotement. */
  breath: "3.2s",
} as const;

/** `0xRRGGBB` vers une couleur CSS, avec alpha. */
export function cssColor(color: number, alpha = 1): string {
  const r = (color >> 16) & 0xff;
  const g = (color >> 8) & 0xff;
  const b = color & 0xff;
  return alpha === 1 ? `rgb(${r} ${g} ${b})` : `rgb(${r} ${g} ${b} / ${alpha})`;
}

/**
 * `0xRRGGBB` vers `#rrggbb`, l'alpha **précomposé** sur le fond. C'est le format des
 * courriers : la moitié des clients de messagerie (Outlook en tête) ignorent
 * `rgb(… / alpha)` et la transparence, et retomberaient sur leur couleur par défaut.
 */
export function hexColor(color: number, alpha = 1, over: number = BACKGROUND): string {
  const channel = (shift: number): string => {
    const top = (color >> shift) & 0xff;
    const bottom = (over >> shift) & 0xff;
    return Math.round(top * alpha + bottom * (1 - alpha))
      .toString(16)
      .padStart(2, "0");
  };
  return `#${channel(16)}${channel(8)}${channel(0)}`;
}

/**
 * Les propriétés CSS de la charte, nom → valeur. C'est ce que `generated/tokens.css`
 * pose sur `:root`, et ce que les composants lisent — jamais de valeur en dur dans
 * `styles.css`.
 */
export function cssVariables(): Record<string, string> {
  return {
    "--occ-bg": cssColor(BACKGROUND),
    "--occ-surface": cssColor(SURFACE),
    "--occ-panel": cssColor(SURFACE, PANEL_ALPHA),
    "--occ-matter": cssColor(TERRAIN.top),
    "--occ-matter-peak": cssColor(TERRAIN.peak),
    "--occ-shade": cssColor(TERRAIN.sideShade),
    "--occ-ink": cssColor(INK),
    "--occ-ink-soft": cssColor(INK, INK_ALPHA.soft),
    "--occ-ink-dim": cssColor(INK, INK_ALPHA.dim),
    "--occ-ink-faint": cssColor(INK, INK_ALPHA.faint),
    "--occ-ink-line": cssColor(INK, INK_ALPHA.line),
    "--occ-ink-ghost": cssColor(INK, INK_ALPHA.ghost),
    "--occ-camp-a": cssColor(CAMP.A),
    "--occ-camp-b": cssColor(CAMP.B),
    "--occ-camp-a-glow": cssColor(CAMP.A, 0.35),
    "--occ-camp-b-glow": cssColor(CAMP.B, 0.35),
    "--occ-ink-glow": cssColor(INK, 0.28),
    "--occ-selection-glow": cssColor(STATE.selection, 0.35),
    "--occ-selection": cssColor(STATE.selection),
    "--occ-legal": cssColor(STATE.legalMove),
    "--occ-climb": cssColor(STATE.climb),
    "--occ-threat": cssColor(STATE.threat),
    // Un geste accepté ou refusé est de l'information de partie : il reprend les tokens
    // d'état, pas une couleur d'interface propre.
    "--occ-accepted": cssColor(STATE.legalMove),
    "--occ-refused": cssColor(STATE.threat),
    "--occ-font-pixel": FONT.pixel,
    "--occ-font-mono": FONT.mono,
    "--occ-text-xs": `${FONT.size.xs}px`,
    "--occ-text-sm": `${FONT.size.sm}px`,
    "--occ-text-md": `${FONT.size.md}px`,
    "--occ-text-lg": `${FONT.size.lg}px`,
    "--occ-text-xl": `${FONT.size.xl}px`,
    "--occ-text-xxl": `${FONT.size.xxl}px`,
    "--occ-text-display": `${FONT.size.display}px`,
    "--occ-caps": FONT.caps,
    "--occ-wordmark": FONT.wordmark,
    ...Object.fromEntries(Object.entries(SPACE).map(([step, px]) => [`--occ-space-${step}`, `${px}px`])),
    "--occ-ease": MOTION.ease,
    "--occ-fast": MOTION.fast,
    "--occ-base": MOTION.base,
    "--occ-slow": MOTION.slow,
    "--occ-breath": MOTION.breath,
  };
}

/** Le contenu de `generated/tokens.css`, tel que le script l'écrit et que le test le relit. */
export function tokensStylesheet(): string {
  const lines = Object.entries(cssVariables()).map(([name, value]) => `  ${name}: ${value};`);
  return [
    "/* Généré depuis src/tokens.ts par `pnpm --filter @occulis/ui tokens` — ne pas modifier. */",
    ":root {",
    ...lines,
    "}",
    "",
  ].join("\n");
}
