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

    <!-- GitHub link in navbar (replaces user menu) -->
    <template #navbar-user-menu>
      <a
        href="https://github.com/omnitend/dashboard-for-laravel"
        target="_blank"
        rel="noopener noreferrer"
        class="github-link"
        aria-label="GitHub repository"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
        </svg>
      </a>
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

.github-link {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--bs-dark);
  padding: 0.5rem;
  border-radius: 0.375rem;
  transition: color 0.15s ease-in-out, background-color 0.15s ease-in-out;
}

.github-link:hover {
  color: var(--bs-primary);
  background-color: var(--bs-light);
}
</style>
