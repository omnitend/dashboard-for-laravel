<template>
  <div class="row-examples">
    <div class="example-section">
      <h5>Basic Row</h5>
      <DContainer>
        <DRow class="demo-row">
          <DCol class="demo-col">Column 1</DCol>
          <DCol class="demo-col">Column 2</DCol>
          <DCol class="demo-col">Column 3</DCol>
        </DRow>
      </DContainer>
    </div>

    <div class="example-section">
      <h5>Row with Gutters</h5>
      <DContainer>
        <DRow class="demo-row g-3">
          <DCol cols="4" class="demo-col">Column 1</DCol>
          <DCol cols="4" class="demo-col">Column 2</DCol>
          <DCol cols="4" class="demo-col">Column 3</DCol>
        </DRow>
      </DContainer>
    </div>

    <div class="example-section">
      <h5>Row with Custom Gutter Sizes</h5>
      <div class="gutter-group">
        <div>
          <p class="mb-2"><strong>No gutter (g-0)</strong></p>
          <DContainer>
            <DRow class="demo-row g-0">
              <DCol class="demo-col">Column 1</DCol>
              <DCol class="demo-col">Column 2</DCol>
              <DCol class="demo-col">Column 3</DCol>
            </DRow>
          </DContainer>
        </div>
        <div>
          <p class="mb-2"><strong>Small gutter (g-2)</strong></p>
          <DContainer>
            <DRow class="demo-row g-2">
              <DCol class="demo-col">Column 1</DCol>
              <DCol class="demo-col">Column 2</DCol>
              <DCol class="demo-col">Column 3</DCol>
            </DRow>
          </DContainer>
        </div>
        <div>
          <p class="mb-2"><strong>Large gutter (g-5)</strong></p>
          <DContainer>
            <DRow class="demo-row g-5">
              <DCol class="demo-col">Column 1</DCol>
              <DCol class="demo-col">Column 2</DCol>
              <DCol class="demo-col">Column 3</DCol>
            </DRow>
          </DContainer>
        </div>
      </div>
    </div>

    <div class="example-section">
      <h5>Row Alignment (Vertical)</h5>
      <div class="alignment-group">
        <div>
          <p class="mb-2"><strong>Align Start</strong></p>
          <DContainer>
            <DRow class="demo-row-tall align-items-start">
              <DCol class="demo-col">Column 1</DCol>
              <DCol class="demo-col">Column 2</DCol>
              <DCol class="demo-col">Column 3</DCol>
            </DRow>
          </DContainer>
        </div>
        <div>
          <p class="mb-2"><strong>Align Centre</strong></p>
          <DContainer>
            <DRow class="demo-row-tall align-items-center">
              <DCol class="demo-col">Column 1</DCol>
              <DCol class="demo-col">Column 2</DCol>
              <DCol class="demo-col">Column 3</DCol>
            </DRow>
          </DContainer>
        </div>
        <div>
          <p class="mb-2"><strong>Align End</strong></p>
          <DContainer>
            <DRow class="demo-row-tall align-items-end">
              <DCol class="demo-col">Column 1</DCol>
              <DCol class="demo-col">Column 2</DCol>
              <DCol class="demo-col">Column 3</DCol>
            </DRow>
          </DContainer>
        </div>
      </div>
    </div>

    <div class="example-section">
      <h5>Row Justification (Horizontal)</h5>
      <div class="alignment-group">
        <div>
          <p class="mb-2"><strong>Justify Start</strong></p>
          <DContainer>
            <DRow class="demo-row justify-content-start">
              <DCol cols="3" class="demo-col">Col 1</DCol>
              <DCol cols="3" class="demo-col">Col 2</DCol>
            </DRow>
          </DContainer>
        </div>
        <div>
          <p class="mb-2"><strong>Justify Centre</strong></p>
          <DContainer>
            <DRow class="demo-row justify-content-center">
              <DCol cols="3" class="demo-col">Col 1</DCol>
              <DCol cols="3" class="demo-col">Col 2</DCol>
            </DRow>
          </DContainer>
        </div>
        <div>
          <p class="mb-2"><strong>Justify End</strong></p>
          <DContainer>
            <DRow class="demo-row justify-content-end">
              <DCol cols="3" class="demo-col">Col 1</DCol>
              <DCol cols="3" class="demo-col">Col 2</DCol>
            </DRow>
          </DContainer>
        </div>
        <div>
          <p class="mb-2"><strong>Justify Between</strong></p>
          <DContainer>
            <DRow class="demo-row justify-content-between">
              <DCol cols="3" class="demo-col">Col 1</DCol>
              <DCol cols="3" class="demo-col">Col 2</DCol>
            </DRow>
          </DContainer>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { DContainer, DRow, DCol } from '@omni-tend/dashboard-for-laravel';

</script>

<style scoped>
.row-examples {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.example-section h5 {
  margin-bottom: 1rem;
  font-weight: 600;
  color: var(--bs-dark);
}

.gutter-group,
.alignment-group {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.gutter-group p,
.alignment-group p {
  font-size: 0.875rem;
  color: var(--bs-secondary);
}

.demo-row {
  background-color: var(--bs-light);
  border: 1px dashed var(--bs-border-color);
  padding: 0.5rem;
  min-height: 60px;
}

.demo-row-tall {
  min-height: 120px;
  background-color: var(--bs-light);
  border: 1px dashed var(--bs-border-color);
  padding: 0.5rem;
}

.demo-col {
  padding: 1rem;
  background-color: var(--bs-white);
  border: 1px solid var(--bs-border-color);
  text-align: center;
  font-size: 0.875rem;
}
</style>
