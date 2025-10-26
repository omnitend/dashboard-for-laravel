<template>
  <div class="form-checkbox-examples">
    <div class="example-section">
      <h5>Basic Checkboxes</h5>
      <div class="checkbox-group">
        <DFormCheckbox v-model="checkbox1">Accept terms and conditions</DFormCheckbox>
        <DFormCheckbox v-model="checkbox2">Subscribe to newsletter</DFormCheckbox>
        <DFormCheckbox v-model="checkbox3">Enable notifications</DFormCheckbox>
        <p class="state-display">
          Selected: {{ [checkbox1 && 'Terms', checkbox2 && 'Newsletter', checkbox3 && 'Notifications'].filter(Boolean).join(', ') || 'None' }}
        </p>
      </div>
    </div>

    <div class="example-section">
      <h5>Checkbox Group</h5>
      <div class="checkbox-group">
        <DFormCheckbox v-model="selectedFeatures" value="feature1">Email Integration</DFormCheckbox>
        <DFormCheckbox v-model="selectedFeatures" value="feature2">Calendar Sync</DFormCheckbox>
        <DFormCheckbox v-model="selectedFeatures" value="feature3">File Storage</DFormCheckbox>
        <DFormCheckbox v-model="selectedFeatures" value="feature4">Team Collaboration</DFormCheckbox>
        <p class="state-display">Selected features: {{ selectedFeatures.length }}</p>
      </div>
    </div>

    <div class="example-section">
      <h5>Disabled Checkboxes</h5>
      <div class="checkbox-group">
        <DFormCheckbox v-model="checkbox4">Enabled checkbox</DFormCheckbox>
        <DFormCheckbox v-model="checkbox5" disabled>Disabled unchecked</DFormCheckbox>
        <DFormCheckbox v-model="checkbox6" disabled>Disabled checked</DFormCheckbox>
      </div>
    </div>

    <div class="example-section">
      <h5>Inline Checkboxes</h5>
      <div class="checkbox-group inline">
        <DFormCheckbox v-model="inlineOptions" value="option1" inline>Option 1</DFormCheckbox>
        <DFormCheckbox v-model="inlineOptions" value="option2" inline>Option 2</DFormCheckbox>
        <DFormCheckbox v-model="inlineOptions" value="option3" inline>Option 3</DFormCheckbox>
      </div>
    </div>

    <div class="example-section">
      <h5>Switch Style Checkboxes</h5>
      <div class="checkbox-group">
        <DFormCheckbox v-model="switch1" switch>Dark Mode</DFormCheckbox>
        <DFormCheckbox v-model="switch2" switch>Auto-save</DFormCheckbox>
        <DFormCheckbox v-model="switch3" switch>Two-factor Authentication</DFormCheckbox>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import DFormCheckbox from '../../../resources/js/components/base/DFormCheckbox.vue';

const checkbox1 = ref(false);
const checkbox2 = ref(false);
const checkbox3 = ref(true);
const checkbox4 = ref(false);
const checkbox5 = ref(false);
const checkbox6 = ref(true);

const selectedFeatures = ref<string[]>(['feature1']);
const inlineOptions = ref<string[]>(['option2']);

const switch1 = ref(false);
const switch2 = ref(true);
const switch3 = ref(false);
</script>

<style scoped>
.form-checkbox-examples {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.example-section h5 {
  margin-bottom: 1rem;
  font-weight: 600;
  color: var(--bs-dark);
}

.checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.checkbox-group.inline {
  flex-direction: row;
  flex-wrap: wrap;
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
