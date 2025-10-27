<template>
  <div class="toast-examples">
    <div class="example-section">
      <h5>Toast Component Variants</h5>
      <div class="toast-grid">
        <DToast title="Primary" body="This is a primary toast notification." variant="primary" :model-value="true" :no-close-button="false" />
        <DToast title="Success" body="Operation completed successfully!" variant="success" :model-value="true" :no-close-button="false" />
        <DToast title="Danger" body="An error occurred." variant="danger" :model-value="true" :no-close-button="false" />
        <DToast title="Warning" body="Please review your input." variant="warning" :model-value="true" :no-close-button="false" />
        <DToast title="Info" body="Additional information is available." variant="info" :model-value="true" :no-close-button="false" />
      </div>
    </div>

    <div class="example-section">
      <h5>Solid Toasts</h5>
      <div class="toast-grid">
        <DToast title="Solid Primary" body="Solid background variant." variant="primary" :model-value="true" :solid="true" />
        <DToast title="Solid Success" body="Solid success notification." variant="success" :model-value="true" :solid="true" />
        <DToast title="Solid Danger" body="Solid error notification." variant="danger" :model-value="true" :solid="true" />
      </div>
    </div>

    <div class="example-section">
      <h5>Toast without Title</h5>
      <DToast body="Simple toast notification without a title." variant="secondary" :model-value="true" />
    </div>

    <div class="example-section">
      <h5>Usage Note</h5>
      <p class="info-text">
        DToast is typically used with DToaster and the <code>useToast()</code> composable from Bootstrap Vue Next
        for programmatic toast notifications. The examples above show the component's visual variants.
        For interactive toast notifications, combine DToast with DToaster in your application layout.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { DToast } from '@omni-tend/dashboard-for-laravel';

</script>

<style scoped>
.toast-examples {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.example-section h5 {
  margin-bottom: 1rem;
  font-weight: 600;
  color: var(--bs-dark);
}

.toast-grid {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 400px;
}

.info-text {
  padding: 1rem;
  background-color: var(--bs-light);
  border-left: 3px solid var(--bs-primary);
  border-radius: 0.25rem;
  margin: 0;
}

.info-text code {
  background-color: var(--bs-white);
  padding: 0.2rem 0.4rem;
  border-radius: 0.2rem;
  font-size: 0.875em;
  color: var(--bs-danger);
}
</style>
