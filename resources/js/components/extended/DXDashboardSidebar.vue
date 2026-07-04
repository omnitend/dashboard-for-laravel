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
        <div
          v-if="group.visible !== false"
          class="nav-group mb-3"
          :class="{ 'nav-group-open': isGroupExpanded(groupIndex, group) }"
        >
          <!-- Collapsible group header (accordion toggle) -->
          <button
            v-if="isGroupToggle(group)"
            type="button"
            class="nav-group-toggle text-uppercase small fw-semibold mb-2 px-2"
            :aria-expanded="isGroupExpanded(groupIndex, group)"
            :aria-controls="groupItemsId(groupIndex)"
            @click="toggleGroup(groupIndex)"
          >
            <span class="nav-group-toggle-label">{{ group.label }}</span>
            <svg
              class="nav-group-chevron"
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              aria-hidden="true"
            >
              <!-- Wide, square-capped chevron matching Omni Tend's menu headers.
                   Points down when closed; rotated 180° when the group is open. -->
              <path
                d="M11.375 4.8125L7 9.1875L2.625 4.8125"
                stroke="currentColor"
                stroke-width="1.75"
                stroke-linecap="square"
                stroke-linejoin="round"
              />
            </svg>
          </button>

          <!-- Static group label (non-collapsible, expanded sidebar) -->
          <div
            v-else-if="group.label && !collapsed"
            class="nav-group-label text-uppercase small fw-semibold mb-2 px-2"
          >
            {{ group.label }}
          </div>

          <!-- Divider shown in place of the label when the sidebar rail is collapsed -->
          <div v-if="group.label && collapsed" class="nav-group-divider">
            <hr class="my-2 border-secondary" />
          </div>

          <div
            :id="groupItemsId(groupIndex)"
            class="nav-group-items"
            :class="{ 'nav-group-items--collapsible': isGroupToggle(group) }"
            :inert="isGroupExpanded(groupIndex, group) ? undefined : true"
          >
            <ul class="nav flex-column gap-1">
              <li v-for="(item, itemIndex) in group.items" :key="itemIndex" class="nav-item">
                <slot
                  name="link"
                  :item="item"
                  :is-active="isActive(item.url)"
                  :collapsed="collapsed"
                  :is-expanded="isGroupExpanded(groupIndex, group)"
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
        </div>
      </template>
    </nav>
  </aside>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, watch, nextTick, useId } from 'vue';
import type { Navigation, NavigationGroup } from '../../types/navigation';

const props = withDefaults(defineProps<{
  navigation: Navigation;
  currentUrl: string;
  collapsed?: boolean;
  hidden?: boolean;
  title?: string;
  /**
   * Turn group headers into accordion toggles that collapse/expand their items.
   * When off (default), every group is rendered permanently expanded.
   */
  collapsibleGroups?: boolean;
  /**
   * Only relevant when `collapsibleGroups` is on.
   * `true` (default): only the active-route group starts open, and opening one
   * group closes the others (single-open accordion).
   * `false`: all groups start open and toggle independently.
   */
  autoCollapseInactiveGroups?: boolean;
}>(), {
  collapsed: false,
  hidden: false,
  title: 'Dashboard',
  collapsibleGroups: false,
  autoCollapseInactiveGroups: true,
});

defineEmits<{
  toggle: [];
}>();

const sidebarRef = ref<HTMLElement | null>(null);

const uid = useId();
const groupItemsId = (index: number): string => `${uid}-nav-group-${index}`;

const brandInitial = computed(() => {
  return props.title.charAt(0).toUpperCase();
});

