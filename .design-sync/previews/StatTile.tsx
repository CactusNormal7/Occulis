import { StatTile } from "@occulis/ui";

export const Linked = () => (
  <div style={{ width: 240 }}>
    <StatTile value={132} label="comptes" detail="+12 sur 7 jours" href="#" animate={false} />
  </div>
);

export const Plain = () => (
  <div style={{ width: 240 }}>
    <StatTile value={4} label="suspendus" animate={false} />
  </div>
);
