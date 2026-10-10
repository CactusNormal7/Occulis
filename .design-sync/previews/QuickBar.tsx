import { IconButton, QuickBar } from "@occulis/ui";

export const AccountActions = () => (
  <QuickBar framed>
    <IconButton icon="mail" label="Marquer l'adresse vérifiée" />
    <IconButton icon="shield" label="Nommer administrateur" />
    <IconButton icon="ban" label="Suspendre" danger />
    <IconButton icon="impersonate" label="Se connecter en tant que ce joueur" />
    <IconButton icon="logout" label="Fermer toutes les sessions" />
    <IconButton icon="trash" label="Supprimer le compte" danger />
  </QuickBar>
);

export const Rotation = () => (
  <QuickBar>
    <IconButton icon="rotateLeft" label="Tourner d'un quart" />
    <IconButton icon="rotateRight" label="Tourner d'un quart" />
  </QuickBar>
);
