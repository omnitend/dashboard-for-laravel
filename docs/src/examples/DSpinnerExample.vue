<template>
  <div class="spinner-examples">
    <div class="example-section">
      <h5>Border Spinners</h5>
      <div class="spinner-group">
        <DSpinner variant="primary" />
        <DSpinner variant="secondary" />
        <DSpinner variant="success" />
        <DSpinner variant="danger" />
        <DSpinner variant="warning" />
        <DSpinner variant="info" />
      </div>
    </div>

    <div class="example-section">
      <h5>Growing Spinners</h5>
      <div class="spinner-group">
        <DSpinner variant="primary" type="grow" />
        <DSpinner variant="secondary" type="grow" />
        <DSpinner variant="success" type="grow" />
        <DSpinner variant="danger" type="grow" />
        <DSpinner variant="warning" type="grow" />
        <DSpinner variant="info" type="grow" />
      </div>
    </div>

    <div class="example-section">
      <h5>Spinner Sizes</h5>
      <div class="spinner-group">
        <DSpinner variant="primary" small />
        <DSpinner variant="primary" />
        <DSpinner variant="primary" style="width: 3rem; height: 3rem;" />
      </div>
      <p class="size-label">Small → Default → Custom Large</p>
    </div>

    <div class="example-section">
      <h5>Spinners with Labels</h5>
      <div class="spinner-label-group">
        <div class="spinner-with-label">
          <DSpinner variant="primary" />
          <span>Loading...</span>
        </div>
        <div class="spinner-with-label">
          <DSpinner variant="success" type="grow" />
          <span>Processing...</span>
        </div>
        <div class="spinner-with-label">
          <DSpinner variant="info" small />
          <span>Fetching data...</span>
        </div>
      </div>
    </div>

    <div class="example-section">
      <h5>Spinners in Buttons</h5>
      <div class="button-group">
        <DButton variant="primary" disabled>
          <DSpinner small />
          <span class="ms-2">Loading...</span>
        </DButton>
        <DButton variant="success" disabled>
          <DSpinner small type="grow" />
          <span class="ms-2">Processing...</span>
        </DButton>
        <DButton variant="secondary" disabled>
          <DSpinner small />
        </DButton>
      </div>
    </div>

    <div class="example-section">
      <h5>Centred Spinners</h5>
      <div class="centred-spinner-container">
        <DSpinner variant="primary" />
      </div>
      <div class="centred-spinner-container">
        <DSpinner variant="success" type="grow" />
      </div>
    </div>

    <div class="example-section">
      <h5>Loading States</h5>
      <div class="loading-demo">
        <DButton variant="primary" @click="simulateLoading">
          {{ isLoading ? '' : 'Load Data' }}
          <DSpinner v-if="isLoading" small />
          <span v-if="isLoading" class="ms-2">Loading...</span>
        </DButton>
        <p v-if="loadingComplete" class="success-message">
          Data loaded successfully!
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { DSpinner, DButton } from '@omnitend/dashboard-for-laravel';

import { ref } from 'vue';

const isLoading = ref(false);
const loadingComplete = ref(false);

const simulateLoading = () => {
  isLoading.value = true;
  loadingComplete.value = false;
  setTimeout(() => {
    isLoading.value = false;
    loadingComplete.value = true;
    setTimeout(() => {
      loadingComplete.value = false;
    }, 2000);
  }, 2000);
};
</script>

<style scoped>
.spinner-examples {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.example-section h5 {
  margin-bottom: 1rem;
  font-weight: 600;
  color: var(--bs-dark);
}

.spinner-group {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: center;
}

.size-label {
  margin-top: 0.5rem;
  font-size: 0.875rem;
  color: var(--bs-secondary);
  font-style: italic;
}

.spinner-label-group {
  display: flex;
  flex-wrap: wrap;
  gap: 2rem;
}

.spinner-with-label {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.spinner-with-label span {
  font-size: 0.875rem;
  color: var(--bs-dark);
}

.button-group {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}

.centred-spinner-container {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 2rem;
  background-color: var(--bs-light);
  border-radius: 0.25rem;
  margin-bottom: 1rem;
}

.centred-spinner-container:last-child {
  margin-bottom: 0;
}

.loading-demo {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.success-message {
  padding: 0.75rem 1rem;
  background-color: var(--bs-success-bg-subtle);
  color: var(--bs-success-text-emphasis);
  border-radius: 0.25rem;
  margin: 0;
}
</style>
