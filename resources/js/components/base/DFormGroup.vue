<template>
  <BFormGroup v-bind="$attrs">
    <template v-for="(_, name) in $slots" #[name]="slotProps">
      <slot :name="name" v-bind="slotProps" />
    </template>
  </BFormGroup>
</template>

<script setup lang="ts">
import { BFormGroup } from "bootstrap-vue-next";
</script>
