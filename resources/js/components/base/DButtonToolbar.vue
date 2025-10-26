/**
 * @component
 * Type-safe wrapper around Bootstrap Vue Next BButtonToolbar component.
 * Group button groups and input groups together on a single line.
 */
<script setup lang="ts">
import { BButtonToolbar } from "bootstrap-vue-next";

defineOptions({
  inheritAttrs: false,
});
</script>

<template>
  <BButtonToolbar v-bind="$attrs">
    <!-- Dynamically pass through all named slots with their props -->
    <template v-for="(_, name) in $slots" :key="name" #[name]="slotProps">
      <slot :name="name" v-bind="slotProps" />
    </template>
  </BButtonToolbar>
</template>
