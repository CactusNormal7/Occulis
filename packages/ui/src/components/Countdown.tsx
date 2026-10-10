import type { ReactNode } from "react";
import { cx } from "../cx.js";

export interface CountdownRingProps {
  /** La durée totale, qui donne la proportion. */
  totalMs: number;
  /** Ce qui reste ; c'est l'appelant qui le fait décroître, le composant ne tient aucune horloge. */
  remainingMs: number;
  /** Au centre : le nombre de secondes, en général. */
  children?: ReactNode | undefined;
  size?: "sm" | "lg" | undefined;
  /** Le libellé accessible : « Temps restant ». */
  label: string;
}

/**
 * Un compte à rebours au trait : un anneau qui se vide. Piloté par ses propriétés et non
 * par une animation CSS — sous mouvement réduit, une animation serait écrasée à zéro et
 * l'anneau se viderait d'un coup, alors que le temps restant est une information.
 * Sous les cinq dernières secondes, il passe dans la teinte des refus.
 */
export function CountdownRing({ totalMs, remainingMs, children, size = "sm", label }: CountdownRingProps) {
  const fraction = totalMs <= 0 ? 0 : Math.min(1, Math.max(0, remainingMs / totalMs));
  const circumference = 2 * Math.PI * 16;
  return (
    <span
      className={cx("occ-countdown", `occ-countdown--${size}`, remainingMs <= 5000 && "occ-countdown--urgent")}
      role="timer"
      aria-label={label}
    >
      <svg viewBox="0 0 36 36" aria-hidden="true">
        <circle className="occ-countdown__track" cx="18" cy="18" r="16" />
        <circle
          className="occ-countdown__arc"
          cx="18"
          cy="18"
          r="16"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - fraction)}
        />
      </svg>
      {children !== undefined && <span className="occ-countdown__value">{children}</span>}
    </span>
  );
}
