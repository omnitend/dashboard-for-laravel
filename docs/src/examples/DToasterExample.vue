<template>
  <div class="toaster-examples">
    <div class="example-section">
      <h5>Toaster Component</h5>
      <p class="text-muted">DToaster provides a container for displaying toast notifications in various positions.</p>
      <DToaster position="top-end" />
    </div>

    <div class="example-section">
      <h5>Different Positions</h5>
      <div class="position-grid">
        <div class="position-item">
          <strong>top-start</strong>
          <DToaster position="top-start" />
        </div>
        <div class="position-item">
          <strong>top-center</strong>
          <DToaster position="top-center" />
        </div>
        <div class="position-item">
          <strong>top-end</strong>
          <DToaster position="top-end" />
        </div>
        <div class="position-item">
          <strong>middle-start</strong>
          <DToaster position="middle-start" />
        </div>
        <div class="position-item">
          <strong>middle-center</strong>
          <DToaster position="middle-center" />
        </div>
        <div class="position-item">
          <strong>middle-end</strong>
          <DToaster position="middle-end" />
        </div>
        <div class="position-item">
          <strong>bottom-start</strong>
          <DToaster position="bottom-start" />
        </div>
        <div class="position-item">
          <strong>bottom-center</strong>
          <DToaster position="bottom-center" />
        </div>
        <div class="position-item">
          <strong>bottom-end</strong>
          <DToaster position="bottom-end" />
        </div>
      </div>
    </div>

    <div class="example-section">
      <h5>Usage Note</h5>
      <p class="info-text">
        DToaster is typically used with the <code>useToast()</code> composable from Bootstrap Vue Next
        to programmatically show toast notifications. Place the DToaster component once in your layout
        and trigger toasts using the composable's <code>show()</code> method.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { DToaster } from '@omnitend/dashboard-for-laravel';

</script>

<style scoped>
.toaster-examples {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.example-section h5 {
  margin-bottom: 1rem;
  font-weight: 600;
  color: var(--bs-dark);
}

.position-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.position-item {
  padding: 1rem;
  background-color: var(--bs-light);
  border-radius: 0.25rem;
  text-align: center;
  border: 1px solid var(--bs-border-color);
}

.position-item strong {
  display: block;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  color: var(--bs-secondary);
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
