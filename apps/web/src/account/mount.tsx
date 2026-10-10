import { createRoot } from "react-dom/client";
import "@occulis/ui/styles.css";
import { AccountApp, type AccountAppProps } from "./AccountApp.js";

/**
 * Monte l'îlot de compte dans la page du jeu. Seul écran du jeu en React pour l'instant :
 * le menu, l'attente et la partie restent en DOM natif (`ui/shell.ts`). Rendre de
 * nouveau avec d'autres propriétés met l'îlot à jour sans le remonter.
 */
export function mountAccount(host: HTMLElement): (props: AccountAppProps) => void {
  const root = createRoot(host);
  return (props) => root.render(<AccountApp {...props} />);
}
