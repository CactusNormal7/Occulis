import { IconButton } from "@occulis/ui";

export const States = () => (
  <div style={{ display: "flex", gap: 8, alignItems: "center", paddingTop: 36 }}>
    <IconButton icon="eye" label="Voir la partie" />
    <IconButton icon="mail" label="Marquer l'adresse vérifiée" />
    <IconButton icon="trash" label="Supprimer le compte" danger />
    <IconButton icon="ban" label="Suspendre" disabledReason="Vous ne pouvez pas vous suspendre vous-même." />
  </div>
);

export const Playback = () => (
  <div style={{ display: "flex", gap: 2 }}>
    <IconButton icon="first" label="Position de départ" />
    <IconButton icon="previous" label="Coup précédent" />
    <IconButton icon="play" label="Lire la partie" />
    <IconButton icon="next" label="Coup suivant" />
    <IconButton icon="last" label="Dernière position" />
  </div>
);
