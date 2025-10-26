/**
 * @component
 * Type-safe wrapper around Bootstrap Vue Next BTabs component.
 * Create tabbed panes of local content with customisable navigation.
 */
<script setup lang="ts">
import { BTabs } from "bootstrap-vue-next";

defineOptions({
  inheritAttrs: false,
});
</script>

<template>
  <BTabs v-bind="$attrs">
    <!-- Dynamically pass through all named slots with their props -->
    <template v-for="(_, name) in $slots" :key="name" #[name]="slotProps">
      <slot :name="name" v-bind="slotProps" />
    </template>
  </BTabs>
</template>
