/**
 * Écrit `src/generated/tokens.css` depuis `src/tokens.ts`, et à côté
 * `src/generated/proposed-tokens.css`, les tokens de la refonte que seul le labo lit. Les
 * fichiers sont versionnés pour que le CSS se lise sans build ; `tokens.test.ts` échoue
 * s'ils ont dérivé de leur source.
 */
import { writeFileSync } from "node:fs";
import { proposedStylesheet, tokensStylesheet } from "../src/tokens.ts";

writeFileSync(new URL("../src/generated/tokens.css", import.meta.url), tokensStylesheet());
writeFileSync(
  new URL("../src/generated/proposed-tokens.css", import.meta.url),
  proposedStylesheet(),
);
console.log("src/generated/tokens.css et src/generated/proposed-tokens.css écrits");
