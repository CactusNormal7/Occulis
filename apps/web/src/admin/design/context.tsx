import { createContext, useContext } from "react";
import type { Palette, ThemeName } from "@occulis/ui/tokens";

/**
 * Les retouches en vigueur, partagées par les pages du design system : le thème montré, sa
 * palette (retouchée ou non) et la vitesse des animations. `DesignSystem` les tient et les
 * pose sur le document ; les pages les lisent.
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

export const TweaksContext = createContext<Tweaks | null>(null);

export function useTweaks(): Tweaks {
  const tweaks = useContext(TweaksContext);
  if (tweaks === null) throw new Error("useTweaks outside DesignSystem");
  return tweaks;
}
