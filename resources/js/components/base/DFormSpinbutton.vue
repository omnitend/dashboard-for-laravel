/**
 * @component
 * Type-safe wrapper around Bootstrap Vue Next BFormSpinbutton component.
 * Number input with increment/decrement buttons.
 */
<script setup lang="ts">
import { BFormSpinbutton } from "bootstrap-vue-next";

defineOptions({
  inheritAttrs: false,
});
</script>

<template>
  <BFormSpinbutton v-bind="$attrs">
    <!-- Dynamically pass through all named slots with their props -->
    <template v-for="(_, name) in $slots" :key="name" #[name]="slotProps">
      <slot :name="name" v-bind="slotProps" />
    </template>
  </BFormSpinbutton>
</template>
