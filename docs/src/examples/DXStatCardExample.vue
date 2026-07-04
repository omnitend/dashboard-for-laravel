<template>
  <div class="statcard-examples">
    <div class="row g-3">
      <div class="col-md-4">
        <DXStatCard
          title="Revenue"
          subtitle="This week"
          :value="6480.55"
          format="currency"
          :delta="-61"
          delta-label="vs last week"
        />
      </div>
      <div class="col-md-4">
        <DXStatCard
          title="New customers"
          subtitle="This week"
          :value="128"
          :delta="12"
          delta-label="vs last week"
        />
      </div>
      <div class="col-md-4">
        <DXStatCard
          title="Refund rate"
          subtitle="Lower is better"
          :value="2.4"
          format="percent"
          :precision="1"
          :delta="-0.6"
          :delta-format="'percent'"
          invert-delta
          delta-label="vs last week"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { DXStatCard } from '@omnitend/dashboard-for-laravel';
</script>

<style scoped>
.statcard-examples {
  padding: 0.5rem;
}
</style>
