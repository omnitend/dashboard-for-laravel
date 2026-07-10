<template>
  <div class="repeater-example">
    <h5>Order Line Items</h5>
    <p class="text-muted">
      A repeatable sub-form (field array). Add and remove rows; each row binds
      to <code>form.data.lines[i]</code> with Laravel-style nested error keys.
    </p>

    <DXForm :form="form" :fields="fields" :show-submit="false" />

    <pre class="state">{{ JSON.stringify(form.data, null, 2) }}</pre>

    <h5 class="mt-4">Table layout (compact mode)</h5>
    <p class="text-muted">
      Setting <code>repeaterLayout: 'table'</code> renders sub-fields as
      columns with one row per item — far more compact than the cards layout
      above for simple 2-3-field rows.
    </p>
    <DXForm :form="tableForm" :fields="tableFields" :show-submit="false" />
  </div>
</template>

<script setup lang="ts">
import {
  DXForm,
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

const tableForm = useForm({
  tags: [
    { key: 'colour', value: 'blue' },
    { key: 'size', value: 'medium' },
  ],
});

const tableFields: FieldDefinition[] = [
  {
    key: 'tags',
    type: 'repeater',
    label: 'Tags',
    addLabel: 'Add tag',
    repeaterLayout: 'table',
    fields: [
      { key: 'key', type: 'text', label: 'Key' },
      { key: 'value', type: 'text', label: 'Value' },
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
  /* Explicit readable colour: a bare <pre> inherits a faint colour on the
     light background (grey-on-grey). Matches the .state-display blocks in the
     other examples. */
  color: var(--bs-dark);
}
</style>
