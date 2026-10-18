/**
 * Le design system du back-office, en ce qu'il a de pur : il lit les **sources** de la
 * charte — celles-là mêmes dont la synchronisation vers Claude Design tire son projet
 * (`.design-sync/`, `packages/ui/src/`) — et en tire ce que la page montre : la catégorie
 * de chaque composant, le code de ses exemples, son commentaire, ses props, les animations
 * déclarées dans une feuille, les notes d'une table de durées, et du Markdown découpé en
 * blocs. Ni DOM ni Vite : les textes lui sont passés, d'où ses tests.
 *
 * Lire les sources plutôt que le projet distant garde la page juste sans re-synchronisation :
 * ce qu'elle montre est ce qui est construit, au commit près.
 */

/** Les copies qu'iCloud fabrique à côté des fichiers (`Button 2.tsx`) : jamais des sources. */
export function isCopy(path: string): boolean {
  return / \d+\.[^/]+$/.test(path);
}

/** `../../.design-sync/previews/Button.tsx` → `Button`. */
export function baseName(path: string): string {
  const file = path.slice(path.lastIndexOf("/") + 1);
  const dot = file.indexOf(".");
  return dot === -1 ? file : file.slice(0, dot);
}

/** La catégorie d'un composant, portée par l'en-tête de sa fiche (`category: Actions`). */
export function categoryOf(markdown: string): string | undefined {
  const head = /^---\n([\s\S]*?)\n---/.exec(markdown);
  const line = head?.[1]?.split("\n").find((entry) => entry.startsWith("category:"));
  const value = line?.slice("category:".length).trim();
  return value === undefined || value.length === 0 ? undefined : value;
}

/**
 * Le code de chaque exemple d'un fichier d'aperçus, par nom d'export : de `export const
 * Nom` jusqu'au suivant. C'est le code qui rend l'aperçu montré à côté — un exemple vérifié.
 */
export function storySources(source: string): Map<string, string> {
  const stories = new Map<string, string>();
  const starts = [...source.matchAll(/^export const (\w+)/gm)];
  starts.forEach((match, index) => {
    const end = starts[index + 1]?.index ?? source.length;
    stories.set(match[1] ?? "", source.slice(match.index, end).trim());
  });
  return stories;
}

/** Le texte entre l'ouvrant `open` à la position `from` et son fermant, bornes comprises. */
function balanced(source: string, from: number, open: string, close: string): string | undefined {
  let depth = 0;
  for (let i = from; i < source.length; i += 1) {
    const char = source[i];
    if (char === open) depth += 1;
    else if (char === close) {
      depth -= 1;
      if (depth === 0) return source.slice(from, i + 1);
    }
  }
  return undefined;
}

/** Un commentaire `/** … *\/` sans ses astérisques, paragraphes conservés. */
export function cleanDoc(comment: string): string {
  return comment
    .replace(/^\/\*\*\s?/, "")
    .replace(/\s*\*\/$/, "")
    .split("\n")
    .map((line) => line.replace(/^\s*\* ?/, ""))
    .join("\n")
    .trim();
}

export interface ComponentDoc {
  /** Le commentaire qui précède la déclaration, nettoyé ; vide s'il n'y en a pas. */
  readonly doc: string;
  /** Le contrat : l'interface `NomProps` si elle existe, sinon les paramètres de la fonction. */
  readonly props: string | undefined;
}

/**
 * Le commentaire et le contrat de chaque composant déclaré dans une source (`export function
 * Nom`, ou `export const Nom = forwardRef(…)`). Les props viennent de l'interface `NomProps`
 * quand le fichier la déclare, sinon du type des paramètres écrit en ligne
 * (`{ children }: { children: ReactNode }`).
 */
export function componentDocs(source: string): Map<string, ComponentDoc> {
  const interfaces = new Map<string, string>();
  for (const match of source.matchAll(
    /^export interface (\w+)(?:<[^>]*>)?(?: extends [^{]+)? \{/gm,
  )) {
    const body = balanced(source, match.index + match[0].length - 1, "{", "}");
    if (body !== undefined)
      interfaces.set(
        match[1] ?? "",
        source.slice(match.index, match.index + match[0].length - 1) + body,
      );
  }

  const docs = new Map<string, ComponentDoc>();
  for (const match of source.matchAll(/^export (function|const) (\w+)/gm)) {
    const name = match[2] ?? "";
    // Une constante n'est un composant que si elle enveloppe un rendu (`forwardRef`, `memo`).
    if (
      !/^[A-Z]/.test(name) ||
      (match[1] === "const" &&
        !/^export const \w+ = (?:forwardRef|memo)\b/.test(source.slice(match.index)))
    )
      continue;
    const before = source.slice(0, match.index).trimEnd();
    const comment = before.endsWith("*/") ? before.slice(before.lastIndexOf("/**")) : "";
    const open = match[1] === "function" ? source.indexOf("(", match.index) : -1;
    const parameters = open === -1 ? undefined : balanced(source, open, "(", ")");
    const typed = parameters?.match(/\}:\s*([\s\S]+)\)$/)?.[1]?.trim();
    const props =
      interfaces.get(`${name}Props`) ??
      (typed !== undefined && !typed.endsWith("Props") ? typed : undefined);
    docs.set(name, { doc: comment.length > 0 ? cleanDoc(comment) : "", props });
  }
  return docs;
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
