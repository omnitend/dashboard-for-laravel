/**
 * @component
 * Type-safe wrapper around Bootstrap Vue Next BFormCheckboxGroup component.
 * Renders a group of checkboxes from an `options` array (or slot content); the
 * `v-model` is the ARRAY of checked option values ("pick any of N").
 */
<script setup lang="ts">
import { BFormCheckboxGroup } from "bootstrap-vue-next";

defineOptions({
  inheritAttrs: false,
});
</script>

<template>
  <BFormCheckboxGroup v-bind="$attrs">
    <!-- Dynamically pass through all named slots with their props -->
    <template v-for="(_, name) in $slots" :key="name" #[name]="slotProps">
      <slot :name="name" v-bind="slotProps" />
    </template>
  </BFormCheckboxGroup>
</template>
