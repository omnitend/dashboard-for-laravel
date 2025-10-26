/**
 * @component
 * Type-safe wrapper around Bootstrap Vue Next BButtonGroup component.
 * Group a series of buttons on a single line or stack them vertically.
 */
<script setup lang="ts">
import { BButtonGroup } from "bootstrap-vue-next";

defineOptions({
  inheritAttrs: false,
});
</script>

<template>
  <BButtonGroup v-bind="$attrs">
    <!-- Dynamically pass through all named slots with their props -->
    <template v-for="(_, name) in $slots" :key="name" #[name]="slotProps">
      <slot :name="name" v-bind="slotProps" />
    </template>
  </BButtonGroup>
</template>
