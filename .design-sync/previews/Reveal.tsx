import { Badge, PlayerPlate, Reveal } from "@occulis/ui";

const self = <PlayerPlate name="Cactus" camp="A" tag="You" lines={["1232 Elo", "14 played · 9 won"]} badges={<Badge>On a roll</Badge>} />;
const opponent = <PlayerPlate name="boris" camp="B" align="end" lines={["1188 Elo", "3 played · 1 won"]} badges={<Badge>First blood</Badge>} />;

export const Announcement = () => <Reveal versus="vs" self={self} opponent={opponent} footer={<Badge tone="strong">Ranked</Badge>} />;

export const Compact = () => <Reveal compact versus="vs" self={self} opponent={opponent} />;
