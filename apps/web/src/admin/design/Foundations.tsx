import { useState } from "react";
import { Button, Card, CardGrid, Specimen, Swatch, SwatchGrid, Table, useMessages } from "@occulis/ui";
import { FONT, MOTION, SPACE, THEMES, cssColor, paletteVariables } from "@occulis/ui/tokens";
import { useTweaks } from "./context.js";
import { fromHex, paletteEntries, toHex } from "./tweaks.js";

/** Les tokens : la palette (retouchable), l'os par alpha, la typographie, les écarts, le mouvement. */
export function Foundations() {
  const m = useMessages().admin.design;
  const tweaks = useTweaks();
  const reference = new Map(paletteEntries(THEMES[tweaks.theme]).map((entry) => [entry.path, entry.value]));
  const variables = paletteVariables(tweaks.palette);
  const inks = ["--occ-ink", "--occ-ink-soft", "--occ-ink-dim", "--occ-ink-faint", "--occ-ink-line", "--occ-ink-ghost"];

  return (
    <>
      <Card title={m.foundations.palette(m.tweaks.themes[tweaks.theme])}>
        <SwatchGrid>
          {paletteEntries(tweaks.palette).map((entry) => (
            <Swatch
              key={entry.path}
              name={entry.path}
              color={cssColor(entry.value)}
              value={toHex(entry.value)}
              edited={reference.get(entry.path) !== entry.value}
              onChange={(text) => {
                const value = fromHex(text);
                if (value !== undefined) tweaks.setColor(entry.path, value);
              }}
            />
          ))}
        </SwatchGrid>
      </Card>
      <CardGrid>
        <Card title={m.foundations.ink}>
          <SwatchGrid>
            {inks.map((name) => (
              <Swatch key={name} name={name} color={`var(${name})`} value={variables[name] ?? ""} />
            ))}
          </SwatchGrid>
        </Card>
        <Card title={m.foundations.space}>
          {Object.entries(SPACE).map(([step, px]) => (
            <Specimen key={step} name={`--occ-space-${step}`} value={`${px}px`}>
              <span style={{ display: "block", width: `var(--occ-space-${step})`, height: 8, background: "var(--occ-ink-dim)" }} />
            </Specimen>
          ))}
        </Card>
      </CardGrid>
      <Card title={m.foundations.type}>
        {Object.entries(FONT.size).map(([step, px]) => {
          const name = `--occ-text-${step}`;
          return (
            <Specimen key={step} name={name} value={`${px}px`}>
              <span style={{ fontSize: `var(${name})`, lineHeight: 1.2, whiteSpace: "nowrap" }}>{m.foundations.sample}</span>
            </Specimen>
          );
        })}
        <Specimen name="--occ-font-pixel" value="Tiny5">
          <span style={{ fontFamily: "var(--occ-font-pixel)" }}>{m.foundations.sample}</span>
        </Specimen>
        <Specimen name="--occ-font-mono" value="ui-monospace">
          <span style={{ fontFamily: "var(--occ-font-mono)" }}>{m.foundations.sample}</span>
        </Specimen>
      </Card>
      <MotionTokens />
      <Card title={m.foundations.variables(Object.keys(variables).length)}>
        <Table columns={[m.foundations.name, m.foundations.value]} rowCount={Object.keys(variables).length}>
          {Object.entries(variables).map(([name, value]) => (
            <tr key={name}>
              <td>
                <code>{name}</code>
              </td>
              <td>
                <code>{value}</code>
              </td>
            </tr>
          ))}
        </Table>
      </Card>
    </>
  );
}

/** Les durées et la courbe de la charte, chacune sur un point qui traverse sa piste. */
function MotionTokens() {
  const m = useMessages().admin.design.foundations;
  const [moved, setMoved] = useState(false);
  const durations = [
    ["--occ-fast", MOTION.fast],
    ["--occ-base", MOTION.base],
    ["--occ-slow", MOTION.slow],
  ] as const;
  return (
    <Card
      title={m.motion}
      action={
        <Button size="sm" icon="play" onClick={() => setMoved((value) => !value)}>
          {m.replay}
        </Button>
      }
    >
      {durations.map(([name, value]) => (
        <Specimen key={name} name={name} value={value}>
          <span style={{ display: "block", width: "100%", height: 8, borderBottom: "1px solid var(--occ-ink-line)", containerType: "inline-size" }}>
            <span
              style={{
                display: "block",
                width: 8,
                height: 8,
                background: "var(--occ-ink)",
                transform: moved ? "translateX(calc(100cqw - 8px))" : "translateX(0)",
                transition: `transform var(${name}) var(--occ-ease)`,
              }}
            />
          </span>
        </Specimen>
      ))}
      <Specimen name="--occ-ease" value={MOTION.ease}>
        <span />
      </Specimen>
      <Specimen name="--occ-breath" value={MOTION.breath}>
        <span />
      </Specimen>
    </Card>
  );
}
