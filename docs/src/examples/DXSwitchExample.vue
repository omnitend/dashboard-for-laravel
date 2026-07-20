<template>
  <div class="switch-examples">
    <div class="example-section">
      <h5>Contextual text (changes with state)</h5>
      <DXSwitch
        v-model="current"
        text-when-true="Product is current"
        text-when-false="Product is not current"
      />
      <p class="state-display">current: {{ current }} — toggle it to see the label change</p>
    </div>

    <div class="example-section">
      <h5>Static label</h5>
      <DXSwitch v-model="on" label="Enabled" />
      <DXSwitch v-model="off" label="Auto-save" />
    </div>

    <div class="example-section">
      <h5>Filled box: green-on / light-red-off by default</h5>
      <DXSwitch
        :model-value="true"
        text-when-true="Product is current"
        text-when-false="Product is not current"
      />
      <DXSwitch
        :model-value="false"
        text-when-true="Product is current"
        text-when-false="Product is not current"
      />
      <p class="state-display">
        Default <code>on-variant="success"</code>: the whole box is green when on, light red when
        off, with a neutral pill. Pair <code>textWhenTrue</code>/<code>textWhenFalse</code> so the
        label names each state too.
      </p>
      <DXSwitch
        :model-value="true"
        text-when-true="Contains alcohol"
        text-when-false="No alcohol"
        on-variant="neutral"
      />
      <DXSwitch
        :model-value="false"
        text-when-true="Contains alcohol"
        text-when-false="No alcohol"
        on-variant="neutral"
      />
      <p class="state-display">
        <code>on-variant="neutral"</code> for mixed-semantics switches: primary on, grey off — no
        good/bad valence.
      </p>
    </div>

    <div class="example-section">
      <h5>Disabled</h5>
      <DXSwitch :model-value="true" label="Locked on" disabled />
      <DXSwitch :model-value="false" label="Locked off" disabled />
    </div>

    <div class="example-section">
      <h5>Custom label (default slot)</h5>
      <DXSwitch v-model="beta">
        <span>Beta features <strong>(experimental)</strong></span>
      </DXSwitch>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { DXSwitch } from '@omnitend/dashboard-for-laravel';

const current = ref(true);
const on = ref(true);
const off = ref(false);
const beta = ref(false);
</script>

<style scoped>
.switch-examples {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.example-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  align-items: flex-start;
}

.example-section h5 {
  margin-bottom: 0.25rem;
  font-weight: 600;
  color: var(--bs-dark);
}

.state-display {
  margin: 0;
  padding: 0.5rem 1rem;
  background-color: var(--bs-light);
  border-radius: 0.25rem;
  font-size: 0.875rem;
  color: var(--bs-dark);
}
</style>
