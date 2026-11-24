/**
 * Le design system du back-office, en ce qu'il a de pur : il lit les **sources** de la
 * charte — celles-là mêmes dont la synchronisation vers Claude Design tire son projet
 * (`.design-sync/`, `packages/ui/src/`) — et en tire ce que la page montre : la catégorie
 * de chaque composant, l'ordre de ses exemples, son commentaire, son contrat, les animations
 * déclarées dans une feuille, les notes d'une table de durées, et du Markdown découpé en
 * blocs. Ni DOM ni Vite : les textes lui sont passés, d'où ses tests.
 *
 * Lire les sources plutôt que le projet distant garde la page juste sans re-synchronisation :
 * ce qu'elle montre est ce qui est construit, au commit près.
 */

/** Les copies qu'iCloud fabrique à côté des fichiers (`Button 2.vue`) : jamais des sources. */
export function isCopy(path: string): boolean {
  return / \d+\.[^/]+$/.test(path);
}

/** `../../.design-sync/previews/Button/Variants.vue` → `Variants`. */
export function baseName(path: string): string {
  const file = path.slice(path.lastIndexOf("/") + 1);
  const dot = file.indexOf(".");
  return dot === -1 ? file : file.slice(0, dot);
}

/** `../../.design-sync/previews/Button/Variants.vue` → `Button` : le dossier qui le contient. */
export function folderName(path: string): string {
  const parts = path.split("/");
  return parts[parts.length - 2] ?? "";
}

/** Les champs de l'en-tête d'une fiche (`category: Actions`), par nom. */
function frontMatter(markdown: string): Map<string, string> {
  const head = /^---\n([\s\S]*?)\n---/.exec(markdown)?.[1] ?? "";
  const fields = new Map<string, string>();
  for (const line of head.split("\n")) {
    const colon = line.indexOf(":");
    if (colon === -1) continue;
    const value = line.slice(colon + 1).trim();
    if (value.length > 0) fields.set(line.slice(0, colon).trim(), value);
  }
  return fields;
}

/** La catégorie d'un composant, portée par l'en-tête de sa fiche (`category: Actions`). */
export function categoryOf(markdown: string): string | undefined {
  return frontMatter(markdown).get("category");
}

/**
 * L'ordre des aperçus d'un composant, tel que l'auteur l'a écrit dans l'en-tête de sa fiche
 * (`stories: Variants, WithIcon, Disabled`) : un fichier par aperçu ne dit pas son rang.
 * Les aperçus que la fiche ne cite pas suivent, par ordre alphabétique.
 */
export function orderStories(markdown: string, names: readonly string[]): string[] {
  const listed = (frontMatter(markdown).get("stories") ?? "")
    .split(",")
    .map((name) => name.trim())
    .filter((name) => names.includes(name));
  const rest = names.filter((name) => !listed.includes(name)).sort();
  return [...listed, ...rest];
}

/**
 * Le texte entre l'ouvrant `open` à la position `from` et son fermant, bornes comprises. Entre
 * chevrons, la flèche d'un type de fonction (`=>`) ne ferme rien.
 */
function balanced(source: string, from: number, open: string, close: string): string | undefined {
  let depth = 0;
  for (let i = from; i < source.length; i += 1) {
    const char = source[i];
    const isArrow = char === ">" && source[i - 1] === "=";
    if (char === open) depth += 1;
    else if (char === close && !isArrow) {
      depth -= 1;
      if (depth === 0) return source.slice(from, i + 1);
    }
  }
  return undefined;
}

/** Un commentaire `/** … *\/` sans ses astérisques, paragraphes conservés. */
function cleanDoc(comment: string): string {
  return comment
    .replace(/^\/\*\*\s?/, "")
    .replace(/\s*\*\/$/, "")
    .split("\n")
    .map((line) => line.replace(/^\s*\* ?/, ""))
    .join("\n")
    .trim();
}

export interface ComponentDoc {
  /** Le commentaire d'en-tête du composant, nettoyé ; vide s'il n'y en a pas. */
  readonly doc: string;
  /** Le contrat : ses props, ses événements et ses emplacements, tels que déclarés. */
  readonly contract: string | undefined;
}

/** Les macros qui déclarent le contrat d'un composant, dans l'ordre où la page les montre. */
const CONTRACT_MACROS = ["defineProps", "defineModel", "defineEmits", "defineSlots"] as const;

