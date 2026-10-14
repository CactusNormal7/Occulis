import type { ReactNode } from "react";
import { cx } from "../cx.js";
import { TileAvatar } from "./TileAvatar.js";

export interface PlayerPlateProps {
  name: string;
  /** Le camp tenu, dans sa couleur : c'est une information de partie. */
  camp: "A" | "B";
  /** Une étiquette au-dessus du nom : « Vous », un rang. */
  tag?: ReactNode | undefined;
  /** Les lignes sous le nom : l'Elo, le bilan. */
  lines?: readonly ReactNode[] | undefined;
  /** Les distinctions exhibées, en pastilles. */
  badges?: ReactNode | undefined;
  /** `end` aligne la plaque à droite, en miroir — celle de l'adversaire. */
  align?: "start" | "end" | undefined;
}

/** La plaque d'un joueur à l'annonce d'une partie : insigne, nom, chiffres, distinctions. */
export function PlayerPlate({ name, camp, tag, lines = [], badges, align = "start" }: PlayerPlateProps) {
  return (
    <section className={cx("occ-plate", `occ-plate--${camp}`, align === "end" && "occ-plate--end")}>
      <TileAvatar name={name} size="lg" camp={camp} />
      <div className="occ-plate__text">
        {tag !== undefined && <span className="occ-plate__tag">{tag}</span>}
        <strong className="occ-plate__name">{name}</strong>
        {lines.map((line, index) => (
          <small key={index}>{line}</small>
        ))}
        {badges !== undefined && <div className="occ-plate__badges">{badges}</div>}
      </div>
    </section>
  );
}

export interface RevealProps {
  /** La plaque de gauche (le joueur) et celle de droite (l'adversaire). */
  self: ReactNode;
  opponent: ReactNode;
  /** Le mot entre les deux : « vs ». */
  versus: string;
  /** Ce qui s'aligne sous l'affrontement : classée ou non. */
  footer?: ReactNode | undefined;
  /** Réduite en bandeau, une fois l'annonce faite. */
  compact?: boolean | undefined;
}

/**
 * L'annonce d'une partie : les deux plaques entrent chacune de son côté, le « vs » se pose
 * entre elles. Puis, `compact`, l'annonce se range en un bandeau. Les animations ne portent
 * aucune information : sous mouvement réduit, tout est simplement là.
 */
export function Reveal({ self, opponent, versus, footer, compact = false }: RevealProps) {
  return (
    <section className={cx("occ-reveal", compact && "occ-reveal--compact")} aria-live="polite">
      <div className="occ-reveal__side occ-reveal__side--self">{self}</div>
      <span className="occ-reveal__versus">{versus}</span>
      <div className="occ-reveal__side occ-reveal__side--opponent">{opponent}</div>
      {footer !== undefined && <div className="occ-reveal__footer">{footer}</div>}
    </section>
  );
}
