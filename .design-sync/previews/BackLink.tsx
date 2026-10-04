import { BackLink } from "@occulis/ui";

export const ToList = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: 8 }}>
    <BackLink href="#">Comptes</BackLink>
    <BackLink href="#">Fiche du compte</BackLink>
  </div>
);
