import { ToastStack } from "@occulis/ui";

export const Messages = () => (
  <div style={{ position: "relative", height: 160, transform: "translateZ(0)" }}>
    <ToastStack
      messages={[
        { id: 1, text: "Pseudo changé, sur le compte et sur le profil de jeu.", ok: true },
        { id: 2, text: "Ce pseudo est déjà pris.", ok: false },
      ]}
    />
  </div>
);
