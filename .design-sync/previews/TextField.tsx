import { TextField } from "@occulis/ui";

export const SignIn = () => (
  <div style={{ display: "grid", gap: 14, maxWidth: 360 }}>
    <TextField label="Adresse électronique" type="email" defaultValue="anne@occulis.test" />
    <TextField label="Mot de passe" type="password" defaultValue="un-mot-de-passe" />
  </div>
);

export const WithHint = () => (
  <div style={{ maxWidth: 360 }}>
    <TextField label="Pseudo" placeholder="entre 2 et 32 caractères" hint="Visible par votre adversaire en partie." />
  </div>
);
