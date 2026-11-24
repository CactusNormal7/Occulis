import type { Messages } from "@occulis/i18n";
import type { PieceSheet } from "../game/inspection.js";

/**
 * Ce que la fiche d'une pièce écrit. Module pur : `hud/model.ts` y ajoute la case et la
 * portée, et `hud/PieceSheet.vue` l'affiche dans la colonne de l'ATH.
 */
export interface SheetTexts {
  readonly title: string;
  /** À qui est la pièce ; pour un fantôme, depuis quand elle n'a plus été vue. */
  readonly owner: string;
  readonly description: string | undefined;
  /** Une ligne d'alerte, quand le roi du joueur est en échec. */
  readonly alert: string | undefined;
  readonly facts: readonly { readonly label: string; readonly value: string }[];
  readonly notes: readonly string[];
}

export function describeSheet(m: Pick<Messages, "game" | "team">, sheet: PieceSheet): SheetTexts {
  const t = m.game.pieceInfo;
  const kind = sheet.piece.kind;
  const owner =
    sheet.relation === "own"
      ? t.own
      : sheet.relation === "enemy"
        ? t.enemy
        : t.ghost(sheet.lastSeenTurn ?? 0);
  const pattern =
    sheet.lines === null
      ? [t.steps(sheet.steps), t.adjacency[sheet.adjacency]]
      : [t.lines(sheet.lines.orthogonal, sheet.lines.diagonal)];
  const movement = [...pattern, sheet.canClimb ? t.climbs : t.noClimb].join(", ");

  return {
    title: m.team.kinds[kind] ?? m.team.unknownKind(kind),
    owner,
    description: m.team.kindDescriptions[kind],
    alert: sheet.inCheck ? t.inCheck : undefined,
    facts: [
      { label: t.movement, value: movement },
      {
        label: t.vision,
        value: Number.isFinite(sheet.visionRange) ? t.range(sheet.visionRange) : t.unlimited,
      },
    ],
    notes: [
      t.capture,
      ...(sheet.role === "commander" ? [t.king] : []),
      ...(sheet.ability === "trap" ? [t.trap] : []),
    ],
  };
}
