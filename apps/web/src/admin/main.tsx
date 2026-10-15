import { createRoot } from "react-dom/client";
import "@occulis/ui/styles.css";
import { App } from "./App.js";
import { loadCache } from "../load/cache.js";
import { parseRoute } from "./model.js";
import { resourcesOf } from "./resources.js";

/**
 * Le back-office, servi sous `/admin/` — une page à part, en React sur les composants de
 * `@occulis/ui`, qui ne charge ni PixiJS ni le moteur de jeu.
 */
// Tout ce que l'écran d'arrivée lira part avant même le premier rendu, en parallèle.
loadCache.preload(resourcesOf(parseRoute(location.hash)));

const host = document.getElementById("admin");
if (host === null) throw new Error("element #admin missing from admin/index.html");
createRoot(host).render(<App />);
