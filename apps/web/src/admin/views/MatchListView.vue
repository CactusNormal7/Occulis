<script setup lang="ts">
/** La liste des parties, filtrée par état et découpée en pages. */
import { computed } from "vue";
import { Card, PageHead, Pager, Segmented, useMessages } from "@occulis/ui";
import Ready from "../../load/Ready.vue";
import { useLoad } from "../../load/use-load.js";
import * as api from "../api.js";
import { routeHash, type MatchStatus } from "../model.js";
import MatchTable from "../parts/MatchTable.vue";
import * as R from "../resources.js";

const props = defineProps<{
  status: MatchStatus | null;
  offset: number;
}>();

type Filter = "all" | MatchStatus;

const messages = useMessages();
const text = computed(() => messages.value.admin.matchList);

const { loaded } = await useLoad(() => R.matches(props.status, props.offset));

const total = computed(() =>
  loaded.value.state === "ready" ? loaded.value.value.total : undefined,
);

const filters = computed(() => {
  const labels: Record<Filter, string> = {
    all: text.value.all,
    ongoing: text.value.ongoing,
    finished: text.value.finished,
  };
  return (["all", "ongoing", "finished"] as const).map((value) => ({
    value,
    label: labels[value],
    href: routeHash({ view: "matches", status: value === "all" ? null : value, offset: 0 }),
  }));
});

function pageHref(offset: number) {
  return routeHash({ view: "matches", status: props.status, offset });
}
</script>

<template>
  <PageHead :title="text.title" :count="total">
    <template #tools>
      <Segmented :label="text.filter" :model-value="status ?? 'all'" :options="filters" />
    </template>
  </PageHead>

  <Ready v-slot="{ value: { matches, total: count } }" :loaded="loaded">
    <Card>
      <MatchTable :matches="matches" />
      <Pager
        :offset="offset"
        :shown="matches.length"
        :total="count"
        :page-size="api.PAGE_SIZE"
        :href-for="pageHref"
      />
    </Card>
  </Ready>
</template>
