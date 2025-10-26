/**
 * @component
 * Type-safe wrapper around Bootstrap Vue Next BListGroup component.
 * Flexible component for displaying a series of content items.
 */
<script setup lang="ts">
import { BListGroup } from "bootstrap-vue-next";

defineOptions({
  inheritAttrs: false,
});
</script>

<template>
  <BListGroup v-bind="$attrs">
    <!-- Dynamically pass through all named slots with their props -->
    <template v-for="(_, name) in $slots" :key="name" #[name]="slotProps">
      <slot :name="name" v-bind="slotProps" />
    </template>
  </BListGroup>
</template>
