import { createRoot } from "react-dom/client";
import "@occulis/ui/styles.css";
import { Deployment, type DeploymentProps } from "./Deployment.js";
import { MatchFound, type MatchFoundProps } from "./MatchFound.js";

/**
 * Les îlots d'avant-partie, montés dans la page du jeu comme l'écran de compte
 * (`account/mount.tsx`). Rendre de nouveau avec d'autres propriétés met l'îlot à jour sans
 * le remonter ; `undefined` le vide.
 */
export function mountMatchFound(host: HTMLElement): (props: MatchFoundProps | undefined) => void {
  const root = createRoot(host);
  return (props) => root.render(props === undefined ? null : <MatchFound {...props} />);
}

export function mountDeployment(host: HTMLElement): (props: DeploymentProps | undefined) => void {
  const root = createRoot(host);
  return (props) => root.render(props === undefined ? null : <Deployment {...props} />);
}
