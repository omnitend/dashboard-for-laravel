<template>
  <div class="examples">
    <div class="example-section">
      <h5>Tab Panels</h5>
      <DTabs content-class="mt-3">
        <DTab title="Profile" active>
          <h4>User Profile</h4>
          <p>View and edit your profile information here.</p>
        </DTab>
        <DTab title="Settings">
          <h4>Settings</h4>
          <p>Configure your application preferences.</p>
        </DTab>
        <DTab title="Notifications">
          <h4>Notifications</h4>
          <p>Manage your notification preferences.</p>
        </DTab>
        <DTab title="Disabled" disabled>
          <p>This tab is disabled.</p>
        </DTab>
      </DTabs>
    </div>
  </div>
</template>

<script setup lang="ts">
import { DTabs, DTab } from '@omnitend/dashboard-for-laravel';
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
