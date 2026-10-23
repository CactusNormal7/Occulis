import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PROPOSED } from "../tokens.js";
import { hopAt, trailAt, waveDelayMs } from "./choreography.js";
import { CipherFrieze, CipherText } from "./Cipher.js";
import {
  CIPHER_ALPHABETS,
  CIPHER_CHARSET,
  GLYPH_HEIGHT,
  GLYPH_WIDTH,
  alphabet,
  cellAt,
  cipherGlyph,
  flickerVariant,
  foldChar,
  settleAt,
  type DecodeTiming,
  type GlyphShape,
} from "./glyphs.js";
import { easing, motionFrom, parseRgb, type Motion } from "./motion.js";
import {
  farthestCorner,
  paperAt,
  project,
  unproject,
  zoneDistances,
  zoneReach,
  zoneTexels,
  type PaperTiming,
} from "./paper.js";
import { PaperInversion } from "./PaperInversion.js";

const signature = (glyph: GlyphShape): string => JSON.stringify(glyph);
const FULL: Motion = { level: "full", amplitude: 1, tempo: 1 };
const CALM: Motion = { level: "calm", amplitude: 0.4, tempo: 1 };
const STILL: Motion = { level: "still", amplitude: 0, tempo: 1 };

describe("alphabets", () => {
  it("donne à chaque direction une clé décodable de glyphes deux à deux distincts", () => {
    for (const name of CIPHER_ALPHABETS) {
      const set = alphabet(name);
      expect(set.key).toHaveLength(CIPHER_CHARSET.length);
      expect(new Set(set.key.map(signature)).size).toBe(CIPHER_CHARSET.length);
      // Le signe de ponctuation ne se confond avec aucune lettre.
      expect(set.key.map(signature)).not.toContain(signature(set.stop));
    }
  });

  it("trace tout glyphe dans sa case", () => {
    for (const name of CIPHER_ALPHABETS) {
      for (const glyph of alphabet(name).pool) {
        const xs = [
          ...glyph.segments.flatMap(([x1, , x2]) => [x1, x2]),
          ...glyph.dots.map(([x]) => x),
          ...glyph.rings.flatMap(([x]) => [x - 2, x + 2]),
        ];
        const ys = [
          ...glyph.segments.flatMap(([, y1, , y2]) => [y1, y2]),
          ...glyph.dots.map(([, y]) => y),
          ...glyph.rings.flatMap(([, y]) => [y - 2, y + 2]),
        ];
        expect(Math.min(...xs)).toBeGreaterThanOrEqual(0);
        expect(Math.max(...xs)).toBeLessThan(GLYPH_WIDTH);
        expect(Math.min(...ys)).toBeGreaterThanOrEqual(0);
        expect(Math.max(...ys)).toBeLessThan(GLYPH_HEIGHT);
      }
    }
  });

  it("n'emploie au treillis que les pentes du plateau : verticale ou 2 pour 1", () => {
    for (const glyph of alphabet("lattice").pool) {
      for (const [x1, y1, x2, y2] of glyph.segments) {
        const vertical = x1 === x2;
        expect(vertical || Math.abs(x2 - x1) === 2 * Math.abs(y2 - y1)).toBe(true);
      }
    }
  });

  it("chiffre toujours une lettre de la même façon quand l'alphabet est décodable, accents compris", () => {
    expect(signature(cipherGlyph("e", 0, "stele", true))).toBe(
      signature(cipherGlyph("É", 9, "stele", true)),
    );
    expect(foldChar("é")).toBe("E");
  });

  it("ne garde aucun lien stable entre lettre et glyphe en ornement", () => {
    const glyphs = Array.from({ length: 12 }, (_, index) =>
      signature(cipherGlyph("E", index, "lattice", false, 1)),
    );
    expect(new Set(glyphs).size).toBeGreaterThan(1);
  });

  it("est déterministe : mêmes entrées, mêmes glyphes", () => {
    expect(signature(cipherGlyph("Q", 3, "orbit", false, 42))).toBe(
      signature(cipherGlyph("Q", 3, "orbit", false, 42)),
    );
  });
});

