import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import { useMouse } from "./useMouse.js";
import { ACCENT } from "./theme.js";

export interface Item {
  key: string;
  label: string;
  hint?: string;
  icon?: string;
  disabled?: boolean;
}

interface Props {
  items: Item[];
  /** Ligne (0-based) où s'affiche le premier item, pour le mapping souris. */
  firstRow: number;
  onSelect: (key: string) => void;
  onCancel?: () => void;
}

function digitFor(index: number): string {
  return index < 9 ? String(index + 1) : index === 9 ? "0" : " ";
}

export function SelectList({ items, firstRow, onSelect, onCancel }: Props): React.ReactElement {
  const [cursor, setCursor] = useState(0);

  const move = (delta: number) => {
    setCursor((c) => {
      let next = c;
      for (let i = 0; i < items.length; i++) {
        next = (next + delta + items.length) % items.length;
        if (!items[next]!.disabled) break;
      }
      return next;
    });
  };

  const choose = (index: number) => {
    const item = items[index];
    if (item && !item.disabled) onSelect(item.key);
  };

  useInput((input, key) => {
    if (key.downArrow || input === "j") move(1);
    else if (key.upArrow || input === "k") move(-1);
    else if (key.return) choose(cursor);
    else if (key.escape || input === "q" || (key.ctrl && input === "c")) onCancel?.();
    else if (/^[0-9]$/.test(input)) {
      const index = input === "0" ? 9 : Number(input) - 1;
      if (index < items.length) {
        setCursor(index);
        choose(index);
      }
    }
  });

  useMouse((event) => {
    const index = event.y - firstRow;
    if (index < 0 || index >= items.length) return;
    if (event.type === "move") {
      if (!items[index]!.disabled) setCursor(index);
    } else if (event.type === "click") {
      choose(index);
    } else if (event.type === "wheel") {
      move(event.dir);
    }
  });

  return (
    <Box flexDirection="column">
      {items.map((item, index) => {
        const active = index === cursor;
        const color = item.disabled ? "gray" : active ? ACCENT : "white";
        return (
          <Text key={item.key} wrap="truncate-end">
            <Text color={active ? ACCENT : "gray"}>{active ? "❯ " : "  "}</Text>
            <Text color={active ? ACCENT : "gray"} dimColor={!active}>
              {digitFor(index)}{" "}
            </Text>
            <Text color={color} bold={active}>
              {item.icon ? `${item.icon}  ` : ""}
              {item.label}
            </Text>
            {item.hint ? <Text color="gray" dimColor>{`  ·  ${item.hint}`}</Text> : null}
          </Text>
        );
      })}
    </Box>
  );
}
