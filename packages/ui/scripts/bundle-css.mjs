/**
 * Écrit `dist/styles.css` : les tokens générés, puis la feuille des composants (avec les
 * feuilles qu'elle importe), en un seul fichier. Le build publié doit se suffire à lui-même — un consommateur qui ne reçoit que
 * cette feuille (Claude Design, via `.design-sync/`) n'a pas `generated/tokens.css` à
 * côté, et un `@import` vers lui laisserait toutes les propriétés `--occ-*` indéfinies.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const source = (path) => readFileSync(new URL(`../src/${path}`, import.meta.url), "utf8");
// Les feuilles que `styles.css` importe à côté des tokens, intégrées à leur place.
const PARTS = ["wip.css"];
let styles = source("styles.css").replace(/^@import "\.\/generated\/tokens\.css";\n/m, "");
for (const part of PARTS) styles = styles.replace(`@import "./${part}";\n`, `${source(part)}\n`);
if (styles.includes("@import"))
  throw new Error("styles.css importe autre chose que les tokens et PARTS : à intégrer ici");

mkdirSync(new URL("../dist", import.meta.url), { recursive: true });
writeFileSync(
  new URL("../dist/styles.css", import.meta.url),
  `${source("generated/tokens.css")}\n${styles}`,
);
console.log("dist/styles.css écrit (tokens inclus)");
