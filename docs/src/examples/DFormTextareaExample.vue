<template>
  <div class="form-textarea-examples">
    <div class="example-section">
      <h5>Basic Textarea</h5>
      <DFormTextarea
        v-model="basicText"
        placeholder="Enter your message here..."
        rows="3"
      />
    </div>

    <div class="example-section">
      <h5>Textarea with Row Configuration</h5>
      <div class="textarea-group">
        <DFormTextarea v-model="smallText" placeholder="Small (2 rows)" rows="2" />
        <DFormTextarea v-model="mediumText" placeholder="Medium (4 rows)" rows="4" />
        <DFormTextarea v-model="largeText" placeholder="Large (6 rows)" rows="6" />
      </div>
    </div>

    <div class="example-section">
      <h5>Textarea Sizes</h5>
      <div class="textarea-group">
        <DFormTextarea v-model="smallSizeText" placeholder="Small size" size="sm" rows="2" />
        <DFormTextarea v-model="defaultSizeText" placeholder="Default size" rows="2" />
        <DFormTextarea v-model="largeSizeText" placeholder="Large size" size="lg" rows="2" />
      </div>
    </div>

    <div class="example-section">
      <h5>Validation States</h5>
      <div class="textarea-group">
        <DFormTextarea
          v-model="validText"
          :state="true"
          placeholder="Valid textarea"
          rows="2"
        />
        <DFormTextarea
          v-model="invalidText"
          :state="false"
          placeholder="Invalid textarea"
          rows="2"
        />
      </div>
    </div>

    <div class="example-section">
      <h5>Disabled and Readonly</h5>
      <div class="textarea-group">
        <DFormTextarea
          v-model="disabledText"
          disabled
          placeholder="Disabled textarea"
          rows="2"
        />
        <DFormTextarea
          v-model="readonlyText"
          readonly
          rows="2"
        />
      </div>
    </div>

    <div class="example-section">
      <h5>Max Length with Counter</h5>
      <DFormTextarea
        v-model="limitedText"
        placeholder="Enter up to 200 characters..."
        rows="3"
        max-rows="6"
      />
      <p class="state-display">Characters: {{ limitedText.length }} / 200</p>
    </div>

    <div class="example-section">
      <h5>Auto-height Textarea</h5>
      <DFormTextarea
        v-model="autoHeightText"
        placeholder="This textarea will grow as you type..."
        rows="2"
        max-rows="8"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import DFormTextarea from '../../../resources/js/components/base/DFormTextarea.vue';

const basicText = ref('');
const smallText = ref('');
const mediumText = ref('');
const largeText = ref('');
const smallSizeText = ref('');
const defaultSizeText = ref('');
const largeSizeText = ref('');
const validText = ref('This textarea contains valid content.');
const invalidText = ref('This textarea contains invalid content.');
const disabledText = ref('This textarea is disabled and cannot be edited.');
const readonlyText = ref('This textarea is read-only. You can select the text but cannot modify it.');
const limitedText = ref('');
const autoHeightText = ref('');
</script>

<style scoped>
.form-textarea-examples {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.example-section h5 {
  margin-bottom: 1rem;
  font-weight: 600;
  color: var(--bs-dark);
}

.textarea-group {
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
