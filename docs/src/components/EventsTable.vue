<template>
  <DTable
    :items="events"
    :fields="fields"
    striped
    hover
    responsive
    class="events-table"
  >
    <template #cell(name)="{ item }">
      <code class="event-name">{{ item.name }}</code>
    </template>

    <template #cell(params)="{ item }">
      <code v-if="item.params !== 'none'" class="event-params">{{ item.params }}</code>
      <span v-else class="text-muted">none</span>
    </template>

    <template #cell(description)="{ item }">
      <span class="event-description">{{ item.description || '-' }}</span>
    </template>
  </DTable>
</template>

<script setup lang="ts">
import { DTable } from '@omni-tend/dashboard-for-laravel';


interface EventDefinition {
  name: string;
  params: string;
  description?: string;
}

interface Props {
  events: EventDefinition[];
}

defineProps<Props>();

const fields = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'params', label: 'Parameters', sortable: false },
  { key: 'description', label: 'Description', sortable: false },
];
</script>

<style scoped>
.events-table {
  margin: 1.5rem 0;
}

.event-name {
  color: var(--bs-info);
  font-weight: 600;
}

.event-params {
  color: var(--bs-secondary);
  font-size: 0.875rem;
}

.event-description {
  font-size: 0.9375rem;
  line-height: 1.5;
}
</style>
