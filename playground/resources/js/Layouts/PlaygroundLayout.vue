<script setup lang="ts">
import { DXDashboard, DToaster } from '@omnitend/dashboard-for-laravel';
import type { Navigation } from '@omnitend/dashboard-for-laravel';
import '@omnitend/dashboard-for-laravel/style.css';
import IconPackage from '~icons/lucide/package';
import IconTags from '~icons/lucide/tags';
import IconBell from '~icons/lucide/bell';
import IconShoppingCart from '~icons/lucide/shopping-cart';
import IconUser from '~icons/lucide/user';
import IconSettings from '~icons/lucide/settings';

interface Props {
  currentUrl: string;
  pageTitle: string;
}

defineProps<Props>();

const navigation: Navigation = [
  {
    items: [
      { label: 'Products', url: '/', icon: IconPackage, active: false },
      { label: 'Categories', url: '/categories', icon: IconTags, active: false },
      { label: 'Toasts', url: '/toasts', icon: IconBell, active: false },
      { label: 'Orders', url: '/orders', icon: IconShoppingCart, active: false },
    ],
  },
  {
    label: 'Settings',
    items: [
      { label: 'Account', url: '/settings/account', icon: IconUser, active: false },
      { label: 'Preferences', url: '/settings/preferences', icon: IconSettings, active: false },
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
