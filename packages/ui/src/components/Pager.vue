<script setup lang="ts">
/** La pagination d'une liste : précédents, « 26–50 sur 132 », suivants. */
import { computed } from "vue";
import { useMessages } from "../composables/locale.js";

const props = defineProps<{
  offset: number;
  /** Le nombre de lignes affichées sur cette page. */
  shown: number;
  total: number;
  pageSize: number;
  /** L'adresse d'une page, à partir de son décalage. */
  hrefFor: (offset: number) => string;
}>();

const messages = useMessages();

const pager = computed(() => messages.value.ui.pager);
const range = computed(() =>
  props.total === 0 || props.shown === 0
    ? pager.value.none
    : pager.value.range(props.offset + 1, props.offset + props.shown, props.total),
);
const hasPrevious = computed(() => props.offset > 0);
const hasNext = computed(() => props.offset + props.pageSize < props.total);
</script>

<template>
  <nav class="occ-pager">
    <a v-if="hasPrevious" :href="hrefFor(Math.max(offset - pageSize, 0))">{{ pager.previous }}</a>
    <span v-else />
    <span>{{ range }}</span>
    <a v-if="hasNext" :href="hrefFor(offset + pageSize)">{{ pager.next }}</a>
    <span v-else />
  </nav>
</template>
