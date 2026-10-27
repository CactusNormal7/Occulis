import { Card, Stat, StatGrid, WorkInProgress } from "@occulis/ui";

export const OnACard = () => (
  <div style={{ width: 320 }}>
    <WorkInProgress note="Placeholder figures">
      <Card title="Match stats">
        <StatGrid>
          <Stat value={42} label="tiles revealed" />
          <Stat value="3.1 s" label="per move" />
          <Stat value={7} label="peak height" />
        </StatGrid>
      </Card>
    </WorkInProgress>
  </div>
);

export const Inline = () => (
  <WorkInProgress>
    <p style={{ margin: 0, padding: "16px 0" }}>Feats of this match</p>
  </WorkInProgress>
);
