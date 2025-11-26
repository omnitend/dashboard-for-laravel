<template>
  <DXDashboard
    :navigation="navigation"
    :current-url="currentUrl"
    :title="title"
    :page-title="pageTitle"
    storage-key="dashboard-sidebar-hidden"
  >
    <!-- Custom brand slot for sidebar -->
    <template #sidebar-brand="{ collapsed }">
      <a :href="normalizedBaseUrl" class="d-flex align-items-center text-decoration-none" :class="{ 'justify-content-center': collapsed }">
        <img
          :src="`${normalizedBaseUrl}logo.svg`"
          alt="Dashboard for Laravel"
          class="brand-icon"
        />
        <div v-if="!collapsed" class="brand-text ms-3">
          Dashboard for Laravel
        </div>
      </a>
    </template>

    <!-- Custom menu icon for navbar -->
    <template #navbar-menu-icon>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        fill="currentColor"
        viewBox="0 0 16 16"
      >
        <path fill-rule="evenodd" d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5m0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5m0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5"/>
      </svg>
    </template>

    <!-- Search in navbar -->
    <template #navbar-search>
      <div v-if="isProduction">
        <Search :base-url="baseUrl" />
      </div>
      <div v-else class="search-placeholder">
        <small class="text-muted">Search available after build</small>
      </div>
    </template>

    <!-- Main content -->
    <slot />
  </DXDashboard>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { DXDashboard } from '@omnitend/dashboard-for-laravel';
import type { Navigation } from '@omnitend/dashboard-for-laravel';
import Search from './Search.vue';

interface Props {
  navigation: Navigation;
  currentUrl: string;
  title: string;
  pageTitle?: string;
  baseUrl?: string;
}

const props = withDefaults(defineProps<Props>(), {
  pageTitle: 'Dashboard',
  baseUrl: '/',
});

// Ensure baseUrl ends with a slash for asset paths
const normalizedBaseUrl = computed(() => props.baseUrl.replace(/\/?$/, '/'));

const isProduction = import.meta.env.PROD;
</script>

<style scoped>
.search-placeholder {
  padding: 0.5rem 1rem;
  color: var(--bs-secondary);
  font-style: italic;
}

.search-placeholder small {
  opacity: 0.7;
}

.brand-icon {
  width: 40px;
  height: 40px;
  border-radius: 0.5rem;
}

.brand-text {
  font-size: 0.9375rem; /* 15px */
  font-weight: 600;
  color: var(--bs-white);
  line-height: 1.2;
  margin-bottom: 0;
  white-space: nowrap;
}
</style>
