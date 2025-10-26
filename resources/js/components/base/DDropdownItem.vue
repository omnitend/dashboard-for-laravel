<script setup lang="ts">
import { BDropdownItem } from "bootstrap-vue-next";
import { useSlots } from "vue";

const slots = useSlots();
</script>

<template>
  <BDropdownItem v-bind="$attrs">
    <template v-for="(_, name) in slots" :key="name" #[name]>
      <slot :name="name" />
    </template>
  </BDropdownItem>
</template>
