import type { SVGProps } from "react";

/**
 * Les icônes d'Occulis : des tracés au trait sur une grille de 24, sans remplissage, dans
 * la ligne du plateau filaire. `currentColor` les fait suivre la couleur de leur parent —
 * aucune couleur ici.
 */

type Shape = { readonly d: string } | { readonly circle: readonly [number, number, number] };

const SHIELD = "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z";

const ICONS = {
  eye: [{ d: "M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" }, { circle: [12, 12, 3] }],
  eyeOff: [
    { d: "M3 3l18 18" },
    { d: "M10.6 5.1A10.4 10.4 0 0 1 12 5c6.4 0 10 7 10 7a17.6 17.6 0 0 1-3.1 4" },
    { d: "M6.6 6.6C3.7 8.4 2 12 2 12s3.6 7 10 7a9.7 9.7 0 0 0 5.4-1.6" },
    { d: "M9.9 9.9a3 3 0 0 0 4.2 4.2" },
  ],
  check: [{ d: "M5 12l5 5 9-10" }],
  user: [{ circle: [12, 8, 4] }, { d: "M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" }],
  link: [{ d: "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" }, { d: "M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" }],
  mail: [{ d: "M3 6h18v12H3z" }, { d: "M3 7l9 6 9-6" }],
  shield: [{ d: SHIELD }, { d: "M9 12l2 2 4-4" }],
  ban: [{ circle: [12, 12, 9] }, { d: "M5.6 5.6l12.8 12.8" }],
  unban: [{ circle: [12, 12, 9] }, { d: "M8 12l3 3 5-6" }],
  impersonate: [{ circle: [9, 8, 4] }, { d: "M2 21c0-4 3-7 7-7s7 3 7 7" }, { d: "M17 9h5M20 7l2 2-2 2" }],
  logout: [{ d: "M9 21H5V3h4" }, { d: "M16 17l5-5-5-5" }, { d: "M21 12H9" }],
  trash: [{ d: "M4 7h16" }, { d: "M9 7V4h6v3" }, { d: "M6 7l1 13h10l1-13" }],
  key: [{ circle: [8, 15, 4] }, { d: "M11 12l9-9" }, { d: "M17 6l3 3" }],
  pencil: [{ d: "M4 20h4L19 9l-4-4L4 16z" }],
  plus: [{ d: "M12 5v14M5 12h14" }],
  close: [{ d: "M6 6l12 12M18 6L6 18" }],
  search: [{ circle: [11, 11, 7] }, { d: "M20 20l-4-4" }],
  copy: [{ d: "M9 9h11v11H9z" }, { d: "M5 15H4V4h11v1" }],
  previous: [{ d: "M15 6l-6 6 6 6" }],
  next: [{ d: "M9 6l6 6-6 6" }],
  first: [{ d: "M17 6l-6 6 6 6" }, { d: "M7 6v12" }],
  last: [{ d: "M7 6l6 6-6 6" }, { d: "M17 6v12" }],
  play: [{ d: "M8 5l11 7-11 7z" }],
  pause: [{ d: "M8 5v14M16 5v14" }],
  rotateLeft: [{ d: "M4 4v5h5" }, { d: "M4.6 9A8 8 0 1 1 4 13" }],
  rotateRight: [{ d: "M20 4v5h-5" }, { d: "M19.4 9A8 8 0 1 0 20 13" }],
  /** Le cube filaire du menu : la marque du jeu. */
  cube: [{ d: "M12 3l8 4-8 4-8-4z" }, { d: "M4 7v9l8 4 8-4V7" }, { d: "M12 11v9" }],
} satisfies Record<string, readonly Shape[]>;

export type IconName = keyof typeof ICONS;

export const ICON_NAMES = Object.keys(ICONS) as IconName[];

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, "children"> {
  /** Le nom de l'icône, parmi `ICON_NAMES`. */
  name: IconName;
  /** Côté en pixels. 16 par défaut, la taille des boutons à icône. */
  size?: number | undefined;
}

/** Une icône au trait, en `currentColor`. Décorative : son libellé est porté par le bouton qui la contient. */
export function Icon({ name, size = 16, className, ...rest }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      className={className === undefined ? "occ-icon" : `occ-icon ${className}`}
      {...rest}
    >
      {(ICONS[name] as readonly Shape[]).map((shape, index) =>
        "d" in shape ? (
          <path key={index} d={shape.d} />
        ) : (
          <circle key={index} cx={shape.circle[0]} cy={shape.circle[1]} r={shape.circle[2]} />
        ),
      )}
    </svg>
  );
}
