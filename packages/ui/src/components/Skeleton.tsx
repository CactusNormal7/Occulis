import { cx } from "../cx.js";
import { useMessages } from "./Locale.js";

export interface SkeletonProps {
  /** Le nombre de lignes de texte simulées. */
  lines?: number | undefined;
  /** Encadrées comme une `Card` : la place d'un bloc plutôt que d'un paragraphe. */
  card?: boolean | undefined;
}

/**
 * La place d'un contenu qui n'est pas encore arrivé. Elle n'apparaît qu'après un court
 * délai, porté par la feuille et non par une minuterie : une réponse rapide ne fait rien
 * clignoter, une réponse lente montre que quelque chose vient plutôt qu'une page vide.
 */
export function Skeleton({ lines = 3, card = false }: SkeletonProps) {
  const m = useMessages().ui;
  return (
    <div
      className={cx("occ-skeleton", card && "occ-skeleton--card")}
      role="status"
      aria-busy="true"
      aria-label={m.loading}
    >
      {Array.from({ length: lines }, (_, index) => (
        <span key={index} className="occ-skeleton__line" />
      ))}
    </div>
  );
}
