import { useState } from "react";
import { CipherText, type CipherMode } from "@occulis/ui/lab";

/**
 * Un texte du back-office pour le rôle `goy` : au repos il est écrit en glyphes ; sous le
 * pointeur il se déchiffre, et se rechiffre quand le pointeur part. Le texte réel reste lu par
 * les lecteurs d'écran (`CipherText`).
 */
export function CipheredText({ text }: { text: string }) {
  const [state, setState] = useState<{ mode: CipherMode; play: number }>({
    mode: "cipher",
    play: 0,
  });
  const move = (mode: CipherMode) => () => setState((last) => ({ mode, play: last.play + 1 }));
  return (
    <span onMouseEnter={move("decode")} onMouseLeave={move("encode")}>
      <CipherText text={text} mode={state.mode} pace="base" playKey={state.play} />
    </span>
  );
}
