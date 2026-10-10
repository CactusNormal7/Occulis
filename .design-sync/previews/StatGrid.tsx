import { Stat, StatGrid } from "@occulis/ui";

export const Record = () => (
  <StatGrid>
    <Stat value={18} label="parties" />
    <Stat value={11} label="victoires" />
    <Stat value={7} label="défaites" />
    <Stat value={1} label="en cours" />
    <Stat value="61 %" label="taux" />
    <Stat value={1200} label="ELO" />
  </StatGrid>
);
