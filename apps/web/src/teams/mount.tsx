import { createRoot } from "react-dom/client";
import "@occulis/ui/styles.css";
import { TeamsApp, type TeamsAppProps } from "./TeamsApp.js";

/** Monte l'écran des équipes dans la page du jeu ; `undefined` le vide. */
export function mountTeams(host: HTMLElement): (props: TeamsAppProps | undefined) => void {
  const root = createRoot(host);
  return (props) => root.render(props === undefined ? null : <TeamsApp {...props} />);
}
