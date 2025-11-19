<script setup lang="ts">
import PlaygroundLayout from '../../Layouts/PlaygroundLayout.vue';
import { DXTable, DBadge } from '@omnitend/dashboard-for-laravel';
import type { PaginatedData } from '../../types';

interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
  is_active: boolean;
  product_count: number;
  created_at: string;
  updated_at: string;
}

interface Props {
  categories: PaginatedData<Category>;
  filterValues?: Record<string, string[]>;
}

defineProps<Props>();

const fields = [
  { key: 'name', label: 'Category Name', sortable: true, filter: 'text' },
  { key: 'slug', label: 'Slug', sortable: true },
  { key: 'product_count', label: 'Products', sortable: true },
  {
    key: 'is_active',
    label: 'Status',
    sortable: true,
    filter: 'select',
    filterOptions: [
      { value: '1', text: 'Active' },
      { value: '0', text: 'Inactive' },
    ],
  },
];

// Edit form fields (demonstrating edit-tabs feature)
const editFields = [
  { key: 'name', type: 'text', label: 'Category Name', required: true },
  { key: 'slug', type: 'text', label: 'Slug', required: true },
  { key: 'description', type: 'textarea', label: 'Description', required: false },
  { key: 'is_active', type: 'checkbox', label: 'Active' },
  { key: 'products', span: true }, // Full-width field for products table
];

// Edit tabs (demonstrates tab organization)
const editTabs = [
  {
    key: 'details',
    label: 'Category Details',
    fieldKeys: ['name', 'slug', 'description', 'is_active'],
  },
  {
    key: 'products',
    label: 'Products',
    fieldKeys: ['products'],
  },
];
</script>

<template>
  <PlaygroundLayout current-url="/categories" page-title="Categories">
    <DXTable
      title="Product Categories - Click to Edit with Tabs"
      item-name="category"
      :items="categories.data"
      :fields="fields"
      :pagination="categories"
      :filter-values="filterValues"
      :edit-fields="editFields"
      :edit-tabs="editTabs"
      edit-url="/api/categories/:id"
      :edit-modal-title="(item) => `Edit Category: ${item.name}`"
      inertia-url="/categories"
      striped
      hover
      responsive
    >
      <template #cell(is_active)="{ item }">
        <DBadge :variant="item.is_active ? 'success' : 'secondary'">
          {{ item.is_active ? 'Active' : 'Inactive' }}
        </DBadge>
      </template>

      <template #cell(product_count)="{ item }">
        <DBadge variant="primary">{{ item.product_count }}</DBadge>
      </template>

      <!-- Custom content for products tab -->
      <template #edit-span(products)="{ item }">
        <div v-if="item" class="products-tab-content">
          <div class="alert alert-info mb-3">
            <strong>Products in {{ item.name }}</strong>
            <p class="mb-0 small">This demonstrates a nested table in an edit tab using the span field feature.</p>
          </div>

          <DXTable
            :key="`products-${item.id}`"
            api-url="/api/products"
            :filters="{ category: item.name }"
            :fields="[
              { key: 'sku', label: 'SKU' },
              { key: 'name', label: 'Product Name' },
              { key: 'price', label: 'Price' },
              { key: 'stock', label: 'Stock' },
            ]"
            item-name="product"
            :show-pagination="true"
            :per-page-options="[5, 10, 25]"
            :current-page="1"
            :per-page="5"
          />
        </div>
      </template>
    </DXTable>
  </PlaygroundLayout>
</template>
