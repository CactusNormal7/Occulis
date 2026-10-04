import { Card, List, ListRow, Person, Badge, BadgeRow, Stat, StatGrid } from "@occulis/ui";

export const WithAction = () => (
  <Card title="Derniers inscrits" action={<a href="#">tout voir</a>}>
    <List>
      <ListRow end={<BadgeRow><Badge tone="strong">admin</Badge><Badge>vérifiée</Badge></BadgeRow>}>
        <Person name="Cactus" detail="2026-10-04 14:44" href="#" />
      </ListRow>
      <ListRow end={<Badge tone="dim">non vérifiée</Badge>}>
        <Person name="anne" detail="2026-10-03 09:12" href="#" />
      </ListRow>
    </List>
  </Card>
);

export const Stats = () => (
  <Card title="Profil de jeu">
    <StatGrid>
      <Stat value={18} label="parties" />
      <Stat value={11} label="victoires" />
      <Stat value={7} label="défaites" />
      <Stat value={1} label="en cours" />
      <Stat value="61 %" label="taux" />
      <Stat value={1200} label="ELO" />
    </StatGrid>
  </Card>
);
