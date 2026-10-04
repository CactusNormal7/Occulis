import { Card, CardColumn, CardGrid, EmptyState } from "@occulis/ui";

export const Stacked = () => (
  <CardGrid>
    <CardColumn>
      <Card title="Profil de jeu">
        <EmptyState>Aucun profil lié.</EmptyState>
      </Card>
      <Card title="Dernières parties">
        <EmptyState>Aucune partie.</EmptyState>
      </Card>
    </CardColumn>
    <Card title="Modifier">
      <p className="occ-muted" style={{ margin: 0 }}>pseudo, adresse, mot de passe</p>
    </Card>
  </CardGrid>
);
