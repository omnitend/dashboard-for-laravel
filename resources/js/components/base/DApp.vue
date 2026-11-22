<!--
  @component
  DApp — wraps bootstrap-vue-next's BApp: the app-root provider that
  `useToast()` and `useModal()` need above them, and the orchestrator that
  renders the toasts and modals they create. Mount it once, around the whole
  app (or around each island in an islands site such as Astro).

  Usage:
  ```vue
  <DApp>
    <MyApp />
  </DApp>
  ```
-->
<template>
  <BApp v-bind="$attrs">
    <template v-for="(_, name) in $slots" :key="name" #[name]="slotProps">
      <slot :name="name" v-bind="slotProps" />
    </template>
  </BApp>
</template>

<script setup lang="ts">
import { BApp } from "bootstrap-vue-next";

defineOptions({
  inheritAttrs: false,
});
</script>
