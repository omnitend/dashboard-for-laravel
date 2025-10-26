/**
 * @component
 * Type-safe wrapper around Bootstrap Vue Next BBreadcrumb component.
 * Indicate the current page's location within a navigational hierarchy.
 */
<script setup lang="ts">
import { BBreadcrumb } from "bootstrap-vue-next";

defineOptions({
  inheritAttrs: false,
});
</script>

<template>
  <BBreadcrumb v-bind="$attrs">
    <!-- Dynamically pass through all named slots with their props -->
    <template v-for="(_, name) in $slots" :key="name" #[name]="slotProps">
      <slot :name="name" v-bind="slotProps" />
    </template>
  </BBreadcrumb>
</template>
