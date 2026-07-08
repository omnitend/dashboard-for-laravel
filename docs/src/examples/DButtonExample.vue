<template>
  <div class="button-examples">
    <div class="example-section">
      <h5>Variants</h5>
      <div class="button-group">
        <DButton variant="primary">Primary</DButton>
        <DButton variant="secondary">Secondary</DButton>
        <DButton variant="success">Success</DButton>
        <DButton variant="danger">Danger</DButton>
        <DButton variant="warning">Warning</DButton>
        <DButton variant="info">Info</DButton>
      </div>
    </div>

    <div class="example-section">
      <h5>Sizes</h5>
      <div class="button-group">
        <DButton variant="primary" size="sm">Small</DButton>
        <DButton variant="primary">Default</DButton>
        <DButton variant="primary" size="lg">Large</DButton>
      </div>
    </div>

    <div class="example-section">
      <h5>Outline Buttons</h5>
      <div class="button-group">
        <DButton variant="outline-primary">Primary</DButton>
        <DButton variant="outline-secondary">Secondary</DButton>
        <DButton variant="outline-success">Success</DButton>
      </div>
    </div>

    <div class="example-section">
      <h5>States</h5>
      <div class="button-group">
        <DButton variant="primary">Normal</DButton>
        <DButton variant="primary" disabled>Disabled</DButton>
        <DButton variant="link">Link Button</DButton>
      </div>
    </div>

    <div class="example-section">
      <h5>Icons</h5>
      <div class="button-group">
        <DButton variant="primary" icon="save">Save</DButton>
        <DButton variant="outline-secondary" icon="pencil">Edit</DButton>
        <DButton variant="danger" icon="trash">Delete</DButton>
        <DButton variant="outline-primary" icon="arrow-clockwise" />
      </div>
    </div>

    <div class="example-section">
      <h5>Loading</h5>
      <p class="example-hint">
        The spinner is anti-flashed: it only appears if the action runs longer
        than <code>spinnerDelay</code> (500ms), and stays for at least
        <code>minSpinnerTime</code> once shown. Click each to compare.
      </p>
      <div class="button-group">
        <DButton
          variant="primary"
          :loading="slowLoading"
          loading-text="Saving…"
          @click="runSlow"
        >
          Slow action (1.5s)
        </DButton>
        <DButton
          variant="secondary"
          :loading="fastLoading"
          @click="runFast"
        >
          Fast action (200ms)
        </DButton>
      </div>
    </div>

    <div class="example-section">
      <h5>Full Width (block)</h5>
      <DButton variant="primary" block>Continue</DButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { DButton } from '@omnitend/dashboard-for-laravel';

const slowLoading = ref(false);
const fastLoading = ref(false);

const runSlow = () => {
  slowLoading.value = true;
  setTimeout(() => (slowLoading.value = false), 1500);
};

// Under the 500ms spinnerDelay, so no spinner ever flashes in.
const runFast = () => {
  fastLoading.value = true;
  setTimeout(() => (fastLoading.value = false), 200);
};
</script>

<style scoped>
.button-examples {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.example-section h5 {
  margin-bottom: 1rem;
  font-weight: 600;
  color: var(--bs-dark);
}

.button-group {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}

.example-hint {
  margin-bottom: 0.75rem;
  color: var(--bs-secondary);
  font-size: 0.875rem;
}
</style>
