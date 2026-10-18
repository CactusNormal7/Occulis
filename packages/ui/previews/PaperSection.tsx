import { useMemo, useState, type MouseEvent } from "react";
import { Badge, Segmented, Stage } from "../src/index.js";
import { PaperInversion, diamond, project, unproject, type PaperRun, type Tile } from "../src/lab/index.js";
import { ISO, PieceShape } from "./BoardPrototype.js";
import { COLUMNS, ROWS, START, allTiles, isWall, key, visibleTo } from "./board-mock.js";

type Blend = "cover" | "invert";

function CircleDemo({ blend }: { blend: Blend }) {
  const [run, setRun] = useState<PaperRun | null>(null);
  const start = (event: MouseEvent<HTMLDivElement>): void => {
    const box = event.currentTarget.getBoundingClientRect();
    setRun({ key: Date.now(), source: { kind: "point", x: event.clientX - box.left, y: event.clientY - box.top } });
  };
  return (
    <div className="occ-lab-screen occ-lab-screen--clickable" onClick={start}>
      <div className="occ-lab-screen__content">
        <span className="occ-lab-display">Click anywhere</span>
        <div className="occ-lab-row">
          <Badge tone="A">Camp A</Badge>
          <Badge tone="B">Camp B</Badge>
          <Badge tone="strong">Ink</Badge>
        </div>
        <span className="occ-lab-note">The wave starts under the pointer and covers the frame, then resorbs.</span>
      </div>
      <PaperInversion run={run} blend={blend} />
    </div>
  );
}

const ZONE_VIEW = { width: ((COLUMNS + ROWS) * ISO.tileWidth) / 2 + 48, height: ((COLUMNS + ROWS) * ISO.tileHeight) / 2 + 72 };

function ZoneDemo({ blend }: { blend: Blend }) {
  // La zone montrée : ce que voit le camp A au départ — la ligne de vue est l'usage le plus
  // probable d'un effet qui suit le contour d'une zone.
  const zone = useMemo(() => {
    const seen = visibleTo("A", START);
    return allTiles().filter((tile) => seen.has(key(tile)) && !isWall(tile));
  }, []);
  const zoneKeys = useMemo(() => new Set(zone.map(key)), [zone]);
  const [run, setRun] = useState<PaperRun | null>(null);

  const start = (event: MouseEvent<HTMLDivElement>): void => {
    const box = event.currentTarget.getBoundingClientRect();
    // Le SVG est mis à l'échelle de sa boîte : la projection du shader doit l'être aussi.
    const ratio = box.width / ZONE_VIEW.width;
    const tile: Tile = unproject((event.clientX - box.left) / ratio, (event.clientY - box.top) / ratio, ISO);
    if (!zoneKeys.has(key(tile))) return;
    setRun({
      key: Date.now(),
      source: {
        kind: "zone",
        zone,
        origin: tile,
        columns: COLUMNS,
        rows: ROWS,
        iso: { originX: ISO.originX * ratio, originY: ISO.originY * ratio, tileWidth: ISO.tileWidth * ratio, tileHeight: ISO.tileHeight * ratio },
      },
    });
  };

  return (
    <div className="occ-lab-screen occ-lab-screen--clickable" onClick={start} style={{ aspectRatio: `${ZONE_VIEW.width} / ${ZONE_VIEW.height}` }}>
      <svg className="occ-lab-board" viewBox={`0 0 ${ZONE_VIEW.width} ${ZONE_VIEW.height}`} aria-hidden="true">
        {allTiles().map((tile) => (
          <polygon key={key(tile)} className={zoneKeys.has(key(tile)) ? "occ-lab-tile" : "occ-lab-wall__right"} points={diamond(tile, ISO)} />
        ))}
        {START.filter((piece) => piece.camp === "A").map((piece) => {
          const at = project(piece.at, ISO);
          return (
            <g key={piece.id} className="occ-lab-piece occ-lab-piece--A" transform={`translate(${at.x} ${at.y})`}>
              <PieceShape role={piece.role} />
            </g>
          );
        })}
      </svg>
      <PaperInversion run={run} blend={blend} />
    </div>
  );
}

const DISAPPEARANCES = [
  { value: "dither", label: "Everywhere at once (dither)" },
  { value: "recede", label: "Back to the click" },
  { value: "none", label: "Stays" },
] as const;

const DISAPPEARANCE_NOTES: Record<string, string> = {
  dither: "The paper holds, then goes out cell by cell everywhere at once, in an ordered dither — the theme veil's gesture.",
  recede: "The paper holds, then the front runs backwards at the same speed and shrinks into the point it came from.",
  none: "The paper stays where it is: an inverted zone that lasts until something replaces it.",
};

export interface PaperSectionProps {
  /** La disparition, `--occ-paper-resorb` : la même que dans la barre du haut. */
  resorb: string;
  onResorb: (value: string) => void;
}

/** Chantier 3 : l'inversion « papier millimétré ». */
export function PaperSection({ resorb, onResorb }: PaperSectionProps) {
  const [blend, setBlend] = useState<Blend>("cover");
  return (
    <section className="occ-lab-section" id="paper">
      <header>
        <h2 className="occ-label">3 · Graph-paper inversion</h2>
        <p>
          The theme inverts inside a zone — bone becomes the ground, the void a grid of dots — and spreads from a point. Drawn by
          a WebGL fragment shader on a decorative overlay: per frame it receives a handful of numbers, nothing touches layout.
          Speed, grid, dot size and resorption are tokens (bar above); hold and resorb durations follow the tempo.
        </p>
      </header>
      <div className="occ-lab-row">
        <Segmented<Blend>
          label="Blend"
          options={[
            { value: "cover", label: "Cover (opaque paper)" },
            { value: "invert", label: "Invert what is below" },
          ]}
          value={blend}
          onChange={setBlend}
        />
        <Segmented
          label="Disappearance"
          options={DISAPPEARANCES.map((option) => ({ value: option.value, label: option.label }))}
          value={resorb}
          onChange={onResorb}
        />
      </div>
      <p className="occ-lab-note">{DISAPPEARANCE_NOTES[resorb] ?? ""}</p>
      <p className="occ-lab-note">
        {blend === "cover"
          ? "Cover: the paper hides what is below. Safe for colours; usable as a screen transition."
          : "Invert: difference blending. Bone text turns black and stays readable, but camp colours flip to their complement — a teal piece would read orange. Not for the board as is."}
      </p>
      <Stage title="Circular propagation">
        <CircleDemo blend={blend} />
      </Stage>
      <Stage
        title="Following a board zone · click a lit tile"
        actions={<Badge tone="dim">Zone = what camp A sees</Badge>}
      >
        <ZoneDemo blend={blend} />
      </Stage>
    </section>
  );
}
