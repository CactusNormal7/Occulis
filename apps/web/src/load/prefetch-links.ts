/**
 * Le survol ne précharge qu'après un court arrêt du pointeur : traverser une liste de
 * liens ne lance pas une lecture par ligne. Le focus et l'appui préchargent tout de suite.
 */
const HOVER_PREFETCH_MS = 60;

/**
 * Écoute les liens `href="#…"` de la page et appelle `prefetch` avec le fragment visé. Rend de
 * quoi arrêter d'écouter.
 */
export function prefetchLinks(prefetch: (hash: string) => void): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const hashOf = (event: Event): string | undefined => {
    const link = event.target instanceof Element ? event.target.closest("a[href^='#']") : null;
    const hash = link?.getAttribute("href");
    return hash === null || hash === undefined || hash === location.hash ? undefined : hash;
  };
  const onOver = (event: Event) => {
    clearTimeout(timer);
    const hash = hashOf(event);
    if (hash !== undefined) timer = setTimeout(() => prefetch(hash), HOVER_PREFETCH_MS);
  };
  const now = (event: Event) => {
    const hash = hashOf(event);
    if (hash !== undefined) prefetch(hash);
  };

  document.addEventListener("pointerover", onOver);
  document.addEventListener("pointerdown", now);
  document.addEventListener("focusin", now);
  return () => {
    clearTimeout(timer);
    document.removeEventListener("pointerover", onOver);
    document.removeEventListener("pointerdown", now);
    document.removeEventListener("focusin", now);
  };
}
