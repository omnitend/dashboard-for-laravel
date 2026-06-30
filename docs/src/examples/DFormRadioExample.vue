<template>
  <div class="examples">
    <div class="example-section">
      <h5>Radio Group</h5>
      <DFormRadioGroup v-model="selected" :options="options" name="radio-options" />
      <p class="mt-2">Selected: <strong>{{ selected }}</strong></p>
    </div>

    <div class="example-section">
      <h5>Inline Radio Group</h5>
      <DFormRadioGroup v-model="size" :options="sizeOptions" name="size-options" inline />
      <p class="mt-2">Size: <strong>{{ size }}</strong></p>
    </div>
  </div>
</template>

<script setup lang="ts">
// Radios bind to a group context. Use DFormRadioGroup (with `options`, or with
// DFormRadio children inside it) rather than standalone DFormRadio.
import { DFormRadioGroup } from '@omnitend/dashboard-for-laravel';
import { ref } from 'vue';

const selected = ref('A');
const options = [
  { value: 'A', text: 'Option A' },
  { value: 'B', text: 'Option B' },
  { value: 'C', text: 'Option C' },
];

const size = ref('md');
const sizeOptions = [
  { value: 'sm', text: 'Small' },
  { value: 'md', text: 'Medium' },
  { value: 'lg', text: 'Large' },
];
</script>
