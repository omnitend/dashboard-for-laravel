<template>
  <div class="nav-item-examples">
    <div class="example-section">
      <h5>Basic Nav Items</h5>
      <DNav>
        <DNavItem @click="handleClick('Home')" active>Home</DNavItem>
        <DNavItem @click="handleClick('About')">About</DNavItem>
        <DNavItem @click="handleClick('Services')">Services</DNavItem>
        <DNavItem @click="handleClick('Contact')">Contact</DNavItem>
      </DNav>
      <p v-if="lastClicked" class="state-display">Last clicked: {{ lastClicked }}</p>
    </div>

    <div class="example-section">
      <h5>Nav Items with Links</h5>
      <DNav tabs>
        <DNavItem href="#dashboard" active>Dashboard</DNavItem>
        <DNavItem href="#analytics">Analytics</DNavItem>
        <DNavItem href="#reports">Reports</DNavItem>
        <DNavItem href="#settings">Settings</DNavItem>
      </DNav>
    </div>

    <div class="example-section">
      <h5>Disabled Nav Items</h5>
      <DNav pills>
        <DNavItem active>Enabled Item</DNavItem>
        <DNavItem>Another Enabled</DNavItem>
        <DNavItem disabled>Disabled Item</DNavItem>
        <DNavItem>Yet Another Enabled</DNavItem>
      </DNav>
    </div>

    <div class="example-section">
      <h5>Nav Items with Active State Management</h5>
      <DNav pills>
        <DNavItem
          v-for="tab in tabs"
          :key="tab.id"
          :active="activeTab === tab.id"
          @click="activeTab = tab.id"
        >
          {{ tab.label }}
        </DNavItem>
      </DNav>
      <div class="tab-content">
        <p>Active tab: {{ tabs.find(t => t.id === activeTab)?.label }}</p>
      </div>
    </div>

    <div class="example-section">
      <h5>Nav Items in Vertical Navigation</h5>
      <DNav vertical pills>
        <DNavItem active>Profile Settings</DNavItem>
        <DNavItem>Security & Privacy</DNavItem>
        <DNavItem>Notifications</DNavItem>
        <DNavItem>Billing & Plans</DNavItem>
        <DNavItem>Integrations</DNavItem>
      </DNav>
    </div>
  </div>
</template>

<script setup lang="ts">
import { DNav, DNavItem } from '@omnitend/dashboard-for-laravel';

import { ref } from 'vue';

const lastClicked = ref<string | null>(null);
const activeTab = ref('overview');

const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'customers', label: 'Customers' },
  { id: 'orders', label: 'Orders' },
  { id: 'products', label: 'Products' },
];

const handleClick = (item: string) => {
  lastClicked.value = item;
};
</script>

<style scoped>
.nav-item-examples {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.example-section h5 {
  margin-bottom: 1rem;
  font-weight: 600;
  color: var(--bs-dark);
}

.state-display {
  margin-top: 1rem;
  padding: 0.5rem 1rem;
  background-color: var(--bs-light);
  border-radius: 0.25rem;
  font-size: 0.875rem;
  color: var(--bs-dark);
}

.tab-content {
  margin-top: 1rem;
  padding: 1rem;
  background-color: var(--bs-light);
  border-radius: 0.25rem;
}

.tab-content p {
  margin: 0;
  font-weight: 500;
}
</style>
