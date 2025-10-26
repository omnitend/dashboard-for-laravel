<script setup lang="ts">
import { BFormSelect } from "bootstrap-vue-next";
import { useSlots } from "vue";

const slots = useSlots();
</script>

<template>
  <BFormSelect v-bind="$attrs">
    <template v-for="(_, name) in slots" :key="name" #[name]>
      <slot :name="name" />
    </template>
  </BFormSelect>
</template>
