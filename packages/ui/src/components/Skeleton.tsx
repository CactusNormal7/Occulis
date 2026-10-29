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
      <Lines count={lines} />
    </div>
  );
}

function Lines({ count }: { count: number }) {
  return Array.from({ length: count }, (_, index) => (
    <span key={index} className="occ-skeleton__line" />
  ));
}

/** Un bloc de lignes sans rôle propre : c'est l'écran entier qui s'annonce. */
function Block({ lines, card = false }: { lines: number; card?: boolean }) {
  return (
    <div className={cx("occ-skeleton", card && "occ-skeleton--card")}>
      <Lines count={lines} />
    </div>
  );
}

/** Les mises en page d'écran qu'un squelette sait imiter. */
export type SkeletonLayout = "hero" | "list" | "detail";

export interface SkeletonScreenProps {
  /**
   * `hero` : un bandeau d'identité puis deux colonnes de cartes (un compte, une fiche) ;
   * `list` : un titre puis une table ; `detail` : un bandeau de faits puis un grand bloc
   * (une partie et son plateau).
   */
  layout?: SkeletonLayout | undefined;
}

/**
 * La place d'un **écran entier** pendant une navigation : la barre du haut a déjà changé
 * d'onglet, l'écran suivant n'est pas encore arrivé. Il paraît aussitôt, en fondu depuis
 * le transparent : une réponse rapide le remplace avant qu'il soit visible, une réponse
 * lente montre la forme de ce qui vient au lieu de l'écran qu'on vient de quitter.
 */
export function SkeletonScreen({ layout = "list" }: SkeletonScreenProps) {
  const m = useMessages().ui;
  return (
    <div className="occ-skeleton-screen" role="status" aria-busy="true" aria-label={m.loading}>
      {layout === "hero" && (
        <>
          <div className="occ-skeleton-screen__hero">
            <span className="occ-skeleton__tile" />
            <Block lines={2} />
          </div>
          <div className="occ-card-grid">
            <div className="occ-card-column">
              <Block lines={4} card />
              <Block lines={3} card />
            </div>
            <div className="occ-card-column">
              <Block lines={5} card />
            </div>
          </div>
        </>
      )}
      {layout === "list" && (
        <>
          <span className="occ-skeleton__title" />
          <Block lines={8} card />
        </>
      )}
      {layout === "detail" && (
        <>
          <Block lines={2} card />
          <span className="occ-skeleton__area" />
        </>
      )}
    </div>
  );
}
