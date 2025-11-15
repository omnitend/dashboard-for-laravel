<template>
  <div class="form-select-examples">
    <div class="example-section">
      <h5>Basic Select</h5>
      <DFormSelect v-model="selectedCountry" :options="countryOptions" />
      <p class="state-display">Selected: {{ selectedCountry || 'None' }}</p>
    </div>

    <div class="example-section">
      <h5>Select with Groups</h5>
      <DFormSelect v-model="selectedAnimal" :options="animalOptions" />
      <p class="state-display">Selected: {{ selectedAnimal || 'None' }}</p>
    </div>

    <div class="example-section">
      <h5>Multiple Select</h5>
      <DFormSelect v-model="selectedSkills" :options="skillOptions" multiple :select-size="4" />
      <p class="state-display">Selected skills: {{ selectedSkills.join(', ') || 'None' }}</p>
    </div>

    <div class="example-section">
      <h5>Select Sizes</h5>
      <div class="select-group">
        <DFormSelect v-model="smallSelect" :options="sizeOptions" size="sm" />
        <DFormSelect v-model="defaultSelect" :options="sizeOptions" />
        <DFormSelect v-model="largeSelect" :options="sizeOptions" size="lg" />
      </div>
    </div>

    <div class="example-section">
      <h5>Validation States</h5>
      <div class="select-group">
        <DFormSelect v-model="validSelect" :options="stateOptions" :state="true" />
        <DFormSelect v-model="invalidSelect" :options="stateOptions" :state="false" />
      </div>
    </div>

    <div class="example-section">
      <h5>Disabled Select</h5>
      <DFormSelect v-model="disabledSelect" :options="countryOptions" disabled />
    </div>
  </div>
</template>

<script setup lang="ts">
import { DFormSelect } from '@omnitend/dashboard-for-laravel';

import { ref } from 'vue';

const selectedCountry = ref('');
const selectedAnimal = ref('');
const selectedSkills = ref<string[]>([]);
const smallSelect = ref('small');
const defaultSelect = ref('default');
const largeSelect = ref('large');
const validSelect = ref('valid');
const invalidSelect = ref('');
const disabledSelect = ref('UK');

const countryOptions = [
  { value: '', text: 'Please select a country' },
  { value: 'UK', text: 'United Kingdom' },
  { value: 'US', text: 'United States' },
  { value: 'CA', text: 'Canada' },
  { value: 'AU', text: 'Australia' },
  { value: 'DE', text: 'Germany' },
  { value: 'FR', text: 'France' },
];

const animalOptions = [
  { value: '', text: 'Please select an animal' },
  {
    label: 'Mammals',
    options: [
      { value: 'dog', text: 'Dog' },
      { value: 'cat', text: 'Cat' },
      { value: 'rabbit', text: 'Rabbit' },
    ],
  },
  {
    label: 'Birds',
    options: [
      { value: 'parrot', text: 'Parrot' },
      { value: 'eagle', text: 'Eagle' },
      { value: 'penguin', text: 'Penguin' },
    ],
  },
];

const skillOptions = [
  { value: 'javascript', text: 'JavaScript' },
  { value: 'typescript', text: 'TypeScript' },
  { value: 'vue', text: 'Vue.js' },
  { value: 'react', text: 'React' },
  { value: 'php', text: 'PHP' },
  { value: 'laravel', text: 'Laravel' },
  { value: 'python', text: 'Python' },
  { value: 'django', text: 'Django' },
];

const sizeOptions = [
  { value: 'small', text: 'Small' },
  { value: 'default', text: 'Default' },
  { value: 'large', text: 'Large' },
];

const stateOptions = [
  { value: '', text: 'Select an option' },
  { value: 'valid', text: 'Valid Option' },
  { value: 'invalid', text: 'Invalid Option' },
];
</script>

<style scoped>
.form-select-examples {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.example-section h5 {
  margin-bottom: 1rem;
  font-weight: 600;
  color: var(--bs-dark);
}

.select-group {
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
