import type { ReactNode } from "react";
import { cx } from "../cx.js";

export interface CardProps {
  /** Le titre, en petites capitales estompées. */
  title?: ReactNode | undefined;
  /** Une action alignée à droite du titre : un lien « tout voir », un bouton. */
  action?: ReactNode | undefined;
  /** Le contenu touche les bords (un plateau, une barre d'outils pleine largeur). */
  flush?: boolean | undefined;
  children?: ReactNode | undefined;
  className?: string | undefined;
}

/** Un panneau : cadre fin, angles vifs, sans fond. L'unité de mise en page de toute vue. */
export function Card({ title, action, flush = false, children, className }: CardProps) {
  return (
    <section className={cx("occ-card", flush && "occ-card--flush", className)}>
      {(title !== undefined || action !== undefined) && (
        <header className="occ-card__head">
          {title !== undefined && <h3 className="occ-label">{title}</h3>}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

/** Des cartes côte à côte, qui passent en colonne sur un écran étroit. */
export function CardGrid({ children }: { children: ReactNode }) {
  return <div className="occ-card-grid">{children}</div>;
}

/** Une pile verticale de cartes, à l'intérieur d'une `CardGrid`. */
export function CardColumn({ children }: { children: ReactNode }) {
  return <div className="occ-card-column">{children}</div>;
}
