import type { ReactNode } from "react";
import { useMessages } from "./Locale.js";

export interface WorkInProgressProps {
  children: ReactNode;
  /** Ce qui manque encore, en infobulle : « données factices ». Un texte générique sinon. */
  note?: string | undefined;
}

/**
 * Un élément encore en chantier : un ruban jaune et noir sur son bord haut et une petite
 * étiquette, sans rien changer à son contenu. Il signale qu'on montre un rendu, pas encore
 * une donnée : ce qu'il entoure peut être factice. Il part avec l'élément, une fois fini.
 */
export function WorkInProgress({ children, note }: WorkInProgressProps) {
  const m = useMessages().ui.wip;
  const detail = note ?? m.note;
  return (
    <div className="occ-wip" title={detail}>
      <span className="occ-wip__tag" aria-label={`${m.label} — ${detail}`}>
        {m.tag}
      </span>
      {children}
    </div>
  );
}
