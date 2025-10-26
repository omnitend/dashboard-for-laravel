/**
 * @component
 * Type-safe wrapper around Bootstrap Vue Next BAccordion component.
 * Easily toggle content visibility with collapsible accordions.
 */
<script setup lang="ts">
import { BAccordion } from "bootstrap-vue-next";

defineOptions({
  inheritAttrs: false,
});
</script>

<template>
  <BAccordion v-bind="$attrs">
    <!-- Dynamically pass through all named slots with their props -->
    <template v-for="(_, name) in $slots" :key="name" #[name]="slotProps">
      <slot :name="name" v-bind="slotProps" />
    </template>
  </BAccordion>
</template>
