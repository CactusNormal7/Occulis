import { h, render } from "vue";
import "@occulis/ui/lab.css";
import { setTextDress } from "../../cipher-text/text.js";
import CipheredText from "./CipheredText.vue";

/**
 * Chiffre tous les textes que le back-office rendra à partir de maintenant : chaque hôte que
 * pose le renderer (`cipher-text/renderer.ts`) reçoit un `CipheredText`, rendu à part avec le
 * renderer ordinaire de Vue. Chargé à part (`resources.ts`), seulement pour un compte `goy` :
 * les autres ne téléchargent ni le labo ni sa feuille.
 */
export function installCipher(): void {
  setTextDress({
    mount: (host, text) => render(h(CipheredText, { text }), host),
    update: (host, text) => render(h(CipheredText, { text }), host),
    unmount: (host) => render(null, host),
  });
}
