/**
 * Le labo de la refonte graphique (docs/design/refonte-graphique.md) : des composants
 * **proposés**, qu'aucun écran n'importe tant que la direction n'est pas validée. Sous-chemin
 * `@occulis/ui/lab`, hors de l'entrée principale : ni le jeu, ni le back-office, ni la
 * synchronisation vers Claude Design ne les voient. Importer aussi `lab/lab.css`.
 */
export {
  CIPHER_ALPHABETS,
  CIPHER_CHARSET,
  alphabet,
  cellAt,
  cipherGlyph,
  foldChar,
  scrambleGlyph,
  settleAt,
  type Alphabet,
  type CellState,
  type CipherAlphabet,
  type GlyphShape,
} from "./glyphs.js";
export {
  CipherFrieze,
  CipherText,
  Glyph,
  type CipherFriezeProps,
  type CipherMode,
  type CipherTextProps,
} from "./Cipher.js";
export { DEFAULT_MOTION, durationMs, motionFrom, readMotion, type Motion } from "./motion.js";
export {
  diamond,
  farthestCorner,
  paperAt,
  project,
  unproject,
  zoneDistances,
  type IsoProjection,
  type PaperFrame,
  type PaperTiming,
  type Tile,
} from "./paper.js";
export {
  PaperInversion,
  type PaperInversionProps,
  type PaperRun,
  type PaperSource,
} from "./PaperInversion.js";
