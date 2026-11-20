/** Les deux premières lettres ou chiffres d'un nom, en capitales : ce qu'affiche `TileAvatar`. */
export function initials(name: string): string {
  const letters = name.replace(/[^\p{L}\p{N}]/gu, "");
  return (letters.slice(0, 2) || "?").toUpperCase();
}
