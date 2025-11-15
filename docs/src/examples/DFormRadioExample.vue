<template>
  <div class="examples">
    <div class="example-section">
      <h5>Radio Buttons</h5>
      <div class="mb-3">
        <DFormRadio v-model="selected" name="radio-options" value="A">
          Option A
        </DFormRadio>
        <DFormRadio v-model="selected" name="radio-options" value="B">
          Option B
        </DFormRadio>
        <DFormRadio v-model="selected" name="radio-options" value="C">
          Option C
        </DFormRadio>
      </div>
      <p>Selected: <strong>{{ selected }}</strong></p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { DFormRadio } from '@omnitend/dashboard-for-laravel';

import { ref } from "vue";

const selected = ref("A");
</script>
