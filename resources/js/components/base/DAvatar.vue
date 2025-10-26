/**
 * @component
 * Type-safe wrapper around Bootstrap Vue Next BAvatar component.
 * Display user profiles as pictures, icons, or short text.
 */
<script setup lang="ts">
import { BAvatar } from "bootstrap-vue-next";

defineOptions({
  inheritAttrs: false,
});
</script>

<template>
  <BAvatar v-bind="$attrs">
    <!-- Dynamically pass through all named slots with their props -->
    <template v-for="(_, name) in $slots" :key="name" #[name]="slotProps">
      <slot :name="name" v-bind="slotProps" />
    </template>
  </BAvatar>
</template>
