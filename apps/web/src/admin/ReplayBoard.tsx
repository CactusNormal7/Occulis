import { useEffect, useRef } from "react";
import type { Board } from "@occulis/core";
import type { AdminFrame } from "@occulis/protocol";
import { mountReplay, type ReplayCanvas } from "./replay-canvas.js";
import type { Perspective } from "./replay.js";

export interface ReplayBoardProps {
  board: Board;
  frames: readonly AdminFrame[];
  /** L'image montrée ; un changement fait glisser les pièces. */
  index: number;
  perspective: Perspective;
  /** Le nombre de quarts de tour demandés, signé : chaque pas fait tourner le plateau. */
  turns: number;
}

/**
 * Le plateau rejoué, en React autour du canevas impératif de `replay-canvas.ts` : le
 * dessin et ses animations restent hors du cycle de rendu, React ne lui transmet que
 * l'image, le point de vue et les quarts de tour.
 */
export function ReplayBoard({ board, frames, index, perspective, turns }: ReplayBoardProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const replay = useRef<ReplayCanvas | null>(null);
  const turned = useRef(0);

  useEffect(() => {
    if (canvas.current === null) return;
    const mounted = mountReplay(canvas.current, board, frames);
    replay.current = mounted;
    return () => {
      mounted.destroy();
      replay.current = null;
    };
  }, [board, frames]);

  useEffect(() => replay.current?.show(index, true), [index]);
  useEffect(() => replay.current?.setPerspective(perspective), [perspective]);
  useEffect(() => {
    while (turned.current < turns) {
      replay.current?.rotate(1);
      turned.current += 1;
    }
    while (turned.current > turns) {
      replay.current?.rotate(-1);
      turned.current -= 1;
    }
  }, [turns]);

  return <canvas ref={canvas} aria-label="Plateau rejoué" style={{ display: "block", width: "100%", height: "clamp(320px, 58vh, 560px)" }} />;
}
