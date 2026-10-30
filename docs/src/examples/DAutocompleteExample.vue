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

    <div class="example-section">
      <h5>Searching a server as you type</h5>
      <p class="text-muted">
        <code>provider</code> asks for the matching options once typing pauses, here from a
        pretend server that takes 400&nbsp;ms. Type <code>fil</code>, then keep typing: only the
        latest result is listed, and the earlier call is aborted.
      </p>
      <DAutocomplete
        v-model="searchedProductLineId"
        :provider="searchProductLines"
        placeholder="Search thousands of product lines…"
      />
      <p class="mt-3">
        Selected id: <strong>{{ searchedProductLineId ?? '—' }}</strong>
        <span class="text-muted">(calls so far: {{ providerCalls }})</span>
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

const CATALOGUE = [
  'Filters & papers',
  'Filter baskets',
  'Grinders',
  'Espresso machines',
  'Milk frothers',
  'Tampers',
  'Scales',
].map((text, index) => ({ value: index + 1, text }));

const searchedProductLineId = ref<number | null>(null);
const providerCalls = ref(0);

// A pretend server: 400 ms, and it honours the abort signal.
const searchProductLines = (term: string, signal: AbortSignal) =>
  new Promise<typeof CATALOGUE>((resolve, reject) => {
    providerCalls.value += 1;
    const timer = setTimeout(
      () => resolve(CATALOGUE.filter((option) => option.text.toLowerCase().includes(term.toLowerCase()))),
      400,
    );
    signal.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    });
  });
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
