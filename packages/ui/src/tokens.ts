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
 * - `apps/web/src/theme/theme.ts` (PixiJS) reprend les entiers 0xRRGGBB ;
 * - les composants de ce paquet lisent les propriétés CSS `--occ-*` de
 *   `generated/tokens.css`, produit depuis ce fichier par `pnpm --filter @occulis/ui
 *   tokens` et verrouillé par un test : il ne se modifie jamais à la main.
 *
 * Une règle ESLint interdit toute valeur de couleur ailleurs, client comme paquet.
 */

/**
 * Une palette complète : tout ce qui porte une couleur, pour un thème. Le jeu en propose
 * plusieurs, entre lesquels le joueur bascule depuis le menu (`THEMES`) ; tous gardent la
 * même grammaire — vide, os, lueurs — et ne changent que la matière et la lumière.
 */
export interface Palette {
  /** Le vide : le fond du plateau et des pages. */
  readonly background: number;
  /** La surface des panneaux, un cran au-dessus du vide. */
  readonly surface: number;
  /** L'os : géométrie, texte, traits d'interface. */
  readonly ink: number;
  /**
   * La matière du plateau. Le dessus s'éclaircit avec la hauteur (`top` → `peak`) ; les
   * falaises ont une face éclairée et une face d'ombre ; `fog` est le dessus d'une case
   * hors de vue, tramé par-dessus.
   */
  readonly terrain: {
    readonly top: number;
    readonly peak: number;
    readonly fog: number;
    readonly sideLight: number;
    readonly sideShade: number;
  };
  /** Couleurs de camp — provisoires, le code couleur définitif reste à arrêter. */
  readonly camp: { readonly A: number; readonly B: number };
  /**
   * Code couleur d'état. Distinct des couleurs de camp par construction : une case mise
   * en avant ne doit jamais se confondre avec une pièce.
   */
  readonly state: {
    readonly selection: number;
    readonly legalMove: number;
    /** Réservé : grimper consomme le tour entier et mériterait un marquage propre. */
    readonly climb: number;
    readonly threat: number;
  };
  /** Le ciel : la couleur des étoiles et de la lumière d'ambiance (nébuleuse, lucioles). */
  readonly sky: { readonly star: number; readonly aura: number };
}

/**
 * Les thèmes (docs/design.md 8.1). Trois propositions, toutes noires et non plus
 * bleutées, sous la même grammaire :
 * - **obsidian** — le noir de *Void Stranger* : matière grise et neutre, os froid, lueurs
 *   glacées et rouges. Le plus sévère ;
 * - **reliquary** — la chaleur d'*Animal Well* : un noir brun, un os doré, des lucioles et
 *   un sceau d'or sous le plateau ;
 * - **astral** — le ciel d'*Helix* : un noir à peine prune, une voûte dense d'étoiles, des
 *   constellations et des étoiles filantes, des lueurs cyan et magenta.
 */
export const THEMES = {
  obsidian: {
    background: 0x050505,
    surface: 0x0d0d0e,
    ink: 0xe9e6df,
    terrain: { top: 0x1a1a1c, peak: 0x3d3d42, fog: 0x0b0b0c, sideLight: 0x131315, sideShade: 0x09090a },
    camp: { A: 0x9be7ff, B: 0xff4d5e },
    state: { selection: 0xffd166, legalMove: 0x7d9cff, climb: 0xc49bff, threat: 0xff4d5e },
    sky: { star: 0xe9e6df, aura: 0x2a2a30 },
  },
  reliquary: {
    background: 0x070504,
    surface: 0x110c09,
    ink: 0xf2dcb0,
    terrain: { top: 0x1e1610, peak: 0x4d3721, fog: 0x0c0806, sideLight: 0x18110b, sideShade: 0x0d0906 },
    camp: { A: 0x72f5c4, B: 0xff7a45 },
    state: { selection: 0xfff0a0, legalMove: 0x5ec8ff, climb: 0xd49bff, threat: 0xff7a45 },
    sky: { star: 0xf2dcb0, aura: 0x8fe8a0 },
  },
  astral: {
    background: 0x040307,
    surface: 0x0d0a12,
    ink: 0xece6ff,
    terrain: { top: 0x17121f, peak: 0x3e2b54, fog: 0x09070d, sideLight: 0x120e19, sideShade: 0x0a0810 },
    camp: { A: 0x5ef0ff, B: 0xff4fd8 },
    state: { selection: 0xffe066, legalMove: 0x8b7bff, climb: 0xb98bff, threat: 0xff4fd8 },
    sky: { star: 0xece6ff, aura: 0x6b3fa0 },
  },
} as const satisfies Record<string, Palette>;

