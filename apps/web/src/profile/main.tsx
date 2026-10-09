import { createRoot } from "react-dom/client";
import "@occulis/ui/styles.css";
import { App } from "./App.js";

/**
 * La page de profil, servie sous `/profil/` — une page à part, en React sur les
 * composants de `@occulis/ui`, qui ne charge ni PixiJS ni le moteur de jeu.
 */
const host = document.getElementById("profil");
if (host === null) throw new Error("élément #profil absent de profil/index.html");
createRoot(host).render(<App />);
