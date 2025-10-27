<script setup lang="ts">
import { BAccordionItem } from "bootstrap-vue-next";
import { useSlots } from "vue";

const slots = useSlots();
</script>

<template>
  <BAccordionItem v-bind="$attrs">
    <template v-for="(_, name) in slots" :key="name" #[name]="slotProps">
      <slot :name="name" v-bind="slotProps" />
    </template>
  </BAccordionItem>
</template>
