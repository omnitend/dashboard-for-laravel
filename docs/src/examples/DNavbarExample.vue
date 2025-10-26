<template>
  <div class="examples">
    <div class="example-section">
      <h5>Responsive Navbar</h5>
      <DNavbar variant="dark" type="dark">
        <BNavbarBrand href="#">Brand</BNavbarBrand>
        <BNavbarToggle target="nav-collapse" />
        <BCollapse id="nav-collapse" is-nav>
          <BNavbarNav>
            <BNavItem href="#" active>Home</BNavItem>
            <BNavItem href="#">Link</BNavItem>
          </BNavbarNav>
        </BCollapse>
      </DNavbar>
    </div>
  </div>
</template>

<script setup lang="ts">
import DNavbar from "../../../resources/js/components/base/DNavbar.vue";
import { BNavbarBrand, BNavbarToggle, BCollapse, BNavbarNav, BNavItem } from "bootstrap-vue-next";
</script>
