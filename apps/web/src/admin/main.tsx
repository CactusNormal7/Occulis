import { createRoot } from "react-dom/client";
import "@occulis/ui/styles.css";
import { App } from "./App.js";
import { loadCache } from "../load/cache.js";
import { guardPageReveal } from "../load/page.js";
import { parseRoute } from "./model.js";
import { resourcesOf } from "./resources.js";
import { applyTheme, storedTheme } from "../theme/theme-choice.js";

/**
 * Le back-office, servi sous `/admin/` — une page à part, en React sur les composants de
 * `@occulis/ui`, qui ne charge ni PixiJS ni le moteur de jeu.
 */
guardPageReveal();

// Tout ce que l'écran d'arrivée lira part avant même le premier rendu, en parallèle.
loadCache.preload(resourcesOf(parseRoute(location.hash)));

// Le replay se dessine dans le design choisi depuis le jeu (`theme/theme-choice.ts`).
applyTheme(storedTheme());

const host = document.getElementById("admin");
if (host === null) throw new Error("element #admin missing from admin/index.html");
createRoot(host).render(<App />);
