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
  </div>
</template>

<script setup lang="ts">
import { DButton } from '@omnitend/dashboard-for-laravel';

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
</style>
