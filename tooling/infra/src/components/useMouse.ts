import { useEffect } from "react";
import { useStdin, useStdout } from "ink";

export interface MouseEvent {
  type: "click" | "move" | "wheel";
  /** 0-based terminal column. */
  x: number;
  /** 0-based terminal row. */
  y: number;
  /** Pour wheel : -1 vers le haut, +1 vers le bas. */
  dir: number;
}

const ENABLE = "\x1b[?1000h\x1b[?1003h\x1b[?1006h";
const DISABLE = "\x1b[?1000l\x1b[?1003l\x1b[?1006l";
const SGR = /\x1b\[<(\d+);(\d+);(\d+)([Mm])/g;

// Active le suivi souris SGR et traduit les séquences en événements. Ink continue
// de gérer le clavier ; ces octets-là ne matchent aucun raccourci Ink.
export function useMouse(handler: (event: MouseEvent) => void): void {
  const { stdin, setRawMode, isRawModeSupported } = useStdin();
  const { stdout } = useStdout();

  useEffect(() => {
    if (!isRawModeSupported) return;
    setRawMode(true);
    stdout.write(ENABLE);

    const onData = (data: Buffer | string) => {
      const text = data.toString("utf8");
      for (const match of text.matchAll(SGR)) {
        const b = Number(match[1]);
        const x = Number(match[2]) - 1;
        const y = Number(match[3]) - 1;
        const press = match[4] === "M";
        if (b === 64 || b === 65) {
          handler({ type: "wheel", x, y, dir: b === 64 ? -1 : 1 });
        } else if (b & 32) {
          handler({ type: "move", x, y, dir: 0 });
        } else if (press && (b & 3) === 0) {
          handler({ type: "click", x, y, dir: 0 });
        }
      }
    };

    stdin.on("data", onData);
    return () => {
      stdin.off("data", onData);
      stdout.write(DISABLE);
    };
  }, [stdin, stdout, setRawMode, isRawModeSupported, handler]);
}
