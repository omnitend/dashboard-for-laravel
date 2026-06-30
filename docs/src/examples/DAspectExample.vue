<template>
  <div class="aspect-example">
    <div class="example-section">
      <h5>16:9</h5>
      <DAspect aspect="16:9">
        <div class="aspect-fill">16 : 9</div>
      </DAspect>
    </div>

    <div class="example-section">
      <h5>1:1 (square)</h5>
      <div style="max-width: 200px">
        <DAspect aspect="1:1">
          <div class="aspect-fill">1 : 1</div>
        </DAspect>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { DAspect } from '@omnitend/dashboard-for-laravel';
</script>

<style scoped>
.aspect-example {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.example-section h5 {
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: var(--bs-dark);
}

.aspect-fill {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  background-color: var(--bs-primary);
  color: var(--bs-white);
  border-radius: var(--bs-border-radius);
  font-weight: 600;
}
</style>
