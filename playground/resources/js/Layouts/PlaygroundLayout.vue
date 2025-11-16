<script setup lang="ts">
import { DXDashboard, DToaster } from '@omnitend/dashboard-for-laravel';
import type { Navigation } from '@omnitend/dashboard-for-laravel';
import '@omnitend/dashboard-for-laravel/style.css';

interface Props {
  currentUrl: string;
  pageTitle: string;
}

defineProps<Props>();

const navigation: Navigation = [
  {
    items: [
      { label: 'Products', url: '/', active: false },
      { label: 'Categories', url: '/categories', active: false },
      { label: 'Toasts', url: '/toasts', active: false },
      { label: 'Orders', url: '/orders', active: false },
    ],
  },
  {
    label: 'Settings',
    items: [
      { label: 'Account', url: '/settings/account', active: false },
      { label: 'Preferences', url: '/settings/preferences', active: false },
    ],
  },
];

const user = {
  name: 'Test User',
  email: 'test@example.com',
};
</script>

<template>
  <DXDashboard
    :navigation="navigation"
    :current-url="currentUrl"
    title="Playground"
    :page-title="pageTitle"
    :user="user"
    dashboard-id="playground"
  >
    <slot />
  </DXDashboard>

  <!-- Toast notifications -->
  <DToaster />
</template>
