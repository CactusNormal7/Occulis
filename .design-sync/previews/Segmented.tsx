import { useState } from "react";
import { Segmented } from "@occulis/ui";

export const Filter = () => {
  const [value, setValue] = useState("ongoing");
  return (
    <Segmented
      label="Filtrer les parties"
      value={value}
      onChange={setValue}
      options={[
        { value: "all", label: "toutes" },
        { value: "ongoing", label: "en cours" },
        { value: "finished", label: "terminées" },
      ]}
    />
  );
};

export const PlayerView = () => {
  const [value, setValue] = useState("A");
  return (
    <Segmented
      label="Point de vue"
      value={value}
      onChange={setValue}
      options={[
        { value: "all", label: "tout" },
        { value: "A", label: "vue d'anne", camp: "A" },
        { value: "B", label: "vue de bruno", camp: "B" },
      ]}
    />
  );
};
