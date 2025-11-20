<script setup lang="ts">
import { DXDashboard, DToaster, DBadge } from '@omnitend/dashboard-for-laravel';
import type { Navigation } from '@omnitend/dashboard-for-laravel';
import '@omnitend/dashboard-for-laravel/style.css';
import IconPackage from '~icons/lucide/package';
import IconTags from '~icons/lucide/tags';
import IconBell from '~icons/lucide/bell';
import IconShoppingCart from '~icons/lucide/shopping-cart';
import IconUser from '~icons/lucide/user';
import IconSettings from '~icons/lucide/settings';
import { usePlaygroundMode } from '../composables/usePlaygroundMode';

interface Props {
  currentUrl: string;
  pageTitle: string;
}

defineProps<Props>();

const { mode, toggleMode } = usePlaygroundMode();

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
    <template #navbar-search>
      <div
        class="mode-toggle d-flex align-items-center gap-2 px-3 py-1 rounded"
        style="cursor: pointer; user-select: none; background-color: var(--bs-light); border: 1px solid var(--bs-border-color);"
        @click="toggleMode"
      >
        <span :style="{ fontWeight: mode === 'api' ? '600' : '400', color: mode === 'api' ? 'var(--bs-primary)' : 'var(--bs-secondary)' }">
          API
        </span>
        <span style="color: var(--bs-secondary);">|</span>
        <span :style="{ fontWeight: mode === 'inertia' ? '600' : '400', color: mode === 'inertia' ? 'var(--bs-primary)' : 'var(--bs-secondary)' }">
          Inertia
        </span>
      </div>
    </template>

    <slot />
  </DXDashboard>

  <!-- Toast notifications -->
  <DToaster />
</template>
