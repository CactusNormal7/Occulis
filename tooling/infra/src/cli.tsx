#!/usr/bin/env tsx
import { render } from "ink";
import { App, type InteractiveOutcome } from "./components/App.js";
import { MOUSE_DISABLE } from "./components/useMouse.js";
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

// Filet de sécurité : la nettoyage React ne s'exécute pas sur un kill dur. Sans ça,
// le terminal reste en suivi souris après coup (curseur figé, clics inertes).
function restoreTerminal(): void {
  process.stdout.write(`${MOUSE_DISABLE}\x1b[?25h`);
}
process.on("exit", restoreTerminal);

// Pendant une commande interactive (wrangler dev / tail / login), le Ctrl+C vise
// l'enfant : on le laisse mourir et la boucle revient au menu. Ailleurs, il quitte.
let inInteractive = false;
process.on("SIGINT", () => {
  if (inInteractive) return;
  restoreTerminal();
  process.exit(130);
});

async function runMenu(): Promise<void> {
  for (;;) {
    let outcome: InteractiveOutcome | "quit" | null = null;

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
    restoreTerminal();

    if (outcome === null || outcome === "quit") {
      console.clear();
      return;
    }

    const { action, env } = outcome as InteractiveOutcome;
    console.clear();
    consoleLog(`${action.label}${env ? ` · ${env}` : ""}`, "step");
    inInteractive = true;
    try {
      await action.run({ env, query: null, log: consoleLog });
    } catch (error) {
      consoleLog(error instanceof Error ? error.message : String(error), "fail");
    } finally {
      inInteractive = false;
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
