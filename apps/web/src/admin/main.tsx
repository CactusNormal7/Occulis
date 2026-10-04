import { createRoot } from "react-dom/client";
import "@occulis/ui/styles.css";
import { App } from "./App.js";

/**
 * Le back-office, servi sous `/admin/` — une page à part, en React sur les composants de
 * `@occulis/ui`, qui ne charge ni PixiJS ni le moteur de jeu.
 */
const host = document.getElementById("admin");
if (host === null) throw new Error("élément #admin absent de admin/index.html");
createRoot(host).render(<App />);
