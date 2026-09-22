import { describe, expect, it } from "vitest";
import {
  CODE_ALPHABET,
  CODE_LENGTH,
  type Room,
  closeRoom,
  codeFrom,
  freeCode,
  normalizeCode,
  openRoom,
  takeRoom,
} from "./rooms.js";

const anne = { playerId: "anne", connectionId: "c1" };
const boris = { playerId: "boris", connectionId: "c2" };

describe("codeFrom", () => {
  it("ne tire que des caractères non confondables", () => {
    const code = codeFrom(new Uint8Array([0, 60, 120, 200, 255]));

    expect(code).toHaveLength(CODE_LENGTH);
    for (const character of code) expect(CODE_ALPHABET).toContain(character);
    // Les paires que l'œil confond ne doivent jamais sortir : un code se recopie
    // à la main, et `O` lu `0` coûte une partie manquée.
    expect(code).not.toMatch(/[BILOSZ01258]/);
  });

  it("est déterministe : mêmes octets, même code", () => {
    const bytes = new Uint8Array([7, 7, 7, 7, 7]);
    expect(codeFrom(bytes)).toBe(codeFrom(bytes));
  });
});

describe("normalizeCode", () => {
  it("pardonne la casse et les espaces d'une saisie manuelle", () => {
    expect(normalizeCode("  a c d e f ")).toBe("ACDEF");
  });
});

describe("openRoom", () => {
  it("ouvre un salon sous le code proposé", () => {
    const { rooms, room } = openRoom([], anne, "ACDEF");

    expect(room.code).toBe("ACDEF");
    expect(rooms).toEqual([{ code: "ACDEF", host: anne }]);
  });

  it("rend son code à un hôte qui revient, et retient sa nouvelle connexion", () => {
    // Une reconnexion renvoie l'intention : un code neuf périmerait celui que
    // l'hôte a déjà transmis à son adversaire.
    const first = openRoom([], anne, "ACDEF");
    const again = openRoom(first.rooms, { playerId: "anne", connectionId: "c9" }, "MNPQR");

    expect(again.room.code).toBe("ACDEF");
    expect(again.rooms).toHaveLength(1);
    expect(again.rooms[0]?.host.connectionId).toBe("c9");
  });
});

describe("takeRoom", () => {
  it("retire le salon apparié, qui ne peut plus l'être une seconde fois", () => {
    const opened = openRoom([], anne, "ACDEF");
    const taken = takeRoom(opened.rooms, "ACDEF");

    expect(taken.room?.host).toEqual(anne);
    expect(takeRoom(taken.rooms, "ACDEF").room).toBeUndefined();
  });

  it("ne rend rien pour un code inconnu, et ne touche pas la table", () => {
    const rooms: readonly Room[] = openRoom([], anne, "ACDEF").rooms;
    const taken = takeRoom(rooms, "WXYZ4");

    expect(taken.room).toBeUndefined();
    expect(taken.rooms).toEqual(rooms);
  });
});

describe("closeRoom", () => {
  it("referme le salon de la connexion partie, et laisse les autres", () => {
    const rooms = openRoom(openRoom([], anne, "ACDEF").rooms, boris, "MNPQR").rooms;

    expect(closeRoom(rooms, "c1")).toEqual([{ code: "MNPQR", host: boris }]);
  });
});

describe("freeCode", () => {
  it("passe au tirage suivant tant que le code est déjà pris", () => {
    const taken = codeFrom(new Uint8Array([0, 0, 0, 0, 0]));
    const rooms = openRoom([], anne, taken).rooms;

    const code = freeCode(rooms, [new Uint8Array([0, 0, 0, 0, 0]), new Uint8Array([1, 1, 1, 1, 1])]);

    expect(code).toBe(codeFrom(new Uint8Array([1, 1, 1, 1, 1])));
  });

  it("ne rend rien si tous les tirages sont pris", () => {
    const rooms = openRoom([], anne, codeFrom(new Uint8Array([0, 0, 0, 0, 0]))).rooms;

    expect(freeCode(rooms, [new Uint8Array([0, 0, 0, 0, 0])])).toBeUndefined();
  });
});
