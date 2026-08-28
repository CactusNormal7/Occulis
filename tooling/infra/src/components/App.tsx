import React, { useCallback, useMemo, useState } from "react";
import { Box, Text, useApp, useInput } from "ink";
import TextInput from "ink-text-input";
import { SelectList, type Item } from "./SelectList.js";
import { OutputPane, type LogLine } from "./OutputPane.js";
import { ACCENT } from "./theme.js";
import { ACTIONS, type ActionDef } from "../actions.js";
import { listEnvNames, dbName, type EnvName } from "../config.js";
import { configuredDatabaseId } from "../toml.js";
import { PLACEHOLDER } from "../config.js";

const FIRST_ROW = 4;

export interface InteractiveOutcome {
  action: ActionDef;
  env: EnvName | null;
}

interface Props {
  onInteractive: (outcome: InteractiveOutcome) => void;
  onQuit: () => void;
}

type Phase = "menu" | "env" | "prompt" | "output";

function tomlBadge(env: EnvName): string {
  const id = configuredDatabaseId(env);
  return !id || id.startsWith(PLACEHOLDER) ? `${env} (à créer)` : `${env} (ok)`;
}

export function App({ onInteractive, onQuit }: Props): React.ReactElement {
  const { exit } = useApp();
  const [phase, setPhase] = useState<Phase>("menu");
  const [action, setAction] = useState<ActionDef | null>(null);
  const [env, setEnv] = useState<EnvName | null>(null);
  const [queryValue, setQueryValue] = useState("");
  const [lines, setLines] = useState<LogLine[]>([]);
  const [running, setRunning] = useState(false);

  // Recalculé à chaque retour au menu : une nouvelle branche peut avoir été
  // créée entre-temps (action "Créer un environnement de branche").
  const subtitle = useMemo(
    () =>
      listEnvNames()
        .filter((e) => e !== "local")
        .map(tomlBadge)
        .join("   ·   "),
    [phase],
  );

  const menuItems: Item[] = ACTIONS.map((a) => ({
    key: a.id,
    label: a.label,
    hint: a.hint,
  }));
  menuItems.push({ key: "__quit", label: "Quitter" });

  const log = useCallback((text: string, level: LogLine["level"] = "info") => {
    setLines((prev) => [...prev, { text, level }]);
  }, []);

  const launch = useCallback(
    async (def: ActionDef, chosenEnv: EnvName | null, query: string | null) => {
      setPhase("output");
      setLines([]);
      setRunning(true);
      try {
        await def.run({ env: chosenEnv, query, log });
      } catch (error) {
        log(error instanceof Error ? error.message : String(error), "fail");
      } finally {
        setRunning(false);
      }
    },
    [log],
  );

  const proceed = useCallback(
    (def: ActionDef, chosenEnv: EnvName | null) => {
      if (def.prompt) {
        setEnv(chosenEnv);
        setQueryValue("");
        setPhase("prompt");
        return;
      }
      void launch(def, chosenEnv, null);
    },
    [launch],
  );

  const onMenuSelect = useCallback(
    (key: string) => {
      if (key === "__quit") {
        exit();
        onQuit();
        return;
      }
      const def = ACTIONS.find((a) => a.id === key)!;
      setAction(def);
      if (def.needsEnv) {
        setPhase("env");
        return;
      }
      if (def.interactive) {
        exit();
        onInteractive({ action: def, env: null });
        return;
      }
      proceed(def, null);
    },
    [exit, onInteractive, onQuit, proceed],
  );

  const onEnvSelect = useCallback(
    (key: string) => {
      const def = action!;
      const chosen = key as EnvName;
      if (def.interactive) {
        exit();
        onInteractive({ action: def, env: chosen });
        return;
      }
      proceed(def, chosen);
    },
    [action, exit, onInteractive, proceed],
  );

  useInput(
    (_input, key) => {
      if (phase === "prompt" && key.escape) setPhase("menu");
    },
    { isActive: phase === "prompt" },
  );

  return (
    <Box flexDirection="column">
      <Text> </Text>
      <Text>
        <Text backgroundColor={ACCENT} color="black" bold>
          {"  OCCULIS  "}
        </Text>
        <Text color={ACCENT} bold>
          {"  infrastructure Cloudflare"}
        </Text>
        {subtitle ? <Text color="gray">{`     wrangler.toml : ${subtitle}`}</Text> : null}
      </Text>
      <Text> </Text>

      {phase === "menu" && (
        <>
          <SelectList
            items={menuItems}
            firstRow={FIRST_ROW}
            onSelect={onMenuSelect}
            onCancel={() => {
              exit();
              onQuit();
            }}
          />
          <Text> </Text>
          <Text color="gray" dimColor>
            {
              "  ↑↓ / j k  déplacer   ·   1-9,0  accès direct   ·   clic & molette   ·   Entrée  valider   ·   Échap  quitter"
            }
          </Text>
        </>
      )}

      {phase === "env" && (
        <>
          <Text color="cyan">{`  ${action?.label} — choisir l'environnement`}</Text>
          <Text> </Text>
          <SelectList
            items={listEnvNames()
              .filter((e) => !(action?.remoteOnly && e === "local"))
              .map((e) => ({
                key: e,
                label: e,
                hint: e === "local" ? "SQLite émulé par wrangler dev" : dbName(e),
              }))}
            firstRow={FIRST_ROW + 2}
            onSelect={onEnvSelect}
            onCancel={() => setPhase("menu")}
          />
          <Text> </Text>
          <Text color="gray" dimColor>
            {"  Échap  retour"}
          </Text>
        </>
      )}

      {phase === "prompt" && (
        <>
          <Text color="cyan">{`  ${action?.prompt} :`}</Text>
          <Box>
            <Text color={ACCENT}>{"  ❯ "}</Text>
            <TextInput
              value={queryValue}
              onChange={setQueryValue}
              onSubmit={(value) => {
                if (value.trim()) void launch(action!, env, value);
                else setPhase("menu");
              }}
            />
          </Box>
          <Text> </Text>
          <Text color="gray" dimColor>
            {"  Entrée  exécuter   ·   Échap  retour"}
          </Text>
        </>
      )}

      {phase === "output" && (
        <OutputPane
          title={`${action?.label}${env ? ` · ${env}` : ""}`}
          lines={lines}
          running={running}
          onDone={() => setPhase("menu")}
        />
      )}
    </Box>
  );
}
