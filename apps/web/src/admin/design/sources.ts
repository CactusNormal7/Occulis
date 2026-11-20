import type { Component } from "vue";
import conventions from "../../../../../.design-sync/conventions.md?raw";
import designDoc from "../../../../../docs/design.md?raw";
import charterCss from "../../../../../packages/ui/src/styles.css?raw";
import gameCss from "../../ui/ui.css?raw";
import themeSource from "../../../../../packages/board/src/theme.ts?raw";
import {
  baseName,
  categoryOf,
  componentDoc,
  cssAnimations,
  fieldNotes,
  folderName,
  isCopy,
  markdownSection,
  orderStories,
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
 * Un aperçu est un composant monofichier, `previews/<Composant>/<Aperçu>.vue`. Il est **monté**
 * (`eager`) et lu en texte (`?raw`) : le code montré est celui qui rend l'aperçu d'à côté. Le
 * tout ne part qu'avec la page du design system, chargée à part par `resources.ts`.
 */

const previewModules = import.meta.glob<Component>("../../../../../.design-sync/previews/*/*.vue", {
  eager: true,
  import: "default",
});
const previewTexts = import.meta.glob<string>("../../../../../.design-sync/previews/*/*.vue", {
  eager: true,
  query: "?raw",
  import: "default",
});
const cards = import.meta.glob<string>("../../../../../.design-sync/docs/*.md", {
  eager: true,
  query: "?raw",
  import: "default",
});
const componentTexts = import.meta.glob<string>("../../../../../packages/ui/src/components/*.vue", {
  eager: true,
  query: "?raw",
  import: "default",
});

export interface Story {
  readonly name: string;
  readonly Render: Component;
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
const CATEGORY_ORDER = [
  "Foundations",
  "Layout",
  "Actions",
  "Forms",
  "Data",
  "Status",
  "Players",
  "Overlays",
];

function byName<T>(files: Record<string, T>): Map<string, T> {
  return new Map(
    Object.entries(files)
      .filter(([path]) => !isCopy(path))
      .map(([path, value]) => [baseName(path), value]),
  );
}

/** Les aperçus de chaque composant, rangés par le nom de leur dossier. */
function storiesByComponent(): Map<string, Map<string, Story>> {
  const stories = new Map<string, Map<string, Story>>();
  for (const [path, Render] of Object.entries(previewModules)) {
    if (isCopy(path)) continue;
    const component = folderName(path);
    const name = baseName(path);
    const ofComponent = stories.get(component) ?? new Map<string, Story>();
    ofComponent.set(name, { name, Render, code: (previewTexts[path] ?? "").trim() });
    stories.set(component, ofComponent);
  }
  return stories;
}

function catalogue(): ComponentEntry[] {
  const allStories = storiesByComponent();
  const sources = byName(componentTexts);
  const entries = [...byName(cards)].map(([name, card]): ComponentEntry => {
    const ofComponent = allStories.get(name) ?? new Map<string, Story>();
    const stories = orderStories(card, [...ofComponent.keys()]).flatMap((story) => {
      const found = ofComponent.get(story);
      return found === undefined ? [] : [found];
    });
    const source = sources.get(name);
    const doc = source === undefined ? undefined : componentDoc(source);
    return {
      name,
      category: categoryOf(card) ?? "Other",
      file: source === undefined ? undefined : `${name}.vue`,
      doc: doc?.doc ?? "",
      contract: doc?.contract,
      stories,
    };
  });
  const rank = (category: string): number => {
    const index = CATEGORY_ORDER.indexOf(category);
    return index === -1 ? CATEGORY_ORDER.length : index;
  };
  return entries.sort(
    (a, b) => rank(a.category) - rank(b.category) || a.name.localeCompare(b.name),
  );
}

export const COMPONENTS: readonly ComponentEntry[] = catalogue();
export const CONVENTIONS: string = conventions;
export const ART_DIRECTION: string = markdownSection(designDoc, "8.1") ?? "";
export const GAME_ANIMATIONS: readonly CssAnimation[] = cssAnimations(gameCss);
export const CHARTER_ANIMATIONS: readonly CssAnimation[] = cssAnimations(charterCss);
export const BOARD_MOTION: readonly FieldNote[] = fieldNotes(themeSource, "MOTION_FX");
