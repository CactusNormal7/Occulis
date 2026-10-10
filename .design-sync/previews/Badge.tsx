import { Badge } from "@occulis/ui";

export const AccountStates = () => (
  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
    <Badge tone="strong">admin</Badge>
    <Badge>vérifiée</Badge>
    <Badge tone="dim">non vérifiée</Badge>
    <Badge tone="refused">suspendu</Badge>
  </div>
);

export const MatchResults = () => (
  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
    <Badge tone="dim">en cours</Badge>
    <Badge tone="A">victoire d'anne (abandon)</Badge>
    <Badge tone="B">victoire de bruno (abandon)</Badge>
  </div>
);
