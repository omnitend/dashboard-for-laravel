<template>
  <div class="tabbed-form-example">
    <h5>Product Editor</h5>
    <p class="text-muted">
      A tabbed form with a conditional field and a custom stock editor. Press
      <strong>Save product</strong>: the demo server rejects it with a 422
      carrying errors on two tabs, on the stock editor's rows and on a key no
      field renders. The form moves to the first tab with an error, and the
      summary above the button lists every message. Click a row to go to its
      field.
    </p>

    <DXForm
      :form="form"
      :fields="fields"
      :tabs="tabs"
      card
      submit-text="Save product"
      @submit="save"
    >
      <!-- A span field renders its own editor. It edits form.data.stock_levels,
           so it claims those error keys with `errorKeys` (see `fields`). -->
      <template #span(stock_editor)>
        <p class="fw-medium mb-2">Stock by warehouse</p>
        <DFormGroup
          v-for="(level, index) in form.data.stock_levels"
          :key="level.warehouse"
          :label="level.warehouse"
          label-cols="4"
          class="mb-2"
        >
          <DFormInput
            v-model.number="level.quantity"
            type="number"
            :state="form.errors[`stock_levels.${index}.quantity`] ? false : null"
          />
        </DFormGroup>
      </template>
    </DXForm>

    <h5 class="mt-4">Horizontal layout</h5>
    <p class="text-muted">
      Setting <code>layout="horizontal"</code> moves every field's label to a
      left-hand column, including checkbox and repeater fields. A field can
      opt back into vertical with <code>field.layout</code>.
    </p>
    <DXForm
      :form="contactForm"
      :fields="contactFields"
      layout="horizontal"
      :show-submit="false"
    />
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue';
import {
  DFormGroup,
  DFormInput,
  DXForm,
  useForm,
  type FieldDefinition,
  type FormTab,
} from '@omnitend/dashboard-for-laravel';
import { answerWith } from './support/demoServer';

const form = useForm({
  name: 'Desk lamp',
  price: 24,
  on_sale: false,
  sale_price: 0,
  sku: 'lamp 1',
  stock_levels: [
    { warehouse: 'Leeds', quantity: -3 },
    { warehouse: 'Bristol', quantity: 12 },
  ],
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
  {
    key: 'stock_editor',
    type: 'text',
    label: 'Stock',
    span: true,
    submit: false,
    // Errors such as `stock_levels.0.quantity` belong to this field.
    errorKeys: ['stock_levels.*.*'],
  },
];

const tabs: FormTab[] = [
  { key: 'general', label: 'General', fieldKeys: ['name', 'price', 'on_sale', 'sale_price'] },
  { key: 'inventory', label: 'Inventory', fieldKeys: ['sku', 'stock_editor'] },
];

// A real app posts to its own endpoint; errors come back as a Laravel 422.
const save = () => form.post('/demo/products').catch(() => {});

// Docs only: the site has no server, so answer that one request with the
// 422 a Laravel controller would return.
let stopDemoServer = () => {};
onMounted(() => {
  stopDemoServer = answerWith('POST', '/demo/products', () => ({
    status: 422,
    body: {
      message: 'A product with this name already exists. (and 3 more errors)',
      errors: {
        name: ['A product with this name already exists.'],
        sku: ['The SKU must look like ABC-123.'],
        'stock_levels.0.quantity': ['Stock in Leeds cannot be negative.'],
        // No field renders this key, so only the summary can show it.
        supplier_id: ['The supplier account is on hold.'],
      },
    },
  }));
});
onBeforeUnmount(() => stopDemoServer());

const contactForm = useForm({
  full_name: '',
  email: '',
  subscribe: false,
});

const contactFields: FieldDefinition[] = [
  { key: 'full_name', type: 'text', label: 'Full name', required: true },
  { key: 'email', type: 'email', label: 'Email', required: true },
  { key: 'subscribe', type: 'checkbox', label: 'Subscribe to updates' },
];
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
