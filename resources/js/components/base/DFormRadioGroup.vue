/**
 * @component
 * Type-safe wrapper around Bootstrap Vue Next BFormRadioGroup component.
 * Renders a group of radio inputs from an `options` array or slot content.
 */
<script setup lang="ts">
import { BFormRadioGroup } from "bootstrap-vue-next";

defineOptions({
  inheritAttrs: false,
});
</script>

<template>
  <BFormRadioGroup v-bind="$attrs">
    <!-- Dynamically pass through all named slots with their props -->
    <template v-for="(_, name) in $slots" :key="name" #[name]="slotProps">
      <slot :name="name" v-bind="slotProps" />
    </template>
  </BFormRadioGroup>
</template>