export type ThemeName = keyof typeof THEMES;

/** Le thème d'un premier passage, et celui des courriers et de la première image d'une page. */
export const DEFAULT_THEME: ThemeName = "obsidian";

export const THEME_NAMES = Object.keys(THEMES) as ThemeName[];

export function isThemeName(value: unknown): value is ThemeName {
  return typeof value === "string" && Object.hasOwn(THEMES, value);
}

const DEFAULT_PALETTE: Palette = THEMES[DEFAULT_THEME];

/** Le vide du thème par défaut. Les courriers et la première image d'une page le lisent. */
export const BACKGROUND = DEFAULT_PALETTE.background;
export const SURFACE = DEFAULT_PALETTE.surface;
export const INK = DEFAULT_PALETTE.ink;
export const TERRAIN = DEFAULT_PALETTE.terrain;
export const CAMP = DEFAULT_PALETTE.camp;
export const STATE = DEFAULT_PALETTE.state;

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
 * Les propriétés CSS de la charte pour un thème, nom → valeur. C'est ce que `generated/tokens.css`
 * pose sur `:root`, et ce que les composants lisent — jamais de valeur en dur dans
 * `styles.css`.
 */
export function cssVariables(theme: ThemeName = DEFAULT_THEME): Record<string, string> {
  return paletteVariables(THEMES[theme]);
}

/**
 * Les propriétés CSS d'une palette quelconque. `cssVariables()` la sert pour chaque thème ;
 * le design system du back-office s'en sert pour une palette retouchée à la main, qu'il
 * pose à chaud sur la page sans rien écrire nulle part.
 */
