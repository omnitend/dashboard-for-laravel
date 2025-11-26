<template>
  <div class="examples">
    <div class="example-section">
      <h5>Navbar Brand</h5>
      <DNavbar variant="dark" type="dark">
        <DNavbarBrand href="#">My Application</DNavbarBrand>
      </DNavbar>
    </div>

    <div class="example-section">
      <h5>Brand with Image</h5>
      <DNavbar variant="light" type="light">
        <DNavbarBrand href="#">
          <img src="https://picsum.photos/30/30" alt="Logo" class="me-2" />
          Brand
        </DNavbarBrand>
      </DNavbar>
    </div>
  </div>
</template>

<script setup lang="ts">
import { DNavbar, DNavbarBrand } from '@omnitend/dashboard-for-laravel';
</script>

<style scoped>
.examples {
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
