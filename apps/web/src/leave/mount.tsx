import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import "@occulis/ui/styles.css";
import { LeaveMatch, type LeaveMatchProps } from "./LeaveMatch.js";

/** L'îlot « quitter la partie », monté dans la page du jeu ; `undefined` le vide. */
export function mountLeaveMatch(host: HTMLElement): (props: LeaveMatchProps | undefined) => void {
  const root = createRoot(host);
  return (props) =>
    flushSync(() => root.render(props === undefined ? null : <LeaveMatch {...props} />));
}
