import type { ReactNode } from "react";
import { Icon } from "./Icon.js";

export interface WordmarkProps {
  /** Le nom de l'écran, après le séparateur : « back-office », « partie »… */
  section?: string | undefined;
  href?: string | undefined;
}

/** Le cube filaire du menu, le mot-symbole estompé, puis le nom de l'écran. */
export function Wordmark({ section, href }: WordmarkProps) {
  const content = (
    <>
      <Icon name="cube" size={20} />
      <span className="occ-wordmark__name">Occulis</span>
      {section !== undefined && <span className="occ-wordmark__section">{section}</span>}
    </>
  );
  return href === undefined ? (
    <span className="occ-wordmark">{content}</span>
  ) : (
    <a className="occ-wordmark" href={href}>
      {content}
    </a>
  );
}

export interface TopBarTab {
  href: string;
  label: string;
  current?: boolean | undefined;
}

export interface TopBarProps {
  /** Le nom de l'écran, sous la marque. */
  section?: string | undefined;
  brandHref?: string | undefined;
  tabs?: readonly TopBarTab[] | undefined;
  /** Ce qui s'aligne à droite : l'identité, un lien de sortie. */
  end?: ReactNode | undefined;
}

/**
 * La barre du haut, celle du HUD des maquettes : marque, onglets en capitales soulignés
 * au trait, identité à droite. Elle reste collée en haut au défilement.
 */
export function TopBar({ section, brandHref, tabs = [], end }: TopBarProps) {
  return (
    <header className="occ-top-bar">
      <Wordmark section={section} href={brandHref} />
      {tabs.length > 0 && (
        <nav className="occ-top-bar__tabs">
          {tabs.map((tab) => (
            <a key={tab.href} href={tab.href} aria-current={tab.current === true ? "page" : undefined}>
              {tab.label}
            </a>
          ))}
        </nav>
      )}
      {end !== undefined && <div className="occ-top-bar__end">{end}</div>}
    </header>
  );
}

/** La barre de chargement indéterminée, sous le bord haut de la fenêtre. */
export function ProgressBar({ active }: { active: boolean }) {
  return <div className="occ-progress" data-active={active} aria-hidden="true" />;
}
