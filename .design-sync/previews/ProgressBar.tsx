import { ProgressBar } from "@occulis/ui";

export const Loading = () => (
  <div style={{ position: "relative", height: 40, transform: "translateZ(0)" }}>
    <ProgressBar active />
    <p className="occ-muted" style={{ margin: "12px 0 0" }}>chargement de la partie…</p>
  </div>
);
