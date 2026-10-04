import { IconButton, List, ListRow } from "@occulis/ui";

export const Sessions = () => (
  <List>
    <ListRow end={<IconButton icon="close" label="Fermer cette session" tipAlign="end" />}>
      <strong>Chrome · Windows</strong>
      <small>127.0.0.1 · ouverte le 2026-10-04 16:25 · expire le 2026-10-11 16:25</small>
    </ListRow>
    <ListRow end={<IconButton icon="close" label="Fermer cette session" tipAlign="end" />}>
      <strong>Firefox · Linux</strong>
      <small>192.168.1.12 · ouverte le 2026-10-02 08:03 · expire le 2026-10-09 08:03</small>
    </ListRow>
  </List>
);
