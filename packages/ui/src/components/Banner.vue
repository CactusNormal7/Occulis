<script setup lang="ts">
/**
 * Un état anormal qui doit se voir : une suspension, un rejeu interrompu. Teinte des refus.
 * L'emplacement `action` porte le geste qui lève l'état signalé, à droite.
 */
import type { IconName } from "../icons.js";
import Icon from "./Icon.vue";

withDefaults(defineProps<{ icon?: IconName }>(), { icon: "ban" });
</script>

<template>
  <div class="occ-banner" role="status">
    <Icon :name="icon" />
    <span><slot /></span>
    <slot name="action" />
  </div>
</template>
