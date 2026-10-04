import { Stat } from "@occulis/ui";

export const Single = () => (
  <div style={{ display: "flex", gap: 48 }}>
    <Stat value={18} label="parties" />
    <Stat value="61 %" label="taux" />
    <Stat value={1200} label="ELO" />
  </div>
);
