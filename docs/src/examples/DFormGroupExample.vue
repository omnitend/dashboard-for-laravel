<template>
  <div class="form-group-examples">
    <div class="example-section">
      <h5>Basic Form Group</h5>
      <DFormGroup
        label="Email Address"
        label-for="email-input"
        description="We'll never share your email with anyone else."
      >
        <DFormInput id="email-input" v-model="email" type="email" placeholder="Enter email" />
      </DFormGroup>
    </div>

    <div class="example-section">
      <h5>Required Field</h5>
      <DFormGroup
        label="Full Name"
        label-for="name-input"
        description="Please enter your full legal name."
      >
        <DFormInput id="name-input" v-model="name" required placeholder="Enter your name" />
      </DFormGroup>
    </div>

    <div class="example-section">
      <h5>With Validation States</h5>
      <DFormGroup
        label="Username"
        label-for="username-input"
        :state="usernameState"
        invalid-feedback="Username must be at least 3 characters."
        valid-feedback="Username is available!"
      >
        <DFormInput
          id="username-input"
          v-model="username"
          :state="usernameState"
          placeholder="Choose a username"
        />
      </DFormGroup>
    </div>

    <div class="example-section">
      <h5>Horizontal Form Group</h5>
      <DFormGroup
        label="Company"
        label-for="company-input"
        label-cols="3"
        label-cols-lg="2"
        description="Enter your company name."
      >
        <DFormInput id="company-input" v-model="company" placeholder="Company name" />
      </DFormGroup>
    </div>

    <div class="example-section">
      <h5>Form Group with Select</h5>
      <DFormGroup
        label="Country"
        label-for="country-select"
        description="Select your country of residence."
      >
        <DFormSelect id="country-select" v-model="country" :options="countryOptions" />
      </DFormGroup>
    </div>

    <div class="example-section">
      <h5>Form Group with Textarea</h5>
      <DFormGroup
        label="Biography"
        label-for="bio-textarea"
        description="Tell us a bit about yourself (optional)."
      >
        <DFormTextarea
          id="bio-textarea"
          v-model="bio"
          placeholder="Enter your bio..."
          rows="3"
        />
      </DFormGroup>
    </div>
  </div>
</template>

<script setup lang="ts">
import { DFormGroup, DFormInput, DFormSelect, DFormTextarea } from '@omnitend/dashboard-for-laravel';

import { ref, computed } from 'vue';

const email = ref('');
const name = ref('');
const username = ref('');
const company = ref('');
const country = ref('');
const bio = ref('');

const usernameState = computed(() => {
  if (username.value.length === 0) return null;
  return username.value.length >= 3;
});

const countryOptions = [
  { value: '', text: 'Please select a country' },
  { value: 'UK', text: 'United Kingdom' },
  { value: 'US', text: 'United States' },
  { value: 'CA', text: 'Canada' },
  { value: 'AU', text: 'Australia' },
  { value: 'DE', text: 'Germany' },
  { value: 'FR', text: 'France' },
];
</script>

<style scoped>
.form-group-examples {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.example-section h5 {
  margin-bottom: 1rem;
  font-weight: 600;
  color: var(--bs-dark);
}
</style>
