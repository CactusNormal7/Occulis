import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cx } from "../cx.js";
import { Icon, type IconName } from "./Icon.js";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * `default` : au trait discret. `primary` : la confirmation, trait franc. `danger` : le
   * geste destructeur, dans la teinte des refus. `ghost` : sans cadre, pour « Annuler ».
   * Aucun bouton n'est plein — c'est la ligne de la DA.
   */
  variant?: "default" | "primary" | "danger" | "ghost" | undefined;
  size?: "sm" | "md" | undefined;
  /** Une icône avant le libellé. */
  icon?: IconName | undefined;
}

/**
 * Un bouton à libellé, en capitales espacées, au trait. Il transmet sa référence : un
 * réglage y rend le focus quand son éditeur se referme (`SettingRow`).
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "default", size = "md", icon, type = "button", className, children, ...rest },
  ref,
) {
  return (
    <button ref={ref} type={type} className={cx("occ-button", `occ-button--${variant}`, `occ-button--${size}`, className)} {...rest}>
      {icon !== undefined && <Icon name={icon} size={14} />}
      {children}
    </button>
  );
});
