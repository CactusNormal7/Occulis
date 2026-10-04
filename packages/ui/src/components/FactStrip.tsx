import type { ReactNode } from "react";

export interface Fact {
  label: string;
  value: ReactNode;
}

/** Des faits courts sur une seule bande cloisonnée : dates, règles, identifiants. */
export function FactStrip({ facts }: { facts: readonly Fact[] }) {
  return (
    <div className="occ-fact-strip">
      {facts.map((fact) => (
        <div key={fact.label} className="occ-fact">
          <span className="occ-label">{fact.label}</span>
          <strong>{fact.value}</strong>
        </div>
      ))}
    </div>
  );
}

/** Des paires terme / valeur, en deux colonnes. */
export function DefinitionList({ entries }: { entries: readonly Fact[] }) {
  return (
    <dl className="occ-definitions">
      {entries.map((entry) => (
        <div key={entry.label}>
          <dt>{entry.label}</dt>
          <dd>{entry.value}</dd>
        </div>
      ))}
    </dl>
  );
}
