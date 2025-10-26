<template>
  <div class="nav-examples">
    <div class="example-section">
      <h5>Basic Navigation</h5>
      <DNav>
        <DNavItem active>Home</DNavItem>
        <DNavItem>About</DNavItem>
        <DNavItem>Services</DNavItem>
        <DNavItem>Contact</DNavItem>
      </DNav>
    </div>

    <div class="example-section">
      <h5>Navigation with Links</h5>
      <DNav>
        <DNavItem href="#home" active>Home</DNavItem>
        <DNavItem href="#about">About</DNavItem>
        <DNavItem href="#services">Services</DNavItem>
        <DNavItem href="#contact">Contact</DNavItem>
      </DNav>
    </div>

    <div class="example-section">
      <h5>Tabs Style</h5>
      <DNav tabs>
        <DNavItem active>Dashboard</DNavItem>
        <DNavItem>Analytics</DNavItem>
        <DNavItem>Reports</DNavItem>
        <DNavItem disabled>Settings</DNavItem>
      </DNav>
    </div>

    <div class="example-section">
      <h5>Pills Style</h5>
      <DNav pills>
        <DNavItem active>Overview</DNavItem>
        <DNavItem>Customers</DNavItem>
        <DNavItem>Orders</DNavItem>
        <DNavItem>Products</DNavItem>
      </DNav>
    </div>

    <div class="example-section">
      <h5>Vertical Navigation</h5>
      <DNav vertical>
        <DNavItem active>Profile</DNavItem>
        <DNavItem>Security</DNavItem>
        <DNavItem>Notifications</DNavItem>
        <DNavItem>Billing</DNavItem>
      </DNav>
    </div>

    <div class="example-section">
      <h5>Justified Navigation</h5>
      <DNav pills fill>
        <DNavItem active>Home</DNavItem>
        <DNavItem>Features</DNavItem>
        <DNavItem>Pricing</DNavItem>
        <DNavItem>About</DNavItem>
      </DNav>
    </div>

    <div class="example-section">
      <h5>Navigation with Alignment</h5>
      <div class="nav-alignment-group">
        <div>
          <p class="mb-2"><strong>Start (default)</strong></p>
          <DNav pills>
            <DNavItem active>Left</DNavItem>
            <DNavItem>Aligned</DNavItem>
            <DNavItem>Nav</DNavItem>
          </DNav>
        </div>
        <div>
          <p class="mb-2"><strong>Centre</strong></p>
          <DNav pills align="center">
            <DNavItem active>Centre</DNavItem>
            <DNavItem>Aligned</DNavItem>
            <DNavItem>Nav</DNavItem>
          </DNav>
        </div>
        <div>
          <p class="mb-2"><strong>End</strong></p>
          <DNav pills align="end">
            <DNavItem active>Right</DNavItem>
            <DNavItem>Aligned</DNavItem>
            <DNavItem>Nav</DNavItem>
          </DNav>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import DNav from '../../../resources/js/components/base/DNav.vue';
import DNavItem from '../../../resources/js/components/base/DNavItem.vue';
</script>

<style scoped>
.nav-examples {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.example-section h5 {
  margin-bottom: 1rem;
  font-weight: 600;
  color: var(--bs-dark);
}

.nav-alignment-group {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.nav-alignment-group p {
  font-size: 0.875rem;
  color: var(--bs-secondary);
}
</style>
