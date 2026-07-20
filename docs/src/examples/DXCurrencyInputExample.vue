<template>
  <div class="currency-examples">
    <div class="example-section">
      <h5>Basic — model is the major-unit amount</h5>
      <DXCurrencyInput v-model="price" style="max-width: 14rem" />
      <p class="state-display">model: {{ price === null ? 'null' : price }} — clear the input to see null (never NaN)</p>
    </div>

    <div class="example-section">
      <h5>Custom symbol and no minor unit (JPY)</h5>
      <DXCurrencyInput v-model="yen" currency-symbol="¥" :decimals="0" style="max-width: 14rem" />
      <p class="state-display">model: {{ yen === null ? 'null' : yen }}</p>
    </div>

    <div class="example-section">
      <h5>minorUnits — edit an integer-pence column as pounds</h5>
      <DXCurrencyInput v-model="pence" minor-units style="max-width: 14rem" />
      <p class="state-display">stored model (pence): {{ pence === null ? 'null' : pence }} — type 19.99 and the model is exactly 1999</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { DXCurrencyInput } from '@omnitend/dashboard-for-laravel';

const price = ref<number | null>(3.8);
const yen = ref<number | null>(500);
const pence = ref<number | null>(1999);
</script>

<style scoped>
.currency-examples {
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
  padding: 0.5rem 1rem;
  background-color: var(--bs-light);
  border-radius: 0.25rem;
  font-size: 0.875rem;
  color: var(--bs-dark);
}
</style>
