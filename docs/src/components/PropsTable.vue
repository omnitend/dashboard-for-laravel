<template>
  <DTable
    :items="props"
    :fields="fields"
    striped
    hover
    responsive
    class="props-table"
  >
    <template #cell(name)="{ item }">
      <code class="prop-name">{{ item.name }}</code>
    </template>

    <template #cell(type)="{ item }">
      <code class="prop-type">{{ item.type }}</code>
    </template>

    <template #cell(required)="{ item }">
      <DBadge :variant="isRequired(item.required) ? 'success' : 'secondary'">
        {{ isRequired(item.required) ? 'Yes' : 'No' }}
      </DBadge>
    </template>

    <template #cell(default)="{ item }">
      <code v-if="item.default !== '-'" class="prop-default">{{ item.default }}</code>
      <span v-else class="text-muted">-</span>
    </template>

    <template #cell(description)="{ item }">
      <span class="prop-description">{{ item.description || '-' }}</span>
    </template>
  </DTable>
</template>

<script setup lang="ts">
import { DTable, DBadge } from '@omnitend/dashboard-for-laravel';


interface PropDefinition {
  name: string;
  type: string;
  required: boolean | string;
  default: string;
  description: string;
}

interface Props {
  props: PropDefinition[];
}

defineProps<Props>();

const fields = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'type', label: 'Type', sortable: false },
  { key: 'required', label: 'Required', sortable: true },
  { key: 'default', label: 'Default', sortable: false },
  { key: 'description', label: 'Description', sortable: false },
];

const isRequired = (value: boolean | string): boolean => {
  if (typeof value === 'boolean') return value;
  return value === 'Yes' || value === 'yes' || value === 'true';
};
</script>

<style scoped>
.props-table {
  margin: 1.5rem 0;
}

.prop-name {
  color: var(--bs-primary);
  font-weight: 600;
}

.prop-type {
  color: var(--bs-secondary);
  font-size: 0.875rem;
}

.prop-default {
  color: var(--bs-success);
  font-size: 0.875rem;
}

.prop-description {
  font-size: 0.9375rem;
  line-height: 1.5;
}
</style>
