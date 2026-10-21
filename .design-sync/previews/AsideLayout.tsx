import { AsideLayout, Card, NavList, Note } from "@occulis/ui";

export const CatalogueLayout = () => (
  <AsideLayout
    aside={
      <Card title="Sections">
        <NavList sections={[{ label: "Foundations", items: [{ href: "#tokens", label: "Tokens", current: true }, { href: "#motion", label: "Motion" }] }]} />
      </Card>
    }
  >
    <Card title="Tokens">
      <Note>The content column takes the remaining width; the aside stays in view while it scrolls.</Note>
    </Card>
  </AsideLayout>
);
