import { ProviderButton } from "@occulis/ui";

export const Google = () => (
  <div style={{ display: "grid", maxWidth: 360 }}>
    <ProviderButton provider="google" />
  </div>
);

export const Disabled = () => (
  <div style={{ display: "grid", maxWidth: 360 }}>
    <ProviderButton provider="google" disabled />
  </div>
);
