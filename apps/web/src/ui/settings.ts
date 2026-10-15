import { isThemeName } from "@occulis/ui/tokens";
import { pixelReveal } from "@occulis/ui/reveal";
import { isLocale, type Locale } from "@occulis/i18n";
import type { ThemeName } from "@occulis/ui/tokens";

/**
 * Les réglages d'affichage : la fenêtre flottante qui s'ouvre depuis l'engrenage, en haut
 * à droite (`index.html`, `#settings`). Elle porte le design (docs/design.md 8.1) et la
 * langue — ni l'un ni l'autre n'est un geste de jeu.
 *
 * Non modale : Échap, l'engrenage ou un clic ailleurs la referment. Elle se construit et se
 * défait en petits carrés (`pixelReveal`), comme toute fenêtre flottante du site.
 */

export interface SettingsElements {
  readonly toggle: HTMLButtonElement;
  readonly panel: HTMLElement;
}

export interface SettingsOptions {
  readonly elements: SettingsElements;
  readonly theme: () => ThemeName;
  readonly locale: () => Locale;
  readonly hint: (theme: ThemeName) => string;
  readonly chooseTheme: (theme: ThemeName) => void;
  readonly chooseLocale: (locale: Locale) => void;
}

export interface Settings {
  /** Montre ou cache l'engrenage ; le cacher referme la fenêtre. */
  setAvailable(available: boolean): void;
  /** Réécrit l'état courant : design et langue choisis, indications. */
  refresh(): void;
}

export function attachSettings({ elements, theme, locale, hint, chooseTheme, chooseLocale }: SettingsOptions): Settings {
  const { toggle, panel } = elements;
  let closing = false;

  const isOpen = (): boolean => !panel.hidden && !closing;

  const open = (): void => {
    if (isOpen()) return;
    closing = false;
    panel.hidden = false;
    toggle.setAttribute("aria-expanded", "true");
    void pixelReveal(panel);
    panel.querySelector<HTMLButtonElement>("button[aria-current='true']")?.focus({ preventScroll: true });
  };

  const close = (immediately = false): void => {
    if (panel.hidden || closing) return;
    toggle.setAttribute("aria-expanded", "false");
    if (immediately) {
      panel.hidden = true;
      return;
    }
    closing = true;
    void pixelReveal(panel, "close").then(() => {
      closing = false;
      panel.hidden = true;
    });
  };

  const refresh = (): void => {
    const current = theme();
    for (const button of panel.querySelectorAll<HTMLButtonElement>("button[data-theme-choice]")) {
      const choice = button.dataset["themeChoice"];
      button.setAttribute("aria-current", String(choice === current));
      if (isThemeName(choice)) button.title = hint(choice);
    }
    for (const button of panel.querySelectorAll<HTMLButtonElement>("button[data-locale]")) {
      button.setAttribute("aria-current", String(button.dataset["locale"] === locale()));
    }
  };

  toggle.addEventListener("click", () => (isOpen() ? close() : open()));
  panel.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    const chosenTheme = target.closest<HTMLButtonElement>("button[data-theme-choice]")?.dataset["themeChoice"];
    if (isThemeName(chosenTheme) && chosenTheme !== theme()) chooseTheme(chosenTheme);
    const chosenLocale = target.closest<HTMLButtonElement>("button[data-locale]")?.dataset["locale"];
    if (isLocale(chosenLocale) && chosenLocale !== locale()) chooseLocale(chosenLocale);
  });
  document.addEventListener("pointerdown", (event) => {
    const target = event.target as Node;
    if (isOpen() && !panel.contains(target) && !toggle.contains(target)) close();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && isOpen()) {
      close();
      toggle.focus();
    }
  });
  refresh();

  return {
    setAvailable(available) {
      toggle.hidden = !available;
      if (!available) close(true);
    },
    refresh,
  };
}
