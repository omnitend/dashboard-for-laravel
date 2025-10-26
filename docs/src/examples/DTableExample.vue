<template>
  <div class="table-examples">
    <div class="example-section">
      <h5>Basic Table</h5>
      <DTable :items="customers" :fields="basicFields" />
    </div>

    <div class="example-section">
      <h5>Striped Table</h5>
      <DTable :items="customers" :fields="basicFields" striped />
    </div>

    <div class="example-section">
      <h5>Bordered Table</h5>
      <DTable :items="customers" :fields="basicFields" bordered />
    </div>

    <div class="example-section">
      <h5>Hoverable Rows</h5>
      <DTable :items="customers" :fields="basicFields" hover />
    </div>

    <div class="example-section">
      <h5>Small Table</h5>
      <DTable :items="customers" :fields="basicFields" small />
    </div>

    <div class="example-section">
      <h5>Table with Custom Cell Rendering</h5>
      <DTable :items="orders" :fields="orderFields" hover striped>
        <template #cell(status)="{ item }">
          <DBadge :variant="getStatusVariant(item.status)">
            {{ item.status }}
          </DBadge>
        </template>
        <template #cell(total)="{ item }">
          £{{ item.total.toFixed(2) }}
        </template>
        <template #cell(actions)="{ item }">
          <DButton variant="primary" size="sm" @click="viewOrder(item)">View</DButton>
        </template>
      </DTable>
    </div>

    <div class="example-section">
      <h5>Clickable Rows</h5>
      <DTable
        :items="products"
        :fields="productFields"
        hover
        class="clickable-table"
        @row-clicked="handleRowClick"
      >
        <template #cell(price)="{ item }">
          £{{ item.price.toFixed(2) }}
        </template>
        <template #cell(stock)="{ item }">
          <DBadge :variant="item.stock > 10 ? 'success' : 'warning'">
            {{ item.stock }} in stock
          </DBadge>
        </template>
      </DTable>
      <p v-if="selectedProduct" class="state-display">
        Selected: {{ selectedProduct.name }}
      </p>
    </div>

    <div class="example-section">
      <h5>Responsive Table</h5>
      <DTable :items="customers" :fields="extendedFields" responsive striped />
    </div>

    <div class="example-section">
      <h5>Table with Sorting</h5>
      <DTable
        :items="customers"
        :fields="sortableFields"
        sort-by="name"
        striped
        hover
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import DTable from '../../../resources/js/components/base/DTable.vue';
import DBadge from '../../../resources/js/components/base/DBadge.vue';
import DButton from '../../../resources/js/components/base/DButton.vue';

const selectedProduct = ref<any>(null);

const customers = [
  { id: 1, name: 'Acme Corporation', email: 'contact@acme.com', country: 'United Kingdom' },
  { id: 2, name: 'Global Industries', email: 'info@global.com', country: 'United States' },
  { id: 3, name: 'Tech Solutions Ltd', email: 'hello@techsol.co.uk', country: 'United Kingdom' },
  { id: 4, name: 'Innovation Partners', email: 'team@innovation.com', country: 'Canada' },
];

const orders = [
  { id: 'ORD-001', customer: 'Acme Corporation', total: 1250.00, status: 'Completed' },
  { id: 'ORD-002', customer: 'Global Industries', total: 890.50, status: 'Pending' },
  { id: 'ORD-003', customer: 'Tech Solutions Ltd', total: 2100.00, status: 'Processing' },
  { id: 'ORD-004', customer: 'Innovation Partners', total: 450.75, status: 'Cancelled' },
];

const products = [
  { id: 1, name: 'Wireless Mouse', price: 29.99, stock: 45, category: 'Electronics' },
  { id: 2, name: 'Mechanical Keyboard', price: 89.99, stock: 8, category: 'Electronics' },
  { id: 3, name: 'USB-C Cable', price: 12.99, stock: 120, category: 'Accessories' },
  { id: 4, name: 'Laptop Stand', price: 49.99, stock: 15, category: 'Accessories' },
];

const basicFields = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'country', label: 'Country' },
];

const extendedFields = [
  { key: 'id', label: 'ID' },
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'country', label: 'Country' },
];

const sortableFields = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'email', label: 'Email', sortable: true },
  { key: 'country', label: 'Country', sortable: true },
];

const orderFields = [
  { key: 'id', label: 'Order ID' },
  { key: 'customer', label: 'Customer' },
  { key: 'total', label: 'Total' },
  { key: 'status', label: 'Status' },
  { key: 'actions', label: 'Actions' },
];

const productFields = [
  { key: 'name', label: 'Product' },
  { key: 'price', label: 'Price' },
  { key: 'stock', label: 'Stock' },
  { key: 'category', label: 'Category' },
];

const getStatusVariant = (status: string) => {
  const variants: Record<string, string> = {
    'Completed': 'success',
    'Pending': 'warning',
    'Processing': 'info',
    'Cancelled': 'danger',
  };
  return variants[status] || 'secondary';
};

const viewOrder = (order: any) => {
  console.log('Viewing order:', order);
};

const handleRowClick = (item: any) => {
  selectedProduct.value = item;
};
</script>

<style scoped>
.table-examples {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.example-section h5 {
  margin-bottom: 1rem;
  font-weight: 600;
  color: var(--bs-dark);
}

.clickable-table {
  cursor: pointer;
}

.state-display {
  margin-top: 1rem;
  padding: 0.5rem 1rem;
  background-color: var(--bs-light);
  border-radius: 0.25rem;
  font-size: 0.875rem;
  color: var(--bs-dark);
}
</style>
