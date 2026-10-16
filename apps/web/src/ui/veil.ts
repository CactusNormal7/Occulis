/**
 * Le voile tramé : un damier d'un pixel sur deux, couleur du vide, qui balaie l'écran de
 * gauche à droite (ui.css, `.theme-veil`). Ce qui change sous lui change pendant qu'il
 * couvre : on ne voit jamais la bascule, seulement le passage du voile.
 *
 * Il sert au changement de thème, pour lequel il a été conçu, et à l'entrée dans la
 * recherche ou la création d'une partie (`shell.ts`). **Le geste est acté tel quel par le
 * porteur du projet** (docs/design.md 8.1) : sa feuille et ses durées sont verrouillées par
 * `veil.test.ts`. Une autre transition qui voudrait s'en écarter prend sa propre classe,
 * elle ne retouche pas celle-ci.
 */

/** Le temps du balayage entier : le voile entre, couvre, puis sort à droite. */
export const VEIL_MS = 520;
/** Le moment où le voile couvre assez l'écran pour qu'on y bascule ce qui est dessous. */
export const VEIL_SWAP_MS = 200;

function prefersStill(): boolean {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Fait passer le voile et appelle `swap` sous lui. Sous mouvement réduit, il n'y a pas de
 * voile et `swap` est appelé tout de suite.
 */
export function sweepVeil(swap: () => void): void {
  if (prefersStill()) {
    swap();
    return;
  }
  const veil = document.createElement("div");
  veil.className = "theme-veil";
  document.body.append(veil);
  window.setTimeout(() => veil.remove(), VEIL_MS + 80);
  window.setTimeout(swap, VEIL_SWAP_MS);
}
