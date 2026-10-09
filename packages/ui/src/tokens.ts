/**
 * Les tokens de la charte d'Occulis — **seule source** des valeurs de couleur du projet.
 *
 * Le code couleur est acté provisoirement en docs/design.md 8.1 : le blanc porte la
 * géométrie, la couleur porte l'état de jeu. Le fog, le relief et la hiérarchie de
 * l'interface se lisent donc par alpha et par épaisseur de trait, jamais par teinte ; un
 * trait coloré signifie toujours une information de partie (un camp, une sélection, un
 * coup légal, une menace).
 *
 * Deux consommateurs, deux formats :
 * - `apps/web/src/theme.ts` (PixiJS) reprend les entiers 0xRRGGBB ;
 * - les composants de ce paquet lisent les propriétés CSS `--occ-*` de
 *   `generated/tokens.css`, produit depuis ce fichier par `pnpm --filter @occulis/ui
 *   tokens` et verrouillé par un test : il ne se modifie jamais à la main.
 *
 * Une règle ESLint interdit toute valeur de couleur ailleurs, client comme paquet.
 */

/** Le fond, partout : plateau, écrans, back-office. */
export const BACKGROUND = 0x0d0f12;

/** La géométrie — terrain, texte, traits d'interface. */
export const INK = 0xffffff;

/** Couleurs de camp — provisoires, le code couleur définitif reste à arrêter. */
export const CAMP = {
  A: 0x74d3c4,
  B: 0xe0785f,
} as const;

/**
 * Code couleur d'état. Distinct des couleurs de camp par construction : une case mise
 * en avant ne doit jamais se confondre avec une pièce.
 */
export const STATE = {
  selection: 0xf5d76e,
  legalMove: 0x6aa9ff,
  /** Réservé : grimper consomme le tour entier et mériterait un marquage propre. */
  climb: 0x9b8cf0,
  threat: 0xe0785f,
} as const;

/**
 * Les opacités de l'encre blanche, du plus présent au plus discret. L'interface n'a pas
 * d'autre moyen de hiérarchiser : pas de gris, seulement du blanc plus ou moins posé.
 */
export const INK_ALPHA = {
  soft: 0.55,
  dim: 0.35,
  faint: 0.2,
  line: 0.1,
  ghost: 0.05,
} as const;

/** Le voile des panneaux posés sur le plateau : le fond, à peine transparent. */
export const PANEL_ALPHA = 0.82;

export const FONT = {
  /**
   * Monospace système, volontairement : aucune police n'est servie, le client ne doit
   * rien télécharger avant d'afficher un écran.
   */
  mono: 'ui-monospace, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
  size: { xs: 10, sm: 11, md: 13, lg: 15, xl: 20, xxl: 26 },
  /** L'interlettrage des capitales — titres, libellés, boutons. */
  caps: "0.16em",
  wordmark: "5px",
} as const;

/** Une échelle de 4 en 4 : tout écart d'interface en est un multiple. */
export const SPACE = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32 } as const;

export const MOTION = {
  /** Départ franc, arrivée amortie : la courbe de toutes les entrées. */
  ease: "cubic-bezier(0.2, 0.7, 0.2, 1)",
  fast: "150ms",
  base: "250ms",
  slow: "420ms",
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
    "--occ-panel": cssColor(BACKGROUND, PANEL_ALPHA),
    "--occ-ink": cssColor(INK),
    "--occ-ink-soft": cssColor(INK, INK_ALPHA.soft),
    "--occ-ink-dim": cssColor(INK, INK_ALPHA.dim),
    "--occ-ink-faint": cssColor(INK, INK_ALPHA.faint),
    "--occ-ink-line": cssColor(INK, INK_ALPHA.line),
    "--occ-ink-ghost": cssColor(INK, INK_ALPHA.ghost),
    "--occ-camp-a": cssColor(CAMP.A),
    "--occ-camp-b": cssColor(CAMP.B),
    "--occ-selection": cssColor(STATE.selection),
    "--occ-legal": cssColor(STATE.legalMove),
    "--occ-climb": cssColor(STATE.climb),
    "--occ-threat": cssColor(STATE.threat),
    // Un geste accepté ou refusé est de l'information de partie : il reprend les tokens
    // d'état, pas une couleur d'interface propre.
    "--occ-accepted": cssColor(STATE.legalMove),
    "--occ-refused": cssColor(STATE.threat),
    "--occ-font-mono": FONT.mono,
    "--occ-text-xs": `${FONT.size.xs}px`,
    "--occ-text-sm": `${FONT.size.sm}px`,
    "--occ-text-md": `${FONT.size.md}px`,
    "--occ-text-lg": `${FONT.size.lg}px`,
    "--occ-text-xl": `${FONT.size.xl}px`,
    "--occ-text-xxl": `${FONT.size.xxl}px`,
    "--occ-caps": FONT.caps,
    "--occ-wordmark": FONT.wordmark,
    ...Object.fromEntries(Object.entries(SPACE).map(([step, px]) => [`--occ-space-${step}`, `${px}px`])),
    "--occ-ease": MOTION.ease,
    "--occ-fast": MOTION.fast,
    "--occ-base": MOTION.base,
    "--occ-slow": MOTION.slow,
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
