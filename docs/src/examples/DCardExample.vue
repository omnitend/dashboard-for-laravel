<template>
  <div class="card-examples">
    <div class="example-section">
      <h5>Basic Card</h5>
      <DCard>
        <template #header>
          Card Header
        </template>
        <p>This is a basic card with a header. You can add any content here.</p>
        <template #footer>
          Card Footer
        </template>
      </DCard>
    </div>

    <div class="example-section">
      <h5>Card with Title</h5>
      <DCard>
        <template #header>
          <h4 class="mb-0">Card Title</h4>
        </template>
        <h6 class="card-subtitle mb-2 text-muted">Card subtitle</h6>
        <p class="card-text">Some quick example text to build on the card title and make up the bulk of the card's content.</p>
        <DButton variant="primary">Go somewhere</DButton>
      </DCard>
    </div>

    <div class="example-section">
      <h5>Simple Card (No Header)</h5>
      <DCard>
        <p>A simple card without a header or footer. Just plain content in the card body.</p>
      </DCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import DCard from '../../../resources/js/components/base/DCard.vue';
import DButton from '../../../resources/js/components/base/DButton.vue';
</script>

<style scoped>
.card-examples {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.example-section h5 {
  margin-bottom: 1rem;
  font-weight: 600;
  color: var(--bs-dark);
}
</style>
