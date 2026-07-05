<!--
  @component
  Internal chrome wrapper for `DXTable`. Renders its content either inside a
  `DCard` (the default) or as a plain, borderless block on the page background
  (`:card="false"`). Extracted so `DXTable`'s ~460-line body and all its slots
  aren't duplicated across a card/plain `v-if`.

  Slots:
  - `#header` — the title / action row. In card mode it fills `DCard`'s header;
    in plain mode it renders above the table with a subtle bottom rule.
  - default — the table body (spinner/error/table/pagination).
-->
<template>
  <DCard v-if="card">
    <template v-if="$slots.header" #header>
      <slot name="header" />
    </template>
    <slot />
  </DCard>

  <div v-else class="dx-table-plain">
    <div v-if="$slots.header" class="dx-table-plain__header">
      <slot name="header" />
    </div>
    <slot />
  </div>
</template>

<script setup lang="ts">
import DCard from '../base/DCard.vue';

interface Props {
  /** Wrap the content in a `DCard`. When false, render plain/borderless. */
  card?: boolean;
}

withDefaults(defineProps<Props>(), {
  card: true,
});
</script>

<style scoped>
/*
  Plain variant: no card border/shadow/background — the table sits directly on
  the page. The header row gets a subtle bottom rule so it still reads as a
  distinct band above the table (mirrors the card header's separation without
  the full card chrome).
*/
.dx-table-plain__header {
  padding-bottom: 0.75rem;
  margin-bottom: 0.75rem;
  border-bottom: 1px solid var(--bs-border-color);
}
</style>
