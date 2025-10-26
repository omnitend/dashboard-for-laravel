<template>
  <div class="form-input-examples">
    <div class="example-section">
      <h5>Text Inputs</h5>
      <div class="input-group">
        <DFormInput v-model="textInput" placeholder="Enter text" />
        <DFormInput v-model="emailInput" type="email" placeholder="Enter email" />
        <DFormInput v-model="passwordInput" type="password" placeholder="Enter password" />
        <DFormInput v-model="urlInput" type="url" placeholder="Enter URL" />
      </div>
    </div>

    <div class="example-section">
      <h5>Number Inputs</h5>
      <div class="input-group">
        <DFormInput v-model="numberInput" type="number" placeholder="Enter number" />
        <DFormInput v-model="rangeInput" type="range" min="0" max="100" />
        <p class="state-display">Range value: {{ rangeInput }}</p>
      </div>
    </div>

    <div class="example-section">
      <h5>Date and Time Inputs</h5>
      <div class="input-group">
        <DFormInput v-model="dateInput" type="date" />
        <DFormInput v-model="timeInput" type="time" />
        <DFormInput v-model="datetimeInput" type="datetime-local" />
      </div>
    </div>

    <div class="example-section">
      <h5>Input Sizes</h5>
      <div class="input-group">
        <DFormInput v-model="smallInput" size="sm" placeholder="Small input" />
        <DFormInput v-model="defaultInput" placeholder="Default input" />
        <DFormInput v-model="largeInput" size="lg" placeholder="Large input" />
      </div>
    </div>

    <div class="example-section">
      <h5>Validation States</h5>
      <div class="input-group">
        <DFormInput v-model="validInput" :state="true" placeholder="Valid input" />
        <DFormInput v-model="invalidInput" :state="false" placeholder="Invalid input" />
        <DFormInput v-model="neutralInput" placeholder="Neutral input" />
      </div>
    </div>

    <div class="example-section">
      <h5>Disabled and Readonly</h5>
      <div class="input-group">
        <DFormInput v-model="disabledInput" disabled placeholder="Disabled input" />
        <DFormInput v-model="readonlyInput" readonly placeholder="Read-only input" />
      </div>
    </div>

    <div class="example-section">
      <h5>Plain Text</h5>
      <div class="input-group">
        <DFormInput v-model="plaintextInput" plaintext readonly />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import DFormInput from '../../../resources/js/components/base/DFormInput.vue';

const textInput = ref('');
const emailInput = ref('');
const passwordInput = ref('');
const urlInput = ref('');
const numberInput = ref(0);
const rangeInput = ref(50);
const dateInput = ref('');
const timeInput = ref('');
const datetimeInput = ref('');
const smallInput = ref('');
const defaultInput = ref('');
const largeInput = ref('');
const validInput = ref('This input is valid');
const invalidInput = ref('This input is invalid');
const neutralInput = ref('');
const disabledInput = ref('This field is disabled');
const readonlyInput = ref('This field is read-only');
const plaintextInput = ref('Plain text display (like a label)');
</script>

<style scoped>
.form-input-examples {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.example-section h5 {
  margin-bottom: 1rem;
  font-weight: 600;
  color: var(--bs-dark);
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 1rem;
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
