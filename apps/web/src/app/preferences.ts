import { chooseLocale, initLocale, translateDom } from "../locale/browser.js";
import { currentLocale, messages } from "../locale/current.js";
import { applyPalette } from "../theme/palette.js";
import { applyTheme, storedTheme } from "../theme/theme-choice.js";
import { type Settings, type SettingsElements, attachSettings } from "../ui/settings.js";
import { sweepVeil } from "../ui/veil.js";

/** Le thème et la langue retenus, posés avant le premier écran. */
export function applyStoredPreferences(): void {
  applyTheme(storedTheme());
  applyPalette(document.documentElement);
  initLocale();
  translateDom(document);
}

/** L'engrenage des réglages : le choix du thème et de la langue. */
export function attachPreferences(elements: SettingsElements): Settings {
  const settings = attachSettings({
    elements,
    theme: storedTheme,
    locale: currentLocale,
    hint: (theme) => messages().ui.theme.hints[theme],
    chooseTheme: (theme) => {
      // Un voile tramé balaie l'écran pendant que tout se repeint (ui/veil.ts).
      sweepVeil(() => {
        applyTheme(theme);
        applyPalette(document.documentElement);
        settings.refresh();
      });
    },
    chooseLocale,
  });
  return settings;
}
