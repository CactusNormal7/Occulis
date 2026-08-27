#!/usr/bin/env tsx
import { render } from "ink";
import { App, type InteractiveOutcome } from "./components/App.js";
import { LEVEL_PREFIX, LEVEL_COLOR } from "./components/theme.js";
import type { Level } from "./actions.js";

const COLOR_CODE: Record<string, string> = {
  green: "32",
  yellow: "33",
  red: "31",
  cyan: "36",
  gray: "90",
};

function consoleLog(text: string, level: Level = "info"): void {
  const code = COLOR_CODE[LEVEL_COLOR[level] ?? ""];
  const body = `${LEVEL_PREFIX[level]}${text}`;
  process.stdout.write(code ? `\x1b[${code}m${body}\x1b[0m\n` : `${body}\n`);
}

async function runMenu(): Promise<void> {
  for (;;) {
    let outcome: InteractiveOutcome | "quit" | null = null;

    // eslint-disable-next-line no-console
    console.clear();
    const instance = render(
      <App
        onInteractive={(value) => {
          outcome = value;
        }}
        onQuit={() => {
          outcome = "quit";
        }}
      />,
      { exitOnCtrlC: false },
    );
    await instance.waitUntilExit();

    if (outcome === null || outcome === "quit") {
      // eslint-disable-next-line no-console
      console.clear();
      return;
    }

    const { action, env } = outcome as InteractiveOutcome;
    // eslint-disable-next-line no-console
    console.clear();
    consoleLog(`${action.icon}  ${action.label}${env ? ` · ${env}` : ""}`, "step");
    try {
      await action.run({ env, query: null, log: consoleLog });
    } catch (error) {
      consoleLog(error instanceof Error ? error.message : String(error), "fail");
    }
    consoleLog("Retour au menu…", "info");
  }
}

runMenu()
  .then(() => process.exit(0))
  .catch((error) => {
    process.stderr.write(`${String(error)}\n`);
    process.exit(1);
  });
