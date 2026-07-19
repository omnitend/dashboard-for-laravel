<template>
  <div class="autocomplete-example">
    <div class="example-section">
      <h5>Country</h5>
      <p class="text-muted">Start typing to filter the list.</p>
      <DAutocomplete v-model="country" :options="countries" placeholder="Start typing…" />
      <p class="mt-3">Selected: <strong>{{ country || '—' }}</strong></p>
    </div>

    <div class="example-section">
      <h5>Searchable single-select with a null option</h5>
      <p class="text-muted">
        <code>null-option</code> pins a selectable "no selection" row to the top of the list. It is
        never filtered out as you type, and selecting it sets the model back to <code>null</code>.
        Option values round-trip unchanged — the numeric ids below come back as numbers.
      </p>
      <DAutocomplete
        v-model="productLineId"
        :options="productLines"
        null-option="No product line"
        placeholder="Search product lines…"
      />
      <p class="mt-3">
        Selected id: <strong>{{ productLineId ?? '—' }}</strong>
        <span class="text-muted">(type: {{ typeof productLineId }})</span>
      </p>
    </div>
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

const productLineId = ref<number | null>(null);
const productLines = [
  { value: 1, text: 'Espresso machines' },
  { value: 2, text: 'Grinders' },
  { value: 3, text: 'Filters & papers' },
  { value: 4, text: 'Milk frothers' },
];
</script>

<style scoped>
.autocomplete-example {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.autocomplete-example h5 {
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: var(--bs-dark);
}
</style>
