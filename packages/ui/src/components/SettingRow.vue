<script setup lang="ts">
/**
 * Un réglage **en lecture d'abord** : libellé, valeur, et un bouton pour le modifier. Le
 * bouton déplie l'éditeur dans la ligne même, sans quitter la page ni masquer le reste —
 * on voit ce qu'on change et à côté de quoi. Quand l'éditeur se referme, le focus revient
 * au bouton qui l'avait ouvert, pour que le clavier reprenne où il en était.
 *
 * Emplacements : `value` et `description` (remplacent les props du même nom), `action` (un
 * geste propre au réglage, « Lier », « Retirer », à la place du bouton d'édition) et le
 * contenu, l'éditeur montré quand `editing` est vrai (en général un `SettingEditor`).
 */
import { useTemplateRef, watch } from "vue";
import { useMessages } from "../composables/locale.js";
import Button from "./Button.vue";

const props = defineProps<{
  /** Le nom du réglage : « Pseudo », « Mot de passe ». */
  label: string;
  /** Sa valeur actuelle, en lecture. */
  value?: string | undefined;
  /** Une précision sous la valeur : une règle, un délai, la raison d'un bouton grisé. */
  description?: string | undefined;
  /** Le libellé du bouton d'édition : un verbe (« Modifier », « Changer », « Définir »). */
  editLabel?: string | undefined;
  /**
   * L'ouverture de l'éditeur, liée par `@edit`. Déclarée en prop pour savoir si elle est
   * fournie : sans elle, pas de bouton d'édition (réglage en lecture seule).
   */
  onEdit?: (() => void) | undefined;
  editDisabled?: boolean | undefined;
  /** L'éditeur est ouvert : il remplace la valeur, le bouton disparaît. */
  editing?: boolean | undefined;
}>();

const messages = useMessages();
const trigger = useTemplateRef<InstanceType<typeof Button>>("trigger");

watch(
  () => props.editing,
  (editing, wasEditing) => {
    if (wasEditing === true && !editing) trigger.value?.focus();
  },
  { flush: "post" },
);
</script>

<template>
  <section :class="['occ-setting', { 'occ-setting--editing': editing }]" :aria-label="label">
    <div class="occ-setting__main">
      <h4 class="occ-setting__label">{{ label }}</h4>
      <slot v-if="editing" />
      <template v-else>
        <div class="occ-setting__value">
          <slot name="value">{{ value }}</slot>
        </div>
        <p
          v-if="description !== undefined || $slots.description !== undefined"
          class="occ-setting__description"
        >
          <slot name="description">{{ description }}</slot>
        </p>
      </template>
    </div>
    <template v-if="!editing">
      <slot name="action">
        <Button
          v-if="onEdit !== undefined"
          ref="trigger"
          size="sm"
          :disabled="editDisabled"
          @click="onEdit()"
        >
          {{ editLabel ?? messages.ui.edit }}
        </Button>
      </slot>
    </template>
  </section>
</template>
