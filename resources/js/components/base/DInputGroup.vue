/**
 * @component
 * Type-safe wrapper around Bootstrap Vue Next BInputGroup component.
 * Easily extend form controls by adding text, buttons, or button groups.
 */
<script setup lang="ts">
import { BInputGroup } from "bootstrap-vue-next";

defineOptions({
  inheritAttrs: false,
});
</script>

<template>
  <BInputGroup v-bind="$attrs">
    <!-- Dynamically pass through all named slots with their props -->
    <template v-for="(_, name) in $slots" :key="name" #[name]="slotProps">
      <slot :name="name" v-bind="slotProps" />
    </template>
  </BInputGroup>
</template>
