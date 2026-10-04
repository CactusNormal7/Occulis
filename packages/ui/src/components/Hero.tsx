import type { ReactNode } from "react";

export interface HeroProps {
  /** L'insigne, en grand (`TileAvatar size="lg"`). */
  avatar?: ReactNode | undefined;
  title: ReactNode;
  /** Les pastilles d'état, à côté du titre. */
  badges?: ReactNode | undefined;
  /** Les métadonnées, sur une ligne estompée sous le titre. */
  meta?: readonly ReactNode[] | undefined;
  /** Les actions de la fiche, à droite (une `QuickBar framed`). */
  actions?: ReactNode | undefined;
}

/** L'en-tête d'une fiche : qui ou quoi, son état, et ce qu'on peut en faire. */
export function Hero({ avatar, title, badges, meta = [], actions }: HeroProps) {
  return (
    <section className="occ-hero">
      {avatar}
      <div className="occ-hero__text">
        <h2>
          {title}
          {badges}
        </h2>
        {meta.length > 0 && (
          <p className="occ-hero__meta">
            {meta.map((item, index) => (
              <span key={index}>{item}</span>
            ))}
          </p>
        )}
      </div>
      {actions !== undefined && <div className="occ-hero__actions">{actions}</div>}
    </section>
  );
}
