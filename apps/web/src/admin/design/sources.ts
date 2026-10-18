import type { ComponentType } from "react";
import conventions from "../../../../../.design-sync/conventions.md?raw";
import designDoc from "../../../../../docs/design.md?raw";
import charterCss from "../../../../../packages/ui/src/styles.css?raw";
import gameCss from "../../ui/ui.css?raw";
import themeSource from "../../theme.ts?raw";
import {
  baseName,
  categoryOf,
  componentDocs,
  cssAnimations,
  fieldNotes,
  isCopy,
  markdownSection,
  storySources,
  type ComponentDoc,
  type CssAnimation,
  type FieldNote,
} from "./catalog.js";

/**
 * Les sources du design system, rassemblées par Vite au build : les aperçus et les fiches
 * de `.design-sync/` (ceux que la synchronisation envoie à Claude Design), les composants de
 * `packages/ui/src/components/`, les conventions, la section 8.1 du design doc, les feuilles
 * et la table des durées du plateau. Ce module ne fait que lire ; tout le découpage est dans
 * `catalog.ts`.
 *
 * Les aperçus sont **montés** (`eager`) et lus en texte (`?raw`) : le code montré est celui
 * qui rend l'aperçu d'à côté. Le tout ne part qu'avec la page du design system, chargée à
 * part par `resources.ts`.
 */

type StoryModule = Record<string, ComponentType>;

const previewModules = import.meta.glob<StoryModule>("../../../../../.design-sync/previews/*.tsx", { eager: true });
const previewTexts = import.meta.glob<string>("../../../../../.design-sync/previews/*.tsx", {
  eager: true,
  query: "?raw",
  import: "default",
});
const cards = import.meta.glob<string>("../../../../../.design-sync/docs/*.md", { eager: true, query: "?raw", import: "default" });
const componentTexts = import.meta.glob<string>("../../../../../packages/ui/src/components/*.tsx", {
  eager: true,
  query: "?raw",
  import: "default",
});

export interface Story {
  readonly name: string;
  readonly Render: ComponentType;
  readonly code: string;
}

export interface ComponentEntry extends ComponentDoc {
  readonly name: string;
  readonly category: string;
  /** Le fichier de `packages/ui/src/components/` qui le déclare. */
  readonly file: string | undefined;
  readonly stories: readonly Story[];
}

/** L'ordre des catégories, des fondations aux fenêtres : celui de Claude Design. */
const CATEGORY_ORDER = ["Foundations", "Layout", "Actions", "Forms", "Data", "Status", "Players", "Overlays"];

function byName<T>(files: Record<string, T>): Map<string, T> {
  return new Map(
    Object.entries(files)
      .filter(([path]) => !isCopy(path))
      .map(([path, value]) => [baseName(path), value]),
  );
}

function catalogue(): ComponentEntry[] {
  const modules = byName(previewModules);
  const texts = byName(previewTexts);
  const docs = new Map<string, ComponentDoc & { file: string }>();
  for (const [file, source] of byName(componentTexts)) {
    for (const [name, doc] of componentDocs(source)) docs.set(name, { ...doc, file: `${file}.tsx` });
  }
  const entries = [...byName(cards)].map(([name, card]): ComponentEntry => {
    const module = modules.get(name) ?? {};
    const code = storySources(texts.get(name) ?? "");
    // Dans l'ordre du fichier, celui que l'auteur des aperçus a choisi — pas l'alphabétique
    // des exports d'un module.
    const stories = [...code.keys()]
      .map((story) => [story, module[story]] as const)
      .filter((entry): entry is readonly [string, ComponentType] => typeof entry[1] === "function")
      .map(([story, Render]) => ({ name: story, Render, code: code.get(story) ?? "" }));
    const doc = docs.get(name);
    return {
      name,
      category: categoryOf(card) ?? "Other",
      file: doc?.file,
      doc: doc?.doc ?? "",
      props: doc?.props,
      stories,
    };
  });
  const rank = (category: string): number => {
    const index = CATEGORY_ORDER.indexOf(category);
    return index === -1 ? CATEGORY_ORDER.length : index;
  };
  return entries.sort((a, b) => rank(a.category) - rank(b.category) || a.name.localeCompare(b.name));
}

export const COMPONENTS: readonly ComponentEntry[] = catalogue();
export const CONVENTIONS: string = conventions;
export const ART_DIRECTION: string = markdownSection(designDoc, "8.1") ?? "";
export const GAME_ANIMATIONS: readonly CssAnimation[] = cssAnimations(gameCss);
export const CHARTER_ANIMATIONS: readonly CssAnimation[] = cssAnimations(charterCss);
export const BOARD_MOTION: readonly FieldNote[] = fieldNotes(themeSource, "MOTION_FX");
