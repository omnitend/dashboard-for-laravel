<template>
  <BModal v-bind="$attrs">
    <template v-for="(_, name) in $slots" #[name]="slotProps">
      <slot :name="name" v-bind="slotProps" />
    </template>
  </BModal>
</template>

<script setup lang="ts">
import { BModal } from "bootstrap-vue-next";
</script>
