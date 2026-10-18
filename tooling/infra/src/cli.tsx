#!/usr/bin/env tsx
import { render } from "ink";
import { App, type InteractiveOutcome } from "./components/App.js";
import { MOUSE_DISABLE } from "./components/useMouse.js";
import { LEVEL_PREFIX, LEVEL_COLOR } from "./components/theme.js";
import { ACTIONS, type Level } from "./actions.js";

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

/**
 * Une action lancée directement, sans le menu : `pnpm infra dev` (ou `pnpm local`) démarre
 * le serveur local comme « Lancer le serveur en local ». Seules les actions marquées
 * `direct` s'y prêtent — ni choix d'environnement, ni effet distant, ni commit. Le code de
 * sortie dit l'issue : 2 pour une action refusée, 1 si l'action a signalé un échec.
 */
async function runDirect(id: string): Promise<void> {
  const action = ACTIONS.find((candidate) => candidate.id === id);
  if (action === undefined || action.direct !== true) {
    const direct = ACTIONS.filter((candidate) => candidate.direct === true);
    consoleLog(action === undefined ? `Action inconnue : « ${id} ».` : `« ${id} » ne se lance que depuis le menu (pnpm infra).`, "fail");
    consoleLog(`Directes : ${direct.map((candidate) => candidate.id).join(", ")}`, "info");
    process.exitCode = 2;
    return;
  }
  consoleLog(action.label, "step");
  inInteractive = action.interactive === true;
  // Les actions signalent un échec par le journal et rendent la main normalement : on le relève
  // ici pour qu'un script qui enchaîne sur `pnpm infra <id>` s'arrête.
  let failed = false;
  const log = (text: string, level: Level = "info"): void => {
    if (level === "fail") failed = true;
    consoleLog(text, level);
  };
  await action.run({ env: null, query: null, log });
  if (failed) process.exitCode = 1;
}

const direct = process.argv[2];

// Le menu sort par `process.exit` (Ink garde le terminal ouvert) ; une action directe se
// termine d'elle-même, sans couper la sortie qui s'écrit encore dans un tube.
(direct === undefined ? runMenu().then(() => process.exit(0)) : runDirect(direct))
  .catch((error) => {
    process.stderr.write(`${String(error)}\n`);
    process.exit(1);
  });
