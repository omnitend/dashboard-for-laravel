<script setup lang="ts">
import { ref } from 'vue';
import PlaygroundLayout from '../../Layouts/PlaygroundLayout.vue';
import { DXTable } from '@omnitend/dashboard-for-laravel';
import type { PaginatedData } from '../../types';
import { usePlaygroundMode } from '../../composables/usePlaygroundMode';

interface Product {
  id: number;
  sku: string;
  name: string;
  description: string;
  price: string;
  category: string;
  stock: number;
  created_at: string;
  updated_at: string;
}

interface Props {
  products: PaginatedData<Product>;
  filterValues?: Record<string, string[]>;
}

defineProps<Props>();

// Use global playground mode
const { mode } = usePlaygroundMode();

// Busy state for API mode
const busy = ref(false);

const fields = [
  { key: 'sku', label: 'SKU', sortable: true, hint: 'Product code' },
  { key: 'name', label: 'Product Name', sortable: true, filter: 'text', hint: 'Search by name' },
  { key: 'category', label: 'Category', sortable: true, filter: 'select', hint: 'Filter by category' },
  {
    key: 'price',
    label: 'Price',
    sortable: true,
    hint: 'USD',
    formatter: (value: string) => `$${parseFloat(value).toFixed(2)}`
  },
  {
    key: 'stock',
    label: 'Stock',
    sortable: true,
    hint: 'Current inventory',
    filter: 'select',
    filterOptions: [
      { value: 'low', text: 'Low Stock (≤10)' },
      { value: 'medium', text: 'Medium Stock (11-50)' },
      { value: 'good', text: 'Good Stock (>50)' },
    ],
  },
];

// Edit form fields (for edit modal)
const editFields = [
  { key: 'sku', label: 'SKU', type: 'text', required: true },
  { key: 'name', label: 'Product Name', type: 'text', required: true },
  { key: 'description', label: 'Description', type: 'textarea', required: false },
  { key: 'price', label: 'Price', type: 'number', required: true },
  { key: 'category', label: 'Category', type: 'text', required: true },
  { key: 'stock', label: 'Stock', type: 'number', required: true },
];
</script>

<template>
  <PlaygroundLayout current-url="/" page-title="Products">
    <DXTable
      title="Product Inventory - Click to Edit"
      item-name="product"
      api-url="/api/products"
      :fields="fields"
      :edit-fields="editFields"
      edit-url="/api/products/:id"
      edit-modal-title="Edit Product"
      v-model:busy="busy"
      striped
      hover
      responsive
    >
      <template #header>
        <div class="d-flex justify-content-between align-items-center">
          <h4 class="mb-0">Product Inventory - Click to Edit</h4>
          <DButton
            size="sm"
            variant="outline-secondary"
            @click="mode = mode === 'api' ? 'inertia' : 'api'"
          >
            {{ mode === 'api' ? 'Switch to Inertia' : 'Switch to API' }}
          </DButton>
        </div>
      </template>
      <template #cell(stock)="{ item }">
        <span
          :class="{
            'badge bg-success': item.stock > 50,
            'badge bg-warning text-dark': item.stock > 10 && item.stock <= 50,
            'badge bg-danger': item.stock <= 10,
          }"
        >
          {{ item.stock }}
        </span>
      </template>
    </DXTable>

    <DXTable
      v-if="mode === 'inertia'"
      key="inertia-table"
      title="Product Inventory - Click to Edit"
      item-name="product"
      :items="products.data"
      :fields="fields"
      :pagination="products"
      :filter-values="filterValues"
      :edit-fields="editFields"
      edit-url="/api/products/:id"
      edit-modal-title="Edit Product"
      inertia-url="/"
      striped
      hover
      responsive
    >
      <template #cell(stock)="{ item }">
        <span
          :class="{
            'badge bg-success': item.stock > 50,
            'badge bg-warning text-dark': item.stock > 10 && item.stock <= 50,
            'badge bg-danger': item.stock <= 10,
          }"
        >
          {{ item.stock }}
        </span>
      </template>
    </DXTable>
  </PlaygroundLayout>
</template>
