/**
 * @component
 * Type-safe wrapper around Bootstrap Vue Next BLink component.
 * Enhanced link component with router support and accessibility features.
 */
<script setup lang="ts">
import { BLink } from "bootstrap-vue-next";

defineOptions({
  inheritAttrs: false,
});
</script>

<template>
  <BLink v-bind="$attrs">
    <!-- Dynamically pass through all named slots with their props -->
    <template v-for="(_, name) in $slots" :key="name" #[name]="slotProps">
      <slot :name="name" v-bind="slotProps" />
    </template>
  </BLink>
</template>
