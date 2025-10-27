<template>
  <div class="examples">
    <div class="example-section">
      <h5>Responsive Navbar</h5>
      <DNavbar variant="dark" type="dark">
        <DNavbarBrand href="#">Brand</DNavbarBrand>
        <DNavbarToggle target="nav-collapse" />
        <DCollapse id="nav-collapse" is-nav>
          <DNavbarNav>
            <DNavItem href="#" active>Home</DNavItem>
            <DNavItem href="#">Link</DNavItem>
          </DNavbarNav>
        </DCollapse>
      </DNavbar>
    </div>
  </div>
</template>

<script setup lang="ts">
import { DNavbar, DNavbarBrand, DNavbarToggle, DCollapse, DNavbarNav, DNavItem } from '@omni-tend/dashboard-for-laravel';

</script>