describe("déchiffrement", () => {
  const timing: DecodeTiming = { durationMs: 900, tickMs: 70, scramble: true, seed: 2 };

  it("part des glyphes et finit sur les lettres, de gauche à droite à peu près", () => {
    expect(cellAt(0, 7, 0, timing, "decode").state).toBe("cipher");
    expect(cellAt(6, 7, 900, timing, "decode").state).toBe("plain");
    expect(settleAt(0, 7, timing)).toBeLessThan(settleAt(6, 7, timing));
    for (let index = 0; index < 7; index += 1)
      expect(settleAt(index, 7, timing)).toBeLessThanOrEqual(900);
  });

  it("montre le vrai glyphe pendant le dernier pas avant la lettre", () => {
    const settle = settleAt(3, 7, timing);
    expect(cellAt(3, 7, settle - timing.tickMs / 2, timing, "decode").state).toBe("cipher");
    expect(cellAt(3, 7, settle - 2.5 * timing.tickMs, timing, "decode").state).toBe("scramble");
  });

  it("ne brouille rien quand le niveau l'interdit", () => {
    const calm = { ...timing, scramble: false };
    for (let t = 0; t < 900; t += 10)
      expect(cellAt(2, 7, t, calm, "decode").state).not.toBe("scramble");
  });

  it("chiffre à l'inverse : des lettres aux glyphes", () => {
    expect(cellAt(0, 7, 0, timing, "encode").state).toBe("plain");
    expect(cellAt(0, 7, 900, timing, "encode").state).toBe("cipher");
  });

  it("fait frémir une frise un glyphe à la fois, pas en bloc", () => {
    const count = 16;
    const before = Array.from({ length: count }, (_, index) =>
      flickerVariant(index, count, 10_000, 1400),
    );
    const after = Array.from({ length: count }, (_, index) =>
      flickerVariant(index, count, 10_000 + 1400, 1400),
    );
    const changed = before.filter((value, index) => value !== after[index]).length;
    expect(changed).toBeLessThanOrEqual(4);
  });
});

describe("mouvement", () => {
  it("lit les boutons de la racine, et retombe sur le défaut si une surcharge est mal formée", () => {
    expect(motionFrom({ level: " calm", amplitude: "0.4", tempo: "1.5" })).toEqual({
      level: "calm",
      amplitude: 0.4,
      tempo: 1.5,
    });
    expect(motionFrom({ level: "wild", amplitude: "x", tempo: "-2" })).toEqual({
      level: "full",
      amplitude: 1,
      tempo: 1,
    });
    expect(motionFrom({ level: "still", amplitude: "1" }).amplitude).toBe(0);
  });

  it("évalue une courbe des tokens comme CSS le ferait", () => {
    const out = easing(PROPOSED.easing.out);
    expect(out(0)).toBe(0);
    expect(out(1)).toBe(1);
    expect(out(0.5)).toBeGreaterThan(0.5);
    expect(easing("linear")(0.3)).toBeCloseTo(0.3);
  });

  it("lit une couleur CSS calculée", () => {
    // Une couleur CSS calculée est l'entrée même de parseRgb().
    // eslint-disable-next-line no-restricted-syntax -- entrée de parseRgb()
    expect(parseRgb("rgb(233 230 223)")).toEqual([233 / 255, 230 / 255, 223 / 255]);
    // eslint-disable-next-line no-restricted-syntax -- entrée de parseRgb()
    expect(parseRgb("rgba(0, 0, 0, 0.5)")).toEqual([0, 0, 0]);
    expect(parseRgb("transparent")).toBeUndefined();
  });

  it("aplatit le saut avec l'amplitude, et retire les rémanences hors de `full`", () => {
    const from = { x: 0, y: 0 };
    const to = { x: 100, y: 0 };
    expect(hopAt(0.5, from, to, FULL).y).toBeCloseTo(-PROPOSED.distance.hop);
    expect(hopAt(0.5, from, to, CALM).y).toBeCloseTo(-PROPOSED.distance.hop * 0.4);
    expect(hopAt(0.5, from, to, STILL).y).toBeCloseTo(0);
    expect(hopAt(1, from, to, FULL).x).toBe(100);
    expect(hopAt(1, from, to, FULL).y).toBeCloseTo(0);
    expect(trailAt(0.5, FULL).length).toBe(PROPOSED.trail.count);
    expect(trailAt(0.5, CALM)).toEqual([]);
  });

  it("ne retarde rien sous `still`, et suit le tempo sinon", () => {
    expect(waveDelayMs(3, "wave", STILL)).toBe(0);
    expect(waveDelayMs(3, "wave", { ...FULL, tempo: 2 })).toBe(3 * PROPOSED.duration.wave * 2);
  });
});

