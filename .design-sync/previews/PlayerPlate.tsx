import { Badge, PlayerPlate } from "@occulis/ui";

export const Self = () => (
  <PlayerPlate name="Cactus" camp="A" tag="You" lines={["1232 Elo", "14 played · 9 won"]} badges={<Badge>On a roll</Badge>} />
);

export const Opponent = () => <PlayerPlate name="boris" camp="B" align="end" lines={["1188 Elo", "first match"]} />;
