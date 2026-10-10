import type { ReactNode } from "react";
import { cx } from "../cx.js";

export interface BadgeProps {
  /**
   * `plain` et `strong` : blanc estompé ou franc. `dim` : un état secondaire. `refused` :
   * un refus ou une sanction. `A` / `B` : la couleur d'un camp — seulement quand la
   * pastille dit quelque chose d'une partie (un vainqueur, un siège).
   */
  tone?: "plain" | "strong" | "dim" | "refused" | "A" | "B" | undefined;
  children: ReactNode;
}

/** Une pastille d'état : capitales, cadre fin, angles vifs. */
export function Badge({ tone = "plain", children }: BadgeProps) {
  return <span className={cx("occ-badge", `occ-badge--${tone}`)}>{children}</span>;
}

/** Une rangée de pastilles. */
export function BadgeRow({ children }: { children: ReactNode }) {
  return <span className="occ-badge-row">{children}</span>;
}
