import type { PlayerId } from "@occulis/core";
import type { MeMatchDebrief } from "@occulis/protocol";

/**
 * Ce que l'écran de fin calcule d'une partie close, sans DOM ni réseau. Tout est tiré du
 * log et des images du replay que le serveur a rendus : la partie est finie, les deux
 * camps sont révélés.
 */

/** Ce qu'un camp a fait de la partie. */
export interface SideStats {
  /** Les déplacements joués, abandon exclu. */
  readonly moves: number;
  /** Les pièces distinctes qu'il a déplacées. */
  readonly pieces: number;
  /** Les cases entrées au moins une fois dans sa ligne de vue. */
  readonly seen: number;
}

export interface DebriefStats {
  readonly self: SideStats;
  readonly opponent: SideStats;
  /** De la création à la clôture, déploiement compris ; `null` pour une partie sans fin. */
  readonly durationMs: number | null;
  /** Le numéro du dernier coup, celui qui a clos la partie (l'abandon). */
  readonly endedOn: number;
}

export function debriefStats(match: MeMatchDebrief): DebriefStats {
  const other: PlayerId = match.seat === "A" ? "B" : "A";
  return {
    self: sideStats(match, match.seat),
    opponent: sideStats(match, other),
    durationMs: match.finishedAt === null ? null : match.finishedAt - match.startedAt,
    endedOn: match.log.length,
  };
}

function sideStats(match: MeMatchDebrief, side: PlayerId): SideStats {
  let moves = 0;
  const pieces = new Set<string>();
  for (const entry of match.log) {
    if (entry.player !== side || entry.action.kind !== "move") continue;
    moves += 1;
    pieces.add(entry.action.pieceId);
  }
  const seen = new Set(match.frames.flatMap((frame) => frame.visible[side]));
  return { moves, pieces: pieces.size, seen: seen.size };
}

/** L'Elo d'avant la partie, que l'écran met en regard de l'actuel. */
export function eloBefore(elo: number, change: number | null): number {
  return change === null ? elo : elo - change;
}

/** Une durée en `m:ss`, ou `h:mm:ss` au-delà d'une heure : des chiffres, sans langue. */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = String(total % 60).padStart(2, "0");
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${seconds}`
    : `${minutes}:${seconds}`;
}

/**
 * **Factices**, pour le rendu seulement : ni les temps de réflexion ni les faits d'armes
 * d'une partie ne sont encore enregistrés. L'écran les montre sous le ruban de chantier
 * (`WorkInProgress`), jamais comme des données.
 */
export const PLACEHOLDER = {
  thinkingMs: { average: 14_000, longest: 92_000 },
  feats: ["first-win", "streak-3", "rating-1400"],
} as const;
