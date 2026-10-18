import { useState } from "react";
import { Badge, Button, Card, Segmented, Stage } from "../src/index.js";
import { CIPHER_ALPHABETS, CIPHER_CHARSET, CipherFrieze, CipherText, Glyph, alphabet, cipherGlyph, type CipherAlphabet, type CipherMode } from "../src/lab/index.js";

const DIRECTIONS: Record<CipherAlphabet, { title: string; text: string }> = {
  lattice: {
    title: "A · Lattice",
    text: "Each glyph is a fragment of the isometric cube of a board tile: top, bottom and vertical edges, 2:1 slopes like the board's. The most coherent with the board; reads as architecture.",
  },
  stele: {
    title: "B · Steles",
    text: "A vertical stem and notches at three heights, flat or on the iso slope. Height as writing; close to ogham or runes, the easiest to scan in a line.",
  },
  orbit: {
    title: "C · Orbits",
    text: "Stars linked on a 3 × 3 grid, sometimes a notched eye at the centre. Echoes the star vault and the name; the airiest, the least legible at small sizes.",
  },
};

function AlphabetTable({ name, decodable }: { name: CipherAlphabet; decodable: boolean }) {
  return (
    <div className="occ-lab-alphabet">
      {Array.from(CIPHER_CHARSET).map((char, index) => (
        <figure key={char}>
          <Glyph glyph={cipherGlyph(char, index, name, decodable, 7)} />
          <figcaption>{decodable ? char : "·"}</figcaption>
        </figure>
      ))}
    </div>
  );
}

/** Un lien dont le libellé se brouille un instant au survol : l'emploi le plus léger de l'alphabet. */
function HoverLink({ label, name }: { label: string; name: CipherAlphabet }) {
  const [play, setPlay] = useState(0);
  return (
    <a href="#cipher" className="occ-label" onMouseEnter={() => setPlay((value) => value + 1)} onFocus={() => setPlay((value) => value + 1)}>
      <CipherText text={label} alphabet={name} mode={play === 0 ? "plain" : "decode"} pace="base" playKey={play} decodable={false} seed={play} />
    </a>
  );
}

/** Chantier 2 : l'alphabet cryptique. */
export function CipherSection() {
  const [name, setName] = useState<CipherAlphabet>("lattice");
  const [decodable, setDecodable] = useState(true);
  const [play, setPlay] = useState(0);
  const [mode, setMode] = useState<CipherMode>("cipher");
  const set = alphabet(name);

  return (
    <section className="occ-lab-section" id="cipher">
      <header>
        <h2 className="occ-label">2 · Cryptic glyphs</h2>
        <p>
          Three directions, drawn in the same 9 × 11 cell with a one-pixel stroke. The text always exists for a screen reader:
          glyphs are only clothing, never the sole carrier of information.
        </p>
      </header>
      <div className="occ-lab-row">
        <Segmented<CipherAlphabet>
          label="Alphabet"
          options={CIPHER_ALPHABETS.map((value) => ({ value, label: DIRECTIONS[value].title }))}
          value={name}
          onChange={setName}
        />
        <Segmented
          label="Decodability"
          options={[
            { value: "yes", label: "Decodable" },
            { value: "no", label: "Ornament" },
          ]}
          value={decodable ? "yes" : "no"}
          onChange={(value) => setDecodable(value === "yes")}
        />
      </div>
      <p className="occ-lab-note">{DIRECTIONS[name].text}</p>
      <Stage title={`${DIRECTIONS[name].title} · ${set.pool.length} glyphs in the family · ${decodable ? "fixed key, one glyph per letter" : "random glyph per position, nothing to decode"}`}>
        <AlphabetTable name={name} decodable={decodable} />
      </Stage>
      <Stage
        title="Decode · encode"
        actions={
          <>
            <Button
              size="sm"
              icon="play"
              onClick={() => {
                setMode("decode");
                setPlay((value) => value + 1);
              }}
            >
              Decode
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setMode("encode");
                setPlay((value) => value + 1);
              }}
            >
              Encode
            </Button>
          </>
        }
      >
        <div className="occ-lab-display">
          <CipherText text="Occulis" alphabet={name} decodable={decodable} mode={mode} playKey={play} />
        </div>
        <p className="occ-lab-note">
          <CipherText text="Vision is the only weapon" alphabet={name} decodable={decodable} mode={mode} playKey={play} seed={3} />
        </p>
        <p className="occ-lab-note">
          Just before a glyph yields its letter, it shows its true glyph for one tick: with a decodable alphabet, that is how
          a patient player learns the key.
        </p>
      </Stage>
      <div className="occ-lab-grid">
        <Card title="Border">
          <CipherFrieze count={18} alphabet={name} live seed={11} />
          <p className="occ-lab-note">A faint frieze along a frame, one glyph shifting every ~1.4 s. Off in calm and still.</p>
        </Card>
        <Card title="Loading">
          <p className="occ-lab-note">
            <CipherText text="Searching an opponent" alphabet={name} decodable={false} mode="decode" pace="slow" playKey={play} seed={5} />
          </p>
          <CipherFrieze count={8} alphabet={name} live seed={4} />
        </Card>
        <Card title="Hover">
          <div className="occ-lab-row">
            <HoverLink label="Profile" name={name} />
            <HoverLink label="Friends" name={name} />
            <HoverLink label="Settings" name={name} />
          </div>
          <p className="occ-lab-note">Label scrambles for 250 ms on hover or focus. The cheapest use; also the most likely to tire.</p>
        </Card>
        <Card title="Rarity">
          <Badge tone="dim">≤ 1 cipher event on screen</Badge>
          <p className="occ-lab-note">Titles decode once per session; ornaments never compete with a timer or a game state.</p>
        </Card>
      </div>
    </section>
  );
}
