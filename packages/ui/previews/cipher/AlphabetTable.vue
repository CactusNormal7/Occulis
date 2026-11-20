<script setup lang="ts">
/** Toutes les lettres de l'alphabet et leur glyphe ; en ornement, les lettres ne sont pas dites. */
import { CIPHER_CHARSET, Glyph, cipherGlyph, type CipherAlphabet } from "../../src/lab/index.js";

defineProps<{ name: CipherAlphabet; decodable: boolean }>();

const chars = Array.from(CIPHER_CHARSET);
</script>

<template>
  <div class="occ-lab-alphabet">
    <figure v-for="(char, index) in chars" :key="char">
      <Glyph :glyph="cipherGlyph(char, index, name, decodable, 7)" />
      <figcaption>{{ decodable ? char : "·" }}</figcaption>
    </figure>
  </div>
</template>
