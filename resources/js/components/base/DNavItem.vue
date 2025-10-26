<script setup lang="ts">
import { BNavItem } from "bootstrap-vue-next";
import { useSlots } from "vue";

const slots = useSlots();
</script>

<template>
  <BNavItem v-bind="$attrs">
    <template v-for="(_, name) in slots" :key="name" #[name]>
      <slot :name="name" />
    </template>
  </BNavItem>
</template>