/**
 * Le commentaire et le contrat d'un composant monofichier (`.vue`). Le commentaire est le
 * premier `/** … *\/` de son `<script setup>`, avant tout import ; le contrat, le type passé à
 * chacune de ses macros (`defineProps<{ … }>()`, `defineEmits<{ … }>()`…), recopié tel quel.
 */
export function componentDoc(source: string): ComponentDoc {
  const script = /<script setup[^>]*>([\s\S]*?)<\/script>/.exec(source)?.[1] ?? "";
  const head = /^\s*(\/\*\*[\s\S]*?\*\/)/.exec(script)?.[1];

  const declarations: string[] = [];
  for (const macro of CONTRACT_MACROS) {
    for (const match of script.matchAll(new RegExp(`\\b${macro}<`, "g"))) {
      const type = balanced(script, match.index + macro.length, "<", ">");
      if (type !== undefined) declarations.push(`${macro}${type}`);
    }
  }

  return {
    doc: head === undefined ? "" : cleanDoc(head),
    contract: declarations.length === 0 ? undefined : declarations.join("\n\n"),
  };
}

export interface CssAnimation {
  /** Le sélecteur qui l'anime. */
  readonly selector: string;
  /** La déclaration `animation`, telle qu'écrite. */
  readonly animation: string;
  /** Le commentaire posé juste au-dessus de la règle, s'il y en a un. */
  readonly note: string;
}

/**
 * Les animations qu'une feuille déclare : chaque règle qui pose une `animation`, avec le
 * commentaire qui la précède. Les règles qui l'éteignent (`animation: none`, sous mouvement
 * réduit) n'en sont pas.
 */
export function cssAnimations(css: string): CssAnimation[] {
  const found: CssAnimation[] = [];
  // Le commentaire retenu est le dernier avant le sélecteur, et jamais un titre de section
  // (`---- Animations ----`) : il ne décrit pas la règle.
  for (const match of css.matchAll(/(?:\/\*((?:[^*]|\*(?!\/))*)\*\/\s*)*([^{}/;]+)\{([^{}]*)\}/g)) {
    const body = match[3] ?? "";
    const declaration = /(?:^|;|\s)animation:\s*([^;]+);/
      .exec(body)?.[1]
      ?.trim()
      .replace(/\s+/g, " ");
    if (declaration === undefined || declaration.startsWith("none")) continue;
    const selector = (match[2] ?? "").trim().replace(/\s+/g, " ");
    if (selector.startsWith("@") || selector.length === 0) continue;
    const note = (match[1] ?? "").trim().replace(/\s+/g, " ");
    found.push({ selector, animation: declaration, note: note.startsWith("----") ? "" : note });
  }
  return found;
}

export interface FieldNote {
  readonly key: string;
  readonly value: string;
  /** Le commentaire qui précède la clé, ou le dernier rencontré dans le bloc. */
  readonly note: string;
}

/**
 * Les clés d'un objet constant (`export const NOM = { … }`) avec leur commentaire. Un
 * commentaire vaut pour les clés qui le suivent jusqu'au suivant : une table de durées les
 * groupe (« la ligne de vue : durée, et retard par case »).
 */
export function fieldNotes(source: string, name: string): FieldNote[] {
  const start = source.search(new RegExp(`export const ${name}\\b[^=]*= \\{`));
  if (start === -1) return [];
  const block = balanced(source, source.indexOf("{", start), "{", "}") ?? "";
  const notes: FieldNote[] = [];
  let note = "";
  for (const match of block.matchAll(/(\/\*\*[\s\S]*?\*\/)|^\s*(\w+):\s*([^,\n]+),?\s*$/gm)) {
    if (match[1] !== undefined) note = cleanDoc(match[1]).replace(/\s+/g, " ");
    else notes.push({ key: match[2] ?? "", value: (match[3] ?? "").trim(), note });
  }
  return notes;
}

