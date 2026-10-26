import "@occulis/ui/lab.css";
import { setTextDress } from "../../cipher-jsx/text.js";
import { CipheredText } from "./CipheredText.js";

/**
 * Chiffre tous les textes que le back-office rendra à partir de maintenant. Chargé à part
 * (`resources.ts`), seulement pour un compte `goy` : les autres ne téléchargent ni le labo
 * ni sa feuille.
 */
export function installCipher(): void {
  setTextDress((text, key) => <CipheredText key={key} text={text} />);
}
