import { Person } from "@occulis/ui";

export const Account = () => <Person name="anne" detail="anne@occulis.test" href="#" />;

export const Seats = () => (
  <div style={{ display: "flex", gap: 32 }}>
    <Person name="Cactus" detail="siège A" camp="A" href="#" />
    <Person name="pseudo2" detail="siège B" camp="B" href="#" />
  </div>
);
