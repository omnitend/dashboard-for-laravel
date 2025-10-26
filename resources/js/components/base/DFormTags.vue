/**
 * @component
 * Type-safe wrapper around Bootstrap Vue Next BFormTags component.
 * Lightweight custom tagged input with duplicate detection and validation.
 */
<script setup lang="ts">
import { BFormTags } from "bootstrap-vue-next";

defineOptions({
  inheritAttrs: false,
});
</script>

<template>
  <BFormTags v-bind="$attrs">
    <!-- Dynamically pass through all named slots with their props -->
    <template v-for="(_, name) in $slots" :key="name" #[name]="slotProps">
      <slot :name="name" v-bind="slotProps" />
    </template>
  </BFormTags>
</template>
