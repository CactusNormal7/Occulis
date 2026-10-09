import type { ReactNode } from "react";
import { useMessages } from "./Locale.js";
import { Person } from "./Person.js";

export interface VersusSide {
  name: string;
  href?: string | undefined;
}

export interface VersusProps {
  /** Le joueur du siège A, dans la couleur de son camp. */
  a: VersusSide;
  /** Le joueur du siège B. */
  b: VersusSide;
  /** Ce qui s'aligne à droite : le résultat (`Badge tone="A"|"B"`), un état. */
  end?: ReactNode;
}

/** L'en-tête d'une partie : les deux sièges, chacun dans la couleur de son camp. */
export function Versus({ a, b, end }: VersusProps) {
  const m = useMessages();
  return (
    <section className="occ-versus">
      <Person name={a.name} detail={m.ui.versus.seat("A")} camp="A" href={a.href} />
      <span className="occ-label">{m.ui.versus.against}</span>
      <Person name={b.name} detail={m.ui.versus.seat("B")} camp="B" href={b.href} />
      {end !== undefined && <div className="occ-versus__end">{end}</div>}
    </section>
  );
}
