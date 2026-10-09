import { Badge, ChoiceList, ChoiceRow } from "@occulis/ui";

export const TeamSlots = () => (
  <ChoiceList label="Team">
    <ChoiceRow selected camp="A" onSelect={() => undefined} end={<Badge>0,9</Badge>}>
      <strong>Commander</strong>
      <small>moves 3 · sees 14</small>
    </ChoiceRow>
    <ChoiceRow onSelect={() => undefined} end={<Badge>1,7</Badge>}>
      <strong>Scout</strong>
      <small>moves 6 · sees 20</small>
    </ChoiceRow>
    <ChoiceRow muted onSelect={() => undefined} end={<Badge tone="dim">not placed</Badge>}>
      <strong>Pawn</strong>
      <small>moves 1 · sees 6</small>
    </ChoiceRow>
  </ChoiceList>
);
