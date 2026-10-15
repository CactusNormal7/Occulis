import { describe, expect, it } from "vitest";
import { START, type Stage, advance } from "./flow.js";

const waiting: Stage = { kind: "waiting", seeking: "host", code: undefined };

describe("advance", () => {
  it("n'affiche ni formulaire ni menu avant de connaître l'identité", () => {
    expect(START).toEqual({ kind: "boot" });
    expect(advance(START, { kind: "identity", signedIn: true })).toEqual({ kind: "menu" });
    expect(advance(START, { kind: "identity", signedIn: false })).toEqual({ kind: "auth" });
  });

  it("ne quitte l'amorce que par l'identité", () => {
    expect(advance(START, { kind: "menu" })).toEqual(START);
    expect(advance(START, { kind: "deploying" })).toEqual(START);
    expect(advance(START, { kind: "teams" })).toEqual(START);
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

  it("attend la réponse d'un ami défié en le nommant", () => {
    expect(advance({ kind: "menu" }, { kind: "seek", seeking: "challenge", friend: "Bob" })).toEqual({
      kind: "waiting",
      seeking: "challenge",
      code: undefined,
      friend: "Bob",
    });
  });

  it("entre en spectateur dans la partie d'un ami", () => {
    const opening = advance({ kind: "menu" }, { kind: "seek", seeking: "watch", friend: "Bob" });
    expect(advance(opening, { kind: "seated", spectating: true })).toEqual({ kind: "game", spectating: true });
  });

  it("ouvre la fenêtre d'acceptation pendant l'attente rapide, et seulement là", () => {
    const quick = advance({ kind: "menu" }, { kind: "seek", seeking: "quick" });
    expect(advance(quick, { kind: "proposed" })).toEqual({ kind: "proposal" });
    expect(advance(waiting, { kind: "proposed" })).toEqual(waiting);
    expect(advance({ kind: "game" }, { kind: "proposed" })).toEqual({ kind: "game" });
  });

  it("remet en attente qui avait accepté, et au menu les autres", () => {
    expect(advance({ kind: "proposal" }, { kind: "lapsed", requeued: true })).toEqual({
      kind: "waiting",
      seeking: "quick",
      code: undefined,
    });
    expect(advance({ kind: "proposal" }, { kind: "lapsed", requeued: false })).toEqual({ kind: "menu" });
    expect(advance({ kind: "game" }, { kind: "lapsed", requeued: false })).toEqual({ kind: "game" });
  });

  it("passe par le déploiement avant la partie, depuis la file comme depuis un salon", () => {
    expect(advance({ kind: "proposal" }, { kind: "deploying" })).toEqual({ kind: "deploying" });
    expect(advance(waiting, { kind: "deploying" })).toEqual({ kind: "deploying" });
    expect(advance({ kind: "deploying" }, { kind: "seated" })).toEqual({ kind: "game" });
    // Un déploiement annoncé à nouveau (reconnexion) ne fait pas sortir d'une partie commencée.
    expect(advance({ kind: "game" }, { kind: "deploying" })).toEqual({ kind: "game" });
  });

  it("ouvre les équipes depuis le menu, et y revient", () => {
    const teams = advance({ kind: "menu" }, { kind: "teams" });
    expect(teams).toEqual({ kind: "teams" });
    expect(advance(teams, { kind: "menu" })).toEqual({ kind: "menu" });
    expect(advance({ kind: "game" }, { kind: "teams" })).toEqual({ kind: "game" });
  });
});
