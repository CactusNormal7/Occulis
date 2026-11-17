/**
 * Les apparitions au défilement. Sans ce script — ou sous « mouvement réduit » — tout est
 * visible d'emblée : la classe `motion` n'est posée qu'ici, et c'est elle qui cache.
 *
 * Un élément `.reveal` reçoit `is-seen` la première fois qu'il entre
 * à l'écran, et le garde : on ne rejoue pas une apparition en remontant la page.
 */
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

if (!reduced.matches && "IntersectionObserver" in window) {
  document.documentElement.classList.add("motion");
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("is-seen");
        observer.unobserve(entry.target);
      }
    },
    { rootMargin: "0px 0px -12% 0px" },
  );
  for (const element of document.querySelectorAll(".reveal")) observer.observe(element);
  // Passer en « mouvement réduit » en cours de route montre tout, sans attendre.
  reduced.addEventListener("change", () => {
    if (!reduced.matches) return;
    document.documentElement.classList.remove("motion");
    observer.disconnect();
  });
}
