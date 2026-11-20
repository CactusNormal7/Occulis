import { inject, provide, type InjectionKey } from "vue";
import type { Palette, ThemeName } from "@occulis/ui/tokens";

/**
 * Les retouches en vigueur, partagées par les pages du design system : le thème montré, sa
 * palette (retouchée ou non) et la vitesse des animations. `DesignSystem.vue` les tient et
 * les pose sur le document ; les pages les lisent.
 */
export interface Tweaks {
  readonly theme: ThemeName;
  readonly palette: Palette;
  /** 1 : temps réel ; 0.25 : quatre fois plus lent. */
  readonly speed: number;
  readonly setTheme: (theme: ThemeName) => void;
  readonly setColor: (path: string, value: number) => void;
  readonly setSpeed: (speed: number) => void;
  readonly reset: () => void;
}

const TWEAKS_KEY: InjectionKey<Tweaks> = Symbol("design-tweaks");

/** `tweaks` est un objet réactif : ses champs se lisent à jour, sans `.value`. */
export function provideTweaks(tweaks: Tweaks): void {
  provide(TWEAKS_KEY, tweaks);
}

export function useTweaks(): Tweaks {
  const tweaks = inject(TWEAKS_KEY, null);
  if (tweaks === null) throw new Error("useTweaks outside DesignSystem");
  return tweaks;
}
