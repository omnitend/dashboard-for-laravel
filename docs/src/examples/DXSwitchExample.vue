<template>
  <div class="switch-examples">
    <div class="example-section">
      <h5>Basic</h5>
      <DXSwitch v-model="current" label="Product is current" />
      <p class="state-display">current: {{ current }}</p>
    </div>

    <div class="example-section">
      <h5>On and off</h5>
      <DXSwitch v-model="on" label="Enabled" />
      <DXSwitch v-model="off" label="Disabled feature" />
    </div>

    <div class="example-section">
      <h5>Disabled</h5>
      <DXSwitch :model-value="true" label="Locked on" disabled />
      <DXSwitch :model-value="false" label="Locked off" disabled />
    </div>

    <div class="example-section">
      <h5>Custom label (default slot)</h5>
      <DXSwitch v-model="beta">
        <span>Beta features <strong>(experimental)</strong></span>
      </DXSwitch>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { DXSwitch } from '@omnitend/dashboard-for-laravel';

const current = ref(true);
const on = ref(true);
const off = ref(false);
const beta = ref(false);
</script>

<style scoped>
.switch-examples {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.example-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  align-items: flex-start;
}

.example-section h5 {
  margin-bottom: 0.25rem;
  font-weight: 600;
  color: var(--bs-dark);
}

.state-display {
  margin: 0;
  padding: 0.5rem 1rem;
  background-color: var(--bs-light);
  border-radius: 0.25rem;
  font-size: 0.875rem;
  color: var(--bs-dark);
}
</style>
