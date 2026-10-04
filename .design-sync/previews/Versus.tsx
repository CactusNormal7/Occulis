import { Badge, Versus } from "@occulis/ui";

export const Ongoing = () => <Versus a={{ name: "Cactus", href: "#" }} b={{ name: "pseudo2", href: "#" }} end={<Badge tone="dim">en cours</Badge>} />;

export const Won = () => (
  <Versus a={{ name: "anne", href: "#" }} b={{ name: "bruno", href: "#" }} end={<Badge tone="B">victoire de bruno (abandon)</Badge>} />
);
