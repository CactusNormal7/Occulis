import { createRenderer, nodeOps, patchProp, type App, type Component } from "vue";
import { acceptsDress, currentDress, isDressable } from "./text.js";

/**
 * Le renderer du back-office : celui de Vue pour le DOM (`nodeOps`, `patchProp`), dont seules
 * les opérations sur le texte changent. Quand un habit est posé (`setTextDress`, rôle `goy`),
 * chaque texte d'un élément devient un hôte `<span>` que l'habit dessine ; sans habit, il
 * rend exactement ce que rendrait Vue.
 *
 * Les attributs (`placeholder`, `aria-label`) ne passent pas par ces opérations : ils restent
 * en clair, comme le contenu des éléments qui n'acceptent que du texte (`<option>`).
 */

/** Les hôtes posés à la place d'un nœud de texte, avec le texte qu'ils habillent. */
const hosts = new WeakMap<Node, string>();

function createHost(text: string): HTMLElement {
  const host = document.createElement("span");
  hosts.set(host, text);
  currentDress()?.mount(host, text);
  return host;
}

function createText(text: string): Node {
  if (currentDress() === null || !isDressable(text)) return nodeOps.createText(text);
  return createHost(text);
}

function setText(node: Node, text: string): void {
  if (!hosts.has(node)) {
    nodeOps.setText(node, text);
    return;
  }
  hosts.set(node, text);
  currentDress()?.update(node as HTMLElement, text);
}

function setElementText(element: Element, text: string): void {
  // Ce que l'élément contenait part, hôtes compris : leur habit se défait d'abord.
  for (const child of element.childNodes) unmountHosts(child);
  if (currentDress() === null || !isDressable(text) || !acceptsDress(element)) {
    nodeOps.setElementText(element, text);
    return;
  }
  element.replaceChildren(createHost(text));
}

function insert(child: Node, parent: Element, anchor?: Node | null): void {
  nodeOps.insert(child, parent, anchor);
  // Un texte créé avant de connaître son parent : s'il atterrit là où le chiffre n'a pas sa
  // place (`<option>`), il redevient du texte.
  const text = hosts.get(child);
  if (text !== undefined && !acceptsDress(parent)) {
    unmountHosts(child);
    parent.replaceChild(document.createTextNode(text), child);
  }
}

function remove(child: Node): void {
  unmountHosts(child);
  nodeOps.remove(child);
}

/** Défait l'habit de chaque hôte contenu dans `node`, `node` compris. */
function unmountHosts(node: Node): void {
  const dress = currentDress();
  if (dress === null) return;
  if (hosts.has(node)) dress.unmount(node as HTMLElement);
  if (node instanceof Element)
    for (const host of node.querySelectorAll("span")) if (hosts.has(host)) dress.unmount(host);
}

/**
 * Le contenu statique que Vue pose d'un bloc (`innerHTML`) n'est jamais modifié ensuite : ses
 * textes s'habillent une fois pour toutes, là où il atterrit.
 */
type StaticInsert = NonNullable<typeof nodeOps.insertStaticContent>;

const domInsertStatic = nodeOps.insertStaticContent;

function insertStaticContent(...args: Parameters<StaticInsert>): ReturnType<StaticInsert> {
  if (domInsertStatic === undefined) throw new Error("runtime-dom without insertStaticContent");
  const [first, last] = domInsertStatic(...args);
  if (currentDress() !== null) dressStaticRange(first, last);
  return [first, last];
}

function dressStaticRange(first: Node, last: Node): void {
  const texts: Text[] = [];
  for (let node: Node | null = first; node !== null; node = node.nextSibling) {
    collectTexts(node, texts);
    if (node === last) break;
  }
  for (const text of texts) {
    const parent = text.parentElement;
    if (parent !== null && acceptsDress(parent) && isDressable(text.data))
      parent.replaceChild(createHost(text.data), text);
  }
}

function collectTexts(node: Node, into: Text[]): void {
  if (node instanceof Text) into.push(node);
  else for (const child of node.childNodes) collectTexts(child, into);
}

const renderer = createRenderer<Node, Element>({
  ...nodeOps,
  patchProp,
  createText,
  setText,
  setElementText,
  insert,
  remove,
  insertStaticContent,
});

/**
 * Monte `root` dans `host` sur le renderer qui sait habiller les textes. L'hôte est un élément
 * et non un sélecteur : seul le `createApp` de `vue` (celui du DOM) résout un sélecteur, celui
 * d'un renderer à soi le prendrait pour un nœud.
 */
export function mountDressableApp(root: Component, host: Element): App<Element> {
  const app = renderer.createApp(root);
  app.mount(host);
  return app;
}
