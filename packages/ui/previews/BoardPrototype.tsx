import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { PROPOSED } from "../src/tokens.js";
import {
  diamond,
  durationMs,
  project,
  readMotion,
  type IsoProjection,
  type Tile,
} from "../src/lab/index.js";
import { hopAt, trailAt, waveDelayMs } from "../src/lab/choreography.js";
import {
  COLUMNS,
  ROWS,
  START,
  allTiles,
  chebyshev,
  destinations,
  isWall,
  key,
  visibleTo,
  type MockPiece,
  type Role,
} from "./board-mock.js";

export const ISO: IsoProjection = {
  originX: (ROWS * 48) / 2 + 24,
  originY: 48,
  tileWidth: 48,
  tileHeight: 24,
};
const WALL_HEIGHT = 16;
const VIEW_WIDTH = ((COLUMNS + ROWS) * ISO.tileWidth) / 2 + 48;
const VIEW_HEIGHT = ((COLUMNS + ROWS) * ISO.tileHeight) / 2 + 72;

/** Le losange d'une case, relevé de `lift` pixels (le dessus d'un mur). */
function top(tile: Tile, lift = 0): string {
  const { x, y } = project(tile, ISO);
  const w = ISO.tileWidth / 2;
  const h = ISO.tileHeight / 2;
  return `${x},${y - h - lift} ${x + w},${y - lift} ${x},${y + h - lift} ${x - w},${y - lift}`;
}

function Wall({ tile }: { tile: Tile }) {
  const { x, y } = project(tile, ISO);
  const w = ISO.tileWidth / 2;
  const h = ISO.tileHeight / 2;
  const z = WALL_HEIGHT;
  return (
    <g>
      <polygon
        className="occ-lab-wall__left"
        points={`${x - w},${y - z} ${x},${y + h - z} ${x},${y + h} ${x - w},${y}`}
      />
      <polygon
        className="occ-lab-wall__right"
        points={`${x},${y + h - z} ${x + w},${y - z} ${x + w},${y} ${x},${y + h}`}
      />
      <polygon className="occ-lab-wall__top" points={top(tile, z)} />
    </g>
  );
}

/**
 * La silhouette d'une pièce, posée sur l'origine (le centre de sa case). Le rôle se lit à la
 * forme seule, jamais à la couleur : la maîtresse porte un œil cranté au sommet d'un mât, la
 * pièce à capacité un losange et une pointe, le pion un mât court penché et un chevron.
 */
export function PieceShape({ role }: { role: Role }): ReactNode {
  if (role === "master") {
    return (
      <>
        <polygon points="-10,0 0,-5 10,0 0,5" />
        <polyline points="0,0 0,-22" />
        <polyline points="-6,2 0,-10 6,2" fill="none" />
        <polygon points="-2,-31 2,-31 4,-29 4,-25 2,-23 -2,-23 -4,-25 -4,-29" />
        <rect x="-0.5" y="-27.5" width="1" height="1" />
      </>
    );
  }
  if (role === "ability") {
    return (
      <>
        <polygon points="-10,0 0,-5 10,0 0,5" />
        <polyline points="0,0 0,-17" />
        <polygon points="-7,-10 0,-13 7,-10 0,-7" />
        <polygon points="0,-25 4,-17 -4,-17" />
      </>
    );
  }
  return (
    <>
      <polygon points="-8,0 0,-4 8,0 0,4" />
      <polyline points="0,0 3,-11" />
      <polyline points="-2,-11 3,-15 8,-11" fill="none" />
    </>
  );
}

export function PieceIcon({ role, camp }: { role: Role; camp: "A" | "B" }) {
  return (
    <svg
      className="occ-lab-board"
      viewBox="-14 -34 28 42"
      width={56}
      height={84}
      aria-hidden="true"
    >
      <g className={`occ-lab-piece occ-lab-piece--${camp}`}>
        <PieceShape role={role} />
      </g>
    </svg>
  );
}

interface Move {
  readonly id: string;
  readonly from: Tile;
  readonly to: Tile;
}

export interface BoardPrototypeProps {
  /** Le libellé accessible du plateau. */
  label: string;
}

/**
 * Prototype « un coup sur le plateau » : sélectionner une pièce (elle s'élève, ses
 * destinations s'ouvrent en cascade), la déplacer (un saut en arc, des images rémanentes, une
 * onde à la retombée), puis la ligne de vue se redéploie en vague depuis la case d'arrivée ;
 * un adversaire qui entre dans la vue se matérialise, un adversaire qui en sort laisse son
 * fantôme. Le plateau réel est en PixiJS : ceci n'en est que la mise en scène.
 */
