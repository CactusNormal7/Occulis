import type { ReactNode } from "react";

/**
 * Le chiffrement des textes du back-office pour le rôle `goy`. Ce module ne dépend ni de
 * `@occulis/ui` ni du labo : il tient seulement la fonction qui habille un texte, posée par
 * `admin/cipher/install.tsx` quand le compte est `goy`. Tant qu'elle est absente — le jeu, le
 * profil, tout autre compte — le runtime JSX ne fait rien de plus que React.
 */
export type TextDress = (text: string, key: number) => ReactNode;

let dress: TextDress | null = null;

export function setTextDress(next: TextDress | null): void {
  dress = next;
}

/** Les éléments dont l'enfant doit rester une chaîne : le navigateur n'y accepte que du texte. */
const TEXT_ONLY = new Set(["option", "textarea", "title", "script", "style"]);

function isDressable(child: unknown): child is string | number {
  if (typeof child === "number") return true;
  return typeof child === "string" && child.trim().length > 0;
}

/**
 * Remplace les chaînes enfants d'un élément du DOM par leur version chiffrée. Les éléments du
 * chiffre lui-même (`occ-cipher*`) restent intacts : leurs lettres sont le texte à montrer.
 */
export function dressProps<P>(type: unknown, props: P): P {
  if (dress === null || typeof type !== "string" || TEXT_ONLY.has(type)) return props;
  const record = props as { className?: unknown; children?: unknown };
  if (typeof record.className === "string" && record.className.includes("occ-cipher")) return props;

  const children = record.children;
  if (isDressable(children)) return { ...props, children: dress(String(children), 0) };
  if (Array.isArray(children)) {
    const dressed = children.map((child: unknown, index) =>
      isDressable(child) ? dress?.(String(child), index) : child,
    );
    return { ...props, children: dressed };
  }
  return props;
}
