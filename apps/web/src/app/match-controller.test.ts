import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type Action, Board, createGame, rulesetFor, startMemory, viewFor } from "@occulis/core";
import type { TeamPreset } from "@occulis/protocol";
import type { MatchChannel, MatchHandlers } from "../net/match-channel.js";
import type { DeploymentState } from "../net/session.js";
import type { FlowEvent, Stage } from "../ui/flow.js";
import { MatchController, type MatchEffects } from "./match-controller.js";

const VERSION = "provisional-1";

/** Un plateau ouvert de 14 × 14 : un éclaireur et un chef de chaque côté suffisent. */
const OPEN = Array.from({ length: 14 }, () => "0".repeat(14));

function position() {
  const board = Board.fromAscii(OPEN);
  const ruleset = rulesetFor(VERSION);
  const { state, knowledge } = startMemory(
    createGame(board, ruleset, [
      { id: "a-scout", kind: "scout", owner: "A", coord: { x: 0, y: 0 } },
      { id: "a-cmd", kind: "commander", owner: "A", coord: { x: 0, y: 13 } },
      { id: "b-cmd", kind: "commander", owner: "B", coord: { x: 13, y: 13 } },
    ]),
  );
  return { board, view: viewFor(state, knowledge.A) };
}

interface FakeChannel extends MatchChannel {
  readonly handlers: MatchHandlers;
  readonly submitted: Action[];
  closed: boolean;
}

function harness(overrides: Partial<MatchEffects> = {}) {
  const channels: FakeChannel[] = [];
  const open = (handlers: MatchHandlers): FakeChannel => {
    const channel: FakeChannel = {
      handlers,
      submitted: [],
      closed: false,
      submit: (action) => void channel.submitted.push(action),
      deploy: () => undefined,
      close: () => void (channel.closed = true),
    };
    channels.push(channel);
    return channel;
  };

  let stage: Stage["kind"] = "menu";
  const events: FlowEvent[] = [];
  const log = { refresh: 0, reports: [] as string[], announced: 0, islands: 0, cleared: 0 };
  const notices: string[] = [];
  let leaves = 0;
  let lost = 0;
  const presetReads: ((presets: readonly TeamPreset[]) => void)[] = [];

  const controller = new MatchController({
    connect: (_id, _seat, handlers) => open(handlers),
    spectate: (_id, _side, handlers) => open(handlers),
    presets: {
      cached: () => [],
      reload: () => new Promise((resolve) => void presetReads.push(resolve)),
    },
    stillSeated: () => Promise.resolve("gone"),
    stage: () => stage,
    go: (event) => void events.push(event),
    showIslands: () => void (log.islands += 1),
    ensureBoard: () => undefined,
    clearBoard: () => void (log.cleared += 1),
    seated: () => undefined,
    reports: () => ({
      refresh: () => void (log.refresh += 1),
      report: (message) => void log.reports.push(message),
      announce: () => void (log.announced += 1),
    }),
    notify: (message) => void notices.push(message),
    leave: () => void (leaves += 1),
    connectionLost: () => Promise.resolve().then(() => void (lost += 1)),
    ...overrides,
  });

  /** Assied le joueur et lui donne sa première vue, comme le fait le serveur. */
  const seat = (spectating = false): FakeChannel => {
    const channel = channels[channels.length - 1]!;
    const { board, view } = position();
    channel.handlers.onSeated({
      player: "A",
      scenario: "open",
      board,
      rulesetVersion: VERSION,
      view,
      spectating,
    });
    return channel;
  };

  return {
    controller,
    channels,
    events,
    log,
    notices,
    setStage: (next: Stage["kind"]) => void (stage = next),
    presetReads,
    leaves: () => leaves,
    lost: () => lost,
    seat,
  };
}

