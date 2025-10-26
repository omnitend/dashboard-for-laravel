<script setup lang="ts">
/**
 * DCard - A type-safe wrapper around Bootstrap Vue Next's BCard component
 *
 * Provides a flexible content container with optional header and footer sections.
 *
 * @component
 * @example
 * ```vue
 * <DCard>
 *   <template #header>
 *     <h3>Card Title</h3>
 *   </template>
 *
 *   <p>Card content goes here</p>
 *
 *   <template #footer>
 *     <small>Last updated 5 mins ago</small>
 *   </template>
 * </DCard>
 * ```
 */
import { BCard } from "bootstrap-vue-next";
import { useSlots } from "vue";

const slots = useSlots();
</script>

<template>
  <BCard v-bind="$attrs">
    <template v-for="(_, name) in slots" :key="name" #[name]>
      <slot :name="name" />
    </template>
  </BCard>
</template>
