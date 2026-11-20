<script setup lang="ts">
/** Une pastille d'état : capitales, cadre fin, angles vifs. */
withDefaults(
  defineProps<{
    /**
     * `plain` et `strong` : blanc estompé ou franc. `dim` : un état secondaire. `refused` :
     * un refus ou une sanction. `A` / `B` : la couleur d'un camp — seulement quand la
     * pastille dit quelque chose d'une partie (un vainqueur, un siège).
     */
    tone?: "plain" | "strong" | "dim" | "refused" | "A" | "B" | undefined;
  }>(),
  { tone: "plain" },
);
</script>

<template>
  <span :class="['occ-badge', `occ-badge--${tone}`]"><slot /></span>
</template>
