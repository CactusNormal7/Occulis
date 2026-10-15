import { describe, expect, it } from "vitest";
import type { Challenge, Friend, FriendsOverview } from "@occulis/protocol";
import {
  EMPTY_SOCIAL,
  challenged,
  presenceLabel,
  readAll,
  receive,
  relationTo,
  socialMessage,
  unreadTotal,
  withOverview,
} from "./model.js";

function friend(id: string, change: Partial<Friend> = {}): Friend {
  return { id, handle: id, online: false, since: 0, allowSpectators: true, unread: 0, matches: [], ...change };
}

function overview(friends: Friend[]): FriendsOverview {
  return { friends, incoming: [], outgoing: [], blocked: [] };
}

const CHALLENGE: Challenge = { from: { id: "bob", handle: "Bob" }, to: { id: "me", handle: "Moi" }, createdAt: 1 };

describe("état social", () => {
  it("allume et éteint la présence d'un ami", () => {
    const state = withOverview(EMPTY_SOCIAL, overview([friend("bob")]));
    const online = receive(state, { kind: "presence", playerId: "bob", online: true });
    expect(online.stale).toBe(false);
    expect(online.state.overview?.friends[0]?.online).toBe(true);
  });

  it("ignore la présence d'un inconnu", () => {
    const state = withOverview(EMPTY_SOCIAL, overview([friend("bob")]));
    expect(receive(state, { kind: "presence", playerId: "eve", online: true }).state).toBe(state);
  });

  it("compte les messages reçus d'un ami, pas ceux qu'on envoie", () => {
    const state = withOverview(EMPTY_SOCIAL, overview([friend("bob")]));
    const message = { id: "m", body: "salut", createdAt: 1, readAt: null };
    const received = receive(state, { kind: "message", message: { ...message, sender: "bob", recipient: "me" } });
    expect(unreadTotal(received.state)).toBe(1);
    const sent = receive(received.state, { kind: "message", message: { ...message, sender: "me", recipient: "bob" } });
    expect(unreadTotal(sent.state)).toBe(1);
    expect(unreadTotal(readAll(sent.state, "bob"))).toBe(0);
  });

  it("demande une relecture quand une relation change", () => {
    expect(receive(EMPTY_SOCIAL, { kind: "friends-changed" }).stale).toBe(true);
    expect(receive(EMPTY_SOCIAL, { kind: "friend-request", from: { id: "bob", handle: "Bob" } }).stale).toBe(true);
  });

  it("tient un défi reçu par ami, et le retire à l'annulation", () => {
    const once = receive(EMPTY_SOCIAL, { kind: "challenge", challenge: CHALLENGE }).state;
    const twice = receive(once, { kind: "challenge", challenge: { ...CHALLENGE, createdAt: 2 } }).state;
    expect(twice.incoming).toEqual([{ ...CHALLENGE, createdAt: 2 }]);
    const gone = receive(twice, { kind: "challenge-cancelled", from: "bob", to: "me" }).state;
    expect(gone.incoming).toEqual([]);
  });

  it("oublie son défi quand l'ami le refuse", () => {
    const sent = challenged(EMPTY_SOCIAL, "bob");
    expect(sent.outgoing).toEqual(["bob"]);
    expect(receive(sent, { kind: "challenge-cancelled", from: "me", to: "bob" }).state.outgoing).toEqual([]);
  });

  it("écarte les défis d'un ancien ami à la relecture", () => {
    const state = challenged(receive(EMPTY_SOCIAL, { kind: "challenge", challenge: CHALLENGE }).state, "bob");
    const after = withOverview(state, overview([]));
    expect(after.incoming).toEqual([]);
    expect(after.outgoing).toEqual([]);
  });

  it("dit si un ami est absent, en ligne ou en partie", () => {
    const match = { id: "m", side: "A" as const, opponent: "x", startedAt: 0, watchable: true };
    expect(presenceLabel(friend("bob"))).toBe("offline");
    expect(presenceLabel(friend("bob", { online: true }))).toBe("online");
    expect(presenceLabel(friend("bob", { online: true, matches: [match] }))).toBe("in a match");
  });

  it("traduit les refus du serveur", () => {
    expect(socialMessage("UNAVAILABLE")).toBe("This player is not available.");
    expect(socialMessage("toString")).toBeUndefined();
    expect(socialMessage("INCONNU")).toBeUndefined();
  });
});

describe("relation à un joueur", () => {
  const state = withOverview(EMPTY_SOCIAL, {
    friends: [friend("bob")],
    incoming: [{ id: "ann", handle: "Ann", createdAt: 1 }],
    outgoing: [{ id: "eve", handle: "Eve", createdAt: 1 }],
    blocked: [{ id: "max", handle: "Max" }],
  });

  it("lit la relation dans la liste", () => {
    expect(relationTo(state, "bob")).toBe("friend");
    expect(relationTo(state, "ann")).toBe("incoming");
    expect(relationTo(state, "eve")).toBe("outgoing");
    expect(relationTo(state, "max")).toBe("blocked");
    expect(relationTo(state, "zoe")).toBe("none");
  });

  it("ne dit rien tant que la liste n'est pas lue", () => {
    expect(relationTo(EMPTY_SOCIAL, "bob")).toBeUndefined();
  });
});
