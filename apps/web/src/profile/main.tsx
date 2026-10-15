import { createRoot } from "react-dom/client";
import "@occulis/ui/styles.css";
import { App } from "./App.js";
import { loadCache } from "../load/cache.js";
import { parseProfileRoute } from "./model.js";
import { resourcesOf } from "./resources.js";

/**
 * La page de profil, servie sous `/profile/` — une page à part, en React sur les
 * composants de `@occulis/ui`, qui ne charge ni PixiJS ni le moteur de jeu.
 */
// Tout ce que l'écran d'arrivée lira part avant même le premier rendu, en parallèle.
loadCache.preload(resourcesOf(parseProfileRoute(location.hash)));

const host = document.getElementById("profile");
if (host === null) throw new Error("element #profile missing from profile/index.html");
createRoot(host).render(<App />);
