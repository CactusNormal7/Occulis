import { Button, Stage } from "@occulis/ui";

export const WithActions = () => (
  <Stage
    title="Variants"
    actions={
      <Button size="sm" variant="ghost">
        Code
      </Button>
    }
  >
    <Button variant="primary">Play</Button>
  </Stage>
);

export const Plain = () => (
  <Stage>
    <Button>Join</Button>
  </Stage>
);
