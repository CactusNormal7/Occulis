import "@occulis/ui/styles.css";
import { mountDressableApp } from "../cipher-text/renderer.js";
import { loadCache } from "../load/cache.js";
import { guardPageReveal } from "../load/page.js";
import { applyTheme, storedTheme } from "../theme/theme-choice.js";
import AdminApp from "./AdminApp.vue";
import { parseRoute } from "./model.js";
import { resourcesOf } from "./resources.js";

/**
 * Le back-office, servi sous `/admin/` — une page à part, en Vue sur les composants de
 * `@occulis/ui`, qui ne charge ni PixiJS ni le moteur de jeu. Il est monté sur le renderer qui
 * sait chiffrer les textes (`cipher-text/`), pour le rôle `goy`.
 */
guardPageReveal();

// Tout ce que l'écran d'arrivée lira part avant même le premier rendu, en parallèle.
loadCache.preload(resourcesOf(parseRoute(location.hash)));

// Le replay se dessine dans le design choisi depuis le jeu (`theme/theme-choice.ts`).
applyTheme(storedTheme());

const host = document.getElementById("admin");
if (host === null) throw new Error("admin/index.html without #admin");
mountDressableApp(AdminApp, host);
