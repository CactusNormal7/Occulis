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
});
