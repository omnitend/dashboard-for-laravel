<script setup lang="ts">
// bootstrap-vue-next 0.44 removed BToastOrchestrator; the toast/modal/popover
// renderer is now the unified BOrchestrator (also included inside BApp).
import { BOrchestrator } from "bootstrap-vue-next";

defineOptions({
  inheritAttrs: false,
});
</script>

<template>
  <BOrchestrator v-bind="$attrs">
    <!-- Dynamically pass through all named slots with their props -->
    <template v-for="(_, name) in $slots" :key="name" #[name]="slotProps">
      <slot :name="name" v-bind="slotProps" />
    </template>
  </BOrchestrator>
</template>
