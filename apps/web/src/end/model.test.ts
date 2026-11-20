import { describe, expect, it } from "vitest";
import { messagesFor } from "@occulis/i18n";
import { endTexts } from "./model.js";

const m = messagesFor("fr").game.end;
const resigned = (winner: "A" | "B") =>
  ({ kind: "victory", winner, reason: "resignation" }) as const;

describe("endTexts", () => {
  it("parle de l'ami regardé quand son adversaire abandonne", () => {
    expect(endTexts(m, { outcome: resigned("A"), side: "A", friend: "Ada" })).toEqual({
      won: true,
      title: m.friendWon("Ada"),
      detail: m.resignation.friendWon,
    });
  });

  it("parle de l'ami regardé quand il abandonne", () => {
    expect(endTexts(m, { outcome: resigned("B"), side: "A", friend: "Ada" })).toEqual({
      won: false,
      title: m.friendLost("Ada"),
      detail: m.resignation.friendLost("Ada"),
    });
  });

  it("distingue le mat de l'abandon", () => {
    const mated = { kind: "victory", winner: "B", reason: "checkmate" } as const;
    expect(endTexts(m, { outcome: mated, side: "A", friend: "Ada" })).toEqual({
      won: false,
      title: m.friendLost("Ada"),
      detail: m.checkmate.friendLost("Ada"),
    });
  });

  it("ne donne ni vainqueur ni perdant à une nulle", () => {
    const drawn = { kind: "draw", reason: "repetition" } as const;
    expect(endTexts(m, { outcome: drawn, side: "A", friend: "Ada" })).toEqual({
      won: false,
      title: m.friendDrew("Ada"),
      detail: m.draws.repetition,
    });
  });
});
