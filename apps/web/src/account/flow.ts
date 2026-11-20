import { inject, onMounted, provide, ref, watch, type InjectionKey, type Ref } from "vue";
import type { AuthOutcome } from "../net/auth.js";
import { fieldOf, type FieldName, type Notice, type RouteKind } from "./model.js";

/**
 * Ce que partagent les formulaires de l'écran de compte : l'adresse tapée (qui suit d'un
 * parcours à l'autre), l'avis affiché en tête, le passage à un autre parcours, et si l'entrée
 * par Google est offerte. `AccountApp.vue` le tient, chaque formulaire le lit.
 */
export interface AccountFlow {
  readonly email: Ref<string>;
  readonly notice: Ref<Notice | undefined>;
  readonly navigate: (kind: RouteKind, notice?: Notice) => void;
  readonly google: boolean;
}

const FLOW_KEY: InjectionKey<AccountFlow> = Symbol("account-flow");

export function provideAccountFlow(flow: AccountFlow): void {
  provide(FLOW_KEY, flow);
}

export function useAccountFlow(): AccountFlow {
  const flow = inject(FLOW_KEY, null);
  if (flow === null) throw new Error("useAccountFlow outside AccountApp");
  return flow;
}

/**
 * L'état commun d'un formulaire : l'envoi en cours, le refus général (dans l'avis) et le
 * refus propre à un champ, qui y ramène le focus. Le champ marqué `autofocus` reçoit le focus
 * à l'ouverture : l'attribut seul ne vaut qu'au chargement de la page.
 */
export function useSubmission(formId: string, notice: Ref<Notice | undefined>) {
  const busy = ref(false);
  const fieldError = ref<{ field: FieldName; message: string } | undefined>(undefined);

  const fieldInput = (selector: string) =>
    document.querySelector<HTMLInputElement>(`#${formId} ${selector}`);

  onMounted(() => fieldInput("[autofocus]")?.focus());

  watch(
    fieldError,
    (error) => {
      if (error === undefined) return;
      const input = fieldInput(`[name="${error.field}"]`);
      input?.focus();
      input?.select();
    },
    { flush: "post" },
  );

  async function run(attempt: () => Promise<AuthOutcome>, onSuccess: () => void) {
    busy.value = true;
    fieldError.value = undefined;
    notice.value = undefined;
    const outcome = await attempt();
    busy.value = false;
    if (outcome.ok) {
      onSuccess();
      return;
    }
    const field = fieldOf(outcome.code);
    if (field === undefined) notice.value = { tone: "error", text: outcome.message };
    else fieldError.value = { field, message: outcome.message };
  }

  function errorFor(field: FieldName): string | undefined {
    return fieldError.value?.field === field ? fieldError.value.message : undefined;
  }

  return { busy, run, errorFor };
}
