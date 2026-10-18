import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { Button, Card, Note, PageHead, Segmented, useMessages, useToast } from "@occulis/ui";
import { THEME_NAMES, THEMES, paletteVariables, type Palette, type ThemeName } from "@occulis/ui/tokens";
import { storedTheme } from "../../theme/theme-choice.js";
import { sweepVeil } from "../../ui/veil.js";
import { routeHash, type DesignPage, type Route } from "../model.js";
import { Components } from "./Components.js";
import { Conventions } from "./Conventions.js";
import { TweaksContext, useTweaks, type Tweaks } from "./context.js";
import { Foundations } from "./Foundations.js";
import { Motion } from "./Motion.js";
import { editedCount, paletteSource, withEntry } from "./tweaks.js";

/**
 * Le design system, dans le back-office (`#/design`) : la charte montrée par ses propres
 * sources — tokens, composants montés en vrai, animations rejouables, conventions — avec des
 * retouches à chaud. Réservé aux administrateurs comme le reste du back-office (`App.tsx`).
 *
 * Les retouches ne s'écrivent nulle part : le thème et la palette sont posés sur le document
 * le temps de la visite, et rendus tels qu'ils étaient en quittant la section ; la palette
 * retouchée se copie sous la forme qu'attend `tokens.ts`, seule source des couleurs.
 */

export type DesignRoute = Extract<Route, { view: "design" }>;

/** Les vitesses proposées : temps réel, puis de plus en plus lent. */
const SPEEDS = [1, 0.5, 0.25, 0.1] as const;

const PAGES: readonly DesignPage[] = ["foundations", "components", "motion", "conventions"];

export function DesignSystem({ route }: { route: DesignRoute }) {
  const m = useMessages().admin.design;
  const [theme, setThemeState] = useState<ThemeName>(storedTheme);
  const [palette, setPalette] = useState<Palette>(THEMES[theme]);
  const [speed, setSpeed] = useState(1);

  const tweaks = useMemo<Tweaks>(
    () => ({
      theme,
      palette,
      speed,
      // Changer de thème passe sous le voile tramé, comme depuis les réglages du jeu.
      setTheme: (next) =>
        sweepVeil(() => {
          setThemeState(next);
          setPalette(THEMES[next]);
        }),
      setColor: (path, value) => setPalette((current) => withEntry(current, path, value)),
      setSpeed,
      reset: () => setPalette(THEMES[theme]),
    }),
    [theme, palette, speed],
  );

  useAppliedTheme(theme, palette);
  useSlowMotion(speed);

  const page = (
    <>
      <PageHead title={m.title} />
      <Note>{m.intro}</Note>
      <Segmented
        label={m.title}
        value={route.page}
        options={PAGES.map((value) => ({
          value,
          label: m.pages[value],
          href: routeHash({ view: "design", page: value, component: null }),
        }))}
      />
      <TweaksCard />
      {route.page === "foundations" && <Foundations />}
      {route.page === "components" && <Components selected={route.component} />}
      {route.page === "motion" && <Motion />}
      {route.page === "conventions" && <Conventions />}
    </>
  );
  return <TweaksContext.Provider value={tweaks}>{page}</TweaksContext.Provider>;
}

function TweaksCard() {
  const m = useMessages().admin.design.tweaks;
  const notify = useToast();
  const tweaks = useTweaks();
  const edited = editedCount(tweaks.palette, THEMES[tweaks.theme]);
  const copy = () => {
    const text = paletteSource(tweaks.theme, tweaks.palette);
    void (navigator.clipboard?.writeText(text) ?? Promise.reject(new Error("clipboard"))).then(
      () => notify(m.copied),
      () => notify(m.copyFailed, false),
    );
  };
  return (
    <Card
      title={m.title}
      action={
        <>
          <Button size="sm" icon="copy" onClick={copy}>
            {m.copy}
          </Button>
          <Button size="sm" variant="ghost" disabled={edited === 0} onClick={tweaks.reset}>
            {m.reset}
          </Button>
        </>
      }
    >
      <Segmented
        label={m.theme}
        value={tweaks.theme}
        onChange={tweaks.setTheme}
        options={THEME_NAMES.map((name) => ({ value: name, label: m.themes[name] }))}
      />
      <Segmented
        label={m.speed}
        value={String(tweaks.speed)}
        onChange={(value) => tweaks.setSpeed(Number(value))}
        options={SPEEDS.map((factor) => ({ value: String(factor), label: m.speedOption(factor) }))}
      />
      <Note>
        {m.edited(edited)} · {m.hint}
      </Note>
    </Card>
  );
}

/**
 * Pose le thème et la palette retouchée sur le document, et les rend en partant : le reste
 * du back-office retrouve le thème choisi dans le jeu, sans retouche.
 */
function useAppliedTheme(theme: ThemeName, palette: Palette): void {
  useLayoutEffect(() => {
    const root = document.documentElement;
    const previous = root.dataset.theme;
    root.dataset.theme = theme;
    return () => {
      if (previous === undefined) delete root.dataset.theme;
      else root.dataset.theme = previous;
    };
  }, [theme]);

  useLayoutEffect(() => {
    if (editedCount(palette, THEMES[theme]) === 0) return;
    const root = document.documentElement;
    const variables = paletteVariables(palette);
    for (const [name, value] of Object.entries(variables)) root.style.setProperty(name, value);
    return () => {
      for (const name of Object.keys(variables)) root.style.removeProperty(name);
    };
  }, [palette, theme]);
}

/**
 * Ralentit toutes les animations CSS de la page — celles qui tournent et chacune qui démarre.
 * Les animations dessinées image par image (ouverture des fenêtres, courbes) lisent `speed`
 * elles-mêmes.
 */
function useSlowMotion(speed: number): void {
  useEffect(() => {
    const slow = (animations: readonly Animation[]) => {
      for (const animation of animations) animation.playbackRate = speed;
    };
    slow(document.getAnimations());
    const onStart = (event: Event) => {
      if (event.target instanceof Element) slow(event.target.getAnimations());
    };
    document.addEventListener("animationstart", onStart, true);
    document.addEventListener("transitionrun", onStart, true);
    return () => {
      document.removeEventListener("animationstart", onStart, true);
      document.removeEventListener("transitionrun", onStart, true);
      for (const animation of document.getAnimations()) animation.playbackRate = 1;
    };
  }, [speed]);
}
