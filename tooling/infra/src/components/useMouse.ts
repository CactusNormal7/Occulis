import { useEffect, useRef } from "react";
import { useStdin } from "ink";

export interface MouseEvent {
  type: "click" | "move" | "wheel";
  /** 0-based terminal column. */
  x: number;
  /** 0-based terminal row. */
  y: number;
  /** Pour wheel : -1 vers le haut, +1 vers le bas. */
  dir: number;
}

export const MOUSE_ENABLE = "\x1b[?1000h\x1b[?1002h\x1b[?1003h\x1b[?1006h";
export const MOUSE_DISABLE = "\x1b[?1006l\x1b[?1003l\x1b[?1002l\x1b[?1000l";

const SGR = /\x1b\[<(\d+);(\d+);(\d+)([Mm])/g;

// Active le suivi souris SGR et traduit les séquences en événements. Le handler est
// gardé dans une ref : l'abonnement stdin et les séquences d'activation ne sont
// posés qu'une fois, sinon le va-et-vient enable/disable à chaque survol fait
// perdre l'événement de clic qui suit.
export function useMouse(handler: (event: MouseEvent) => void): void {
  const { stdin, setRawMode, isRawModeSupported } = useStdin();
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!isRawModeSupported) return;
    setRawMode(true);
    process.stdout.write(MOUSE_ENABLE);

    const onData = (data: Buffer | string) => {
      const text = data.toString("utf8");
      for (const match of text.matchAll(SGR)) {
        const b = Number(match[1]);
        const x = Number(match[2]) - 1;
        const y = Number(match[3]) - 1;
        const press = match[4] === "M";
        if (b === 64 || b === 65) {
          handlerRef.current({ type: "wheel", x, y, dir: b === 64 ? -1 : 1 });
        } else if (b & 32) {
          handlerRef.current({ type: "move", x, y, dir: 0 });
        } else if (press && (b & 3) === 0) {
          handlerRef.current({ type: "click", x, y, dir: 0 });
        }
      }
    };

    stdin.on("data", onData);
    return () => {
      stdin.off("data", onData);
      process.stdout.write(MOUSE_DISABLE);
    };
  }, [stdin, setRawMode, isRawModeSupported]);
}
