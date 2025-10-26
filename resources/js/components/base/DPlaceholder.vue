/**
 * @component
 * Type-safe wrapper around Bootstrap Vue Next BPlaceholder component.
 * Loading placeholder component to indicate content is still loading.
 */
<script setup lang="ts">
import { BPlaceholder } from "bootstrap-vue-next";

defineOptions({
  inheritAttrs: false,
});
</script>

<template>
  <BPlaceholder v-bind="$attrs">
    <!-- Dynamically pass through all named slots with their props -->
    <template v-for="(_, name) in $slots" :key="name" #[name]="slotProps">
      <slot :name="name" v-bind="slotProps" />
    </template>
  </BPlaceholder>
</template>
