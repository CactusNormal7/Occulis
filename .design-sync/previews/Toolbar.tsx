import { IconButton, QuickBar, Segmented, Toolbar, ToolbarText } from "@occulis/ui";

export const ReplayControls = () => (
  <Toolbar>
    <QuickBar>
      <IconButton icon="first" label="Position de départ" />
      <IconButton icon="previous" label="Coup précédent" />
      <IconButton icon="play" label="Lire la partie" />
      <IconButton icon="next" label="Coup suivant" />
      <IconButton icon="last" label="Dernière position" />
    </QuickBar>
    <ToolbarText>coup 3 / 11 — A · anne — 3,7 → 6,7</ToolbarText>
    <Segmented
      value="all"
      options={[
        { value: "all", label: "tout" },
        { value: "A", label: "vue d'anne", camp: "A" },
        { value: "B", label: "vue de bruno", camp: "B" },
      ]}
    />
  </Toolbar>
);
