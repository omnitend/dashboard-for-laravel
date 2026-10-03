<script setup lang="ts">
import { ref, watch } from 'vue';
import PlaygroundLayout from '../../Layouts/PlaygroundLayout.vue';
import {
  DCard,
  DFormGroup,
  DFormInput,
  DXForm,
  DXSaveButton,
  useForm,
} from '@omnitend/dashboard-for-laravel';
import type { FieldDefinition } from '@omnitend/dashboard-for-laravel';

// 1. DXForm: the saved state comes free with a successful form.put().
const productForm = useForm({ name: 'Espresso', sku: 'COF-001' });
const productFields: FieldDefinition[] = [
  { key: 'name', type: 'text', label: 'Name', required: true },
  { key: 'sku', type: 'text', label: 'SKU' },
];
const saveProduct = () => productForm.put('/api/save-demo').catch(() => {});

// 2. DXSaveButton driven by two booleans, for a hand-built form.
const note = ref('Deliveries on Tuesdays');
const isSaving = ref(false);
const isSaved = ref(false);

watch(note, () => {
  isSaved.value = false;
});

async function saveNote(): Promise<void> {
  isSaving.value = true;
  try {
    await new Promise((resolve) => setTimeout(resolve, 900));
    isSaved.value = true;
  } finally {
    isSaving.value = false;
  }
}
</script>

<template>
  <PlaygroundLayout current-url="/save-button" page-title="Save button">
    <div class="save-demo d-flex flex-column gap-4">
      <DCard data-demo="dxform">
        <template #header>
          <h4 class="mb-0">DXForm</h4>
        </template>
        <p class="text-muted">
          Save, then edit a field: the button reads "Saved" until something changes.
        </p>
        <DXForm
          :form="productForm"
          :fields="productFields"
          submit-text="Save"
          submit-loading-text="Saving…"
          @submit="saveProduct"
        />
      </DCard>

      <DCard data-demo="standalone">
        <template #header>
          <h4 class="mb-0">DXSaveButton (saving + saved booleans)</h4>
        </template>
        <form @submit.prevent="saveNote">
          <DFormGroup label="Delivery note" label-for="delivery-note">
            <DFormInput id="delivery-note" v-model="note" />
          </DFormGroup>
          <DXSaveButton
            type="submit"
            class="mt-3"
            :saving="isSaving"
            :saved="isSaved"
            saving-text="Saving…"
          >
            Save
          </DXSaveButton>
        </form>
      </DCard>
    </div>
  </PlaygroundLayout>
</template>

<style scoped>
.save-demo {
  max-width: 36rem;
}
</style>
