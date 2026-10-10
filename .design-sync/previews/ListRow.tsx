import { Badge, List, ListRow, Person } from "@occulis/ui";

export const Newcomer = () => (
  <List>
    <ListRow end={<Badge tone="dim">non vérifiée</Badge>}>
      <Person name="anne" detail="2026-10-03 09:12" href="#" />
    </ListRow>
  </List>
);