// Normalize URLs for comparison: drop any query string / hash, lowercase, and
// remove a single trailing slash. Dropping ?query and #hash means an index page
// carrying filter/pagination params (e.g. `/rotas?page=2`) still matches its
// `/rotas` nav item.
const normalizeUrl = (url: string): string =>
  url.toLowerCase().replace(/[?#].*$/, '').replace(/\/$/, '');

/**
 * The single best-matching nav item URL for the current route. Prefers an exact
 * match; otherwise the longest ancestor path, so a detail page like
 * `/rotas/507` activates the `/rotas` item. Root `/` only matches exactly — it
 * is a prefix of every path, so it is never treated as an ancestor.
 * Returns the normalized URL of the winning item, or null if nothing matches.
 */
const activeUrl = computed<string | null>(() => {
  const current = normalizeUrl(props.currentUrl);
  let best: string | null = null;
  for (const group of props.navigation) {
    if (group.visible === false) continue;
    for (const item of group.items) {
      if (item.visible === false) continue;
      const candidate = normalizeUrl(item.url);
      const matches =
        candidate === current ||
        (candidate !== '' && current.startsWith(candidate + '/'));
      if (matches && (best === null || candidate.length > best.length)) {
        best = candidate;
      }
    }
  }
  return best;
});

const isActive = (url: string): boolean =>
  activeUrl.value !== null && normalizeUrl(url) === activeUrl.value;

// Index of the group containing the active route (-1 if none).
const activeGroupIndex = computed(() =>
  props.navigation.findIndex(
    (group) => group.visible !== false && group.items.some((item) => isActive(item.url))
  )
);

// A group renders a clickable toggle header only when collapsible groups are
// enabled, the sidebar rail is expanded, the group has a label, and the group
// hasn't individually opted out via `collapsible: false`.
const isGroupToggle = (group: NavigationGroup): boolean =>
  props.collapsibleGroups &&
  !props.collapsed &&
  !!group.label &&
  group.collapsible !== false;

// Whether a group's items are currently shown. Rail-collapsed sidebars always
// show items (as icons); non-collapsible groups are always expanded.
const isGroupExpanded = (index: number, group: NavigationGroup): boolean => {
  if (props.collapsed) return true;
  if (!isGroupToggle(group)) return true;
  return openGroups.value.has(index);
};

const openGroups = ref<Set<number>>(new Set());

const computeInitialOpenGroups = (): Set<number> => {
  const next = new Set<number>();
  if (props.autoCollapseInactiveGroups) {
    if (activeGroupIndex.value >= 0) next.add(activeGroupIndex.value);
  } else {
    props.navigation.forEach((group, index) => {
      if (group.visible !== false && group.collapsible !== false) next.add(index);
    });
  }
  return next;
};

// Initialise synchronously so the active group is already open on first paint —
// no post-mount height measurement, so no open/close flicker on load.
openGroups.value = computeInitialOpenGroups();

const toggleGroup = (index: number): void => {
  const wasOpen = openGroups.value.has(index);
  if (props.autoCollapseInactiveGroups) {
    openGroups.value = wasOpen ? new Set() : new Set([index]);
    return;
  }
  const next = new Set(openGroups.value);
  if (wasOpen) next.delete(index);
  else next.add(index);
  openGroups.value = next;
};

// Ensure the active-route group is open. In single-open mode this switches to
// it (closing others); otherwise it just adds it to the open set. No-op when
// there is no active group (e.g. a detail page not present in the nav).
const openActiveGroup = (): void => {
  if (!props.collapsibleGroups || activeGroupIndex.value < 0) return;
  if (props.autoCollapseInactiveGroups) {
    openGroups.value = new Set([activeGroupIndex.value]);
  } else {
    const next = new Set(openGroups.value);
    next.add(activeGroupIndex.value);
    openGroups.value = next;
  }
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

// Client-side route change: open the newly active group, then scroll to it.
watch(() => props.currentUrl, () => {
  openActiveGroup();
  scrollToActiveItem(true);
});

// The active group can change without a currentUrl change — e.g. navigation
// arrives/repopulates after mount (async data, permission gating), so the active
// route resolves late. Watch the derived index (not the array identity, which
// can churn on every parent re-render) and open the active group when it lands.
watch(activeGroupIndex, () => {
  openActiveGroup();
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

/* Collapsible group toggle header */
.nav-group-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  /* Comfortable, ergonomic click target (matches the nav links' vertical
     rhythm). `px-2` on the element sets only left/right padding, so vertical
     padding here does not fight Bootstrap's utility `!important`. */
  min-height: 2.5rem;
  padding-top: 0.5rem;
  padding-bottom: 0.5rem;
  font-size: 0.75rem;
  letter-spacing: 0.5px;
  background: transparent;
  border: 0;
  /* No `color` here on purpose: theme.scss sets `.nav-group-toggle` to
     $navbar-dark-color so the toggle matches the static .nav-group-label.
     A scoped `color` would override that (equal specificity, later source order). */
  cursor: pointer;
  text-align: left;
  border-radius: var(--bs-border-radius, 0.375rem);
  transition: background-color 0.2s ease;
}

.nav-group-toggle:hover {
  background-color: rgba(255, 255, 255, 0.08);
}

.nav-group-toggle:focus-visible {
  outline: 2px solid rgba(255, 255, 255, 0.5);
  outline-offset: 2px;
}

.nav-group-toggle-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.nav-group-chevron {
  flex-shrink: 0;
  margin-left: 0.5rem;
}

.nav-group-open > .nav-group-toggle .nav-group-chevron {
  transform: rotate(180deg);
}

/*
 * Grid-based collapse: animate rows 0fr -> 1fr so the container height follows
 * its content with no JS measurement. The active group renders with
 * `.nav-group-open` already applied, so its open state paints without a
 * transition (no load flicker). Opacity fades the items in/out alongside the
 * height change for a smoother reveal.
 *
 * This mechanism is applied ONLY to groups that actually collapse
 * (`--collapsible`). A group that never collapses (feature off, rail-collapsed,
 * or `collapsible: false`) keeps a plain wrapper, so its `overflow: hidden`
 * never clips focus outlines / badge shadows for consumers who didn't opt in.
 */
.nav-group-items--collapsible {
  display: grid;
  grid-template-rows: 0fr;
  opacity: 0;
  transition: grid-template-rows 0.2s ease, opacity 0.2s ease;
}

.nav-group-open > .nav-group-items--collapsible {
  grid-template-rows: 1fr;
  opacity: 1;
}

.nav-group-items--collapsible > .nav {
  overflow: hidden;
  min-height: 0;
  /*
   * Bootstrap's `.nav` sets `flex-wrap: wrap`. While the grid row is collapsing
   * (height near 0), a wrapping flex-column can't stack its items in the tiny
   * height and wraps them into side-by-side columns instead — a visible reflow
   * flash. `nowrap` keeps them stacked and simply clipped by `overflow: hidden`.
   */
  flex-wrap: nowrap;
}

/* Respect reduced-motion: collapse instantly, no fade. */
@media (prefers-reduced-motion: reduce) {
  .nav-group-items--collapsible,
  .nav-group-toggle {
    transition: none;
  }
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
