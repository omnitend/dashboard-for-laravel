<template>
  <aside
    ref="sidebarRef"
    class="dashboard-sidebar text-white"
    :class="{
      'sidebar-collapsed': collapsed,
      'sidebar-hidden': hidden
    }"
  >
    <div class="sidebar-header p-3">
      <div class="d-flex align-items-center justify-content-between">
        <slot name="brand" :collapsed="collapsed" :title="title">
          <div class="brand-container" :class="{ 'collapsed': collapsed }">
            <div class="brand-initial">{{ brandInitial }}</div>
            <h5 v-if="!collapsed" class="mb-0 fw-bold ms-2">
              {{ title }}
            </h5>
          </div>
        </slot>
      </div>
    </div>

    <nav class="sidebar-nav p-3">
      <template v-for="(group, groupIndex) in navigation" :key="groupIndex">
        <div v-if="group.visible !== false" class="nav-group mb-3">
          <div
            v-if="group.label && !collapsed"
            class="nav-group-label text-uppercase small fw-semibold mb-2 px-2"
          >
            {{ group.label }}
          </div>

          <div v-if="group.label && collapsed" class="nav-group-divider">
            <hr class="my-2 border-secondary" />
          </div>

          <ul class="nav flex-column gap-1">
            <li v-for="(item, itemIndex) in group.items" :key="itemIndex" class="nav-item">
              <slot
                name="link"
                :item="item"
                :is-active="isActive(item.url)"
                :collapsed="collapsed"
              >
                <a
                  :href="item.url"
                  class="nav-link d-flex align-items-center gap-2 rounded"
                  :class="{
                    'active': isActive(item.url),
                    'justify-content-center': collapsed
                  }"
                >
                  <component
                    v-if="item.icon"
                    :is="item.icon"
                    class="nav-icon"
                    style="width: 20px; height: 20px;"
                  />
                  <span v-if="!collapsed" class="nav-label">{{ item.label }}</span>
                  <span
                    v-if="item.badge && !collapsed"
                    class="badge ms-auto"
                    :class="`bg-${item.badgeColor || 'primary'}`"
                  >
                    {{ item.badge }}
                  </span>
                </a>
              </slot>
            </li>
          </ul>
        </div>
      </template>
    </nav>
  </aside>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, watch, nextTick } from 'vue';
import type { Navigation } from '../../types/navigation';

const props = withDefaults(defineProps<{
  navigation: Navigation;
  currentUrl: string;
  collapsed?: boolean;
  hidden?: boolean;
  title?: string;
}>(), {
  collapsed: false,
  hidden: false,
  title: 'Dashboard',
});

defineEmits<{
  toggle: [];
}>();

const sidebarRef = ref<HTMLElement | null>(null);

const brandInitial = computed(() => {
  return props.title.charAt(0).toUpperCase();
});

const isActive = (url: string): boolean => {
  // Normalize URLs for comparison (remove trailing slash, lowercase)
  const normalizeUrl = (u: string) => u.toLowerCase().replace(/\/$/, '');
  return normalizeUrl(props.currentUrl) === normalizeUrl(url);
};

const scrollToActiveItem = async (smooth = false) => {
  await nextTick();
  if (!sidebarRef.value) return;

  const activeLink = sidebarRef.value.querySelector('.nav-link.active') as HTMLElement;
  if (activeLink) {
    const sidebar = sidebarRef.value;
    const linkRect = activeLink.getBoundingClientRect();
    const sidebarRect = sidebar.getBoundingClientRect();

    // Calculate the position to scroll to (center the active item)
    const scrollTop = activeLink.offsetTop - (sidebarRect.height / 2) + (linkRect.height / 2);

    sidebar.scrollTo({
      top: scrollTop,
      behavior: smooth ? 'smooth' : 'instant',
    });
  }
};

// Scroll to active item on initial mount (instant, no animation)
onMounted(() => {
  scrollToActiveItem(false);
});

// Watch for URL changes (client-side routing) and scroll smoothly
watch(() => props.currentUrl, () => {
  scrollToActiveItem(true);
});
</script>

<style scoped>
.dashboard-sidebar {
  min-height: 100vh;
  transition: width 0.3s ease;
  position: sticky;
  top: 0;
  height: 100vh;
  overflow-y: auto;
  overflow-x: hidden;
  flex-shrink: 0;
}

.sidebar-header {
  display: flex;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.brand-container {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  transition: all 0.3s ease;
}

.brand-container.collapsed {
  justify-content: center;
}

.brand-initial {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 1.25rem;
}

.sidebar-nav {
  overflow-x: hidden;
}

.nav-group-label {
  font-size: 0.75rem;
  letter-spacing: 0.5px;
}

:deep(.nav-link) {
  padding: 0.625rem 0.75rem;
  transition: all 0.2s ease;
  text-decoration: none;
  white-space: nowrap;
}

:deep(.nav-link.active) {
  font-weight: 500;
}

:deep(.nav-icon) {
  flex-shrink: 0;
}

:deep(.nav-label) {
  flex: 1;
}

.sidebar-collapsed :deep(.nav-link) {
  padding: 0.625rem;
}

/* Custom scrollbar */
.dashboard-sidebar::-webkit-scrollbar {
  width: 6px;
}

.dashboard-sidebar::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.1);
}

.dashboard-sidebar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}

.dashboard-sidebar::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}

.sidebar-hidden {
  display: none;
}
</style>
