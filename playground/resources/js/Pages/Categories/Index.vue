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
</script>

<template>
  <PlaygroundLayout current-url="/categories" page-title="Categories">
    <DXTable
      title="Product Categories"
      item-name="categories"
      :items="categories.data"
      :fields="fields"
      :pagination="categories"
      :filter-values="filterValues"
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
    </DXTable>
  </PlaygroundLayout>
</template>
