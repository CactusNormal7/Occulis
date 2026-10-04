import { DefinitionList } from "@occulis/ui";

export const Account = () => (
  <DefinitionList
    entries={[
      { label: "adresse", value: "anne@occulis.test" },
      { label: "rôle", value: "joueur" },
      { label: "inscription", value: "2026-10-03 09:12" },
      { label: "état", value: "actif" },
    ]}
  />
);
