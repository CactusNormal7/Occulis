import { Card, CardGrid, Stat, StatGrid } from "@occulis/ui";

export const TwoColumns = () => (
  <CardGrid>
    <Card title="Profil de jeu">
      <StatGrid>
        <Stat value={18} label="parties" />
        <Stat value={11} label="victoires" />
        <Stat value={7} label="défaites" />
      </StatGrid>
    </Card>
    <Card title="Sessions ouvertes (1)">
      <p className="occ-muted" style={{ margin: 0 }}>Chrome · Windows — 127.0.0.1</p>
    </Card>
  </CardGrid>
);
