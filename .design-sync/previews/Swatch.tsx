import { Swatch } from "@occulis/ui";

export const Token = () => <Swatch name="--occ-camp-a" color="var(--occ-camp-a)" value="camp A" />;

export const Editable = () => (
  <Swatch name="camp.B" color="var(--occ-camp-b)" value="camp B" edited onChange={() => undefined} />
);
