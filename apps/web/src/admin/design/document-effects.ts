import { watch, watchEffect, type Ref } from "vue";
import { THEMES, paletteVariables, type Palette, type ThemeName } from "@occulis/ui/tokens";
import { editedCount } from "./tweaks.js";

/**
 * Pose le thème et la palette retouchée sur le document, et les rend en partant : le reste
 * du back-office retrouve le thème choisi dans le jeu, sans retouche.
 */
export function useAppliedTheme(theme: Ref<ThemeName>, palette: Ref<Palette>): void {
  watch(
    theme,
    (current, _previous, onCleanup) => {
      const root = document.documentElement;
      const before = root.dataset["theme"];
      root.dataset["theme"] = current;
      onCleanup(() => {
        if (before === undefined) delete root.dataset["theme"];
        else root.dataset["theme"] = before;
      });
    },
    { immediate: true, flush: "sync" },
  );

  watchEffect(
    (onCleanup) => {
      if (editedCount(palette.value, THEMES[theme.value]) === 0) return;
      const style = document.documentElement.style;
      const variables = paletteVariables(palette.value);
      for (const [name, value] of Object.entries(variables)) style.setProperty(name, value);
      onCleanup(() => {
        for (const name of Object.keys(variables)) style.removeProperty(name);
      });
    },
    { flush: "sync" },
  );
}

/**
 * Ralentit toutes les animations CSS de la page — celles qui tournent et chacune qui démarre.
 * Les animations dessinées image par image (ouverture des fenêtres, courbes) lisent `speed`
 * elles-mêmes.
 */
export function useSlowMotion(speed: Ref<number>): void {
  watchEffect((onCleanup) => {
    const rate = speed.value;
    const slow = (animations: readonly Animation[]) => {
      for (const animation of animations) animation.playbackRate = rate;
    };
    const onStart = (event: Event) => {
      if (event.target instanceof Element) slow(event.target.getAnimations());
    };

    slow(document.getAnimations());
    document.addEventListener("animationstart", onStart, true);
    document.addEventListener("transitionrun", onStart, true);
    onCleanup(() => {
      document.removeEventListener("animationstart", onStart, true);
      document.removeEventListener("transitionrun", onStart, true);
      for (const animation of document.getAnimations()) animation.playbackRate = 1;
    });
  });
}
