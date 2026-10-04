import { TileAvatar } from "@occulis/ui";

export const Sizes = () => (
  <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
    <TileAvatar name="anne" />
    <TileAvatar name="anne" size="lg" />
  </div>
);

export const Camps = () => (
  <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
    <TileAvatar name="Cactus" camp="A" />
    <TileAvatar name="pseudo2" camp="B" />
    <TileAvatar name="bruno" />
  </div>
);
