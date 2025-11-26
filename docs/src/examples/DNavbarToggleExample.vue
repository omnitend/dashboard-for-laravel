<template>
  <div class="examples">
    <div class="example-section">
      <h5>Responsive Navbar with Toggle</h5>
      <p class="text-muted mb-3">Resize the browser to see the toggle button appear on smaller screens.</p>
      <DNavbar variant="dark" type="dark" toggleable="md">
        <DNavbarBrand href="#">Brand</DNavbarBrand>
        <DNavbarToggle target="nav-collapse-example" />
        <DCollapse id="nav-collapse-example" is-nav>
          <DNavbarNav>
            <DNavItem href="#" active>Home</DNavItem>
            <DNavItem href="#">Features</DNavItem>
            <DNavItem href="#">Pricing</DNavItem>
          </DNavbarNav>
        </DCollapse>
      </DNavbar>
    </div>
  </div>
</template>

<script setup lang="ts">
import { DNavbar, DNavbarBrand, DNavbarToggle, DCollapse, DNavbarNav, DNavItem } from '@omnitend/dashboard-for-laravel';
</script>

<style scoped>
.examples {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.example-section h5 {
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: var(--bs-dark);
}
</style>
