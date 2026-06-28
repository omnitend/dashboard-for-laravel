<template>
  <div class="tabbed-form-example">
    <h5>Product Editor</h5>
    <p class="text-muted">
      A tabbed form with conditional fields, a currency input, and
      auto-switching to the tab containing the first validation error.
    </p>

    <DXForm
      :form="form"
      :fields="fields"
      :tabs="tabs"
      submit-text="Save product"
      @submit="handleSubmit"
    />

    <p v-if="lastError" class="text-danger mt-2 mb-0">
      Validation failed — the form jumped to the “{{ lastError }}” tab.
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import {
  DXForm,
  useForm,
  type FieldDefinition,
  type FormTab,
} from '@omnitend/dashboard-for-laravel';

const form = useForm({
  name: '',
  price: 0,
  on_sale: false,
  sale_price: 0,
  sku: '',
  stock: 0,
});

const fields: FieldDefinition[] = [
  { key: 'name', type: 'text', label: 'Name', required: true },
  { key: 'price', type: 'currency', label: 'Price', currencySymbol: '£' },
  { key: 'on_sale', type: 'checkbox', label: 'On sale' },
  {
    key: 'sale_price',
    type: 'currency',
    label: 'Sale price',
    currencySymbol: '£',
    // Cross-field reactivity: only shown while "On sale" is ticked.
    when: (model) => model.on_sale === true,
  },
  { key: 'sku', type: 'text', label: 'SKU', hint: 'Format: ABC-123' },
  { key: 'stock', type: 'number', label: 'Stock on hand' },
];

const tabs: FormTab[] = [
  { key: 'general', label: 'General', fieldKeys: ['name', 'price', 'on_sale', 'sale_price'] },
  { key: 'inventory', label: 'Inventory', fieldKeys: ['sku', 'stock'] },
];

const lastError = ref('');

const handleSubmit = () => {
  // Pretend the server rejected an Inventory-tab field. Setting errors makes
  // DXForm switch to the tab that contains the first errored field.
  if (!form.data.sku) {
    form.setErrors({ sku: ['SKU is required.'] });
    lastError.value = 'Inventory';
    return;
  }
  lastError.value = '';
  alert(`Saved ${form.data.name} at £${form.data.price}`);
};
</script>

<style scoped>
.tabbed-form-example h5 {
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: var(--bs-dark);
}

.tabbed-form-example p {
  margin-bottom: 1.5rem;
}
</style>
