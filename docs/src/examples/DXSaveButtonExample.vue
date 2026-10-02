<template>
  <div class="save-button-examples">
    <div class="example-section">
      <h5>Driven by two booleans</h5>
      <form @submit.prevent="saveNote">
        <DFormGroup label="Delivery note" label-for="save-example-note">
          <DFormInput id="save-example-note" v-model="note" />
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
      <p class="state-display">
        Save, then type in the field: the button reads "✓ Saved" until something changes.
      </p>
    </div>

    <div class="example-section">
      <h5>The three states</h5>
      <div class="d-flex flex-wrap gap-2">
        <DXSaveButton>Save</DXSaveButton>
        <DXSaveButton saving :spinner-delay="0">Save</DXSaveButton>
        <DXSaveButton saved>Save</DXSaveButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { DFormGroup, DFormInput, DXSaveButton } from '@omnitend/dashboard-for-laravel';

const note = ref('Deliveries on Tuesdays');
const isSaving = ref(false);
const isSaved = ref(false);

// Any change to what the button would save clears the saved state.
watch(note, () => {
  isSaved.value = false;
});

async function saveNote(): Promise<void> {
  isSaving.value = true;
  try {
    // Your request goes here; this stands in for a ~1s round trip.
    await new Promise((resolve) => setTimeout(resolve, 1000));
    isSaved.value = true;
  } finally {
    isSaving.value = false;
  }
}
</script>

<style scoped>
.save-button-examples {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-width: 32rem;
}

.state-display {
  margin-top: 0.5rem;
  color: var(--bs-secondary-color);
  font-size: 0.875rem;
}
</style>
