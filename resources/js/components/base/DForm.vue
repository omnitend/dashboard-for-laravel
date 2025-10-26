/**
 * @component
 * Type-safe wrapper around Bootstrap Vue Next BForm component.
 * Form component with support for inline styles and validation states.
 */
<script setup lang="ts">
import { BForm } from "bootstrap-vue-next";

defineOptions({
  inheritAttrs: false,
});
</script>

<template>
  <BForm v-bind="$attrs">
    <!-- Dynamically pass through all named slots with their props -->
    <template v-for="(_, name) in $slots" :key="name" #[name]="slotProps">
      <slot :name="name" v-bind="slotProps" />
    </template>
  </BForm>
</template>
