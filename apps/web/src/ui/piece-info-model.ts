import type { Messages } from "@occulis/i18n";
import type { PieceSheet } from "../game/inspection.js";

/**
 * Ce que la fiche d'une pièce écrit, et où elle se pose. Module pur : `piece-info.ts`
 * n'a plus qu'à le mettre dans le DOM.
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
  const movement = [
    t.steps(sheet.steps),
    t.adjacency[sheet.adjacency],
    sheet.canClimb ? t.climbs : t.noClimb,
  ].join(", ");

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
    notes: sheet.role === "commander" ? [t.capture, t.king] : [t.capture],
  };
}

export interface Size {
  readonly width: number;
  readonly height: number;
}

/** L'écart entre la pièce cliquée et le bord de la fiche, et la marge au bord de la fenêtre. */
const GAP = 28;
const MARGIN = 12;

/**
 * Le coin haut-gauche de la fiche : centrée au-dessus du point cliqué, pour ne pas
 * couvrir la pièce. Elle passe dessous quand la place manque en haut, et reste toujours
 * entière dans la fenêtre.
 */
export function placeAbove(
  point: { readonly x: number; readonly y: number },
  panel: Size,
  viewport: Size,
): { readonly left: number; readonly top: number } {
  const clamp = (value: number, max: number): number =>
    Math.round(Math.max(MARGIN, Math.min(value, max - MARGIN)));
  const above = point.y - GAP - panel.height;
  const top = above >= MARGIN ? above : point.y + GAP;
  return {
    left: clamp(point.x - panel.width / 2, viewport.width - panel.width),
    top: clamp(top, viewport.height - panel.height),
  };
}
