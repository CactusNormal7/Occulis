import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import "@occulis/ui/styles.css";
import { DebriefApp, type DebriefAppProps } from "./DebriefApp.js";

/** Monte l'écran de fin dans la page du jeu ; `undefined` le vide. */
export function mountDebrief(host: HTMLElement): (props: DebriefAppProps | undefined) => void {
  const root = createRoot(host);
  return (props) =>
    flushSync(() => root.render(props === undefined ? null : <DebriefApp {...props} />));
}
