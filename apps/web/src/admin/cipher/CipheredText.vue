<script setup lang="ts">
/**
 * Un texte du back-office pour le rôle `goy` : au repos il est écrit en glyphes ; sous le
 * pointeur il se déchiffre, et se rechiffre quand le pointeur part. Le texte réel reste lu par
 * les lecteurs d'écran (`CipherText`).
 */
import { ref } from "vue";
import { CipherText, type CipherMode } from "@occulis/ui/lab";

defineProps<{ text: string }>();

const mode = ref<CipherMode>("cipher");
/** Change à chaque passage du pointeur : l'animation rejoue. */
const play = ref(0);

function move(next: CipherMode) {
  mode.value = next;
  play.value += 1;
}
</script>

<template>
  <span @mouseenter="move('decode')" @mouseleave="move('encode')">
    <CipherText :text="text" :mode="mode" pace="base" :play-key="play" />
  </span>
</template>
