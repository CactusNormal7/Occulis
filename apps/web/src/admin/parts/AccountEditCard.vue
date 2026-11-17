<script setup lang="ts">
/** Les champs modifiables d'un compte : le pseudo, l'adresse et le mot de passe. */
import { computed } from "vue";
import { Card, InlineEdit, useMessages } from "@occulis/ui";
import type { Act } from "../actions/act.js";
import * as api from "../api.js";

const props = defineProps<{
  user: { readonly id: string; readonly name: string; readonly email: string };
  /** Le profil de jeu du compte ; sans lui, le pseudo ne se renomme pas. */
  playerId: string | undefined;
  act: Act;
}>();

const messages = useMessages();
const text = computed(() => messages.value.admin.user);

function rename(value: string) {
  if (props.playerId === undefined) return;
  return props.act(api.rename(props.playerId, value), text.value.renamed);
}

function changeAddress(value: string) {
  return props.act(api.update(props.user.id, { email: value }), text.value.addressChanged);
}

function setPassword(value: string) {
  return props.act(api.setPassword(props.user.id, value), text.value.passwordSet);
}
</script>

<template>
  <Card :title="text.edit">
    <InlineEdit
      v-if="playerId !== undefined"
      :label="text.handle"
      :default-value="user.name"
      :action="text.rename"
      @submit="rename"
    />
    <InlineEdit
      :label="text.address"
      type="email"
      :default-value="user.email"
      :action="text.change"
      @submit="changeAddress"
    />
    <InlineEdit :label="text.password" type="password" :action="text.set" @submit="setPassword" />
  </Card>
</template>
