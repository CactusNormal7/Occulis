import { useState } from "react";
import { MoveList } from "@occulis/ui";

const entries = [
  { number: "—", text: "départ" },
  { number: "1", seat: "A" as const, text: "0,7 → 3,7" },
  { number: "2", seat: "B" as const, text: "9,0 → 9,3" },
  { number: "3", seat: "A" as const, text: "3,7 → 6,7" },
  { number: "4", seat: "B" as const, text: "9,3 → 9,6" },
  { number: "5", seat: "A" as const, text: "6,7 → 7,7" },
  { number: "6", seat: "B" as const, text: "abandon" },
];

export const History = () => {
  const [pinned, setPinned] = useState(3);
  const [shown, setShown] = useState(3);
  return (
    <MoveList entries={entries} pinned={pinned} shown={shown} onPreview={setShown} onPick={setPinned} onLeave={() => setShown(pinned)} />
  );
};

export const Interrupted = () => (
  <MoveList entries={[...entries.slice(0, 4), { number: "4", seat: "B", text: "9,3 → 9,6", disabled: true }]} pinned={3} />
);
