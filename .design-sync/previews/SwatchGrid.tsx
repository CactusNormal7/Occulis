import { Swatch, SwatchGrid } from "@occulis/ui";

export const Inks = () => (
  <SwatchGrid>
    {["--occ-ink", "--occ-ink-soft", "--occ-ink-dim", "--occ-ink-faint"].map((name) => (
      <Swatch key={name} name={name} color={`var(${name})`} value={name.replace("--occ-", "")} />
    ))}
  </SwatchGrid>
);
