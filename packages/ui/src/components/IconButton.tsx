import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "../cx.js";
import { Icon, type IconName } from "./Icon.js";

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  icon: IconName;
  /** Le libellé accessible, montré en infobulle au survol. Obligatoire : une icône seule ne dit rien. */
  label: string;
  /** Le geste est destructeur : la teinte des refus au survol. */
  danger?: boolean | undefined;
  /**
   * Rend le bouton inactif et remplace l'infobulle par la raison. Préférer ceci à
   * `disabled` seul : un bouton grisé sans explication n'apprend rien.
   */
  disabledReason?: string | undefined;
  /** Côté où s'ouvre l'infobulle quand le bouton touche le bord droit d'un conteneur. */
  tipAlign?: "center" | "end" | undefined;
}

/** Un bouton carré à icône, avec infobulle. La brique des barres d'actions rapides. */
export function IconButton({
  icon,
  label,
  danger = false,
  disabledReason,
  tipAlign = "center",
  className,
  type = "button",
  disabled,
  ...rest
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      data-tip={disabledReason ?? label}
      disabled={disabledReason !== undefined || disabled === true}
      className={cx("occ-icon-button", danger && "occ-icon-button--danger", tipAlign === "end" && "occ-tip--end", className)}
      {...rest}
    >
      <Icon name={icon} />
    </button>
  );
}

export interface QuickBarProps {
  children: ReactNode;
  /** Un cadre fin autour de la rangée, pour la poser seule dans un en-tête. */
  framed?: boolean | undefined;
  className?: string | undefined;
}

/** Une rangée de `IconButton` : les actions rapides d'un objet, au même endroit d'une vue à l'autre. */
export function QuickBar({ children, framed = false, className }: QuickBarProps) {
  return <div className={cx("occ-quick-bar", framed && "occ-quick-bar--framed", className)}>{children}</div>;
}
