<script setup lang="ts">
/**
 * Un message de la pile. Interne à la charte : il s'ouvre à son arrivée et se referme quand
 * il est marqué `leaving`, depuis son centre (`revealWindow`).
 */
import { computed, onMounted, useTemplateRef, watch } from "vue";
import type { ToastMessage } from "../types.js";
import { revealWindow } from "../window-reveal.js";

const props = defineProps<{ message: ToastMessage }>();

const emit = defineEmits<{ dismiss: [] }>();

const toast = useTemplateRef<HTMLDivElement>("toast");
const leaving = computed(() => props.message.leaving === true);

function reveal() {
  if (toast.value !== null) void revealWindow(toast.value, leaving.value ? "close" : "open");
}

onMounted(reveal);
watch(leaving, reveal, { flush: "post" });
</script>

<template>
  <div
    ref="toast"
    :role="message.ok ? 'status' : 'alert'"
    :class="[
      'occ-toast',
      message.ok ? 'occ-toast--ok' : 'occ-toast--ko',
      { 'occ-toast--leaving': leaving },
    ]"
    @click="emit('dismiss')"
  >
    {{ message.text }}
  </div>
</template>
