import type { Locale } from "@occulis/i18n";
import { mountDebrief } from "../debrief/mount.js";
import type { DebriefAppProps } from "../debrief/DebriefApp.js";
import { mountEndScreen } from "../end/mount.js";
import type { EndScreenProps } from "../end/EndScreen.js";
import { mountLeaveMatch } from "../leave/mount.js";
import type { LeaveMatchProps } from "../leave/LeaveMatch.js";
import { currentLocale } from "../locale/current.js";
import { mountDeployment, mountMatchFound } from "../prepare/mount.js";
import type { DeploymentProps } from "../prepare/Deployment.js";
import type { MatchFoundProps } from "../prepare/MatchFound.js";
import { mountTeams } from "../presets/mount.js";
import type { TeamsAppProps } from "../presets/TeamsApp.js";
import { element } from "./page.js";

/** Les propriétés d'un îlot, la langue en moins : c'est le rendu qui l'ajoute. */
type WithoutLocale<P> = Omit<P, "locale">;

export type LeaveDialog = WithoutLocale<LeaveMatchProps>;
export type EndScreen = WithoutLocale<EndScreenProps>;
export type DebriefScreen = WithoutLocale<DebriefAppProps>;
export type MatchFound = WithoutLocale<MatchFoundProps>;
export type DeploymentAnnouncement = WithoutLocale<DeploymentProps>;
export type TeamsScreen = WithoutLocale<TeamsAppProps>;

/**
 * Où chaque îlot lit ses propriétés. Chacune est tenue par le module qui la fait vivre ;
 * `undefined` vide l'îlot.
 */
export interface IslandSources {
  readonly leave: () => LeaveDialog | undefined;
  readonly ended: () => EndScreen | undefined;
  readonly found: () => MatchFound | undefined;
  readonly deploying: () => DeploymentAnnouncement | undefined;
  readonly teams: () => TeamsScreen | undefined;
  readonly debrief: () => DebriefScreen | undefined;
}

/**
 * Les îlots React de la page du jeu, hors compte : quitter la partie, fin d'une partie
 * regardée, partie trouvée, déploiement, équipes et écran de fin. Un rendu les redessine tous — après un message comme après un
 * changement de langue.
 */
export class Islands {
  private readonly renderLeave = mountLeaveMatch(element<HTMLElement>("leave-root"));
  private readonly renderEnd = mountEndScreen(element<HTMLElement>("end-root"));
  private readonly renderFound = mountMatchFound(element<HTMLElement>("match-found-root"));
  private readonly renderDeployment = mountDeployment(element<HTMLElement>("deploy-root"));
  private readonly renderTeams = mountTeams(element<HTMLElement>("teams-root"));
  private readonly renderDebrief = mountDebrief(element<HTMLElement>("debrief-root"));

  constructor(private readonly sources: IslandSources) {}

  render(): void {
    const locale = currentLocale();
    this.renderLeave(withLocale(this.sources.leave(), locale));
    this.renderEnd(withLocale(this.sources.ended(), locale));
    this.renderFound(withLocale(this.sources.found(), locale));
    this.renderDeployment(withLocale(this.sources.deploying(), locale));
    this.renderTeams(withLocale(this.sources.teams(), locale));
    this.renderDebrief(withLocale(this.sources.debrief(), locale));
  }
}

function withLocale<P>(props: P | undefined, locale: Locale): (P & { locale: Locale }) | undefined {
  if (props === undefined) return undefined;
  return { ...props, locale };
}
