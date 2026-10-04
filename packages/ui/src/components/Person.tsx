import type { ReactNode } from "react";
import { TileAvatar } from "./TileAvatar.js";

export interface PersonProps {
  name: string;
  /** La ligne secondaire : une adresse, une date, un siège. */
  detail?: ReactNode | undefined;
  /** Un lien vers la fiche ; sans lui, l'élément n'est pas cliquable. */
  href?: string | undefined;
  camp?: "A" | "B" | undefined;
}

/** Un joueur ou un compte en une ligne : insigne, nom, détail. */
export function Person({ name, detail, href, camp }: PersonProps) {
  const content = (
    <>
      <TileAvatar name={name} camp={camp} />
      <span className="occ-person__text">
        <strong>{name}</strong>
        {detail !== undefined && <small>{detail}</small>}
      </span>
    </>
  );
  return href === undefined ? (
    <span className="occ-person">{content}</span>
  ) : (
    <a className="occ-person" href={href}>
      {content}
    </a>
  );
}
