import { useEffect, useRef, type ReactNode } from "react";
import { cx } from "../cx.js";

export interface StatTileProps {
  value: number;
  label: string;
  /** Une précision sous le libellé : une tendance, une part. */
  detail?: ReactNode | undefined;
  /** Rend la tuile cliquable vers la liste qu'elle résume. */
  href?: string | undefined;
  /** Le chiffre monte de zéro à sa valeur à l'affichage. Coupé si le système demande moins de mouvement. */
  animate?: boolean | undefined;
}

/** Un chiffre clé : grand nombre, libellé en capitales. */
export function StatTile({ value, label, detail, href, animate = true }: StatTileProps) {
  const number = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = number.current;
    if (element === null) return;
    if (!animate || value === 0 || matchMedia("(prefers-reduced-motion: reduce)").matches) {
      element.textContent = String(value);
      return;
    }
    const start = performance.now();
    let frame = 0;
    const step = (now: number) => {
      const progress = Math.min((now - start) / 700, 1);
      element.textContent = String(Math.round(value * (1 - (1 - progress) ** 3)));
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value, animate]);

  const content = (
    <>
      <strong ref={number}>{value}</strong>
      <span className="occ-label">{label}</span>
      {detail !== undefined && <small>{detail}</small>}
    </>
  );
  return href === undefined ? (
    <div className="occ-stat-tile">{content}</div>
  ) : (
    <a className={cx("occ-stat-tile", "occ-stat-tile--link")} href={href}>
      {content}
    </a>
  );
}

/** Les tuiles d'une vue d'ensemble, quatre par rangée. */
export function StatTileGrid({ children }: { children: ReactNode }) {
  return <div className="occ-stat-tile-grid">{children}</div>;
}

export interface StatProps {
  value: ReactNode;
  label: string;
}

/** Un chiffre dans une carte : plus petit qu'une `StatTile`, sans cadre. */
export function Stat({ value, label }: StatProps) {
  return (
    <div className="occ-stat">
      <strong>{value}</strong>
      <span className="occ-label">{label}</span>
    </div>
  );
}

/** Des `Stat` sur trois colonnes. */
export function StatGrid({ children }: { children: ReactNode }) {
  return <div className="occ-stat-grid">{children}</div>;
}
