<script setup lang="ts">
import { BNavbarBrand } from "bootstrap-vue-next";
import { useSlots } from "vue";

const slots = useSlots();
</script>

<template>
  <BNavbarBrand v-bind="$attrs">
    <template v-for="(_, name) in slots" :key="name" #[name]="slotProps">
      <slot :name="name" v-bind="slotProps" />
    </template>
  </BNavbarBrand>
</template>
