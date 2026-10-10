import { IconButton, Toolbar, ToolbarText } from "@occulis/ui";

export const Status = () => (
  <Toolbar>
    <IconButton icon="previous" label="Coup précédent" />
    <ToolbarText>position de départ</ToolbarText>
    <IconButton icon="next" label="Coup suivant" />
  </Toolbar>
);
