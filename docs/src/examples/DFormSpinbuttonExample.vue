<template>
  <div class="examples">
    <div class="example-section">
      <h5>Spinbutton</h5>
      <DFormSpinbutton
        v-model="value"
        :min="0"
        :max="100"
        :step="5"
      />
      <p class="mt-2">Value: <strong>{{ value }}</strong></p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { DFormSpinbutton } from '@omnitend/dashboard-for-laravel';

import { ref } from "vue";

const value = ref(50);
</script>
