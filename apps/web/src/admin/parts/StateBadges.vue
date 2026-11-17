<script setup lang="ts">
/**
 * Les pastilles d'état d'un compte. Blanches ou estompées : la couleur reste réservée à
 * l'information de partie — seule la suspension prend la teinte des refus.
 */
import { computed } from "vue";
import { Badge, BadgeRow, useMessages } from "@occulis/ui";
import type { QuickUser } from "../actions/act.js";
import { isAdminRole } from "../model.js";

defineProps<{ user: QuickUser }>();

const messages = useMessages();
const text = computed(() => messages.value.admin.badges);
</script>

<template>
  <BadgeRow>
    <Badge v-if="isAdminRole(user.role)" tone="strong">{{ text.admin }}</Badge>
    <Badge v-if="user.emailVerified">{{ text.verified }}</Badge>
    <Badge v-else tone="dim">{{ text.unverified }}</Badge>
    <Badge v-if="user.banned === true" tone="refused">{{ text.banned }}</Badge>
  </BadgeRow>
</template>
