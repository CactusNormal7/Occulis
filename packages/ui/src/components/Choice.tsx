import type { ReactNode } from "react";
import { cx } from "../cx.js";

/** Une liste d'éléments à choisir un par un : les emplacements d'une équipe, des presets. */
export function ChoiceList({ children, label }: { children: ReactNode; label?: string | undefined }) {
  return (
    <ul className="occ-choices" aria-label={label}>
      {children}
    </ul>
  );
}

export interface ChoiceRowProps {
  /** Le contenu principal : un nom et sa précision. */
  children: ReactNode;
  /** Ce qui s'aligne à droite : une pastille, un sélecteur, un bouton. */
  end?: ReactNode | undefined;
  selected?: boolean | undefined;
  /** Atténué : un emplacement encore vide, un preset caduc. */
  muted?: boolean | undefined;
  /** Rend la ligne choisissable ; sans lui, elle n'est qu'affichée. */
  onSelect?: (() => void) | undefined;
  /** Le camp dont la sélection prend la couleur. */
  camp?: "A" | "B" | undefined;
}

/**
 * Une ligne choisissable : un vrai bouton (`aria-pressed`) pour la partie principale, et à
 * droite ce qui reste interactif à part. La ligne choisie est marquée du trait de la
 * sélection — l'information « c'est celle-ci que vous déplacez ».
 */
export function ChoiceRow({ children, end, selected = false, muted = false, onSelect, camp }: ChoiceRowProps) {
  return (
    <li className={cx("occ-choice", selected && "occ-choice--selected", muted && "occ-choice--muted", camp !== undefined && `occ-choice--${camp}`)}>
      {onSelect === undefined ? (
        <div className="occ-choice__main">{children}</div>
      ) : (
        <button type="button" className="occ-choice__main" aria-pressed={selected} onClick={onSelect}>
          {children}
        </button>
      )}
      {end !== undefined && <div className="occ-choice__end">{end}</div>}
    </li>
  );
}
