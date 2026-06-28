<template>
  <div class="repeater-example">
    <h5>Order Line Items</h5>
    <p class="text-muted">
      A repeatable sub-form (field array). Add and remove rows; each row binds
      to <code>form.data.lines[i]</code> with Laravel-style nested error keys.
    </p>

    <DXTabbedForm :form="form" :fields="fields" :show-submit="false" />

    <pre class="state">{{ JSON.stringify(form.data, null, 2) }}</pre>
  </div>
</template>

<script setup lang="ts">
import {
  DXTabbedForm,
  useForm,
  type FieldDefinition,
} from '@omnitend/dashboard-for-laravel';

const form = useForm({
  reference: 'ORD-1001',
  lines: [{ description: 'Widget', quantity: 2, unit_price: 9.99 }],
});

const fields: FieldDefinition[] = [
  { key: 'reference', type: 'text', label: 'Order reference' },
  {
    key: 'lines',
    type: 'repeater',
    label: 'Line items',
    addLabel: 'Add line',
    minItems: 1,
    maxItems: 10,
    fields: [
      { key: 'description', type: 'text', label: 'Description' },
      { key: 'quantity', type: 'number', label: 'Qty', default: 1 },
      { key: 'unit_price', type: 'currency', label: 'Unit price', currencySymbol: '£' },
    ],
  },
];
</script>

<style scoped>
.repeater-example h5 {
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: var(--bs-dark);
}

.repeater-example p {
  margin-bottom: 1.5rem;
}

.state {
  margin-top: 1rem;
  padding: 0.75rem;
  background-color: var(--bs-light);
  border: 1px solid var(--bs-border-color);
  border-radius: var(--bs-border-radius);
  font-size: 0.85rem;
}
</style>
