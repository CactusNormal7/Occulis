import { describe, expect, it } from "vitest";
import {
  baseName,
  categoryOf,
  componentDoc,
  cssAnimations,
  fieldNotes,
  folderName,
  inline,
  isCopy,
  markdownBlocks,
  markdownSection,
  orderStories,
} from "./catalog.js";

describe("fichiers", () => {
  it("écarte les copies d'iCloud et nomme un fichier par sa base et son dossier", () => {
    expect(isCopy("../previews/Button/Variants 2.vue")).toBe(true);
    expect(isCopy("../previews/Button/Variants.vue")).toBe(false);
    expect(baseName("../../.design-sync/previews/Button/Variants.vue")).toBe("Variants");
    expect(folderName("../../.design-sync/previews/Button/Variants.vue")).toBe("Button");
    expect(baseName("../docs/Badge.md")).toBe("Badge");
  });

  it("lit la catégorie dans l'en-tête d'une fiche", () => {
    expect(categoryOf("---\ncategory: Actions\n---\n")).toBe("Actions");
    expect(categoryOf("Pas d'en-tête")).toBeUndefined();
  });

  it("range les aperçus dans l'ordre de la fiche, puis les autres par ordre alphabétique", () => {
    const card = "---\ncategory: Actions\nstories: Variants, WithIcon\n---\n";
    expect(orderStories(card, ["Disabled", "WithIcon", "Variants", "Busy"])).toEqual([
      "Variants",
      "WithIcon",
      "Busy",
      "Disabled",
    ]);
    expect(orderStories("", ["B", "A"])).toEqual(["A", "B"]);
  });
});

describe("componentDoc", () => {
  const source = `<script setup lang="ts">
/** Un panneau : cadre fin.
 * Sur deux lignes. */
import { computed } from "vue";

defineProps<{
  /** Le titre. */
  title?: string | undefined;
  onPick?: ((value: string) => void) | undefined;
}>();

const emit = defineEmits<{ close: [] }>();
</script>

<template><section /></template>
`;

  it("rend le commentaire d'en-tête et le contrat déclaré par les macros", () => {
    const card = componentDoc(source);
    expect(card.doc).toBe("Un panneau : cadre fin.\nSur deux lignes.");
    expect(card.contract).toContain("defineProps<{");
    expect(card.contract).toContain("onPick?: ((value: string) => void) | undefined;\n}>");
    expect(card.contract).toContain("defineEmits<{ close: [] }>");
  });

  it("rend un commentaire vide et aucun contrat quand le composant n'en déclare pas", () => {
    const bare = componentDoc('<script setup lang="ts">\nimport { h } from "vue";\n</script>');
    expect(bare).toEqual({ doc: "", contract: undefined });
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
      "# Title\n\nOne line\ncontinued.\n\n- first\n  wrapped\n- second\n\n1. un\n2. deux\n\n```vue\n<UiRoot />\n```\n",
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
    expect(blocks[4]).toEqual({ kind: "code", language: "vue", text: "<UiRoot />" });
  });
});
