import type { ReactNode } from "react";

export interface PageHeadProps {
  title: string;
  /** Un total, à côté du titre. */
  count?: number | undefined;
  /** Les outils de la vue, à droite : recherche, filtre, création. */
  tools?: ReactNode | undefined;
}

/** L'en-tête d'une vue : titre en capitales espacées, total, outils. */
export function PageHead({ title, count, tools }: PageHeadProps) {
  return (
    <div className="occ-page-head">
      <h2>
        {title}
        {count !== undefined && <span className="occ-count">{count}</span>}
      </h2>
      {tools !== undefined && <div className="occ-page-head__tools">{tools}</div>}
    </div>
  );
}

/** Le lien de retour vers la liste parente, au-dessus d'une fiche. */
export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a className="occ-back-link" href={href}>
      ← {children}
    </a>
  );
}
