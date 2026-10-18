// Les aperçus vivent avec la charte, dans `packages/ui/previews/` : cette page ne fait que
// les monter. Un appel et non un import seul, que le build élaguerait (`mountLab`).
import { mountLab } from "../../../packages/ui/previews/main.tsx";

mountLab(document.getElementById("lab"));
