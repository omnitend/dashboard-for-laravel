<template>
  <div class="stepper-examples">
    <div class="example-section">
      <h5>Basic, with a lower bound</h5>
      <DXNumberStepper v-model="cases" :min="1" aria-label="Cases" />
      <p class="state-display">model: {{ cases === null ? 'null' : cases }} (decrease disables at 1)</p>
    </div>

    <div class="example-section">
      <h5>Bounded both ways, step 5</h5>
      <DXNumberStepper v-model="covers" :min="0" :max="40" :step="5" aria-label="Covers" />
      <p class="state-display">model: {{ covers === null ? 'null' : covers }} (type 99 and leave the field: it clamps to 40)</p>
    </div>

    <div class="example-section">
      <h5>Decimal step</h5>
      <DXNumberStepper v-model="litres" :min="0" :step="0.1" aria-label="Litres" />
      <p class="state-display">model: {{ litres === null ? 'null' : litres }} (0.1 three times is 0.3)</p>
    </div>

    <div class="example-section">
      <h5>Sizes and disabled</h5>
      <div class="d-flex flex-wrap align-items-center gap-3">
        <DXNumberStepper v-model="small" size="sm" aria-label="Small" />
        <DXNumberStepper v-model="small" aria-label="Medium" />
        <DXNumberStepper v-model="small" size="lg" aria-label="Large" />
        <DXNumberStepper v-model="small" disabled aria-label="Disabled" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { DXNumberStepper } from '@omnitend/dashboard-for-laravel';

const cases = ref<number | null>(2);
const covers = ref<number | null>(20);
const litres = ref<number | null>(0);
const small = ref<number | null>(3);
</script>

<style scoped>
.stepper-examples {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
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
  color: var(--bs-secondary-color);
  font-size: 0.875rem;
}
</style>
