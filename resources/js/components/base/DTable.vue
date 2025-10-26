<template>
  <BTable v-bind="$attrs">
    <template v-for="(_, name) in $slots" #[name]="slotProps">
      <slot :name="name" v-bind="slotProps" />
    </template>
  </BTable>
</template>

<script setup lang="ts">
import { BTable } from "bootstrap-vue-next";
</script>
