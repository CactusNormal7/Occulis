import { useState } from "react";
import { ChipGroup } from "@occulis/ui";

export const BanDuration = () => {
  const [value, setValue] = useState("7");
  return (
    <ChipGroup
      value={value}
      onChange={setValue}
      options={[
        { value: "1", label: "1 jour" },
        { value: "7", label: "7 jours" },
        { value: "30", label: "30 jours" },
        { value: "", label: "définitive" },
      ]}
    />
  );
};
