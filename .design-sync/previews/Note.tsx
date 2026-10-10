import { Note } from "@occulis/ui";

export const Explanation = () => (
  <div style={{ display: "grid", gap: 10, maxWidth: 420 }}>
    <Note>Le compte et ses sessions disparaissent. Le profil de jeu et l'historique des parties restent.</Note>
    <Note>Tout ce que vous ferez — file d'attente, coups, abandon — sera fait en son nom.</Note>
  </div>
);
