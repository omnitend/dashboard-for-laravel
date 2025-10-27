<template>
  <div class="col-examples">
    <div class="example-section">
      <h5>Equal Width Columns</h5>
      <DContainer>
        <DRow class="demo-row">
          <DCol class="demo-col">Column 1</DCol>
          <DCol class="demo-col">Column 2</DCol>
          <DCol class="demo-col">Column 3</DCol>
        </DRow>
      </DContainer>
    </div>

    <div class="example-section">
      <h5>Specific Width Columns</h5>
      <DContainer>
        <DRow class="demo-row">
          <DCol cols="4" class="demo-col">4 columns wide</DCol>
          <DCol cols="8" class="demo-col">8 columns wide</DCol>
        </DRow>
        <DRow class="demo-row">
          <DCol cols="6" class="demo-col">6 columns wide</DCol>
          <DCol cols="6" class="demo-col">6 columns wide</DCol>
        </DRow>
      </DContainer>
    </div>

    <div class="example-section">
      <h5>Responsive Columns</h5>
      <DContainer>
        <DRow class="demo-row">
          <DCol cols="12" md="6" lg="4" class="demo-col">
            Full width on mobile, half on tablet, third on desktop
          </DCol>
          <DCol cols="12" md="6" lg="4" class="demo-col">
            Full width on mobile, half on tablet, third on desktop
          </DCol>
          <DCol cols="12" md="12" lg="4" class="demo-col">
            Full width on mobile & tablet, third on desktop
          </DCol>
        </DRow>
      </DContainer>
    </div>

    <div class="example-section">
      <h5>Offset Columns</h5>
      <DContainer>
        <DRow class="demo-row">
          <DCol cols="4" offset="4" class="demo-col">
            Centred with offset
          </DCol>
        </DRow>
        <DRow class="demo-row">
          <DCol cols="3" class="demo-col">Column 1</DCol>
          <DCol cols="3" offset="6" class="demo-col">Column 2 (offset)</DCol>
        </DRow>
      </DContainer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { DContainer, DRow, DCol } from '@omni-tend/dashboard-for-laravel';

</script>

<style scoped>
.col-examples {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.example-section h5 {
  margin-bottom: 1rem;
  font-weight: 600;
  color: var(--bs-dark);
}

.demo-row {
  margin-bottom: 1rem;
}

.demo-row:last-child {
  margin-bottom: 0;
}

.demo-col {
  padding: 1rem;
  background-color: var(--bs-light);
  border: 1px solid var(--bs-border-color);
  text-align: center;
  font-size: 0.875rem;
}
</style>
