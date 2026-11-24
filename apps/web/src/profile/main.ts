import { createApp } from "vue";
import "@occulis/ui/styles.css";
import { loadCache } from "../load/cache.js";
import { guardPageReveal } from "../load/page.js";
import { applyTheme, storedTheme } from "../theme/theme-choice.js";
import { parseProfileRoute } from "./model.js";
import ProfileApp from "./ProfileApp.vue";
import { resourcesOf } from "./resources.js";

/**
 * La page de profil, servie sous `/profile/` — une page à part, en Vue sur les composants de
 * `@occulis/ui`, qui ne charge ni PixiJS ni le moteur de jeu.
 */
guardPageReveal();

// Tout ce que l'écran d'arrivée lira part avant même le premier rendu, en parallèle.
loadCache.preload(resourcesOf(parseProfileRoute(location.hash)));

// Le replay se dessine dans le design choisi depuis le jeu (`theme/theme-choice.ts`).
applyTheme(storedTheme());

createApp(ProfileApp).mount("#profile");
