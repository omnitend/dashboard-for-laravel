<template>
  <div class="data-table-example">
    <h5>Customer Data Table (Client-Side Mode)</h5>
    <DXTable
      :items="customerItems"
      :fields="customerFields"
      :client-side="true"
      item-name="customer"
      title="Customers"
    />
  </div>
</template>

<script setup lang="ts">
import { DXTable } from '@omnitend/dashboard-for-laravel';

import { ref } from 'vue';

const customerFields = [
  { key: 'id', label: 'ID', sortable: true },
  { key: 'name', label: 'Name', sortable: true, filter: 'text' },
  { key: 'email', label: 'Email', filter: 'text' },
  { key: 'company', label: 'Company', sortable: true, filter: 'text' },
  { key: 'status', label: 'Status', filter: 'select', filterOptions: [
    { value: 'Active', text: 'Active' },
    { value: 'Inactive', text: 'Inactive' },
    { value: 'Pending', text: 'Pending' },
  ]},
];

const customerItems = ref([
  { id: 1, name: 'John Smith', email: 'john@example.com', company: 'Acme Ltd', status: 'Active' },
  { id: 2, name: 'Jane Doe', email: 'jane@example.com', company: 'Tech Corp', status: 'Active' },
  { id: 3, name: 'Bob Johnson', email: 'bob@example.com', company: 'Global Industries', status: 'Inactive' },
  { id: 4, name: 'Alice Williams', email: 'alice@example.com', company: 'Digital Solutions', status: 'Active' },
  { id: 5, name: 'Charlie Brown', email: 'charlie@example.com', company: 'Cloud Systems', status: 'Pending' },
  { id: 6, name: 'Diana Ross', email: 'diana@example.com', company: 'Media Inc', status: 'Active' },
  { id: 7, name: 'Edward Norton', email: 'edward@example.com', company: 'Film Studios', status: 'Inactive' },
  { id: 8, name: 'Fiona Apple', email: 'fiona@example.com', company: 'Music Label', status: 'Active' },
  { id: 9, name: 'George Lucas', email: 'george@example.com', company: 'Skywalker Ranch', status: 'Active' },
  { id: 10, name: 'Helen Hunt', email: 'helen@example.com', company: 'Acting Co', status: 'Pending' },
  { id: 11, name: 'Ivan Reitman', email: 'ivan@example.com', company: 'Comedy Films', status: 'Active' },
  { id: 12, name: 'Julia Roberts', email: 'julia@example.com', company: 'Star Productions', status: 'Active' },
]);
</script>

<style scoped>
.data-table-example h5 {
  margin-bottom: 1.5rem;
  font-weight: 600;
  color: var(--bs-dark);
}
</style>
