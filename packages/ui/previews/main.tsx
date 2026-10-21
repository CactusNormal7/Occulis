/**
 * L'entrée de la page du labo de la refonte graphique (docs/design/refonte-graphique.md).
 * Servie par le serveur de développement du client sous `/lab/` (`apps/web/lab/`), et par
 * `build:local` ; jamais par le build de production.
 *
 * Une fonction et non un module à effet : `@occulis/ui` se déclare sans effet de bord hors
 * CSS (`sideEffects`), et le build élaguerait un simple `import` de ce fichier — la page
 * construite serait vide, alors que le serveur de développement, qui n'élague rien, l'affiche.
 */
import { createRoot } from "react-dom/client";
import "../src/styles.css";
import "../src/lab/lab.css";
import { Lab } from "./Lab.js";

export function mountLab(host: HTMLElement | null): void {
  if (host !== null) createRoot(host).render(<Lab />);
}
