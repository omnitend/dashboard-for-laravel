<template>
  <BTable
    ref="bTableRef"
    v-bind="$attrs"
    :fields="shieldedFields"
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
import { ref, computed } from 'vue';
import { BTable } from "bootstrap-vue-next";

defineOptions({
  inheritAttrs: false,
});

const props = defineProps<{
  /**
   * Column definitions. Declared as a prop (rather than passed through
   * `$attrs`) so we can shield the field `formatter` signature across
   * bootstrap-vue-next versions.
   */
  fields?: any[];
}>();

// Define emits to forward BTable events
const emit = defineEmits(['update:sortBy', 'update:currentPage', 'update:busy', 'sorted', 'rowClicked']);

// Reference to BTable for exposing methods
const bTableRef = ref<any>(null);

/**
 * bootstrap-vue-next 0.43 changed the field `formatter` to receive a single
 * object `{ value, key, item }`. This library has always documented the
 * positional `(value, key, item)` signature, so wrap each formatter to keep
 * existing consumer formatters working across the upgrade.
 */
const shieldedFields = computed(() => {
  if (!props.fields) return undefined;
  return props.fields.map((field) => {
    if (field && typeof field.formatter === 'function') {
      const original = field.formatter;
      return {
        ...field,
        formatter: (obj: { value: unknown; key: string; item: any }) =>
          original(obj?.value, obj?.key, obj?.item),
      };
    }
    return field;
  });
});

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

/**
 * bootstrap-vue-next 0.43 changed row events to a single object payload
 * `{ item, index, event }`. Re-emit in the historic `(item, index, event)`
 * shape so consumers (incl. DXTable) keep their handler signatures.
 */
const handleRowClicked = (obj: any) => {
  emit('rowClicked', obj?.item, obj?.index, obj?.event);
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
