/**
 * @component
 * Type-safe wrapper around Bootstrap Vue Next BTooltip component.
 * Display helpful tooltips when hovering over elements.
 */
<script setup lang="ts">
import { BTooltip } from "bootstrap-vue-next";

defineOptions({
  inheritAttrs: false,
});
</script>

<template>
  <BTooltip v-bind="$attrs">
    <!-- Dynamically pass through all named slots with their props -->
    <template v-for="(_, name) in $slots" :key="name" #[name]="slotProps">
      <slot :name="name" v-bind="slotProps" />
    </template>
  </BTooltip>
</template>
