import { Button, PageHead, SearchField } from "@occulis/ui";

export const WithTools = () => (
  <PageHead
    title="Comptes"
    count={132}
    tools={
      <>
        <SearchField placeholder="Pseudo ou adresse…" onSearch={() => undefined} />
        <Button icon="plus">Nouveau compte</Button>
      </>
    }
  />
);

export const TitleOnly = () => <PageHead title="Vue d'ensemble" />;
