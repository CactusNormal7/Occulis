import { describe, expect, it } from "vitest";
import { START, type Stage, advance } from "./flow.js";

const waiting: Stage = { kind: "waiting", seeking: "host", code: undefined };

describe("advance", () => {
  it("part du formulaire de compte et n'ouvre le menu qu'une fois connecté", () => {
    expect(START).toEqual({ kind: "auth" });
    expect(advance(START, { kind: "identity", signedIn: true })).toEqual({ kind: "menu" });
  });

  it("ramène au formulaire dès la déconnexion, y compris en pleine partie", () => {
    expect(advance({ kind: "game" }, { kind: "identity", signedIn: false })).toEqual({
      kind: "auth",
    });
  });

  it("n'arrache pas le joueur à sa partie quand l'identité est reconfirmée", () => {
    // `whoAmI` est rappelé à chaque action de compte : ce message revient donc en
    // pleine partie, et ne doit rien y changer.
    expect(advance({ kind: "game" }, { kind: "identity", signedIn: true })).toEqual({
      kind: "game",
    });
  });

  it("met en attente, puis y affiche le code du salon", () => {
    const sought = advance({ kind: "menu" }, { kind: "seek", seeking: "host" });
    expect(sought).toEqual(waiting);

    expect(advance(sought, { kind: "hosting", code: "ACDEF" })).toEqual({
      kind: "waiting",
      seeking: "host",
      code: "ACDEF",
    });
  });

  it("ignore un code arrivé après l'appariement", () => {
    // Message en retard : revenir à l'attente sortirait le joueur d'une partie
    // déjà commencée.
    expect(advance({ kind: "game" }, { kind: "hosting", code: "ACDEF" })).toEqual({
      kind: "game",
    });
  });

  it("passe en partie une fois assis, et revient au menu en la quittant", () => {
    const seated = advance(waiting, { kind: "seated" });
    expect(seated).toEqual({ kind: "game" });
    expect(advance(seated, { kind: "menu" })).toEqual({ kind: "menu" });
  });

  it("ne remonte jamais au menu sans compte", () => {
    expect(advance({ kind: "auth" }, { kind: "menu" })).toEqual({ kind: "auth" });
  });
});