export function paletteVariables(palette: Palette): Record<string, string> {
  const { background, surface, ink, terrain, camp, state, sky } = palette;
  return {
    "--occ-bg": cssColor(background),
    "--occ-surface": cssColor(surface),
    "--occ-panel": cssColor(surface, PANEL_ALPHA),
    "--occ-matter": cssColor(terrain.top),
    "--occ-matter-peak": cssColor(terrain.peak),
    "--occ-shade": cssColor(terrain.sideShade),
    "--occ-ink": cssColor(ink),
    "--occ-ink-soft": cssColor(ink, INK_ALPHA.soft),
    "--occ-ink-dim": cssColor(ink, INK_ALPHA.dim),
    "--occ-ink-faint": cssColor(ink, INK_ALPHA.faint),
    "--occ-ink-line": cssColor(ink, INK_ALPHA.line),
    "--occ-ink-ghost": cssColor(ink, INK_ALPHA.ghost),
    "--occ-camp-a": cssColor(camp.A),
    "--occ-camp-b": cssColor(camp.B),
    "--occ-camp-a-glow": cssColor(camp.A, 0.35),
    "--occ-camp-b-glow": cssColor(camp.B, 0.35),
    "--occ-ink-glow": cssColor(ink, 0.28),
    "--occ-star": cssColor(sky.star, 0.5),
    "--occ-star-faint": cssColor(sky.star, 0.22),
    "--occ-aura": cssColor(sky.aura, 0.16),
    "--occ-selection-glow": cssColor(state.selection, 0.35),
    "--occ-selection": cssColor(state.selection),
    "--occ-legal": cssColor(state.legalMove),
    "--occ-climb": cssColor(state.climb),
    "--occ-threat": cssColor(state.threat),
    // Un geste accepté ou refusé est de l'information de partie : il reprend les tokens
    // d'état, pas une couleur d'interface propre.
    "--occ-accepted": cssColor(state.legalMove),
    "--occ-refused": cssColor(state.threat),
    // Les échantillons de chaque thème, identiques sous tous les thèmes : le sélecteur
    // montre chaque proposition dans ses propres couleurs.
    ...Object.fromEntries(
      THEME_NAMES.flatMap((name) => {
        const other: Palette = THEMES[name];
        return [
          [`--occ-swatch-${name}-bg`, cssColor(other.terrain.top)],
          [`--occ-swatch-${name}-ink`, cssColor(other.ink)],
          [`--occ-swatch-${name}-a`, cssColor(other.camp.A)],
          [`--occ-swatch-${name}-b`, cssColor(other.camp.B)],
        ];
      }),
    ),
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

/*
 * ---- Proposition de refonte — non intégrée ---------------------------------------------
 *
 * Les tokens que la refonte graphique ajoute (docs/design/refonte-graphique.md). Ils ne
 * sortent pas dans `generated/tokens.css`, donc dans aucun écran : `proposedStylesheet()`
 * les écrit à part, dans `generated/proposed-tokens.css`, que seuls le labo
 * (`src/lab/`) et ses aperçus (`previews/`) importent. À la validation de la direction,
 * ils rejoignent `cssVariables()` et ce bloc disparaît.
 *
 * Trois étages, pour qu'une surcharge à l'exécution (globale ou par compte, depuis le
 * back-office) n'ait qu'à poser quelques propriétés sur `:root` :
 * - **les valeurs** (ici) : durées en millisecondes, courbes, pas de grille ;
 * - **les rôles** (`--occ-dur-window`, `--occ-paper`…) : ce que les feuilles lisent. Une
 *   couleur de rôle n'est jamais une valeur, toujours une propriété du thème
 *   (`var(--occ-ink)`), pour qu'un changement de thème la suive ;
 * - **les boutons** (`--occ-tempo`, `--occ-motion-amplitude`, `--occ-motion-loop`) : les
 *   seuls réglages d'une surcharge. Chaque durée de rôle est multipliée par `--occ-tempo`.
 */

/** Les niveaux d'intensité du mouvement, du plus vif au plus calme. */
export const MOTION_LEVEL_NAMES = ["full", "calm", "still"] as const;
export type MotionLevel = (typeof MOTION_LEVEL_NAMES)[number];

export function isMotionLevel(value: unknown): value is MotionLevel {
  return typeof value === "string" && (MOTION_LEVEL_NAMES as readonly string[]).includes(value);
}

export const PROPOSED = {
  /** Les écarts d'écran (entre blocs d'une page, autour d'un plateau), au-delà de `SPACE`. */
  space: { 10: 40, 12: 48, 16: 64 },
  /** L'interligne : serré pour un titre, ample pour une notice. */
  leading: { tight: 1.25, base: 1.5, loose: 1.75 },
  /**
   * Les durées par rôle, en millisecondes, avant `--occ-tempo`. `window` et `screen` sont
   * celles de `revealWindow()` et du voile tramé : notées ici pour que la grammaire soit
   * complète, sans que ni l'un ni l'autre ne les lise encore (le voile est verrouillé).
   */
  duration: {
    /** Un pas de glyphe qui se transforme. */
    tick: 70,
    /** Un retour de survol, un appui. */
    fast: 150,
    /** Une fenêtre qu'un clic ouvre (`revealWindow`). */
    window: 220,
    base: 250,
    slow: 420,
    /** Le voile tramé entre deux écrans. */
    screen: 520,
    /** Une chaîne cryptique qui devient lisible. */
    decode: 900,
    /** L'inversion « papier », pleinement posée, avant sa résorption. */
    hold: 700,
    /** La résorption de l'inversion. */
    resorb: 600,
    breath: 3200,
    /** Le retard par case d'une vague : la ligne de vue qui se déploie depuis une pièce. */
    wave: 45,
    /** Le retard par case d'une cascade : les destinations d'une pièce sélectionnée. */
    cascade: 38,
  },
  /**
   * Les distances parcourues, en pixels, avant `--occ-motion-amplitude` : une entrée qui
   * monte (`rise`), une pièce qui s'élève à la sélection (`lift`), le sommet d'un saut (`hop`).
   */
  distance: { rise: 8, lift: 3, hop: 14 },
  /** Les images rémanentes d'un saut : leur nombre, et le retard de l'une sur l'autre (part du saut). */
  trail: { count: 3, lag: 0.09 },
  /**
   * Les courbes, par geste. `out` est `MOTION.ease` : une entrée. `in` une sortie, qui part
   * lentement et file. `inOut` un trajet (un saut de pièce). `sweep` un front qui se propage :
   * presque linéaire, pour que la vitesse se lise.
   */
  easing: {
    out: MOTION.ease,
    in: "cubic-bezier(0.55, 0, 0.8, 0.3)",
    inOut: "cubic-bezier(0.65, 0, 0.35, 1)",
    sweep: "cubic-bezier(0.3, 0.1, 0.4, 1)",
  },
  /**
   * Ce que chaque niveau d'intensité règle. `amplitude` multiplie les distances parcourues
   * (une montée de 8 px devient 3 px en `calm`, rien en `still`) ; `loop` met en pause les
   * boucles décoratives (étoiles, glyphes qui frémissent) ; `scramble` laisse les glyphes
   * se brouiller avant de céder leur lettre. `still` est aussi ce que `prefers-reduced-motion`
   * impose : plus rien ne se déplace, les changements passent en fondu.
   */
  motion: {
    full: { amplitude: 1, loop: "running", scramble: true },
    calm: { amplitude: 0.4, loop: "paused", scramble: false },
    still: { amplitude: 0, loop: "paused", scramble: false },
  },
  /** L'alphabet cryptique : une case de glyphe, son trait, et l'os qui le porte. */
  cipher: {
    /** Le côté d'un pas de la grille du glyphe : un pixel du plateau. */
    unit: 1,
    stroke: 1,
    /** Le temps moyen entre deux frémissements d'un glyphe en ornement. */
    flicker: 1400,
  },
  /** L'inversion « papier millimétré ». */
  paper: {
    /** Le pas du quadrillage de points, en pixels. */
    grid: 8,
    /** Le côté d'un point. */
    dot: 2,
    /** La vitesse du front, en pixels par seconde. */
    speed: 900,
    /** La résorption : `dither` (trame qui s'éteint), `recede` (le front repart), `none`. */
    resorb: "dither",
  },
} as const;

export type PaperResorb = "dither" | "recede" | "none";

/** Une durée de rôle, multipliée par le bouton de tempo. */
function tempoed(ms: number): string {
  return `calc(${ms}ms * var(--occ-tempo))`;
}

/** Les propriétés d'un niveau d'intensité : celles que `data-motion` bascule. */
export function motionLevelVariables(level: MotionLevel): Record<string, string> {
  const { amplitude, loop } = PROPOSED.motion[level];
  return {
    "--occ-motion-level": level,
    "--occ-motion-amplitude": String(amplitude),
    "--occ-motion-loop": loop,
  };
}

/**
 * Les propriétés proposées, nom → valeur, posées sur `:root` par `proposed-tokens.css`.
 * Aucune n'est une couleur : les rôles colorés renvoient aux propriétés du thème.
 */
export function proposedVariables(): Record<string, string> {
  const { space, leading, duration, distance, easing, cipher, paper } = PROPOSED;
  return {
    "--occ-tempo": "1",
    ...motionLevelVariables("full"),
    ...Object.fromEntries(Object.entries(space).map(([step, px]) => [`--occ-space-${step}`, `${px}px`])),
    ...Object.fromEntries(Object.entries(leading).map(([name, value]) => [`--occ-leading-${name}`, String(value)])),
    ...Object.fromEntries(Object.entries(duration).map(([name, ms]) => [`--occ-dur-${name}`, tempoed(ms)])),
    ...Object.fromEntries(
      Object.entries(distance).map(([name, px]) => [`--occ-dist-${name}`, `calc(${px}px * var(--occ-motion-amplitude))`]),
    ),
    "--occ-ease-out": easing.out,
    "--occ-ease-in": easing.in,
    "--occ-ease-in-out": easing.inOut,
    "--occ-ease-sweep": easing.sweep,
    "--occ-cipher-unit": `${cipher.unit}px`,
    "--occ-cipher-stroke": `${cipher.stroke}px`,
    "--occ-cipher-ink": "var(--occ-ink-soft)",
    "--occ-cipher-ink-faint": "var(--occ-ink-faint)",
    "--occ-dur-flicker": tempoed(cipher.flicker),
    // Le papier est l'os, ses points sont le vide : une inversion exacte du thème, sans
    // aucune couleur propre.
    "--occ-paper": "var(--occ-ink)",
    "--occ-paper-dot": "var(--occ-bg)",
    "--occ-paper-grid": `${paper.grid}px`,
    "--occ-paper-dot-size": `${paper.dot}px`,
    "--occ-paper-speed": String(paper.speed),
    "--occ-paper-resorb": paper.resorb,
  };
}

/**
 * Le contenu de `generated/proposed-tokens.css`. Les niveaux d'intensité se basculent par
 * `data-motion` sur la racine ; `prefers-reduced-motion` impose `still` **par-dessus** tout
 * choix explicite — le réglage du système d'exploitation est un plafond, pas une valeur
 * par défaut (point ouvert dans docs/design/refonte-graphique.md).
 */
export function proposedStylesheet(): string {
  const declarations = (variables: Record<string, string>): string[] =>
    Object.entries(variables).map(([name, value]) => `  ${name}: ${value};`);
  return [
    "/* Généré depuis src/tokens.ts (PROPOSED) par `pnpm --filter @occulis/ui tokens` — ne pas modifier.",
    "   Proposition de refonte, importée par le seul labo (src/lab/lab.css). */",
    ":root {",
    ...declarations(proposedVariables()),
    "}",
    ...MOTION_LEVEL_NAMES.filter((level) => level !== "full").flatMap((level) => [
      `:root[data-motion="${level}"] {`,
      ...declarations(motionLevelVariables(level)),
      "}",
    ]),
    "@media (prefers-reduced-motion: reduce) {",
    "  :root,",
    "  :root[data-motion] {",
    ...declarations(motionLevelVariables("still")).map((line) => `  ${line}`),
    "  }",
    "}",
    "",
  ].join("\n");
}

/**
 * Le contenu de `generated/tokens.css` : le thème par défaut sur `:root`, puis chaque
 * thème sous `:root[data-theme="…"]`, que le bloc critique pose avant la première image.
 */
export function tokensStylesheet(): string {
  const block = (selector: string, theme: ThemeName): string[] => [
    `${selector} {`,
    ...Object.entries(cssVariables(theme)).map(([name, value]) => `  ${name}: ${value};`),
    "}",
  ];
  return [
    "/* Généré depuis src/tokens.ts par `pnpm --filter @occulis/ui tokens` — ne pas modifier. */",
    ...block(":root", DEFAULT_THEME),
    ...THEME_NAMES.flatMap((theme) => block(`:root[data-theme="${theme}"]`, theme)),
    "",
  ].join("\n");
}
