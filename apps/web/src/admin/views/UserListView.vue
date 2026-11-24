<script setup lang="ts">
/** La liste des comptes : une recherche, une page de la table, et la création d'un compte. */
import { computed, ref } from "vue";
import {
  Button,
  Card,
  PageHead,
  Pager,
  Person,
  SearchField,
  Table,
  useMessages,
  useToast,
} from "@occulis/ui";
import Ready from "../../load/Ready.vue";
import { useLoad } from "../../load/use-load.js";
import CreateUserDialog from "../actions/CreateUserDialog.vue";
import QuickActions from "../actions/QuickActions.vue";
import * as api from "../api.js";
import { formatDate, routeHash } from "../model.js";
import StateBadges from "../parts/StateBadges.vue";
import * as R from "../resources.js";

const props = defineProps<{
  search: string;
  offset: number;
  /** Le pseudo de l'administrateur connecté. */
  self: string;
}>();

const messages = useMessages();
const text = computed(() => messages.value.admin.users);
const notify = useToast();
const creating = ref(false);

const { loaded, reload } = await useLoad(() => R.users(props.search, props.offset));

const total = computed(() =>
  loaded.value.state === "ready" ? loaded.value.value.total : undefined,
);
const columns = computed(() => {
  const c = text.value.columns;
  return [c.account, c.state, c.signup, ""];
});
const emptyText = computed(() =>
  props.search.length > 0 ? text.value.noMatch(props.search) : text.value.none,
);

function searchFor(value: string) {
  location.hash = routeHash({ view: "users", search: value, offset: 0 });
}

function pageHref(offset: number) {
  return routeHash({ view: "users", search: props.search, offset });
}

function announceDeleted(name: string) {
  notify(text.value.deleted(name));
  reload();
}
</script>

<template>
  <PageHead :title="text.title" :count="total">
    <template #tools>
      <SearchField :default-value="search" :placeholder="text.search" @search="searchFor" />
      <Button icon="plus" @click="creating = true">{{ text.create }}</Button>
    </template>
  </PageHead>

  <Ready v-slot="{ value: { users, total: count } }" :loaded="loaded">
    <Card>
      <Table :columns="columns" :row-count="users.length" :empty="emptyText">
        <tr v-for="user in users" :key="user.id">
          <td>
            <Person
              :name="user.name"
              :detail="user.email"
              :href="routeHash({ view: 'user', id: user.id })"
            />
          </td>
          <td><StateBadges :user="user" /></td>
          <td class="occ-muted">{{ formatDate(user.createdAt) }}</td>
          <td class="occ-actions-cell">
            <QuickActions
              :user="user"
              :self="self"
              :reload="reload"
              @deleted="announceDeleted(user.name)"
            />
          </td>
        </tr>
      </Table>
      <Pager
        :offset="offset"
        :shown="users.length"
        :total="count"
        :page-size="api.PAGE_SIZE"
        :href-for="pageHref"
      />
    </Card>
  </Ready>

  <CreateUserDialog v-if="creating" @close="creating = false" />
</template>
