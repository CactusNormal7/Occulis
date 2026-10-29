import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import "@occulis/ui/styles.css";
import { EndScreen, type EndScreenProps } from "./EndScreen.js";

/** L'îlot de fin de partie, monté dans la page du jeu ; `undefined` le vide. */
export function mountEndScreen(host: HTMLElement): (props: EndScreenProps | undefined) => void {
  const root = createRoot(host);
  return (props) =>
    flushSync(() => root.render(props === undefined ? null : <EndScreen {...props} />));
}
