import { SelectField } from "@occulis/ui";

export const Role = () => (
  <div style={{ maxWidth: 320 }}>
    <SelectField
      label="Rôle"
      defaultValue="user"
      options={[
        { value: "user", label: "joueur" },
        { value: "admin", label: "administrateur" },
      ]}
    />
  </div>
);
