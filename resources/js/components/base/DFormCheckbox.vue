<script setup lang="ts">
import { BFormCheckbox } from "bootstrap-vue-next";
import { useSlots } from "vue";

const slots = useSlots();
</script>

<template>
  <BFormCheckbox v-bind="$attrs">
    <template v-for="(_, name) in slots" :key="name" #[name]>
      <slot :name="name" />
    </template>
  </BFormCheckbox>
</template>
