<template>
  <BOffcanvas v-bind="$attrs">
    <template v-for="(_, name) in $slots" #[name]="slotProps">
      <slot :name="name" v-bind="slotProps" />
    </template>
  </BOffcanvas>
</template>

<script setup lang="ts">
import { BOffcanvas } from "bootstrap-vue-next";
</script>
