/**
 * Les icônes du back-office : des tracés au trait, sans remplissage, dans la ligne du
 * plateau filaire. `currentColor` les fait suivre la couleur du bouton qui les porte —
 * aucune couleur ici, comme partout hors de `theme.ts`.
 */

const SVG = "http://www.w3.org/2000/svg";

type Shape = { readonly d: string } | { readonly circle: readonly [number, number, number] };

const SHIELD = "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z";

const ICONS = {
  eye: [{ d: "M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" }, { circle: [12, 12, 3] }],
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
  back: [{ d: "M15 6l-6 6 6 6" }],
  previous: [{ d: "M15 6l-6 6 6 6" }],
  next: [{ d: "M9 6l6 6-6 6" }],
  first: [{ d: "M17 6l-6 6 6 6" }, { d: "M7 6v12" }],
  last: [{ d: "M7 6l6 6-6 6" }, { d: "M17 6v12" }],
  play: [{ d: "M8 5l11 7-11 7z" }],
  pause: [{ d: "M8 5v14M16 5v14" }],
  rotateLeft: [{ d: "M4 4v5h5" }, { d: "M4.6 9A8 8 0 1 1 4 13" }],
  rotateRight: [{ d: "M20 4v5h-5" }, { d: "M19.4 9A8 8 0 1 0 20 13" }],
  /** Le cube filaire du menu : la marque du jeu, reprise dans l'en-tête. */
  cube: [{ d: "M12 3l8 4-8 4-8-4z" }, { d: "M4 7v9l8 4 8-4V7" }, { d: "M12 11v9" }],
} satisfies Record<string, readonly Shape[]>;

export type IconName = keyof typeof ICONS;

export function icon(name: IconName): SVGSVGElement {
  const svg = document.createElementNS(SVG, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("class", "icon");
  for (const shape of ICONS[name] as readonly Shape[]) {
    const element =
      "d" in shape ? document.createElementNS(SVG, "path") : document.createElementNS(SVG, "circle");
    if ("d" in shape) element.setAttribute("d", shape.d);
    else {
      const [cx, cy, r] = shape.circle;
      element.setAttribute("cx", String(cx));
      element.setAttribute("cy", String(cy));
      element.setAttribute("r", String(r));
    }
    svg.append(element);
  }
  return svg;
}
