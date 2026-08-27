import React, { useEffect, useState } from "react";
import { Box, Text, useInput } from "ink";
import { useMouse } from "./useMouse.js";
import { LEVEL_COLOR, LEVEL_PREFIX } from "./theme.js";
import type { Level } from "../actions.js";

export interface LogLine {
  text: string;
  level: Level;
}

interface Props {
  title: string;
  lines: LogLine[];
  running: boolean;
  onDone: () => void;
}

const VIEWPORT = 18;
const SPIN = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

export function OutputPane({ title, lines, running, onDone }: Props): React.ReactElement {
  const [offset, setOffset] = useState(0); // lignes masquées en bas (0 = collé au flux)
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setFrame((f) => (f + 1) % SPIN.length), 80);
    return () => clearInterval(timer);
  }, [running]);

  const maxOffset = Math.max(0, lines.length - VIEWPORT);
  const clampedOffset = Math.min(offset, maxOffset);
  const end = lines.length - clampedOffset;
  const start = Math.max(0, end - VIEWPORT);
  const visible = lines.slice(start, end);

  const scroll = (delta: number) => setOffset((o) => Math.max(0, Math.min(maxOffset, o + delta)));

  useInput((input, key) => {
    if (key.upArrow || input === "k") scroll(1);
    else if (key.downArrow || input === "j") scroll(-1);
    else if (key.pageUp) scroll(VIEWPORT);
    else if (key.pageDown) scroll(-VIEWPORT);
    else if (!running && (key.return || key.escape || input === "q")) onDone();
  });

  useMouse((event) => {
    if (event.type === "wheel") scroll(event.dir === -1 ? 3 : -3);
  });

  return (
    <Box flexDirection="column">
      <Box>
        <Text color="cyan" bold>
          {running ? `${SPIN[frame]}  ` : "•  "}
          {title}
        </Text>
        {clampedOffset > 0 ? (
          <Text color="yellow">{`   ↑ ${clampedOffset} ligne(s) plus bas`}</Text>
        ) : null}
      </Box>
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor={running ? "cyan" : "gray"}
        paddingX={1}
        minHeight={VIEWPORT + 2}
      >
        {visible.length === 0 ? (
          <Text color="gray" dimColor>
            …
          </Text>
        ) : (
          visible.map((line, i) => (
            <Text key={start + i} color={LEVEL_COLOR[line.level]} wrap="truncate-end">
              {line.level === "raw" ? "" : LEVEL_PREFIX[line.level]}
              {line.text || " "}
            </Text>
          ))
        )}
      </Box>
      <Text color="gray" dimColor>
        {running
          ? "  molette / ↑↓ défiler · exécution en cours…"
          : "  Entrée ou Échap : retour au menu · molette défiler"}
      </Text>
    </Box>
  );
}
