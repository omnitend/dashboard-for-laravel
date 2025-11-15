<template>
  <DTable
    :items="components"
    :fields="fields"
    hover
    responsive
    class="components-table"
  >
    <template #cell(name)="{ item }">
      <a :href="item.url" class="component-link">
        <code>{{ item.name }}</code>
      </a>
    </template>
  </DTable>
</template>

<script setup lang="ts">
import { DTable } from '@omnitend/dashboard-for-laravel';


interface Component {
  name: string;
  description: string;
  type: string;
  url: string;
}

interface Props {
  components: Component[];
}

defineProps<Props>();

const fields = [
  { key: 'name', label: 'Component', sortable: true },
  { key: 'description', label: 'Description' },
  { key: 'type', label: 'Type' },
];
</script>

<style scoped>
.component-link {
  text-decoration: none;
  color: var(--bs-primary);
  font-weight: 500;
}

.component-link:hover {
  text-decoration: underline;
}

.component-link code {
  background-color: transparent;
  padding: 0;
  color: inherit;
  font-size: 0.9375rem;
}

:deep(.components-table td) {
  vertical-align: middle;
}
</style>
