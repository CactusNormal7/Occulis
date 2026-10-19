import { describe, expect, it } from "vitest";
import {
  baseName,
  categoryOf,
  componentDocs,
  cssAnimations,
  fieldNotes,
  inline,
  isCopy,
  markdownBlocks,
  markdownSection,
  storySources,
} from "./catalog.js";

describe("fichiers", () => {
  it("écarte les copies d'iCloud et nomme un fichier par sa base", () => {
    expect(isCopy("../previews/Button 2.tsx")).toBe(true);
    expect(isCopy("../previews/Button.tsx")).toBe(false);
    expect(baseName("../../.design-sync/previews/Button.tsx")).toBe("Button");
    expect(baseName("../docs/Badge.md")).toBe("Badge");
  });

  it("lit la catégorie dans l'en-tête d'une fiche", () => {
    expect(categoryOf("---\ncategory: Actions\n---\n")).toBe("Actions");
    expect(categoryOf("Pas d'en-tête")).toBeUndefined();
  });
});

describe("storySources", () => {
  it("découpe un fichier d'aperçus en exemples, du nom d'export au suivant", () => {
    const source =
      'import { Button } from "@occulis/ui";\n\nexport const One = () => <Button />;\n\nexport const Two = () => (\n  <Button variant="primary" />\n);\n';
    const stories = storySources(source);
    expect([...stories.keys()]).toEqual(["One", "Two"]);
    expect(stories.get("One")).toBe("export const One = () => <Button />;");
    expect(stories.get("Two")).toContain('variant="primary"');
  });
});

describe("componentDocs", () => {
  const source = `import type { ReactNode } from "react";

export interface CardProps {
  /** Le titre. */
  title?: ReactNode | undefined;
}

/** Un panneau : cadre fin.
 * Sur deux lignes. */
export function Card({ title }: CardProps) {
  return null;
}

/** Des cartes côte à côte. */
export function CardGrid({ children }: { children: ReactNode }) {
  return null;
}

export function helper() {}

/** Un bouton qui transmet sa référence. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(props, ref) {
  return null;
});

export interface ButtonProps {
  variant?: string;
}

export const ICONS = {};
`;

  it("rend le commentaire et l'interface de props d'un composant", () => {
    const card = componentDocs(source).get("Card");
    expect(card?.doc).toBe("Un panneau : cadre fin.\nSur deux lignes.");
    expect(card?.props).toContain("export interface CardProps {");
    expect(card?.props).toContain("title?: ReactNode | undefined;");
  });

  it("retombe sur le type des paramètres écrit en ligne, et ignore ce qui n'est pas un composant", () => {
    const docs = componentDocs(source);
    expect(docs.get("CardGrid")?.props).toBe("{ children: ReactNode }");
    expect(docs.has("helper")).toBe(false);
    expect(docs.has("ICONS")).toBe(false);
  });

  it("lit aussi un composant déclaré par forwardRef", () => {
    const button = componentDocs(source).get("Button");
    expect(button?.doc).toBe("Un bouton qui transmet sa référence.");
    expect(button?.props).toContain("variant?: string;");
  });
});

describe("cssAnimations", () => {
  it("relève chaque règle animée avec son commentaire, et pas celles qui l'éteignent", () => {
    const css = `/* ---- Console ---- */

/* Une ligne qui se trace. */
#status[data-fresh] {
  animation: line-in 420ms ease both;
}

.quiet { color: red; }

/* ---- Fin ---- */
.bare { animation: spin 1s linear infinite; }

@media (prefers-reduced-motion: reduce) {
  #status[data-fresh] {
    animation: none !important;
  }
}`;
    expect(cssAnimations(css)).toEqual([
      {
        selector: "#status[data-fresh]",
        animation: "line-in 420ms ease both",
        note: "Une ligne qui se trace.",
      },
      { selector: ".bare", animation: "spin 1s linear infinite", note: "" },
    ]);
  });
});

describe("fieldNotes", () => {
  it("rend les clés d'un objet constant, chacune sous le dernier commentaire rencontré", () => {
    const source = `export const MOTION_FX = {
  /** La respiration. */
  breathMs: 3200,
  /** La vue : durée, puis retard par case. */
  revealMs: 420,
  revealPerTileMs: 45,
} as const;`;
    expect(fieldNotes(source, "MOTION_FX")).toEqual([
      { key: "breathMs", value: "3200", note: "La respiration." },
      { key: "revealMs", value: "420", note: "La vue : durée, puis retard par case." },
      { key: "revealPerTileMs", value: "45", note: "La vue : durée, puis retard par case." },
    ]);
    expect(fieldNotes(source, "ABSENT")).toEqual([]);
  });
});

describe("Markdown", () => {
  it("isole une section jusqu'au titre suivant de même rang", () => {
    const doc =
      "## 8. Choix\n\nintro\n\n### 8.1 DA\n\ncorps\n\n#### détail\n\nencore\n\n### 8.2 Autre\n\nfin";
    expect(markdownSection(doc, "8.1")).toBe("### 8.1 DA\n\ncorps\n\n#### détail\n\nencore\n");
    expect(markdownSection(doc, "9")).toBeUndefined();
  });

  it("découpe les spans d'une ligne", () => {
    expect(inline("Use `UiRoot`, **always**, see [doc](a.md).")).toEqual([
      { kind: "text", text: "Use " },
      { kind: "code", text: "UiRoot" },
      { kind: "text", text: ", " },
      { kind: "strong", text: "always" },
      { kind: "text", text: ", see " },
      { kind: "link", text: "doc", href: "a.md" },
      { kind: "text", text: "." },
    ]);
  });

  it("découpe un document en titres, paragraphes, listes et code", () => {
    const blocks = markdownBlocks(
      "# Title\n\nOne line\ncontinued.\n\n- first\n  wrapped\n- second\n\n1. un\n2. deux\n\n```jsx\n<UiRoot />\n```\n",
    );
    expect(blocks.map((block) => block.kind)).toEqual([
      "heading",
      "paragraph",
      "list",
      "list",
      "code",
    ]);
    expect(blocks[1]).toEqual({
      kind: "paragraph",
      text: [{ kind: "text", text: "One line continued." }],
    });
    expect(blocks[2]).toEqual({
      kind: "list",
      ordered: false,
      items: [[{ kind: "text", text: "first wrapped" }], [{ kind: "text", text: "second" }]],
    });
    expect(blocks[3]).toMatchObject({ kind: "list", ordered: true });
    expect(blocks[4]).toEqual({ kind: "code", language: "jsx", text: "<UiRoot />" });
  });
});