export function BoardPrototype({ label }: BoardPrototypeProps) {
  const [pieces, setPieces] = useState<readonly MockPiece[]>(START);
  const [selected, setSelected] = useState<string | null>(null);
  const [moving, setMoving] = useState<Move | null>(null);
  const [wave, setWave] = useState<{ origin: Tile; key: number } | null>(null);
  const [ghosts, setGhosts] = useState<ReadonlyMap<string, MockPiece>>(new Map());
  const [revealed, setRevealed] = useState<ReadonlySet<string>>(new Set());
  const hop = useRef<SVGGElement>(null);
  const trails = useRef<(SVGGElement | null)[]>([]);
  const frame = useRef(0);
  // Le saut en cours s'arrête avec le plateau : remis à zéro ou remonté par un réglage, il ne
  // doit plus écrire sur des nœuds détachés ni poser une pièce sur un plateau disparu.
  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  const seen = useMemo(() => visibleTo("A", pieces), [pieces]);
  const selectedPiece = pieces.find((piece) => piece.id === selected);
  const targets = useMemo(
    () =>
      selectedPiece === undefined || moving !== null
        ? new Map<string, number>()
        : destinations(selectedPiece, pieces),
    [selectedPiece, pieces, moving],
  );
  const tiles = useMemo(() => allTiles().sort((a, b) => a.x + a.y - (b.x + b.y)), []);
  // Lu une fois : un changement d'intensité ou de tempo remonte le plateau (`Lab`), et
  // `getComputedStyle` à chaque rendu forcerait un recalcul de style à chaque survol.
  const motion = useMemo(() => readMotion(), []);

  const land = (move: Move): void => {
    const after = pieces.map((piece) => (piece.id === move.id ? { ...piece, at: move.to } : piece));
    const before = visibleTo("A", pieces);
    const now = visibleTo("A", after);
    const enemies = after.filter((piece) => piece.camp === "B");
    // Un adversaire qui sort de la vue laisse son fantôme ; qui y entre, se matérialise.
    const nextGhosts = new Map(ghosts);
    const entering = new Set<string>();
    for (const enemy of enemies) {
      const was = before.has(key(enemy.at));
      const is = now.has(key(enemy.at));
      if (was && !is) nextGhosts.set(enemy.id, enemy);
      if (is) nextGhosts.delete(enemy.id);
      if (!was && is) entering.add(enemy.id);
    }
    setGhosts(nextGhosts);
    setRevealed(entering);
    setPieces(after);
    setMoving(null);
    setWave({ origin: move.to, key: Date.now() });
  };

  const play = (to: Tile): void => {
    if (selectedPiece === undefined) return;
    const move = { id: selectedPiece.id, from: selectedPiece.at, to };
    setSelected(null);
    const current = motion;
    if (current.level === "still") {
      land(move);
      setRevealed((ids) => new Set([...ids, move.id]));
      return;
    }
    setMoving(move);
    const from = project(move.from, ISO);
    const target = project(move.to, ISO);
    const duration = durationMs("slow", current);
    const start = performance.now();
    const step = (now: number): void => {
      const t = Math.min(1, (now - start) / duration);
      // Le saut est tracé directement sur l'élément, hors de React : une image par trame
      // ne doit pas réconcilier tout le plateau.
      const point = hopAt(t, from, target, current);
      hop.current?.setAttribute("transform", `translate(${point.x} ${point.y})`);
      const behind = trailAt(t, current);
      trails.current.forEach((element, index) => {
        const lag = behind[index];
        if (element === null) return;
        if (lag === undefined) {
          element.setAttribute("visibility", "hidden");
          return;
        }
        const ghost = hopAt(lag, from, target, current);
        element.setAttribute("visibility", "visible");
        element.setAttribute("transform", `translate(${ghost.x} ${ghost.y})`);
      });
      if (t < 1) frame.current = requestAnimationFrame(step);
      else land(move);
    };
    frame.current = requestAnimationFrame(step);
  };

  const click = (tile: Tile): void => {
    if (moving !== null) return;
    if (targets.has(key(tile))) {
      play(tile);
      return;
    }
    const own = pieces.find((piece) => piece.camp === "A" && key(piece.at) === key(tile));
    setSelected(own === undefined || own.id === selected ? null : own.id);
  };

  const waveDelay = (tile: Tile): string =>
    wave === null ? "0ms" : `${waveDelayMs(chebyshev(wave.origin, tile), "wave", motion)}ms`;
  const visiblePieces = pieces
    .filter((piece) => piece.id !== moving?.id && (piece.camp === "A" || seen.has(key(piece.at))))
    .sort((a, b) => a.at.x + a.at.y - (b.at.x + b.at.y));
  const movingPiece = moving === null ? undefined : pieces.find((piece) => piece.id === moving.id);

  return (
    <svg
      className="occ-lab-board"
      viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
      role="img"
      aria-label={label}
    >
      <defs>
        <pattern id="occ-lab-dither" width="2" height="2" patternUnits="userSpaceOnUse">
          <rect className="occ-lab-dither" width="1" height="1" />
          <rect className="occ-lab-dither" x="1" y="1" width="1" height="1" />
        </pattern>
      </defs>
      {tiles.map((tile) => (
        <polygon key={key(tile)} className="occ-lab-tile" points={diamond(tile, ISO)} />
      ))}
      {tiles.filter(isWall).map((tile) => (
        <Wall key={key(tile)} tile={tile} />
      ))}
      {tiles.map((tile) => (
        <polygon
          key={`fog-${key(tile)}`}
          className="occ-lab-fog"
          data-seen={seen.has(key(tile))}
          points={top(tile, isWall(tile) ? WALL_HEIGHT : 0)}
          fill="url(#occ-lab-dither)"
          style={{ ["--delay" as string]: waveDelay(tile) }}
        />
      ))}
      {selectedPiece !== undefined && (
        <polygon className="occ-lab-selected" points={diamond(selectedPiece.at, ISO)} />
      )}
      {[...targets].map(([tileKey, distance]) => {
        const [x, y] = tileKey.split(",").map(Number) as [number, number];
        return (
          <polygon
            key={`dest-${tileKey}`}
            className="occ-lab-dest"
            points={diamond({ x, y }, ISO)}
            style={{ ["--delay" as string]: `${waveDelayMs(distance, "cascade", motion)}ms` }}
          />
        );
      })}
      {wave !== null && motion.level !== "still" && (
        <polygon
          key={`ripple-${wave.key}`}
          className="occ-lab-ripple"
          points={diamond(wave.origin, ISO)}
        />
      )}
      {[...ghosts.values()].map((ghost) => {
        const at = project(ghost.at, ISO);
        return (
          <g
            key={`ghost-${ghost.id}`}
            className="occ-lab-ghost"
            transform={`translate(${at.x} ${at.y})`}
          >
            <PieceShape role={ghost.role} />
          </g>
        );
      })}
      {visiblePieces.map((piece) => {
        const at = project(piece.at, ISO);
        const entering = revealed.has(piece.id);
        return (
          <g
            key={`${piece.id}-${entering ? (wave?.key ?? 0) : 0}`}
            transform={`translate(${at.x} ${at.y})`}
          >
            <g
              className={[
                "occ-lab-piece",
                `occ-lab-piece--${piece.camp}`,
                piece.id === selected && "occ-lab-piece--lifted",
                entering && "occ-lab-piece--enter",
              ]
                .filter(Boolean)
                .join(" ")}
              style={entering ? { ["--delay" as string]: waveDelay(piece.at) } : undefined}
            >
              <g className="occ-lab-piece__body">
                <PieceShape role={piece.role} />
              </g>
            </g>
          </g>
        );
      })}
      {movingPiece !== undefined && (
        <>
          {Array.from({ length: PROPOSED.trail.count }, (_, index) => (
            <g
              key={`trail-${index}`}
              ref={(element) => {
                trails.current[index] = element;
              }}
              visibility="hidden"
              className={`occ-lab-piece occ-lab-piece--${movingPiece.camp} occ-lab-piece--trail`}
            >
              <PieceShape role={movingPiece.role} />
            </g>
          ))}
          <g
            ref={hop}
            className={`occ-lab-piece occ-lab-piece--${movingPiece.camp}`}
            transform={`translate(${project(movingPiece.at, ISO).x} ${project(movingPiece.at, ISO).y})`}
          >
            <PieceShape role={movingPiece.role} />
          </g>
        </>
      )}
      {tiles.map((tile) => (
        <g key={`hit-${key(tile)}`} className="occ-lab-cell" onClick={() => click(tile)}>
          <polygon className="occ-lab-hit" points={diamond(tile, ISO)} />
          <polygon className="occ-lab-hover" points={diamond(tile, ISO)} />
        </g>
      ))}
    </svg>
  );
}
