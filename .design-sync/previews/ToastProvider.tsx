import { Button, ToastProvider, useToast } from "@occulis/ui";

function Trigger() {
  const notify = useToast();
  return (
    <div style={{ display: "flex", gap: 12 }}>
      <Button onClick={() => notify("Sessions fermées.")}>Fermer les sessions</Button>
      <Button variant="danger" onClick={() => notify("Action réservée aux administrateurs.", false)}>
        Supprimer
      </Button>
    </div>
  );
}

export const Usage = () => (
  <ToastProvider>
    <Trigger />
  </ToastProvider>
);
