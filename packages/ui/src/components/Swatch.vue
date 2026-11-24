<script setup lang="ts">
/** Un échantillon de couleur : la pastille, le nom du token, sa valeur. */
defineProps<{
  /** La couleur montrée, en CSS : une valeur calculée depuis les tokens, jamais en dur. */
  color: string;
  /** Le nom du token. */
  name: string;
  /** La valeur lisible (`#e9e6df`, `rgb(… / 0.4)`). */
  value: string;
  /**
   * La retouche, liée par `@change`. Déclarée en prop pour savoir si elle est fournie : avec
   * elle, un clic ouvre le sélecteur de couleur du système, qui rend `#rrggbb` ; sans elle,
   * l'échantillon n'est qu'une lecture.
   */
  onChange?: ((value: string) => void) | undefined;
  /** La valeur a été retouchée : le nom est marqué. */
  edited?: boolean | undefined;
}>();
</script>

<template>
  <div :class="['occ-swatch', { 'occ-swatch--edited': edited }]">
    <span
      v-if="onChange === undefined"
      class="occ-swatch__chip"
      :style="{ background: color }"
      aria-hidden="true"
    />
    <label v-else class="occ-swatch__picker">
      <span class="occ-swatch__chip" :style="{ background: color }" aria-hidden="true" />
      <input
        type="color"
        :value="value"
        :aria-label="name"
        @input="onChange(($event.target as HTMLInputElement).value)"
      />
    </label>
    <span class="occ-swatch__name">{{ name }}</span>
    <code class="occ-swatch__value">{{ value }}</code>
  </div>
</template>
