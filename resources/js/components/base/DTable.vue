<template>
  <BTable
    v-bind="$attrs"
    @update:sort-by="handleSortByUpdate"
    @update:busy="handleBusyUpdate"
    @sorted="handleSorted"
  >
    <template v-for="(_, name) in $slots" #[name]="slotProps">
      <slot :name="name" v-bind="slotProps" />
    </template>
  </BTable>
</template>

<script setup lang="ts">
import { BTable } from "bootstrap-vue-next";

defineOptions({
  inheritAttrs: false,
});

// Define emits to forward BTable events
const emit = defineEmits(['update:sortBy', 'update:busy', 'sorted']);

// Event handlers to forward BTable events
const handleSortByUpdate = (val: any) => {
  emit('update:sortBy', val);
};

const handleBusyUpdate = (val: any) => {
  emit('update:busy', val);
};

const handleSorted = (val: any) => {
  emit('sorted', val);
};
</script>
