import { useLayoutEffect } from "react";

/**
 * L'arrivée d'une page React (profil, back-office) depuis une autre page du site.
 *
 * Le fondu entre pages (`@view-transition`, `criticalHead()`) part de la **première image**
 * de la page d'arrivée, prête ou non. Sans précaution, il fondait donc l'ancienne page vers
 * un écran vide — les données n'étant pas encore arrivées —, puis l'écran entier surgissait :
 * un clignotement. Deux défenses :
 *
 * - les liens de ces pages sont pré-rendus au survol (règles de spéculation) : au clic,
 *   la page est déjà complète et le fondu va d'un écran entier à l'autre ;
 * - sinon (clic sans survol, pré-rendu refusé), `guardPageReveal()` annule le fondu quand
 *   l'écran n'est pas complet : mieux vaut une coupure franche qu'un fondu vers le vide.
 */
let screenShown = false;

/**
 * Posé à l'intérieur de la frontière `Suspense` de la page : son effet ne s'exécute que
 * lorsque l'écran entier est monté, jamais sur le repli.
 */
export function ScreenReady(): null {
  useLayoutEffect(() => {
    screenShown = true;
  }, []);
  return null;
}

/**
 * À appeler avant tout rendu : `pagereveal` part avec la première image, et le script
 * d'entrée doit donc bloquer le rendu (`blocking="render"` dans le HTML) pour l'écouter
 * à temps. Une page pré-rendue ne la reçoit qu'à son activation, écran déjà monté.
 */
export function guardPageReveal(): void {
  window.addEventListener("pagereveal", (event) => {
    const fontsReady = document.fonts.status === "loaded";
    if (event.viewTransition !== null && !(screenShown && fontsReady))
      event.viewTransition.skipTransition();
  });
}
