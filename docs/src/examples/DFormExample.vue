<template>
  <div class="examples">
    <div class="example-section">
      <h5>Basic Form</h5>
      <DForm @submit.prevent="handleSubmit">
        <DFormGroup label="Email address" label-for="email-input">
          <DFormInput
            id="email-input"
            v-model="formData.email"
            type="email"
            placeholder="Enter email"
            required
          />
        </DFormGroup>

        <DFormGroup label="Password" label-for="password-input">
          <DFormInput
            id="password-input"
            v-model="formData.password"
            type="password"
            placeholder="Password"
            required
          />
        </DFormGroup>

        <DButton type="submit" variant="primary">Submit</DButton>
      </DForm>
    </div>
  </div>
</template>

<script setup lang="ts">
import { DForm, DFormGroup, DFormInput, DButton } from '@omnitend/dashboard-for-laravel';

import { reactive } from "vue";

const formData = reactive({
  email: "",
  password: ""
});

const handleSubmit = () => {
  alert("Form submitted!");
};
</script>
