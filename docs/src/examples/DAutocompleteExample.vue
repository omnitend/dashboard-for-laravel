<template>
  <div class="autocomplete-example">
    <h5>Country</h5>
    <p class="text-muted">Start typing to filter the list.</p>
    <DAutocomplete v-model="country" :options="countries" placeholder="Start typing…" />
    <p class="mt-3">Selected: <strong>{{ country || '—' }}</strong></p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { DAutocomplete } from '@omnitend/dashboard-for-laravel';

const country = ref('');
const countries = [
  'United Kingdom',
  'United States',
  'Canada',
  'Australia',
  'Germany',
  'France',
  'Spain',
  'Italy',
  'Netherlands',
  'Sweden',
];
</script>

<style scoped>
.autocomplete-example h5 {
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: var(--bs-dark);
}
</style>
