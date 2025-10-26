<template>
  <div v-if="dynamicForwarding" class="slots-forwarding alert alert-info">
    <p class="mb-0">
      This component uses <strong>dynamic slot forwarding</strong> - it accepts and forwards all slots to the underlying Bootstrap Vue Next component.
    </p>
    <p class="mb-0 mt-2">
      Refer to the <a href="https://bootstrap-vue-next.github.io/bootstrap-vue-next/" target="_blank" rel="noopener">Bootstrap Vue Next documentation</a> for available slots.
    </p>
  </div>

  <DTable
    v-else
    :items="slots"
    :fields="fields"
    striped
    hover
    responsive
    class="slots-table"
  >
    <template #cell(name)="{ item }">
      <code class="slot-name">{{ item.name }}</code>
    </template>

    <template #cell(description)="{ item }">
      <span class="slot-description">{{ item.description || '-' }}</span>
    </template>

    <template #cell(scoped)="{ item }">
      <code v-if="item.scoped" class="slot-scoped">{{ item.scoped }}</code>
      <span v-else class="text-muted">-</span>
    </template>
  </DTable>
</template>

<script setup lang="ts">
import DTable from '../../../resources/js/components/base/DTable.vue';

interface SlotDefinition {
  name: string;
  description?: string;
  scoped?: string;
}

interface Props {
  slots: SlotDefinition[];
  dynamicForwarding?: boolean;
}

withDefaults(defineProps<Props>(), {
  dynamicForwarding: false,
});

const fields = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'description', label: 'Description', sortable: false },
  { key: 'scoped', label: 'Scoped Props', sortable: false },
];
</script>

<style scoped>
.slots-table {
  margin: 1.5rem 0;
}

.slots-forwarding {
  margin: 1.5rem 0;
}

.slot-name {
  color: var(--bs-warning);
  font-weight: 600;
}

.slot-scoped {
  color: var(--bs-secondary);
  font-size: 0.875rem;
}

.slot-description {
  font-size: 0.9375rem;
  line-height: 1.5;
}
</style>
