<template>
  <div class="examples">
    <div class="example-section">
      <h5>Form Validation Feedback</h5>
      <DForm>
        <DFormGroup label="Username">
          <DFormInput
            v-model="username"
            :state="usernameState"
            placeholder="Choose a username"
          />
          <DFormValidFeedback :state="usernameState">
            That username is available.
          </DFormValidFeedback>
        </DFormGroup>
      </DForm>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { DForm, DFormGroup, DFormInput, DFormValidFeedback } from '@omnitend/dashboard-for-laravel';

const username = ref('ada');
const usernameState = computed(() => {
  if (!username.value) return null;
  return username.value.length >= 3 ? true : false;
});
</script>
