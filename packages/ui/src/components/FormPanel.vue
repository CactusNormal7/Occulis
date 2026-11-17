<script setup lang="ts">
/**
 * Une colonne étroite et centrée, marque en tête : l'écrin des parcours de compte. Sans
 * animation d'entrée : posée dans un cadre déjà affiché, elle laisserait voir le cadre vide
 * avant son contenu.
 *
 * Emplacements : `lead` (une ligne sous le titre, remplace la prop du même nom), le
 * formulaire, et `footer` (ce qui le suit : liens vers les autres parcours).
 */
import Wordmark from "./Wordmark.vue";

defineProps<{
  /** Le titre de l'écran : « Connexion », « Créer un compte »… */
  title: string;
  /** Une ligne sous le titre. */
  lead?: string | undefined;
}>();
</script>

<template>
  <div class="occ-form-panel">
    <Wordmark />
    <div class="occ-form-panel__head">
      <h1 class="occ-form-panel__title">{{ title }}</h1>
      <p v-if="lead !== undefined || $slots.lead !== undefined" class="occ-note">
        <slot name="lead">{{ lead }}</slot>
      </p>
    </div>
    <slot />
    <div v-if="$slots.footer !== undefined" class="occ-form-panel__footer">
      <slot name="footer" />
    </div>
  </div>
</template>
