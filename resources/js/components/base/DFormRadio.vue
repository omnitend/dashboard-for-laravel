/**
 * @component
 * Type-safe wrapper around Bootstrap Vue Next BFormRadio component.
 * Custom radio button input with accessibility markup.
 */
<script setup lang="ts">
import { BFormRadio } from "bootstrap-vue-next";

defineOptions({
  inheritAttrs: false,
});
</script>

<template>
  <BFormRadio v-bind="$attrs">
    <!-- Dynamically pass through all named slots with their props -->
    <template v-for="(_, name) in $slots" :key="name" #[name]="slotProps">
      <slot :name="name" v-bind="slotProps" />
    </template>
  </BFormRadio>
</template>
