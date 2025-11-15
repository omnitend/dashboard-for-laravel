<script setup lang="ts">
import { BFormText } from "bootstrap-vue-next";

defineOptions({
  inheritAttrs: false,
});
</script>

<template>
  <BFormText v-bind="$attrs">
    <!-- Dynamically pass through all named slots -->
    <template v-for="(_, name) in $slots" :key="name" #[name]="slotProps">
      <slot :name="name" v-bind="slotProps" />
    </template>
  </BFormText>
</template>
