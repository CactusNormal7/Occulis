import type { ChatMessage } from "@occulis/protocol";
import { describe, expect, it } from "vitest";
import { merged, withMessage } from "./thread.js";

function message(id: string, createdAt: number, body = id): ChatMessage {
  return { id, sender: "anne", recipient: "bruno", body, createdAt, readAt: null };
}

describe("withMessage", () => {
  it("ajoute un message nouveau à la fin du fil", () => {
    const thread = [message("1", 10)];
    expect(withMessage(thread, message("2", 20)).map((m) => m.id)).toEqual(["1", "2"]);
  });

  it("ignore un message déjà reçu, par l'envoi comme par le canal", () => {
    const thread = [message("1", 10)];
    expect(withMessage(thread, message("1", 10))).toBe(thread);
  });
});

describe("merged", () => {
  it("réunit deux morceaux du fil dans l'ordre d'envoi, sans doublon", () => {
    const older = [message("1", 10), message("2", 20)];
    const current = [message("2", 20), message("3", 30)];
    expect(merged(older, current).map((m) => m.id)).toEqual(["1", "2", "3"]);
  });

  it("garde la version la plus récente d'un message relu", () => {
    const read = { ...message("1", 10), readAt: 15 };
    expect(merged([read], [message("1", 10)])[0]?.readAt).toBe(15);
  });
});
