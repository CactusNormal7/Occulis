import type { Palette } from "@occulis/ui/tokens";

/**
 * Les retouches du design system : une palette modifiée couleur par couleur, à chaud, puis
 * rendue sous la forme exacte que `packages/ui/src/tokens.ts` attend. Rien n'est écrit :
 * la palette retouchée vit dans la page, et on la recopie à la main si elle convient —
 * `tokens.ts` reste la seule source des couleurs.
 */

/** Une couleur de la palette, désignée par son chemin (`terrain.top`, `camp.A`). */
export interface PaletteEntry {
  readonly path: string;
  readonly value: number;
}

type Node = number | { readonly [key: string]: Node };

/** Toutes les couleurs d'une palette, dans l'ordre de sa déclaration. */
export function paletteEntries(palette: Palette): PaletteEntry[] {
  const entries: PaletteEntry[] = [];
  const walk = (node: Node, prefix: string): void => {
    if (typeof node === "number") {
      entries.push({ path: prefix, value: node });
      return;
    }
    for (const [key, child] of Object.entries(node)) walk(child, prefix === "" ? key : `${prefix}.${key}`);
  };
  walk(palette as unknown as Node, "");
  return entries;
}

/** La palette, la couleur `path` remplacée par `value`. Un chemin inconnu la rend telle quelle. */
export function withEntry(palette: Palette, path: string, value: number): Palette {
  const replace = (node: Node, keys: readonly string[]): Node => {
    if (typeof node === "number" || keys.length === 0) return keys.length === 0 ? value : node;
    const [head, ...rest] = keys;
    if (head === undefined || !Object.hasOwn(node, head)) return node;
    return { ...node, [head]: replace(node[head] as Node, rest) };
  };
  return replace(palette as unknown as Node, path.split(".")) as unknown as Palette;
}

/** Le nombre de couleurs qui diffèrent entre deux palettes. */
export function editedCount(palette: Palette, reference: Palette): number {
  const original = new Map(paletteEntries(reference).map((entry) => [entry.path, entry.value]));
  return paletteEntries(palette).filter((entry) => original.get(entry.path) !== entry.value).length;
}

/** `0xRRGGBB` → `#rrggbb`, le format du sélecteur de couleur du navigateur. */
export function toHex(value: number): string {
  return `#${value.toString(16).padStart(6, "0")}`;
}

/** `#rrggbb` → `0xRRGGBB` ; `undefined` pour tout autre texte. */
export function fromHex(text: string): number | undefined {
  return /^#[0-9a-f]{6}$/i.test(text) ? Number.parseInt(text.slice(1), 16) : undefined;
}

/**
 * La palette écrite comme dans `THEMES` (`tokens.ts`), prête à remplacer l'entrée du thème :
 * mêmes clés, même ordre, entiers en `0x` minuscules.
 */
export function paletteSource(name: string, palette: Palette): string {
  const literal = (value: number): string => `0x${value.toString(16).padStart(6, "0")}`;
  const lines = Object.entries(palette as unknown as Record<string, Node>).map(([key, node]) => {
    if (typeof node === "number") return `    ${key}: ${literal(node)},`;
    const fields = Object.entries(node).map(([field, value]) => `${field}: ${literal(value as number)}`);
    return `    ${key}: { ${fields.join(", ")} },`;
  });
  return [`  ${name}: {`, ...lines, "  },"].join("\n");
}
