<template>
  <div class="examples">
    <div class="example-section">
      <h5>Progress Bars</h5>
      <div class="mb-3">
        <DProgress :value="25" variant="primary" show-progress />
      </div>
      <div class="mb-3">
        <DProgress :value="50" variant="success" striped />
      </div>
      <div>
        <DProgress :value="75" variant="warning" animated striped />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { DProgress } from '@omnitend/dashboard-for-laravel';

</script>
