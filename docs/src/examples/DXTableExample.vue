<template>
  <div class="data-table-example">
    <h5>Customer Data Table</h5>
    <DXTable
      :items="customerItems"
      :fields="customerFields"
      :pagination="paginationData"
      title="Customers"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import DXTable from '../../../resources/js/components/extended/DXTable.vue';

const customerFields = [
  { key: 'id', label: 'ID', sortable: true },
  { key: 'name', label: 'Name', sortable: true },
  { key: 'email', label: 'Email' },
  { key: 'company', label: 'Company', sortable: true },
  { key: 'status', label: 'Status' },
];

const customerItems = ref([
  { id: 1, name: 'John Smith', email: 'john@example.com', company: 'Acme Ltd', status: 'Active' },
  { id: 2, name: 'Jane Doe', email: 'jane@example.com', company: 'Tech Corp', status: 'Active' },
  { id: 3, name: 'Bob Johnson', email: 'bob@example.com', company: 'Global Industries', status: 'Inactive' },
  { id: 4, name: 'Alice Williams', email: 'alice@example.com', company: 'Digital Solutions', status: 'Active' },
  { id: 5, name: 'Charlie Brown', email: 'charlie@example.com', company: 'Cloud Systems', status: 'Pending' },
]);

const paginationData = ref({
  currentPage: 1,
  perPage: 10,
  total: 5,
  from: 1,
  to: 5,
});
</script>

<style scoped>
.data-table-example h5 {
  margin-bottom: 1.5rem;
  font-weight: 600;
  color: var(--bs-dark);
}
</style>
