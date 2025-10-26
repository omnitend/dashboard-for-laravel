/**
 * @component
 * Type-safe wrapper around Bootstrap Vue Next BNavbar component.
 * Responsive navigation header with support for branding, navigation, and more.
 */
<script setup lang="ts">
import { BNavbar } from "bootstrap-vue-next";

defineOptions({
  inheritAttrs: false,
});
</script>

<template>
  <BNavbar v-bind="$attrs">
    <!-- Dynamically pass through all named slots with their props -->
    <template v-for="(_, name) in $slots" :key="name" #[name]="slotProps">
      <slot :name="name" v-bind="slotProps" />
    </template>
  </BNavbar>
</template>
