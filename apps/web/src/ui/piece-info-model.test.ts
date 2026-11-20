import { describe, expect, it } from "vitest";
import { messagesFor } from "@occulis/i18n";
import type { PieceSheet } from "../game/inspection.js";
import { describeSheet } from "./piece-info-model.js";

const m = messagesFor("fr");

const scout: PieceSheet = {
  piece: { id: "a-1", kind: "scout", owner: "A", coord: { x: 1, y: 2 } },
  relation: "own",
  role: "special",
  steps: 3,
  adjacency: "octile",
  canClimb: true,
  visionRange: 20,
  inCheck: false,
};

describe("describeSheet", () => {
  it("écrit le nom, le camp et les chiffres du type", () => {
    expect(describeSheet(m, scout)).toEqual({
      title: "Éclaireur",
      owner: "À vous",
      description: "Rapide et voyant loin.",
      alert: undefined,
      facts: [
        {
          label: "Déplacement",
          value: "3 cases, dans toutes les directions, grimpe d'un niveau",
        },
        { label: "Vision", value: "20 cases" },
      ],
      notes: ["Prend en arrivant sur la case d'une pièce adverse."],
    });
  });

  it("dit d'un fantôme depuis quand il n'a plus été vu", () => {
    const ghost: PieceSheet = { ...scout, relation: "ghost", lastSeenTurn: 7 };
    expect(describeSheet(m, ghost).owner).toBe("Adversaire, vue pour la dernière fois au tour 7");
    expect(describeSheet(m, { ...scout, relation: "enemy" }).owner).toBe("Adversaire");
  });

  it("alerte sur le roi en échec et rappelle ce qu'il vaut", () => {
    const king: PieceSheet = {
      ...scout,
      piece: { ...scout.piece, kind: "commander" },
      role: "commander",
      steps: 1,
      adjacency: "orthogonal",
      canClimb: false,
      visionRange: Number.POSITIVE_INFINITY,
      inCheck: true,
    };
    const texts = describeSheet(m, king);

    expect(texts.alert).toBe("En échec");
    expect(texts.facts.map((fact) => fact.value)).toEqual([
      "1 case, sans diagonale, ne grimpe pas",
      "illimitée",
    ]);
    expect(texts.notes).toHaveLength(2);
  });

  it("garde l'identifiant d'un type que le dictionnaire ne connaît pas", () => {
    const texts = describeSheet(m, { ...scout, piece: { ...scout.piece, kind: "golem" } });
    expect(texts.title).toBe("golem");
    expect(texts.description).toBeUndefined();
  });
});
