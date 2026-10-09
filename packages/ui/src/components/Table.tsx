import type { ReactNode } from "react";
import { EmptyState } from "./Banner.js";
import { useMessages } from "./Locale.js";

export interface TableProps {
  /** Les en-têtes de colonne ; une chaîne vide pour la colonne d'actions. */
  columns: readonly string[];
  /** Les lignes, en `<tr>` dont la dernière cellule peut porter `className="occ-actions-cell"`. */
  children?: ReactNode | undefined;
  /** Le nombre de lignes ; à zéro, la table cède la place à `empty`. */
  rowCount: number;
  empty?: ReactNode | undefined;
}

/**
 * Une table dense : en-têtes en petites capitales, lignes séparées d'un trait presque
 * invisible, survol estompé. Les actions de ligne ne s'affichent pleinement qu'au survol.
 */
export function Table({ columns, children, rowCount, empty }: TableProps) {
  const m = useMessages();
  if (rowCount === 0) return <EmptyState>{empty ?? m.ui.empty}</EmptyState>;
  return (
    <div className="occ-table-scroll">
      <table className="occ-table">
        <thead>
          <tr>
            {columns.map((column, index) => (
              <th key={index}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export interface PagerProps {
  offset: number;
  /** Le nombre de lignes affichées sur cette page. */
  shown: number;
  total: number;
  pageSize: number;
  /** L'adresse d'une page, à partir de son décalage. */
  hrefFor: (offset: number) => string;
}

/** La pagination d'une liste : précédents, « 26–50 sur 132 », suivants. */
export function Pager({ offset, shown, total, pageSize, hrefFor }: PagerProps) {
  const m = useMessages();
  const label = total === 0 || shown === 0 ? m.ui.pager.none : m.ui.pager.range(offset + 1, offset + shown, total);
  return (
    <nav className="occ-pager">
      {offset > 0 ? <a href={hrefFor(Math.max(offset - pageSize, 0))}>{m.ui.pager.previous}</a> : <span />}
      <span>{label}</span>
      {offset + pageSize < total ? <a href={hrefFor(offset + pageSize)}>{m.ui.pager.next}</a> : <span />}
    </nav>
  );
}

export interface ListRowProps {
  /** Le contenu principal : un `Person`, un titre et sa précision. */
  children: ReactNode;
  /** Ce qui s'aligne à droite : des pastilles, un bouton. */
  end?: ReactNode | undefined;
}

/** Une ligne de liste simple, sans colonnes : derniers inscrits, sessions ouvertes. */
export function ListRow({ children, end }: ListRowProps) {
  return (
    <li className="occ-list-row">
      <div className="occ-list-row__main">{children}</div>
      {end}
    </li>
  );
}

/** Le conteneur des `ListRow`. */
export function List({ children }: { children: ReactNode }) {
  return <ul className="occ-list">{children}</ul>;
}
