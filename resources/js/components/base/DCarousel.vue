/**
 * @component
 * Type-safe wrapper around Bootstrap Vue Next BCarousel component.
 * Slideshow component for cycling through images or content.
 */
<script setup lang="ts">
import { BCarousel } from "bootstrap-vue-next";

defineOptions({
  inheritAttrs: false,
});
</script>

<template>
  <BCarousel v-bind="$attrs">
    <!-- Dynamically pass through all named slots with their props -->
    <template v-for="(_, name) in $slots" :key="name" #[name]="slotProps">
      <slot :name="name" v-bind="slotProps" />
    </template>
  </BCarousel>
</template>
