<template>
  <div class="examples">
    <div class="example-section">
      <h5>Navbar Navigation</h5>
      <DNavbar variant="dark" type="dark">
        <DNavbarBrand href="#">Brand</DNavbarBrand>
        <DNavbarNav>
          <DNavItem href="#" active>Home</DNavItem>
          <DNavItem href="#">Features</DNavItem>
          <DNavItem href="#">Pricing</DNavItem>
          <DNavItem href="#" disabled>Disabled</DNavItem>
        </DNavbarNav>
      </DNavbar>
    </div>

    <div class="example-section">
      <h5>Right-aligned Navigation</h5>
      <DNavbar variant="light" type="light">
        <DNavbarBrand href="#">Brand</DNavbarBrand>
        <DNavbarNav class="ms-auto">
          <DNavItem href="#">Login</DNavItem>
          <DNavItem href="#">Sign Up</DNavItem>
        </DNavbarNav>
      </DNavbar>
    </div>
  </div>
</template>

<script setup lang="ts">
import { DNavbar, DNavbarBrand, DNavbarNav, DNavItem } from '@omnitend/dashboard-for-laravel';
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
