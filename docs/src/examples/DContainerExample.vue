<template>
  <div class="container-examples">
    <div class="example-section">
      <h5>Default Container</h5>
      <DContainer class="demo-container">
        <p>This is a responsive container that centres content and adds horizontal padding.</p>
      </DContainer>
    </div>

    <div class="example-section">
      <h5>Fluid Container</h5>
      <DContainer fluid class="demo-container">
        <p>This is a fluid container that spans the full width of the viewport.</p>
      </DContainer>
    </div>

    <div class="example-section">
      <h5>Container with Grid</h5>
      <DContainer class="demo-container">
        <DRow>
          <DCol cols="12" md="4" class="demo-col">Column 1</DCol>
          <DCol cols="12" md="4" class="demo-col">Column 2</DCol>
          <DCol cols="12" md="4" class="demo-col">Column 3</DCol>
        </DRow>
      </DContainer>
    </div>

    <div class="example-section">
      <h5>Breakpoint-Specific Container</h5>
      <DContainer fluid="md" class="demo-container">
        <p>This container is fluid until the 'md' breakpoint, then becomes fixed-width.</p>
      </DContainer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { DContainer, DRow, DCol } from '@omni-tend/dashboard-for-laravel';

</script>

<style scoped>
.container-examples {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.example-section h5 {
  margin-bottom: 1rem;
  font-weight: 600;
  color: var(--bs-dark);
}

.demo-container {
  background-color: var(--bs-light);
  border: 2px dashed var(--bs-border-color);
  padding: 1rem;
  min-height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.demo-container p {
  margin: 0;
  text-align: center;
}

.demo-col {
  padding: 1rem;
  background-color: var(--bs-white);
  border: 1px solid var(--bs-border-color);
  text-align: center;
  margin-bottom: 1rem;
}
</style>
