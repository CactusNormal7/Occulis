import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { cx } from "../cx.js";
import { Icon, type IconName } from "./Icon.js";
import { useMessages } from "./Locale.js";
import { Wordmark } from "./TopBar.js";

export interface FormPanelProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  /** Le titre de l'écran : « Connexion », « Créer un compte »… */
  title: string;
  /** Une ligne sous le titre. */
  lead?: ReactNode | undefined;
  /** Ce qui suit le formulaire : liens vers les autres parcours. */
  footer?: ReactNode | undefined;
  children: ReactNode;
}

/** Une colonne étroite et centrée, marque en tête : l'écrin des parcours de compte. */
export function FormPanel({ title, lead, footer, children, className, ...rest }: FormPanelProps) {
  return (
    <div className={cx("occ-form-panel", "occ-enter", className)} {...rest}>
      <Wordmark />
      <div className="occ-form-panel__head">
        <h1 className="occ-form-panel__title">{title}</h1>
        {lead !== undefined && <p className="occ-note">{lead}</p>}
      </div>
      {children}
      {footer !== undefined && <div className="occ-form-panel__footer">{footer}</div>}
    </div>
  );
}

export interface FormMessageProps {
  /** `error` dans la teinte des refus, `success` dans celle des gestes acceptés. */
  tone?: "error" | "success" | "info" | undefined;
  children: ReactNode;
  action?: ReactNode | undefined;
}

const TONE_ICONS: Record<NonNullable<FormMessageProps["tone"]>, IconName> = {
  error: "ban",
  success: "check",
  info: "mail",
};

/**
 * Le retour d'un formulaire, au-dessus des champs. `role="alert"` pour une erreur, lue
 * aussitôt ; `status` sinon, lu sans interrompre.
 */
export function FormMessage({ tone = "info", children, action }: FormMessageProps) {
  return (
    <div className={`occ-form-message occ-form-message--${tone}`} role={tone === "error" ? "alert" : "status"}>
      <Icon name={TONE_ICONS[tone]} />
      <span>{children}</span>
      {action}
    </div>
  );
}

/** Un séparateur horizontal, avec un mot au milieu (« ou »). */
export function Divider({ children }: { children?: ReactNode }) {
  return (
    <div className="occ-divider" role="separator">
      {children !== undefined && <span>{children}</span>}
    </div>
  );
}

export interface ProviderButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  provider: "google";
}

/**
 * « Continuer avec Google ». Le logo est monochrome, en `currentColor`, comme toute icône
 * de la charte : la couleur reste réservée à l'information de partie.
 */
export function ProviderButton({ provider, className, children, type = "button", ...rest }: ProviderButtonProps) {
  const m = useMessages();
  return (
    <button type={type} className={cx("occ-provider", className)} {...rest}>
      {provider === "google" && <GoogleMark />}
      <span>{children ?? m.ui.continueWithGoogle}</span>
    </button>
  );
}

function GoogleMark() {
  return (
    <svg className="occ-provider__mark" viewBox="0 0 48 48" width={18} height={18} aria-hidden="true">
      <path
        fill="currentColor"
        d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.6 13.3l7.9 6.2C12.4 13.7 17.7 9.5 24 9.5z"
      />
      <path
        fill="currentColor"
        d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.4-4.6 7l7.4 5.8c4.3-4 6.9-9.9 6.9-17.3z"
      />
      <path
        fill="currentColor"
        d="M10.5 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.2C.9 16.6 0 20.2 0 24s.9 7.4 2.6 10.8l7.9-6.2z"
      />
      <path
        fill="currentColor"
        d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.8c-2.1 1.4-4.8 2.3-8.5 2.3-6.3 0-11.6-4.2-13.5-10l-7.9 6.2C6.6 42.6 14.6 48 24 48z"
      />
    </svg>
  );
}