const STEP: Action = { kind: "move", pieceId: "a-scout", to: { x: 1, y: 0 } };

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("MatchController", () => {
  describe("un seul canal à la fois", () => {
    it("referme le canal précédent avant d'en ouvrir un autre", () => {
      const { controller, channels } = harness();

      controller.sit("m1", "seat-1");
      controller.sit("m2", "seat-2");

      expect(channels).toHaveLength(2);
      expect(channels[0]!.closed).toBe(true);
      expect(channels[1]!.closed).toBe(false);
    });

    it("referme aussi celui d'une partie regardée quand on s'assied", () => {
      const { controller, channels } = harness();

      controller.watch("Ada", "m1", "A");
      controller.sit("m2", "seat-2");

      expect(channels[0]!.closed).toBe(true);
      expect(controller.watching).toBeUndefined();
    });

    it("referme le canal précédent quand on regarde une partie", () => {
      const { controller, channels } = harness();

      controller.sit("m1", "seat-1");
      controller.watch("Ada", "m2", "B");

      expect(channels[0]!.closed).toBe(true);
      expect(controller.watching).toBe("Ada");
    });
  });

  describe("close", () => {
    it("remet la table à zéro", () => {
      const { controller, channels, seat, log } = harness();
      controller.sit("m1", "seat-1");
      seat();
      controller.play(STEP);
      controller.hover({ x: 1, y: 1 });
      channels[0]!.handlers.onSpectators?.(2);
      expect(controller.match).toBeDefined();
      expect(controller.pending).toBe(true);
      expect(controller.spectators).toBe(2);

      const cleared = log.cleared;
      controller.close();

      expect(channels[0]!.closed).toBe(true);
      expect(controller.hasChannel).toBe(false);
      expect(controller.match).toBeUndefined();
      expect(controller.pending).toBe(false);
      expect(controller.selection).toBeUndefined();
      expect(controller.animation).toBeUndefined();
      expect(controller.hovered).toBeUndefined();
      expect(controller.deploying).toBeUndefined();
      expect(controller.spectators).toBe(0);
      expect(log.cleared).toBe(cleared + 1);
    });
  });

  describe("jouer", () => {
    it("refuse tant que le serveur n'a pas assis le joueur", () => {
      const { controller } = harness();

      expect(controller.play(STEP)).toEqual({ ok: false, error: { code: "game-over" } });
      expect(controller.pending).toBe(false);
    });

    it("envoie le coup, attend la réponse, et ne déplace rien", () => {
      const { controller, seat } = harness();
      controller.sit("m1", "seat-1");
      const channel = seat();
      const before = controller.match!.state;

      expect(controller.play(STEP).ok).toBe(true);

      expect(channel.submitted).toEqual([STEP]);
      expect(controller.pending).toBe(true);
      expect(controller.match!.state).toBe(before);
    });

    it("rouvre le jeu quand le serveur refuse le coup", () => {
      const { controller, seat, log } = harness();
      controller.sit("m1", "seat-1");
      const channel = seat();
      controller.play(STEP);

      channel.handlers.onRejected({ code: "not-your-turn", activePlayer: "B" });

      expect(controller.pending).toBe(false);
      expect(log.reports).toHaveLength(1);
    });

    it("n'envoie rien en spectateur", () => {
      const { controller, seat } = harness();
      controller.watch("Ada", "m1", "A");
      const channel = seat(true);

      controller.play(STEP);

      expect(channel.submitted).toEqual([]);
    });
  });

  describe("regarder la partie d'un ami", () => {
    it("quitte et prévient quand aucune vue n'arrive à l'échéance", () => {
      const { controller, leaves, notices } = harness();

      controller.watch("Ada", "m1", "A");
      vi.advanceTimersByTime(6000);

      expect(leaves()).toBe(1);
      expect(notices.at(-1)).toContain("Ada");
    });

    it("garde la partie quand le serveur accepte le spectateur", () => {
      const { controller, channels, leaves } = harness();

      controller.watch("Ada", "m1", "A");
      channels[0]!.handlers.onWatching?.();
      vi.advanceTimersByTime(6000);

      expect(leaves()).toBe(0);
    });

    it("garde la partie quand la première vue est arrivée", () => {
      const { controller, seat, leaves } = harness();

      controller.watch("Ada", "m1", "A");
      seat(true);
      vi.advanceTimersByTime(6000);

      expect(leaves()).toBe(0);
    });

    it("n'attend plus rien d'une partie refermée avant l'échéance", () => {
      const { controller, leaves } = harness();

      controller.watch("Ada", "m1", "A");
      controller.close();
      vi.advanceTimersByTime(6000);

      expect(leaves()).toBe(0);
    });
  });

  describe("quitter une partie", () => {
    it("demande confirmation pour une partie vivante", () => {
      const { controller, seat } = harness();
      controller.sit("m1", "seat-1");
      seat();

      expect(controller.requestLeave()).toBe(true);
      expect(controller.leaving).toBe(true);
    });

    it("ne demande rien sans partie", () => {
      const { controller } = harness();

      expect(controller.requestLeave()).toBe(false);
      expect(controller.leaving).toBe(false);
    });

    it("ne demande rien à un spectateur", () => {
      const { controller, seat } = harness();
      controller.watch("Ada", "m1", "A");
      seat(true);

      expect(controller.requestLeave()).toBe(false);
    });

    it("abandonne sur le canal à la confirmation", () => {
      const { controller, seat } = harness();
      controller.sit("m1", "seat-1");
      const channel = seat();
      controller.requestLeave();

      controller.confirmLeave();

      expect(channel.submitted).toEqual([{ kind: "resign" }]);
      expect(controller.leaving).toBe(false);
    });

    it("n'abandonne pas quand le joueur se ravise", () => {
      const { controller, seat } = harness();
      controller.sit("m1", "seat-1");
      const channel = seat();
      controller.requestLeave();

      controller.cancelLeave();

      expect(channel.submitted).toEqual([]);
      expect(controller.leaving).toBe(false);
    });
  });

  describe("connexion perdue", () => {
    it("quitte quand le serveur ne tient plus le joueur assis", async () => {
      const { controller, channels, leaves, lost } = harness();
      controller.sit("m1", "seat-1");

      channels[0]!.handlers.onStatus("unreachable");
      await vi.runAllTimersAsync();

      expect(leaves()).toBe(1);
      expect(lost()).toBe(1);
    });

    it("laisse le canal réessayer quand le réseau est simplement coupé", async () => {
      const { controller, channels, leaves } = harness({
        stillSeated: () => Promise.resolve("unknown"),
      });
      controller.sit("m1", "seat-1");

      channels[0]!.handlers.onStatus("unreachable");
      await vi.runAllTimersAsync();

      expect(leaves()).toBe(0);
    });

    it("ignore une réponse qui arrive après la fermeture de la partie", async () => {
      let answer: (value: "gone") => void = () => undefined;
      const { controller, channels, leaves } = harness({
        stillSeated: () => new Promise((resolve) => (answer = resolve)),
      });
      controller.sit("m1", "seat-1");
      channels[0]!.handlers.onStatus("unreachable");

      controller.close();
      answer("gone");
      await vi.runAllTimersAsync();

      expect(leaves()).toBe(0);
    });
  });

  describe("vues du serveur", () => {
    /** La même position, l'éclaireur d'une case plus loin. */
    const moved = () => {
      const { view } = position();
      return {
        ...view,
        ownPieces: view.ownPieces.map((piece) =>
          piece.id === "a-scout" ? { ...piece, coord: { x: 1, y: 0 } } : piece,
        ),
      };
    };

    it("lève le coup en attente et anime le déplacement", () => {
      const { controller, channels, seat, log } = harness();
      controller.sit("m1", "seat-1");
      seat();
      controller.play(STEP);
      const refreshed = log.refresh;

      channels[0]!.handlers.onView(moved());

      expect(controller.pending).toBe(false);
      expect(controller.animation).toBeDefined();
      expect(log.refresh).toBe(refreshed + 1);
    });

    it("rafraîchit la console à la fin de l'animation, pas avant", () => {
      const { controller, channels, seat, log } = harness();
      controller.sit("m1", "seat-1");
      seat();
      channels[0]!.handlers.onView(moved());
      const refreshed = log.refresh;

      controller.advance(1);
      expect(controller.animation).toBeDefined();
      expect(log.refresh).toBe(refreshed);

      controller.advance(60_000);
      expect(controller.animation).toBeUndefined();
      expect(log.refresh).toBe(refreshed + 1);
    });

    it("n'avance rien sans animation", () => {
      const { controller, log } = harness();

      controller.advance(16);

      expect(log.refresh).toBe(0);
    });

    it("annonce la fin de partie que la vue porte", () => {
      const { controller, channels, seat, log } = harness();
      controller.sit("m1", "seat-1");
      seat();

      channels[0]!.handlers.onView({
        ...position().view,
        outcome: { kind: "victory", winner: "A", reason: "resignation" },
      });

      expect(log.announced).toBe(1);
    });

    it("signale une version périmée et une reconnexion, sans rien quitter", () => {
      const { controller, channels, seat, log, leaves } = harness();
      controller.sit("m1", "seat-1");
      seat();

      channels[0]!.handlers.onOutdated(7);
      channels[0]!.handlers.onStatus("reconnecting");

      expect(log.reports).toHaveLength(2);
      expect(leaves()).toBe(0);
    });

    it("ne signale pas une reconnexion avant que la partie existe", () => {
      const { controller, channels, log } = harness();
      controller.sit("m1", "seat-1");

      channels[0]!.handlers.onStatus("reconnecting");

      expect(log.reports).toEqual([]);
    });
  });

  describe("clic sur le plateau", () => {
    it("sélectionne sa pièce, puis joue vers une case permise", () => {
      const { controller, channels, seat } = harness();
      controller.sit("m1", "seat-1");
      seat();

      expect(controller.pick({ x: 0, y: 0 })).toBeUndefined();
      expect(controller.selection?.piece.id).toBe("a-scout");

      expect(controller.pick({ x: 1, y: 0 })).toEqual(STEP);
      expect(channels[0]!.submitted).toEqual([]);
    });

    it("désélectionne en recliquant, et en cliquant hors plateau", () => {
      const { controller, seat } = harness();
      controller.sit("m1", "seat-1");
      seat();

      controller.pick({ x: 0, y: 0 });
      controller.pick({ x: 0, y: 0 });
      expect(controller.selection).toBeUndefined();

      controller.pick({ x: 0, y: 0 });
      controller.pick(undefined);
      expect(controller.selection).toBeUndefined();
    });

    it("ne fait rien sans partie", () => {
      const { controller } = harness();

      expect(controller.pick({ x: 0, y: 0 })).toBeUndefined();
    });

    it("efface la sélection quand le coup part", () => {
      const { controller, seat } = harness();
      controller.sit("m1", "seat-1");
      seat();
      controller.pick({ x: 0, y: 0 });

      controller.play(STEP);

      expect(controller.selection).toBeUndefined();
    });
  });

  describe("déploiement", () => {
    const announce = (channel: FakeChannel, remainingMs: number) => {
      const { board } = position();
      channel.handlers.onDeployment({
        player: "A",
        scenario: "open",
        board,
        rulesetVersion: VERSION,
        deployment: { remainingMs } as DeploymentState,
      });
    };

    it("montre l'annonce, puis l'efface à la première vue", () => {
      const { controller, channels, events, seat } = harness();
      controller.sit("m1", "seat-1");

      announce(channels[0]!, 30_000);
      expect(controller.deploying?.deployment.remainingMs).toBe(30_000);
      expect(events.at(-1)).toEqual({ kind: "deploying" });

      seat();
      expect(controller.deploying).toBeUndefined();
    });

    it("n'écrase pas l'instant d'arrivée tant que le temps restant ne change pas", () => {
      const { controller, channels } = harness();
      controller.sit("m1", "seat-1");
      announce(channels[0]!, 30_000);
      const first = controller.deploying!.receivedAt;

      vi.advanceTimersByTime(500);
      announce(channels[0]!, 30_000);

      expect(controller.deploying!.receivedAt).toBe(first);
    });

    it("garde un refus du serveur pour l'écran de déploiement, sans rouvrir le jeu", () => {
      const { controller, channels, setStage, log } = harness();
      controller.sit("m1", "seat-1");
      announce(channels[0]!, 30_000);
      setStage("deploying");

      channels[0]!.handlers.onRejected({ code: "already-locked" });

      expect(controller.deploying?.rejection).toBeTypeOf("string");
      expect(log.reports).toEqual([]);
    });

    it("ignore la relecture des équipes d'une partie refermée", async () => {
      const { controller, channels, presetReads } = harness();
      controller.sit("m1", "seat-1");
      controller.sit("m2", "seat-2");
      announce(channels[1]!, 30_000);

      // La relecture lancée pour m1 répond après que m2 a pris la table.
      const late: TeamPreset[] = [{ id: "late" } as unknown as TeamPreset];
      presetReads[0]!(late);
      await vi.runAllTimersAsync();
      expect(controller.deploying?.presets).toEqual([]);

      // Celle de la partie courante, en revanche, est reprise.
      const current: TeamPreset[] = [{ id: "current" } as unknown as TeamPreset];
      presetReads[1]!(current);
      await vi.runAllTimersAsync();
      expect(controller.deploying?.presets).toBe(current);
    });
  });
});
