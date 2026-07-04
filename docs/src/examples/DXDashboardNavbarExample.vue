<template>
  <div class="navbar-example">
    <h5>Dashboard Navbar Example</h5>
    <p class="text-muted mb-3">A responsive top navigation bar with user menu and search</p>
    <div class="navbar-demo">
      <DXDashboardNavbar
        :user="currentUser"
        :page-title="pageTitle"
        @toggle-sidebar="handleToggle"
      >
        <template #search>
          <div class="search-input">
            <input
              type="text"
              class="form-control form-control-sm"
              placeholder="Search..."
              style="max-width: 300px;"
            />
          </div>
        </template>

        <!-- Page-level primary action, right-aligned near the user menu -->
        <template #actions="{ pageTitle }">
          <DButton variant="primary" size="sm" @click="handleCreate">
            New item
          </DButton>
        </template>

        <template #user-menu-items="{ user }">
          <DDropdownItem href="/profile">
            <span>Profile</span>
          </DDropdownItem>
          <DDropdownItem href="/settings">
            <span>Settings</span>
          </DDropdownItem>
          <DDropdownDivider />
          <DDropdownItem @click="handleLogout">
            <span>Log out</span>
          </DDropdownItem>
        </template>
      </DXDashboardNavbar>

      <div class="demo-content">
        <div class="alert alert-info">
          <strong>Last action:</strong> {{ lastAction || 'None' }}
        </div>
        <p><strong>Current User:</strong> {{ currentUser.name }}</p>
        <p><strong>Page Title:</strong> {{ pageTitle }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { DXDashboardNavbar, DButton, DDropdownItem, DDropdownDivider } from '@omnitend/dashboard-for-laravel';

import { ref } from 'vue';

const currentUser = ref({
  name: 'Sarah Johnson',
  email: 'sarah@example.com',
});

const pageTitle = ref('Dashboard Overview');
const lastAction = ref('');

const handleToggle = () => {
  lastAction.value = 'Sidebar toggle clicked';
};

const handleLogout = () => {
  lastAction.value = 'Logout clicked';
};

const handleCreate = () => {
  lastAction.value = 'New item clicked';
};
</script>

<style scoped>
.navbar-example h5 {
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: var(--bs-dark);
}

.navbar-demo {
  border: 1px solid var(--bs-border-color);
  border-radius: 0.375rem;
  overflow: hidden;
}

.demo-content {
  padding: 2rem;
  background-color: var(--bs-light);
  min-height: 200px;
}

.search-input {
  display: flex;
  align-items: center;
}
</style>
