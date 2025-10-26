/**
 * @component
 * Type-safe wrapper around Bootstrap Vue Next BImg component.
 * Responsive image component with optional lazy loading and fluid sizing.
 */
<script setup lang="ts">
import { BImg } from "bootstrap-vue-next";

defineOptions({
  inheritAttrs: false,
});
</script>

<template>
  <BImg v-bind="$attrs">
    <!-- Dynamically pass through all named slots with their props -->
    <template v-for="(_, name) in $slots" :key="name" #[name]="slotProps">
      <slot :name="name" v-bind="slotProps" />
    </template>
  </BImg>
</template>
