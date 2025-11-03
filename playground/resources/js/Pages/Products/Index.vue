<script setup lang="ts">
import { ref } from 'vue';
import PlaygroundLayout from '../../Layouts/PlaygroundLayout.vue';
import { DXTable, DButton, DButtonGroup } from '@omni-tend/dashboard-for-laravel';
import type { PaginatedData } from '../../types';

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
}

defineProps<Props>();

// Mode toggle state
const mode = ref<'inertia' | 'api'>('inertia');

// Busy state for API mode
const busy = ref(false);

const fields = [
  { key: 'sku', label: 'SKU', sortable: true },
  { key: 'name', label: 'Product Name', sortable: true },
  { key: 'category', label: 'Category', sortable: true },
  { key: 'price', label: 'Price', sortable: true },
  { key: 'stock', label: 'Stock', sortable: true },
];
</script>

<template>
  <PlaygroundLayout current-url="/" page-title="Products">
    <!-- Mode Toggle -->
    <div class="mb-4 d-flex justify-content-between align-items-center">
      <div>
        <h5 class="mb-2">Mode Selection</h5>
        <p class="text-muted small mb-0">
          <strong>Inertia Mode:</strong> Server-side rendering with page navigation<br>
          <strong>API Mode:</strong> Client-side AJAX requests using provider pattern
        </p>
      </div>
      <DButtonGroup>
        <DButton
          :variant="mode === 'inertia' ? 'primary' : 'outline-primary'"
          @click="mode = 'inertia'"
        >
          Inertia Mode
        </DButton>
        <DButton
          :variant="mode === 'api' ? 'primary' : 'outline-primary'"
          @click="mode = 'api'"
        >
          API Mode
        </DButton>
      </DButtonGroup>
    </div>

    <!-- Inertia Mode Table -->
    <DXTable
      v-if="mode === 'inertia'"
      title="Product Inventory (Inertia Mode)"
      :items="products.data"
      :fields="fields"
      :pagination="products"
      inertia-url="/"
      striped
      hover
      responsive
    >
      <template #cell(price)="{ item }">
        <strong>${{ parseFloat(item.price).toFixed(2) }}</strong>
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

    <!-- API Mode Table -->
    <DXTable
      v-else
      title="Product Inventory (API Mode)"
      api-url="/api/products"
      :fields="fields"
      v-model:busy="busy"
      :per-page="10"
      striped
      hover
      responsive
    >
      <template #cell(price)="{ item }">
        <strong>${{ parseFloat(item.price).toFixed(2) }}</strong>
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
  </PlaygroundLayout>
</template>
