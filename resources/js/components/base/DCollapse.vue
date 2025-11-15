<script setup lang="ts">
/**
 * DCollapse - A type-safe wrapper around Bootstrap Vue Next's BCollapse component
 *
 * Toggles the visibility of content with smooth collapse/expand animations.
 *
 * @component
 * @example
 * import { ref } from 'vue'
 * import { DButton, DCollapse } from '@omnitend/dashboard-for-laravel'
 *
 * const visible = ref(false)
 *
 * // In template:
 * // <DButton @click="visible = !visible">Toggle Collapse</DButton>
 * // <DCollapse v-model="visible">
 * //   <div class="card card-body">Your collapsible content here</div>
 * // </DCollapse>
 */
import { BCollapse } from "bootstrap-vue-next";

defineOptions({
  inheritAttrs: false,
});
</script>

<template>
  <BCollapse v-bind="$attrs">
    <!-- Dynamically pass through all named slots with their props -->
    <template v-for="(_, name) in $slots" :key="name" #[name]="slotProps">
      <slot :name="name" v-bind="slotProps" />
    </template>
  </BCollapse>
</template>