/** Une section d'un document Markdown, de son titre (`### 8.1 …`) au titre suivant de même rang. */
export function markdownSection(markdown: string, heading: string): string | undefined {
  const lines = markdown.split("\n");
  const start = lines.findIndex(
    (line) => /^#+ /.test(line) && line.replace(/^#+ /, "").startsWith(heading),
  );
  if (start === -1) return undefined;
  const level = /^#+/.exec(lines[start] ?? "")?.[0].length ?? 1;
  const end = lines.findIndex(
    (line, index) =>
      index > start && /^#+ /.test(line) && (/^#+/.exec(line)?.[0].length ?? 0) <= level,
  );
  return lines.slice(start, end === -1 ? undefined : end).join("\n");
}

export type Inline =
  | { readonly kind: "text"; readonly text: string }
  | { readonly kind: "code"; readonly text: string }
  | { readonly kind: "strong"; readonly text: string }
  | { readonly kind: "em"; readonly text: string }
  | { readonly kind: "link"; readonly text: string; readonly href: string };

export type Block =
  | { readonly kind: "heading"; readonly level: number; readonly text: readonly Inline[] }
  | { readonly kind: "paragraph"; readonly text: readonly Inline[] }
  | {
      readonly kind: "list";
      readonly ordered: boolean;
      readonly items: readonly (readonly Inline[])[];
    }
  | { readonly kind: "code"; readonly language: string; readonly text: string };

/** Le Markdown d'une ligne : `code`, **gras**, *italique*, [lien](url). Rien d'autre. */
export function inline(text: string): Inline[] {
  const spans: Inline[] = [];
  const pattern = /`([^`]+)`|\*\*([^*]+)\*\*|\*([^*]+)\*|\[([^\]]+)\]\(([^)]+)\)/g;
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    if (match.index > last) spans.push({ kind: "text", text: text.slice(last, match.index) });
    if (match[1] !== undefined) spans.push({ kind: "code", text: match[1] });
    else if (match[2] !== undefined) spans.push({ kind: "strong", text: match[2] });
    else if (match[3] !== undefined) spans.push({ kind: "em", text: match[3] });
    else spans.push({ kind: "link", text: match[4] ?? "", href: match[5] ?? "" });
    last = match.index + match[0].length;
  }
  if (last < text.length) spans.push({ kind: "text", text: text.slice(last) });
  return spans;
}

/**
 * Le Markdown des conventions et du design doc, découpé en blocs : titres, paragraphes,
 * listes (une ligne de suite indentée prolonge l'élément), blocs de code. Le sous-ensemble
 * que ces documents emploient, pas une implémentation de CommonMark.
 */
export function markdownBlocks(markdown: string): Block[] {
  const blocks: Block[] = [];
  const lines = markdown.replace(/^---\n[\s\S]*?\n---\n/, "").split("\n");
  let i = 0;
  const item = /^\s*(?:[-*]|\d+[.)])\s+/;
  while (i < lines.length) {
    const line = lines[i] ?? "";
    if (line.trim().length === 0) {
      i += 1;
      continue;
    }
    const fence = /^```(\w*)/.exec(line);
    if (fence !== null) {
      const body: string[] = [];
      i += 1;
      while (i < lines.length && !(lines[i] ?? "").startsWith("```")) body.push(lines[i++] ?? "");
      i += 1;
      blocks.push({ kind: "code", language: fence[1] ?? "", text: body.join("\n") });
      continue;
    }
    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading !== null) {
      blocks.push({
        kind: "heading",
        level: heading[1]?.length ?? 1,
        text: inline(heading[2] ?? ""),
      });
      i += 1;
      continue;
    }
    if (item.test(line)) {
      const ordered = /^\s*\d/.test(line);
      const items: string[] = [];
      while (i < lines.length && (lines[i] ?? "").trim().length > 0) {
        const current = lines[i] ?? "";
        if (item.test(current)) items.push(current.replace(item, ""));
        else items[items.length - 1] += ` ${current.trim()}`;
        i += 1;
      }
      blocks.push({ kind: "list", ordered, items: items.map(inline) });
      continue;
    }
    const paragraph: string[] = [];
    while (
      i < lines.length &&
      (lines[i] ?? "").trim().length > 0 &&
      !/^(#{1,6}\s|```)/.test(lines[i] ?? "") &&
      !item.test(lines[i] ?? "")
    ) {
      paragraph.push((lines[i] ?? "").trim());
      i += 1;
    }
    blocks.push({ kind: "paragraph", text: inline(paragraph.join(" ")) });
  }
  return blocks;
}
