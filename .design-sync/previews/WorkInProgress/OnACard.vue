<script setup lang="ts">
import { Card, Stat, StatGrid, WorkInProgress } from "@occulis/ui";
</script>

<template>
  <div style="width: 320px">
    <WorkInProgress note="Placeholder figures">
      <Card title="Match stats">
        <StatGrid>
          <Stat :value="42" label="tiles revealed" />
          <Stat value="3.1 s" label="per move" />
          <Stat :value="7" label="peak height" />
        </StatGrid>
      </Card>
    </WorkInProgress>
  </div>
</template>
