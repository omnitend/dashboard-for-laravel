/**
 * @component
 * Type-safe wrapper around Bootstrap Vue Next BOverlay component.
 * Overlay component for indicating loading states or blocking content.
 */
<script setup lang="ts">
import { BOverlay } from "bootstrap-vue-next";

defineOptions({
  inheritAttrs: false,
});
</script>

<template>
  <BOverlay v-bind="$attrs">
    <!-- Dynamically pass through all named slots with their props -->
    <template v-for="(_, name) in $slots" :key="name" #[name]="slotProps">
      <slot :name="name" v-bind="slotProps" />
    </template>
  </BOverlay>
</template>
