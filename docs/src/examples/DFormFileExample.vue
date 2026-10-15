<template>
  <div class="form-file-examples">
    <div class="example-section">
      <h5>Single File</h5>
      <DFormGroup label="Invoice" label-for="invoice-file">
        <DFormFile id="invoice-file" v-model="invoice" accept=".pdf" />
      </DFormGroup>
      <p class="state-display">Selected: {{ invoice ? invoice.name : 'none' }}</p>
    </div>

    <div class="example-section">
      <h5>Multiple Files with File Names</h5>
      <DFormGroup label="Photos" label-for="photo-files">
        <!-- The file-name slot replaces the text inside the control (and the
             list below it too, if show-file-names is set). -->
        <DFormFile id="photo-files" v-model="photos" multiple accept="image/*">
          <template #file-name="{ names }">
            <span v-if="names.length">{{ names.length }} photos: {{ names.join(', ') }}</span>
            <span v-else class="text-muted">No photos chosen</span>
          </template>
        </DFormFile>
      </DFormGroup>
      <ul v-if="photos && photos.length" class="file-list small text-muted mt-2">
        <li v-for="photo in photos" :key="photo.name">
          {{ photo.name }} ({{ Math.ceil(photo.size / 1024) }} KB)
        </li>
      </ul>
    </div>

    <div class="example-section">
      <h5>Drop Zone</h5>
      <p class="small text-muted">Drag files onto the control, or click it to browse.</p>
      <DFormFile
        v-model="dropped"
        multiple
        browse-text="Choose files"
        placeholder="Drop files here or choose"
        drop-placeholder="Release to add the files"
      />
      <DButton class="mt-2" size="sm" variant="link" @click="dropped = null">Clear</DButton>
    </div>

    <div class="example-section">
      <h5>Invalid State</h5>
      <DFormGroup
        label="Contract"
        label-for="contract-file"
        :state="contract ? null : false"
        invalid-feedback="Please choose the signed contract."
      >
        <DFormFile id="contract-file" v-model="contract" :state="contract ? null : false" />
      </DFormGroup>
    </div>

    <div class="example-section">
      <h5>Sizes and Disabled</h5>
      <div class="file-group">
        <DFormFile size="sm" placeholder="Small" />
        <DFormFile size="lg" placeholder="Large" />
        <DFormFile disabled placeholder="Disabled" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { DButton, DFormFile, DFormGroup } from '@omnitend/dashboard-for-laravel';

import { ref } from 'vue';

const invoice = ref<File | null>(null);
const photos = ref<File[] | null>(null);
const dropped = ref<File[] | null>(null);
const contract = ref<File | null>(null);
</script>

<style scoped>
.form-file-examples {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.example-section h5 {
  margin-bottom: 1rem;
  font-weight: 600;
  color: var(--bs-dark);
}

.file-group {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.file-list {
  margin: 0;
  padding-left: 1.25rem;
}

.state-display {
  margin-top: 0.5rem;
  padding: 0.5rem 1rem;
  background-color: var(--bs-light);
  border-radius: 0.25rem;
  font-size: 0.875rem;
  color: var(--bs-dark);
}
</style>
