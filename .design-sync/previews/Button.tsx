import { Button } from "@occulis/ui";

export const Variants = () => (
  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
    <Button>Rejoindre</Button>
    <Button variant="primary">Jouer</Button>
    <Button variant="danger">Abandonner</Button>
    <Button variant="ghost">Annuler</Button>
  </div>
);

export const WithIcon = () => (
  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
    <Button icon="plus">Nouveau compte</Button>
    <Button icon="logout" size="sm">
      Tout fermer
    </Button>
    <Button variant="danger" icon="trash">
      Supprimer
    </Button>
  </div>
);

export const Disabled = () => (
  <div style={{ display: "flex", gap: 12 }}>
    <Button variant="primary" disabled>
      Confirmer
    </Button>
    <Button disabled>Renommer</Button>
  </div>
);
