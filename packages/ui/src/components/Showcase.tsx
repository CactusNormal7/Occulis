import type { ReactNode } from "react";
import { cx } from "../cx.js";

/**
 * Les briques d'une page qui montre la charte elle-même — le design system du back-office :
 * du code, des échantillons, des cadres d'aperçu, du texte rédigé. Elles vivent ici et non
 * dans la vue, pour qu'aucune page n'ait de classe ou de couleur propre.
 */

export interface CodeBlockProps {
  children: string;
  /** Un nom au-dessus du bloc : le fichier, le langage. */
  label?: string | undefined;
}

/** Du code, tel quel : monospace, sans retour forcé, défilant s'il déborde. */
export function CodeBlock({ children, label }: CodeBlockProps) {
  return (
    <figure className="occ-code">
      {label !== undefined && <figcaption className="occ-label">{label}</figcaption>}
      <pre className="occ-code__body">
        <code>{children}</code>
      </pre>
    </figure>
  );
}

export interface SwatchProps {
  /** La couleur montrée, en CSS : une valeur calculée depuis les tokens, jamais en dur. */
  color: string;
  /** Le nom du token. */
  name: string;
  /** La valeur lisible (`#e9e6df`, `rgb(… / 0.4)`). */
  value: string;
  /**
   * Rend l'échantillon modifiable : un clic ouvre le sélecteur de couleur du système, qui
   * rend `#rrggbb`. Sans lui, l'échantillon n'est qu'une lecture.
   */
  onChange?: ((value: string) => void) | undefined;
  /** La valeur a été retouchée : le nom est marqué. */
  edited?: boolean | undefined;
}

/** Un échantillon de couleur : la pastille, le nom du token, sa valeur. */
export function Swatch({ color, name, value, onChange, edited = false }: SwatchProps) {
  const chip = <span className="occ-swatch__chip" style={{ background: color }} aria-hidden="true" />;
  return (
    <div className={cx("occ-swatch", edited && "occ-swatch--edited")}>
      {onChange === undefined ? (
        chip
      ) : (
        <label className="occ-swatch__picker">
          {chip}
          <input type="color" value={value} aria-label={name} onChange={(event) => onChange(event.target.value)} />
        </label>
      )}
      <span className="occ-swatch__name">{name}</span>
      <code className="occ-swatch__value">{value}</code>
    </div>
  );
}

/** Des échantillons côte à côte, autant que la largeur en tient. */
export function SwatchGrid({ children }: { children: ReactNode }) {
  return <div className="occ-swatch-grid">{children}</div>;
}

export interface SpecimenProps {
  /** Le nom du token ou de la règle. */
  name: string;
  /** Sa valeur. */
  value?: ReactNode | undefined;
  /** Ce que le token produit : une barre de l'écart, un texte à la taille, un point qui bouge. */
  children: ReactNode;
}

/** Un token montré par son effet, à côté de son nom et de sa valeur. */
export function Specimen({ name, value, children }: SpecimenProps) {
  return (
    <div className="occ-specimen">
      <div className="occ-specimen__visual">{children}</div>
      <span className="occ-specimen__name">{name}</span>
      {value !== undefined && <code className="occ-specimen__value">{value}</code>}
    </div>
  );
}

export interface StageProps {
  /** Le nom de ce qui est montré : une variante, une animation. */
  title?: ReactNode | undefined;
  /** Des boutons alignés à droite du titre : rejouer, montrer le code. */
  actions?: ReactNode | undefined;
  children: ReactNode;
}

/**
 * Le cadre d'un aperçu vivant : un fond de vide, un trait pointillé, une marge. Ce qui est
 * dedans est le vrai composant, pas une image.
 */
export function Stage({ title, actions, children }: StageProps) {
  return (
    <section className="occ-stage">
      {(title !== undefined || actions !== undefined) && (
        <header className="occ-stage__head">
          {title !== undefined && <h4 className="occ-label">{title}</h4>}
          {actions !== undefined && <div className="occ-stage__actions">{actions}</div>}
        </header>
      )}
      <div className="occ-stage__body">{children}</div>
    </section>
  );
}

/** Du texte rédigé (titres, paragraphes, listes, code) : une page de conventions, une notice. */
export function Prose({ children }: { children: ReactNode }) {
  return <div className="occ-prose">{children}</div>;
}

export interface NavSection {
  label: string;
  items: readonly { href: string; label: string; current?: boolean | undefined }[];
}

/** Une navigation par sections, en colonne : la table des matières d'un catalogue. */
export function NavList({ sections, label }: { sections: readonly NavSection[]; label?: string | undefined }) {
  return (
    <nav className="occ-navlist" aria-label={label}>
      {sections.map((section) => (
        <div key={section.label} className="occ-navlist__section">
          <h4 className="occ-label">{section.label}</h4>
          <ul>
            {section.items.map((item) => (
              <li key={item.href}>
                <a href={item.href} aria-current={item.current === true ? "page" : undefined}>
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

/** Une colonne étroite à gauche (navigation, réglages), le contenu à droite. */
export function AsideLayout({ aside, children }: { aside: ReactNode; children: ReactNode }) {
  return (
    <div className="occ-aside-layout">
      <aside className="occ-aside-layout__aside">{aside}</aside>
      <div className="occ-aside-layout__main">{children}</div>
    </div>
  );
}
