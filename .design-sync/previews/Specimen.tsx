import { Specimen } from "@occulis/ui";

export const Spacing = () => (
  <div className="occ-stack">
    {[2, 4, 8].map((step) => (
      <Specimen key={step} name={`--occ-space-${step}`} value={`step ${step}`}>
        <span style={{ display: "block", width: `var(--occ-space-${step})`, height: 8, background: "var(--occ-ink-dim)" }} />
      </Specimen>
    ))}
  </div>
);

export const Type = () => (
  <Specimen name="--occ-text-xl" value="24px">
    <span style={{ fontSize: "var(--occ-text-xl)" }}>The void looks back</span>
  </Specimen>
);
