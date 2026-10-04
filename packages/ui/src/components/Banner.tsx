import type { ReactNode } from "react";
import { Icon, type IconName } from "./Icon.js";

export interface BannerProps {
  icon?: IconName | undefined;
  children: ReactNode;
  /** Le geste qui lève l'état signalé, à droite. */
  action?: ReactNode | undefined;
}

/** Un état anormal qui doit se voir : une suspension, un rejeu interrompu. Teinte des refus. */
export function Banner({ icon = "ban", children, action }: BannerProps) {
  return (
    <div className="occ-banner" role="status">
      <Icon name={icon} />
      <span>{children}</span>
      {action}
    </div>
  );
}

export interface EmptyStateProps {
  children: ReactNode;
  action?: ReactNode | undefined;
  /** Le message est une erreur, dans la teinte des refus. */
  error?: boolean | undefined;
}

/** Ce qu'une liste ou une vue dit quand elle n'a rien à montrer. */
export function EmptyState({ children, action, error = false }: EmptyStateProps) {
  return (
    <div className={error ? "occ-empty occ-empty--error" : "occ-empty"}>
      <span>{children}</span>
      {action}
    </div>
  );
}
