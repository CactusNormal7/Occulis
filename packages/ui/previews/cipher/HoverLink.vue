<script setup lang="ts">
/** Un lien dont le libellé se brouille un instant au survol : l'emploi le plus léger de l'alphabet. */
import { ref } from "vue";
import { CipherText, type CipherAlphabet } from "../../src/lab/index.js";

defineProps<{ label: string; name: CipherAlphabet }>();

const play = ref(0);
</script>

<template>
  <a href="#cipher" class="occ-label" @mouseenter="play += 1" @focus="play += 1">
    <CipherText
      :text="label"
      :alphabet="name"
      :mode="play === 0 ? 'plain' : 'decode'"
      pace="base"
      :play-key="play"
      :decodable="false"
      :seed="play"
    />
  </a>
</template>
