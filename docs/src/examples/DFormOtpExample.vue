<template>
  <div class="otp-example">
    <div class="example-section">
      <h5>Verification code</h5>
      <p class="text-muted">Enter the 6-digit code from your authenticator app.</p>
      <DFormOtp v-model="code" :length="6" />
      <p class="mt-3">Code: <strong>{{ code.join('') || '—' }}</strong></p>
    </div>

    <div class="example-section">
      <h5>4 digits, with separator</h5>
      <DFormOtp v-model="pin" :length="4" separator="-" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { DFormOtp } from '@omnitend/dashboard-for-laravel';

const code = ref<string[]>([]);
const pin = ref<string[]>([]);
</script>

<style scoped>
.otp-example {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.example-section h5 {
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: var(--bs-dark);
}
</style>
