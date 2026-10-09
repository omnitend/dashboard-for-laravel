<template>
  <div>
    <p class="text-muted">
      Click a row to edit it, then press <strong>Save</strong>. The demo server
      rejects the save with a 422, and the modal lists every message in its
      footer, beside the button, until the next save.
    </p>
    <DXTable
      :items="suppliers"
      :fields="fields"
      :edit-fields="editFields"
      :client-side="true"
      edit-url="/demo/suppliers/:id"
      item-name="supplier"
      title="Suppliers"
    />
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { DXTable, type FieldDefinition } from '@omnitend/dashboard-for-laravel';
import { answerWith } from './support/demoServer';

const fields = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
];

const editFields: FieldDefinition[] = [
  { key: 'name', type: 'text', label: 'Name' },
  { key: 'email', type: 'email', label: 'Email' },
];

const suppliers = ref([
  { id: 1, name: 'Northwind Paper', email: 'orders@northwind.example' },
  { id: 2, name: 'Harbour Lighting', email: 'sales@harbour.example' },
]);

// Docs only: the site has no server, so answer PUT /demo/suppliers/<id>
// with the 422 a Laravel controller would return.
let stopDemoServer = () => {};
onMounted(() => {
  stopDemoServer = answerWith('PUT', /^\/demo\/suppliers\/\d+$/, () => ({
    status: 422,
    body: {
      message: 'The email has already been taken. (and 1 more error)',
      errors: {
        email: ['The email has already been taken.'],
        // No edit field renders this key; the summary still lists it.
        credit_limit: ['The credit limit needs a finance sign-off.'],
      },
    },
  }));
});
onBeforeUnmount(() => stopDemoServer());
</script>
