import { ref } from "vue";
import type * as api from "../api.js";

/** Ce que reçoit chaque éditeur de réglage. */
export interface EditorEvents {
  /** L'éditeur a abouti : le message à annoncer. */
  done: [message: string];
  cancel: [];
}

/**
 * L'état commun d'un éditeur : l'envoi en cours, et le refus du serveur, affiché dans
 * l'éditeur même. `run` envoie, puis appelle `onDone` avec le message de réussite.
 */
export function useEditor(onDone: (message: string) => void) {
  const busy = ref(false);
  const error = ref<string | undefined>(undefined);

  async function run(pending: Promise<api.Outcome<unknown>>, message: string) {
    busy.value = true;
    error.value = undefined;
    const outcome = await pending;
    busy.value = false;
    if (outcome.ok) onDone(message);
    else error.value = outcome.message;
  }

  return { busy, error, run };
}
