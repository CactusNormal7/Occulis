/**
 * Écrit `src/generated/tokens.css` depuis `src/tokens.ts`. Le fichier est versionné pour
 * que le CSS se lise sans build ; `tokens.test.ts` échoue s'il a dérivé de sa source.
 */
import { writeFileSync } from "node:fs";
import { tokensStylesheet } from "../src/tokens.ts";

writeFileSync(new URL("../src/generated/tokens.css", import.meta.url), tokensStylesheet());
console.log("src/generated/tokens.css écrit");
