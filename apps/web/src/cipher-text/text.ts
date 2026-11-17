/**
 * Le chiffrement des textes du back-office pour le rôle `goy`. Ce module ne dépend ni de Vue
 * ni de `@occulis/ui` : il tient seulement l'habit posé par `admin/cipher/install.ts` quand le
 * compte est `goy`, et les règles qui disent quel texte le porte. Tant qu'aucun habit n'est
 * posé — le jeu, le profil, tout autre compte —, le renderer de `renderer.ts` ne fait rien de
 * plus que celui de Vue.
 */

/**
 * Ce qui habille un texte. L'hôte est un `<span>` posé à la place du nœud de texte ; l'habit
 * y dessine ce qu'il veut, le met à jour quand le texte change, et le défait quand l'hôte
 * quitte la page.
 */
export interface TextDress {
  mount(host: HTMLElement, text: string): void;
  update(host: HTMLElement, text: string): void;
  unmount(host: HTMLElement): void;
}

let dress: TextDress | null = null;

export function setTextDress(next: TextDress | null): void {
  dress = next;
}

export function currentDress(): TextDress | null {
  return dress;
}

/** Les éléments dont le contenu doit rester du texte : le navigateur n'y accepte rien d'autre. */
const TEXT_ONLY = new Set(["OPTION", "TEXTAREA", "TITLE", "SCRIPT", "STYLE"]);

/** La classe que porte tout ce que dessine le chiffre : ses lettres sont le texte à montrer. */
const CIPHER_CLASS = "occ-cipher";

/** Un texte qui vaut d'être chiffré : autre chose que des blancs. */
export function isDressable(text: string): boolean {
  return text.trim().length > 0;
}

/**
 * Un élément peut-il recevoir un texte chiffré ? Ni un élément qui n'accepte que du texte, ni
 * un élément du chiffre lui-même — ses lettres seraient chiffrées à leur tour.
 */
export function acceptsDress(element: Element): boolean {
  if (TEXT_ONLY.has(element.tagName.toUpperCase())) return false;
  return element.closest(`.${CIPHER_CLASS}`) === null;
}