describe("papier", () => {
  const timing: PaperTiming = {
    reach: 900,
    speed: 900,
    holdMs: 700,
    resorbMs: 600,
    resorb: "dither",
  };

  it("avance à vitesse constante, tient, puis se dissout", () => {
    expect(paperAt(500, timing)).toMatchObject({ phase: "spread", front: 450, covered: false });
    expect(paperAt(1200, timing)).toMatchObject({ phase: "hold", front: 900, covered: true });
    expect(paperAt(2000, timing)).toMatchObject({ phase: "resorb", dissolve: 0.5 });
    expect(paperAt(2400, timing).phase).toBe("done");
  });

  it("repart vers son origine en `recede`, reste en `none`", () => {
    expect(paperAt(1700 + 500, { ...timing, resorb: "recede" })).toMatchObject({
      phase: "resorb",
      front: 450,
    });
    expect(paperAt(60_000, { ...timing, resorb: "none" })).toMatchObject({
      phase: "hold",
      covered: true,
    });
  });

  it("couvre tout le cadre depuis n'importe quel point", () => {
    expect(farthestCorner(300, 400, { x: 0, y: 0 })).toBe(500);
    expect(farthestCorner(300, 400, { x: 300, y: 400 })).toBe(500);
  });

  it("mesure la distance dans la zone : le front contourne ce qui n'en est pas", () => {
    // Un U : de (0,0) à (2,0), il faut descendre et remonter.
    const zone = [
      { x: 0, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 2, y: 0 },
    ];
    const distances = zoneDistances(zone, { x: 0, y: 0 });
    expect(distances.get("2,0")).toBe(4);
    expect(zoneReach(distances)).toBe(5);
    expect(zoneDistances(zone, { x: 5, y: 5 }).size).toBe(0);
    const texels = zoneTexels(distances, 3, 2);
    expect(texels[(0 * 3 + 2) * 4]).toBe(255);
    expect(texels[(0 * 3 + 2) * 4 + 1]).toBe(4);
    expect(texels[(0 * 3 + 1) * 4]).toBe(0);
  });

  it("projette et retrouve la même case", () => {
    const iso = { originX: 200, originY: 40, tileWidth: 48, tileHeight: 24 };
    for (const tile of [
      { x: 0, y: 0 },
      { x: 3, y: 5 },
      { x: 8, y: 2 },
    ]) {
      const { x, y } = project(tile, iso);
      expect(unproject(x + 5, y - 3, iso)).toEqual(tile);
    }
  });
});

describe("composants du labo", () => {
  it("donne le texte réel au lecteur d'écran et cache les glyphes", () => {
    const html = renderToStaticMarkup(<CipherText text="Déploiement" />);
    expect(html).toContain('<span class="occ-cipher__sr">Déploiement</span>');
    expect(html).toContain('class="occ-cipher__chars" aria-hidden="true"');
    expect(html.match(/data-state="cipher"/g)).toHaveLength("Déploiement".length);
  });

  it("garde les espaces entre les mots sans en faire des glyphes", () => {
    const html = renderToStaticMarkup(<CipherText text="Vision is" mode="plain" />);
    expect(html.match(/occ-cipher__word/g)).toHaveLength(2);
    expect(html.match(/occ-cipher__cell/g)).toHaveLength(8);
  });

  it("rend une frise entièrement décorative", () => {
    const html = renderToStaticMarkup(<CipherFrieze count={5} />);
    expect(html.startsWith('<span class="occ-frieze occ-frieze--row" aria-hidden="true"')).toBe(
      true,
    );
    expect(html.match(/<svg/g)).toHaveLength(5);
  });

  it("pose le papier en calque décoratif", () => {
    const html = renderToStaticMarkup(<PaperInversion run={null} blend="invert" />);
    expect(html).toBe('<canvas class="occ-paper occ-paper--invert" aria-hidden="true"></canvas>');
  });
});
