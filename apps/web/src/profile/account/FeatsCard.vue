<script setup lang="ts">
/**
 * Les faits d'armes : ceux débloqués, et les trois au plus qu'on montre à ses adversaires
 * à l'annonce d'une partie. Le serveur refuse ce qui n'est pas débloqué ; griser n'évite
 * qu'un clic dans le vide.
 */
import { computed } from "vue";
import {
  Badge,
  Button,
  Card,
  ChoiceList,
  ChoiceRow,
  Note,
  useMessages,
  useToast,
} from "@occulis/ui";
import Ready from "../../load/Ready.vue";
import { useLoad } from "../../load/use-load.js";
import * as api from "../api.js";
import * as R from "../resources.js";

defineProps<{ readOnly: boolean }>();

/** Le nombre de faits d'armes montrés à la fois. */
const SHOWCASE_SIZE = 3;

const messages = useMessages();
const text = computed(() => messages.value.feats);
const notify = useToast();

const { loaded, reload } = await useLoad(() => R.feats);

async function toggle(showcase: readonly string[], id: string) {
  const next = showcase.includes(id) ? showcase.filter((other) => other !== id) : [...showcase, id];
  const outcome = await api.setShowcase(next);
  notify(outcome.ok ? text.value.saved : outcome.message, outcome.ok);
  if (outcome.ok) reload();
}
</script>

<template>
  <Ready v-slot="{ value: { feats, showcase } }" :loaded="loaded">
    <Card :title="text.title">
      <Note>{{ text.lead }}</Note>
      <ChoiceList :label="text.title">
        <ChoiceRow v-for="feat in feats" :key="feat.id" :muted="!feat.unlocked">
          <strong>
            {{ text.names[feat.id] ?? feat.id }}
            <template v-if="showcase.includes(feat.id)"> · {{ text.shown }}</template>
          </strong>
          <small>{{ text.descriptions[feat.id] ?? "" }}</small>
          <template #end>
            <Badge v-if="!feat.unlocked" tone="dim">{{ text.locked }}</Badge>
            <Button
              v-else-if="showcase.includes(feat.id)"
              size="sm"
              :disabled="readOnly"
              @click="toggle(showcase, feat.id)"
            >
              {{ text.hide }}
            </Button>
            <Button
              v-else
              size="sm"
              :disabled="readOnly || showcase.length >= SHOWCASE_SIZE"
              :title="showcase.length >= SHOWCASE_SIZE ? text.full : undefined"
              @click="toggle(showcase, feat.id)"
            >
              {{ text.show }}
            </Button>
          </template>
        </ChoiceRow>
      </ChoiceList>
    </Card>
  </Ready>
</template>
