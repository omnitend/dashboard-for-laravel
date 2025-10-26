<template>
  <div class="sidebar-example">
    <h5>Dashboard Sidebar Example</h5>
    <p class="text-muted mb-3">A collapsible sidebar with navigation groups, icons, and badges</p>
    <div class="sidebar-demo">
      <DXDashboardSidebar
        :navigation="navigation"
        :current-url="currentUrl"
        :collapsed="collapsed"
        title="My Dashboard"
        @toggle="collapsed = !collapsed"
      >
        <template #brand="{ collapsed, title }">
          <div v-if="!collapsed" class="brand-full">
            <strong>{{ title }}</strong>
          </div>
          <div v-else class="brand-collapsed">
            <strong>{{ title.charAt(0) }}</strong>
          </div>
        </template>

        <template #link="{ item, isActive, collapsed }">
          <a
            :href="item.url"
            class="nav-link d-flex align-items-center gap-2 rounded"
            :class="{
              'active bg-primary text-white': isActive,
              'text-white-50': !isActive,
              'justify-content-center': collapsed
            }"
            @click.prevent="handleNavClick(item)"
          >
            <span v-if="item.icon" class="nav-icon">{{ item.icon }}</span>
            <span v-if="!collapsed" class="nav-label">{{ item.label }}</span>
            <span
              v-if="item.badge && !collapsed"
              class="badge ms-auto"
              :class="`bg-${item.badgeColor || 'primary'}`"
            >
              {{ item.badge }}
            </span>
          </a>
        </template>
      </DXDashboardSidebar>

      <div class="demo-content">
        <div class="d-flex justify-content-between align-items-center mb-4">
          <h4 class="mb-0">{{ currentPageTitle }}</h4>
          <button class="btn btn-primary btn-sm" @click="collapsed = !collapsed">
            {{ collapsed ? 'Expand' : 'Collapse' }} Sidebar
          </button>
        </div>

        <div class="alert alert-info">
          <strong>Current URL:</strong> {{ currentUrl }}
        </div>

        <div class="row g-3">
          <div class="col-md-6">
            <div class="card">
              <div class="card-body">
                <h6 class="text-muted mb-2">Total Users</h6>
                <p class="h3 mb-0">2,543</p>
              </div>
            </div>
          </div>
          <div class="col-md-6">
            <div class="card">
              <div class="card-body">
                <h6 class="text-muted mb-2">Revenue</h6>
                <p class="h3 mb-0">£89,234</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import DXDashboardSidebar from '../../../resources/js/components/extended/DXDashboardSidebar.vue';
import type { Navigation } from '../../../resources/js/types/navigation';

const collapsed = ref(false);
const currentUrl = ref('/dashboard');

const navigation: Navigation = [
  {
    items: [
      { label: 'Dashboard', url: '/dashboard', icon: '📊' },
      { label: 'Analytics', url: '/analytics', icon: '📈' },
    ],
  },
  {
    label: 'Management',
    items: [
      { label: 'Users', url: '/users', icon: '👥', badge: '12', badgeColor: 'danger' },
      { label: 'Products', url: '/products', icon: '📦' },
      { label: 'Orders', url: '/orders', icon: '🛒', badge: '5', badgeColor: 'warning' },
    ],
  },
  {
    label: 'Settings',
    items: [
      { label: 'Profile', url: '/profile', icon: '👤' },
      { label: 'Preferences', url: '/preferences', icon: '⚙️' },
    ],
  },
];

const currentPageTitle = computed(() => {
  for (const group of navigation) {
    const item = group.items.find(item => item.url === currentUrl.value);
    if (item) return item.label;
  }
  return 'Dashboard';
});

const handleNavClick = (item: any) => {
  currentUrl.value = item.url;
};
</script>

<style scoped>
.sidebar-example h5 {
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: var(--bs-dark);
}

.sidebar-demo {
  display: flex;
  height: 500px;
  border: 1px solid var(--bs-border-color);
  border-radius: 0.375rem;
  overflow: hidden;
}

.demo-content {
  flex: 1;
  padding: 2rem;
  background-color: var(--bs-light);
  overflow-y: auto;
}

.brand-full,
.brand-collapsed {
  padding: 0.5rem;
  text-align: center;
}

.nav-icon {
  font-size: 1.25rem;
  line-height: 1;
}
</style>
