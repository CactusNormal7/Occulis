import { type FlowEvent, START, type Stage, advance } from "../ui/flow.js";
import type { Settings } from "../ui/settings.js";
import type { Shell } from "../ui/shell.js";

/** Les écrans pleine page, où l'engrenage des réglages n'a pas sa place. */
const FULL_PAGE_STAGES: readonly Stage["kind"][] = ["boot", "deploying", "teams", "debrief"];

/** L'écran courant : `ui/flow.ts` le décide, le shell le montre. */
export class Navigation {
  private current: Stage = START;

  constructor(
    private readonly shell: Pick<Shell, "render">,
    private readonly settings: Pick<Settings, "setAvailable">,
  ) {}

  get stage(): Stage {
    return this.current;
  }

  /** Fait avancer `flow.ts` et réaffiche les écrans. */
  go(event: FlowEvent): void {
    this.current = advance(this.current, event);
    this.shell.render(this.current);
    // Partie comprise : c'est sur le plateau qu'un design se juge.
    this.settings.setAvailable(!FULL_PAGE_STAGES.includes(this.current.kind));
  }

  /** Réaffiche l'écran courant sans le changer, après un changement de langue. */
  render(): void {
    this.shell.render(this.current);
  }
}
