import React, { useCallback, useMemo, useState } from "react";
import { Box, Text, useApp, useInput } from "ink";
import TextInput from "ink-text-input";
import { SelectList, type Item } from "./SelectList.js";
import { OutputPane, type LogLine } from "./OutputPane.js";
import { ACCENT } from "./theme.js";
import { ACTIONS, type ActionDef } from "../actions.js";
import { listEnvNames, dbName, type EnvName } from "../config.js";
import { listBranchEnvNames, findDeployEnvironment } from "../deploy-manifest.js";
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

// Une action ciblant un environnement de branche ne propose que ceux-là : la cible est
// explicite, indépendante de la branche courante. Les autres gardent la liste complète.
function envItems(action: ActionDef): Item[] {
  if (action.branchEnvsOnly)
    return listBranchEnvNames().map((env) => {
      const entry = findDeployEnvironment(env);
      return {
        key: env,
        label: env,
        hint: entry
          ? `${entry.d1Database}  ·  branche ${entry.branch}`
          : `${dbName(env)}  ·  hors manifeste`,
      };
    });
  return listEnvNames()
    .filter((env) => !(action.remoteOnly && env === "local"))
    .map((env) => ({
      key: env,
      label: env,
      hint: env === "local" ? "SQLite émulé par wrangler dev" : dbName(env),
    }));
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

  // Recalculé à chaque entrée dans la phase : une action précédente a pu créer ou
  // supprimer un environnement.
  const envChoices = useMemo(
    () => (phase === "env" && action ? envItems(action) : []),
    [phase, action],
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

  // Échap est porté par SelectList : sans liste à l'écran (saisie libre, ou aucun
  // environnement à cibler), personne ne le capterait.
  useInput(
    (_input, key) => {
      if (key.escape) setPhase("menu");
    },
    { isActive: phase === "prompt" || (phase === "env" && envChoices.length === 0) },
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
          {envChoices.length === 0 ? (
            <Text color="gray">{"  Aucun environnement de branche — rien à cibler."}</Text>
          ) : (
            <SelectList
              items={envChoices}
              firstRow={FIRST_ROW + 2}
              onSelect={onEnvSelect}
              onCancel={() => setPhase("menu")}
            />
          )}
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
