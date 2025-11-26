<template>
  <div class="examples">
    <div class="example-section">
      <h5>Form Validation Feedback</h5>
      <DForm>
        <DFormGroup label="Email">
          <DFormInput
            v-model="email"
            type="email"
            :state="emailState"
            placeholder="Enter email"
          />
          <DFormInvalidFeedback :state="emailState">
            Please enter a valid email address.
          </DFormInvalidFeedback>
        </DFormGroup>
      </DForm>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { DForm, DFormGroup, DFormInput, DFormInvalidFeedback } from '@omnitend/dashboard-for-laravel';

const email = ref('invalid-email');
const emailState = computed(() => {
  if (!email.value) return null;
  return email.value.includes('@') ? true : false;
});
</script>
