<script setup lang="ts">
import { BCol } from "bootstrap-vue-next";
import { useSlots } from "vue";

const slots = useSlots();
</script>

<template>
  <BCol v-bind="$attrs">
    <template v-for="(_, name) in slots" :key="name" #[name]>
      <slot :name="name" />
    </template>
  </BCol>
</template>
