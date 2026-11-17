<script setup lang="ts">
/**
 * Le retour d'un formulaire, au-dessus des champs. `role="alert"` pour une erreur, lue
 * aussitôt ; `status` sinon, lu sans interrompre. L'emplacement `action` porte un geste
 * lié au message (renvoyer un lien).
 */
import type { IconName } from "../icons.js";
import Icon from "./Icon.vue";

type Tone = "error" | "success" | "info";

withDefaults(
  defineProps<{
    /** `error` dans la teinte des refus, `success` dans celle des gestes acceptés. */
    tone?: Tone | undefined;
  }>(),
  { tone: "info" },
);

const TONE_ICONS: Record<Tone, IconName> = {
  error: "ban",
  success: "check",
  info: "mail",
};
</script>

<template>
  <div
    :class="['occ-form-message', `occ-form-message--${tone}`]"
    :role="tone === 'error' ? 'alert' : 'status'"
  >
    <Icon :name="TONE_ICONS[tone]" />
    <span><slot /></span>
    <slot name="action" />
  </div>
</template>
