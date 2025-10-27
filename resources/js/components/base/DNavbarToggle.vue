<script setup lang="ts">
import { BNavbarToggle } from "bootstrap-vue-next";
import { useSlots } from "vue";

const slots = useSlots();
</script>

<template>
  <BNavbarToggle v-bind="$attrs">
    <template v-for="(_, name) in slots" :key="name" #[name]="slotProps">
      <slot :name="name" v-bind="slotProps" />
    </template>
  </BNavbarToggle>
</template>
