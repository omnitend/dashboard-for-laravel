/**
 * @component
 * Type-safe wrapper around Bootstrap Vue Next BFormOtp component.
 * One-time-code / PIN input rendered as a row of single-character boxes.
 * `v-model` is a `string[]` (one entry per box).
 */
<script setup lang="ts">
import { BFormOtp } from "bootstrap-vue-next";

defineOptions({
  inheritAttrs: false,
});
</script>

<template>
  <BFormOtp v-bind="$attrs">
    <!-- Dynamically pass through all named slots with their props -->
    <template v-for="(_, name) in $slots" :key="name" #[name]="slotProps">
      <slot :name="name" v-bind="slotProps" />
    </template>
  </BFormOtp>
</template>
