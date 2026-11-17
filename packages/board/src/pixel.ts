/**
 * Le pixel du plateau. Module pur : ni PixiJS, ni DOM.
 *
 * Le plateau est rendu dans une image plus petite que l'écran, puis agrandie au plus
 * proche voisin (docs/design.md 8.1) : le pixel se voit, mais il reste fin. Sa taille
 * est fixée en **pixels physiques** et non en pixels CSS, pour qu'il ait le même grain
 * sur un écran ordinaire et sur un écran dense — et que l'agrandissement tombe toujours
 * sur un nombre entier de pixels physiques, sans quoi l'image baverait.
 */

/** Côté d'un pixel du plateau, en pixels physiques. */
export const ART_PIXEL = 2;

/**
 * La résolution du rendu, au sens de PixiJS (pixels du tampon par pixel CSS). À 1 sur un
 * écran ordinaire, le tampon fait la moitié de l'écran ; à 2 sur un écran dense, il en
 * fait la taille CSS, chaque pixel du plateau couvrant alors deux pixels physiques.
 */
export function pixelResolution(devicePixelRatio: number): number {
  const ratio = Number.isFinite(devicePixelRatio) && devicePixelRatio > 0 ? devicePixelRatio : 1;
  return ratio / ART_PIXEL;
}

/** Arrondit une coordonnée à la grille des pixels du plateau (`unit` : un pixel, en unités logiques). */
export function snap(value: number, unit: number): number {
  return Math.round(value / unit) * unit;
}

/** Mélange deux couleurs `0xRRGGBB` : `t = 0` rend `from`, `t = 1` rend `to`. */
export function mixColor(from: number, to: number, t: number): number {
  const k = Math.min(1, Math.max(0, t));
  let mixed = 0;
  for (const shift of [16, 8, 0]) {
    const a = (from >> shift) & 255;
    const b = (to >> shift) & 255;
    mixed |= Math.round(a + (b - a) * k) << shift;
  }
  return mixed;
}

/**
 * La respiration des lueurs : 0 → 1 → 0 sur une période, en sinus. Une pulsation et
 * non un clignotement — rien ne change d'état par paliers.
 */
export function breath(timeMs: number, periodMs: number): number {
  return 0.5 - 0.5 * Math.cos((2 * Math.PI * timeMs) / periodMs);
}
