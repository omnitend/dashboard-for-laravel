/**
 * @component
 * Type-safe wrapper around Bootstrap Vue Next BPopover component.
 * Overlay component for displaying rich content in a popup.
 */
<script setup lang="ts">
import { BPopover } from "bootstrap-vue-next";

defineOptions({
  inheritAttrs: false,
});
</script>

<template>
  <BPopover v-bind="$attrs">
    <!-- Dynamically pass through all named slots with their props -->
    <template v-for="(_, name) in $slots" :key="name" #[name]="slotProps">
      <slot :name="name" v-bind="slotProps" />
    </template>
  </BPopover>
</template>
