import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import "@occulis/ui/styles.css";
import { AccountApp, type AccountAppProps } from "./AccountApp.js";

/**
 * Monte l'îlot de compte dans la page du jeu, comme ceux de la préparation (`prepare/`) et
 * des équipes (`presets/`) ; le menu, l'attente et la partie restent en DOM natif
 * (`ui/shell.ts`). Rendre de nouveau avec d'autres propriétés met l'îlot à jour sans le
 * remonter.
 */
// Rendu synchrone (`flushSync`) : `shell.ts` ne montre l'écran qu'après, et le panneau ne
// doit jamais paraître vide le temps que React dessine le formulaire.
export function mountAccount(host: HTMLElement): (props: AccountAppProps) => void {
  const root = createRoot(host);
  return (props) => flushSync(() => root.render(<AccountApp {...props} />));
}
