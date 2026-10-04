import { useState } from "react";
import { ChipGroup, Dialog, Note, TextField } from "@occulis/ui";

export const Suspend = () => {
  const [days, setDays] = useState("7");
  return (
    <Dialog open title="Suspendre anne" confirmLabel="Suspendre" danger onConfirm={() => false} onClose={() => undefined}>
      <Note>Ses sessions sont fermées tout de suite, et il ne peut plus en ouvrir jusqu'à la levée.</Note>
      <TextField label="motif (facultatif)" defaultValue="triche répétée" />
      <ChipGroup
        options={[
          { value: "1", label: "1 jour" },
          { value: "7", label: "7 jours" },
          { value: "30", label: "30 jours" },
          { value: "", label: "définitive" },
        ]}
        value={days}
        onChange={setDays}
      />
      <TextField label="durée en jours" value={days} onChange={(event) => setDays(event.target.value)} />
    </Dialog>
  );
};
