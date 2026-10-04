import { cx } from "../cx.js";

export interface MoveEntry {
  /** Le numéro affiché (« 3 »), ou « — » pour la position de départ. */
  number: string;
  /** Le camp qui a joué ; absent pour la position de départ. */
  seat?: "A" | "B" | undefined;
  /** Le coup, comme l'historique de la partie : « 2,4 → 3,4 », « abandon ». */
  text: string;
  /** Le coup ne peut pas être montré (rejeu interrompu avant lui). */
  disabled?: boolean | undefined;
}

export interface MoveListProps {
  entries: readonly MoveEntry[];
  /** L'entrée montrée en ce moment (survol). */
  shown?: number | undefined;
  /** L'entrée épinglée, à laquelle la vue revient. Marquée dans la teinte de la sélection. */
  pinned?: number | undefined;
  /** Survol ou focus d'une entrée. */
  onPreview?: ((index: number) => void) | undefined;
  /** Clic sur une entrée. */
  onPick?: ((index: number) => void) | undefined;
  /** La souris quitte la liste. */
  onLeave?: (() => void) | undefined;
}

/**
 * L'historique d'une partie, en colonnes : numéro, camp, coup, chaque ligne dans la
 * couleur du camp qui l'a joué. Survoler montre, cliquer épingle.
 */
export function MoveList({ entries, shown, pinned, onPreview, onPick, onLeave }: MoveListProps) {
  return (
    <div className="occ-move-list" onMouseLeave={onLeave}>
      {entries.map((entry, index) => (
        <button
          key={index}
          type="button"
          disabled={entry.disabled}
          className={cx(
            "occ-move",
            entry.seat !== undefined && `occ-move--${entry.seat}`,
            index === shown && "occ-move--shown",
            index === pinned && "occ-move--pinned",
          )}
          onMouseEnter={() => onPreview?.(index)}
          onFocus={() => onPreview?.(index)}
          onClick={() => onPick?.(index)}
        >
          <span className="occ-move__number">{entry.number}</span>
          <span className="occ-move__seat">{entry.seat ?? ""}</span>
          <span className="occ-move__text">{entry.text}</span>
        </button>
      ))}
    </div>
  );
}
