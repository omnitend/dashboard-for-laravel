/**
 * @component
 * Type-safe wrapper around Bootstrap Vue Next BAspect component.
 * Keeps its default slot content at a fixed aspect ratio (e.g. `aspect="16:9"`
 * or a number like `1.7778`). Useful for responsive media/embeds.
 */
<script setup lang="ts">
import { BAspect } from "bootstrap-vue-next";

defineOptions({
  inheritAttrs: false,
});
</script>

<template>
  <BAspect v-bind="$attrs">
    <!-- Dynamically pass through all named slots with their props -->
    <template v-for="(_, name) in $slots" :key="name" #[name]="slotProps">
      <slot :name="name" v-bind="slotProps" />
    </template>
  </BAspect>
</template>
