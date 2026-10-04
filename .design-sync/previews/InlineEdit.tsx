import { InlineEdit } from "@occulis/ui";

export const AccountFields = () => (
  <div style={{ display: "grid", gap: 10, maxWidth: 560 }}>
    <InlineEdit label="pseudo" defaultValue="anne" action="Renommer" onSubmit={() => undefined} />
    <InlineEdit label="adresse" type="email" defaultValue="anne@occulis.test" action="Changer" onSubmit={() => undefined} />
    <InlineEdit label="mot de passe" type="password" action="Définir" onSubmit={() => undefined} />
  </div>
);
