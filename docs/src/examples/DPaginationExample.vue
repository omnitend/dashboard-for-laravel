<template>
  <div class="pagination-examples">
    <div class="example-section">
      <h5>Basic Pagination</h5>
      <DPagination
        v-model="currentPage1"
        :total-rows="100"
        :per-page="10"
      />
      <p class="state-display">Current page: {{ currentPage1 }} / 10</p>
    </div>

    <div class="example-section">
      <h5>Pagination with Custom Number of Pages</h5>
      <DPagination
        v-model="currentPage2"
        :total-rows="250"
        :per-page="25"
      />
      <p class="state-display">
        Showing items {{ ((currentPage2 - 1) * 25) + 1 }} - {{ Math.min(currentPage2 * 25, 250) }} of 250
      </p>
    </div>

    <div class="example-section">
      <h5>Pagination Sizes</h5>
      <div class="pagination-group">
        <div>
          <p class="mb-2"><strong>Small</strong></p>
          <DPagination
            v-model="currentPage3"
            :total-rows="50"
            :per-page="10"
            size="sm"
          />
        </div>
        <div>
          <p class="mb-2"><strong>Default</strong></p>
          <DPagination
            v-model="currentPage4"
            :total-rows="50"
            :per-page="10"
          />
        </div>
        <div>
          <p class="mb-2"><strong>Large</strong></p>
          <DPagination
            v-model="currentPage5"
            :total-rows="50"
            :per-page="10"
            size="lg"
          />
        </div>
      </div>
    </div>

    <div class="example-section">
      <h5>Pagination Alignment</h5>
      <div class="pagination-group">
        <div>
          <p class="mb-2"><strong>Start (default)</strong></p>
          <DPagination
            v-model="currentPage6"
            :total-rows="50"
            :per-page="10"
          />
        </div>
        <div>
          <p class="mb-2"><strong>Centre</strong></p>
          <DPagination
            v-model="currentPage7"
            :total-rows="50"
            :per-page="10"
            align="center"
          />
        </div>
        <div>
          <p class="mb-2"><strong>End</strong></p>
          <DPagination
            v-model="currentPage8"
            :total-rows="50"
            :per-page="10"
            align="end"
          />
        </div>
      </div>
    </div>

    <div class="example-section">
      <h5>Pagination with Limited Visible Pages</h5>
      <DPagination
        v-model="currentPage9"
        :total-rows="1000"
        :per-page="10"
        :limit="5"
      />
      <p class="state-display">
        Page {{ currentPage9 }} of 100 (showing max 5 page buttons)
      </p>
    </div>

    <div class="example-section">
      <h5>Pagination with First/Last Buttons</h5>
      <DPagination
        v-model="currentPage10"
        :total-rows="100"
        :per-page="10"
        first-number
        last-number
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { DPagination } from '@omni-tend/dashboard-for-laravel';

import { ref } from 'vue';

const currentPage1 = ref(1);
const currentPage2 = ref(1);
const currentPage3 = ref(1);
const currentPage4 = ref(1);
const currentPage5 = ref(1);
const currentPage6 = ref(1);
const currentPage7 = ref(1);
const currentPage8 = ref(1);
const currentPage9 = ref(1);
const currentPage10 = ref(1);
</script>

<style scoped>
.pagination-examples {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.example-section h5 {
  margin-bottom: 1rem;
  font-weight: 600;
  color: var(--bs-dark);
}

.pagination-group {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.pagination-group p {
  font-size: 0.875rem;
  color: var(--bs-secondary);
}

.state-display {
  margin-top: 1rem;
  padding: 0.5rem 1rem;
  background-color: var(--bs-light);
  border-radius: 0.25rem;
  font-size: 0.875rem;
  color: var(--bs-dark);
}
</style>
