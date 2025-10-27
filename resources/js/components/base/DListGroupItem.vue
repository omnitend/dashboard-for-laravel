<script setup lang="ts">
import { BListGroupItem } from "bootstrap-vue-next";
import { useSlots } from "vue";

const slots = useSlots();
</script>

<template>
  <BListGroupItem v-bind="$attrs">
    <template v-for="(_, name) in slots" :key="name" #[name]="slotProps">
      <slot :name="name" v-bind="slotProps" />
    </template>
  </BListGroupItem>
</template>
