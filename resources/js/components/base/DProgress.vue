/**
 * @component
 * Type-safe wrapper around Bootstrap Vue Next BProgress component.
 * Progress bar for displaying simple or complex progress indicators.
 */
<script setup lang="ts">
import { BProgress } from "bootstrap-vue-next";

defineOptions({
  inheritAttrs: false,
});
</script>

<template>
  <BProgress v-bind="$attrs">
    <!-- Dynamically pass through all named slots with their props -->
    <template v-for="(_, name) in $slots" :key="name" #[name]="slotProps">
      <slot :name="name" v-bind="slotProps" />
    </template>
  </BProgress>
</template>
