<template>
  <div class="user-avatar-examples">
    <div class="example-section">
      <h5>Default</h5>
      <DXUserAvatar :user="currentUser" />
      <p class="state-display">The initial is taken from user.name ({{ currentUser.name }}).</p>
    </div>

    <div class="example-section">
      <h5>Explicit initial and custom content</h5>
      <div class="d-flex align-items-center gap-3">
        <DXUserAvatar :user="currentUser" initial="SJ" />
        <DXUserAvatar>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm0 1.5c-2.7 0-5 1.4-5 3.1V14h10v-1.4c0-1.7-2.3-3.1-5-3.1Z" />
          </svg>
        </DXUserAvatar>
      </div>
      <p class="state-display">
        initial overrides the derived letter; the default slot replaces it entirely.
      </p>
    </div>

    <div class="example-section">
      <h5>Notification badge</h5>
      <div class="d-flex align-items-center gap-3">
        <DXUserAvatar :user="currentUser" badge badge-label="3 unread notifications" />
        <DXUserAvatar :user="currentUser" badge badge-variant="primary" />
        <DXUserAvatar :user="currentUser" badge badge-variant="success" />
      </div>
      <p class="state-display">
        The dot is a colour-only signal, so badgeLabel carries the meaning for screen readers.
      </p>
    </div>

    <div class="example-section">
      <h5>Decorating the navbar user-icon slot</h5>
      <div class="navbar-demo">
        <DXDashboardNavbar :user="currentUser" page-title="Dashboard">
          <template #user-icon="{ user }">
            <DXUserAvatar :user="user" :badge="hasUnread" badge-label="Unread notifications" />
          </template>

          <template #user-menu-items>
            <DDropdownItem href="/notifications">Notifications</DDropdownItem>
            <DDropdownItem href="/settings">Settings</DDropdownItem>
          </template>
        </DXDashboardNavbar>
      </div>
      <DButton size="sm" variant="outline-secondary" @click="hasUnread = !hasUnread">
        Toggle unread
      </DButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import {
  DXUserAvatar,
  DXDashboardNavbar,
  DButton,
  DDropdownItem,
} from '@omnitend/dashboard-for-laravel';

const currentUser = ref({
  name: 'Sarah Johnson',
  email: 'sarah@example.com',
});

const hasUnread = ref(true);
</script>

<style scoped>
.user-avatar-examples {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.example-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  align-items: flex-start;
}

.example-section h5 {
  margin-bottom: 0.25rem;
  font-weight: 600;
  color: var(--bs-dark);
}

.state-display {
  margin: 0;
  padding: 0.5rem 1rem;
  background-color: var(--bs-light);
  border-radius: 0.25rem;
  font-size: 0.875rem;
  color: var(--bs-dark);
}

.navbar-demo {
  width: 100%;
  border: 1px solid var(--bs-border-color);
  border-radius: 0.375rem;
  overflow: hidden;
}
</style>
