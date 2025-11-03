<template>
  <BTable
    ref="bTableRef"
    v-bind="$attrs"
    @update:sort-by="handleSortByUpdate"
    @update:current-page="handleCurrentPageUpdate"
    @update:busy="handleBusyUpdate"
    @sorted="handleSorted"
    @row-clicked="handleRowClicked"
  >
    <template v-for="(_, name) in $slots" #[name]="slotProps">
      <slot :name="name" v-bind="slotProps" />
    </template>
  </BTable>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { BTable } from "bootstrap-vue-next";

defineOptions({
  inheritAttrs: false,
});

// Define emits to forward BTable events
const emit = defineEmits(['update:sortBy', 'update:currentPage', 'update:busy', 'sorted', 'rowClicked']);

// Reference to BTable for exposing methods
const bTableRef = ref<any>(null);

// Event handlers to forward BTable events
const handleSortByUpdate = (val: any) => {
  emit('update:sortBy', val);
};

const handleCurrentPageUpdate = (val: any) => {
  emit('update:currentPage', val);
};

const handleBusyUpdate = (val: any) => {
  emit('update:busy', val);
};

const handleSorted = (val: any) => {
  emit('sorted', val);
};

const handleRowClicked = (item: any, index: number, event: MouseEvent) => {
  emit('rowClicked', item, index, event);
};

// Expose refresh method from BTable
const refresh = () => {
  if (bTableRef.value && typeof bTableRef.value.refresh === 'function') {
    bTableRef.value.refresh();
  }
};

defineExpose({
  refresh,
});
</script>
