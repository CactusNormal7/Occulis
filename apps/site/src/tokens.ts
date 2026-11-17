import { DEFAULT_THEME, THEMES, paletteVariables } from "@occulis/ui/tokens";

/**
 * Les propriétés CSS de la charte, posées sur `:root` à la construction. Aucune couleur
 * n'est écrite dans le site : tout vient de `packages/ui/src/tokens.ts`, comme pour le jeu
 * (docs/design.md 8.1). Le site ne propose qu'un thème, celui d'un premier passage dans le
 * jeu — le choix entre les trois n'est pas tranché.
 */
export function rootDeclarations(): string {
  const variables = paletteVariables(THEMES[DEFAULT_THEME]);
  return `:root{${Object.entries(variables)
    .map(([name, value]) => `${name}:${value}`)
    .join(";")}}`;
}
