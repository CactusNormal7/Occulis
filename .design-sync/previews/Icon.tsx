import { ICON_NAMES, Icon } from "@occulis/ui";

export const AllIcons = () => (
  <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 16, padding: 8 }}>
    {ICON_NAMES.map((name) => (
      <div key={name} style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Icon name={name} size={20} />
        <span className="occ-muted">{name}</span>
      </div>
    ))}
  </div>
);

export const Sizes = () => (
  <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
    <Icon name="cube" size={16} />
    <Icon name="cube" size={24} />
    <Icon name="cube" size={40} />
  </div>
);
