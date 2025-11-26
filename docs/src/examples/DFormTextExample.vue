<template>
  <div class="examples">
    <div class="example-section">
      <h5>Form Help Text</h5>
      <DForm>
        <DFormGroup label="Password">
          <DFormInput
            v-model="password"
            type="password"
            placeholder="Enter password"
          />
          <DFormText>
            Password must be at least 8 characters with one uppercase letter and one number.
          </DFormText>
        </DFormGroup>
      </DForm>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { DForm, DFormGroup, DFormInput, DFormText } from '@omnitend/dashboard-for-laravel';

const password = ref('');
</script>
