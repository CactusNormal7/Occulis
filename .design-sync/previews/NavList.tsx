import { NavList } from "@occulis/ui";

export const Catalogue = () => (
  <NavList
    label="Components"
    sections={[
      { label: "Actions", items: [{ href: "#button", label: "Button", current: true }, { href: "#icon-button", label: "IconButton" }] },
      { label: "Forms", items: [{ href: "#text-field", label: "TextField" }, { href: "#segmented", label: "Segmented" }] },
    ]}
  />
);
