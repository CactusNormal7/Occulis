import { Badge, BadgeRow } from "@occulis/ui";

export const Account = () => (
  <BadgeRow>
    <Badge tone="strong">admin</Badge>
    <Badge>vérifiée</Badge>
  </BadgeRow>
);

export const Suspended = () => (
  <BadgeRow>
    <Badge tone="dim">non vérifiée</Badge>
    <Badge tone="refused">suspendu</Badge>
  </BadgeRow>
);
