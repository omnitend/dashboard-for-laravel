<!--
  @component
  DXDashboard is the full dashboard shell — a collapsible sidebar
  (`DXDashboardSidebar`) alongside a top navbar (`DXDashboardNavbar`) and the
  page content area. It owns sidebar visibility state (persisted to
  localStorage, SSR-safe) and forwards any `sidebar-*` slot to the sidebar and
  any `navbar-*` slot to the navbar, stripping the prefix.
-->
<template>
  <div class="dashboard-layout d-flex" :data-dashboard-id="dashboardId">
    <!-- Sidebar -->
    <DXDashboardSidebar
      :navigation="navigation"
      :current-url="currentUrl"
      :title="title"
      :collapsed="collapsed"
      :hidden="hidden"
      :collapsible-groups="collapsibleGroups"
      :auto-collapse-inactive-groups="autoCollapseInactiveGroups"
      @toggle="toggleSidebar"
    >
      <!-- Dynamically forward all sidebar-* slots by stripping the prefix -->
      <template
        v-for="(originalName, strippedName) in sidebarSlots"
        :key="strippedName"
        #[strippedName]="slotProps"
      >
        <!--
          @slot Forwards any `sidebar-*` slot to DXDashboardSidebar with the `sidebar-` prefix stripped (e.g. `sidebar-brand` becomes the sidebar's `brand` slot).
          @binding {function} toggleSidebar Shows/hides the sidebar — so slot content (e.g. a close affordance in the brand row) can drive it.
          @binding {boolean} sidebarHidden Whether the sidebar is currently hidden.
        -->
        <slot
          :name="originalName"
          v-bind="slotProps"
          :toggleSidebar="toggleSidebar"
          :sidebarHidden="hidden"
        />
      </template>
    </DXDashboardSidebar>

    <!-- Main Content Area -->
    <div class="dashboard-content flex-grow-1">
      <!-- Top Navbar -->
      <DXDashboardNavbar
        :page-title="pageTitle"
        :user="user"
        :search-align="searchAlign"
        :actions-on-mobile="actionsOnMobile"
        :user-menu-label="userMenuLabel"
        @toggle-sidebar="toggleSidebar"
      >
        <!-- Dynamically forward all navbar-* slots by stripping the prefix -->
        <template
          v-for="(originalName, strippedName) in navbarSlots"
          :key="strippedName"
          #[strippedName]="slotProps"
        >
          <!--
            @slot Forwards any `navbar-*` slot to DXDashboardNavbar with the `navbar-` prefix stripped (e.g. `navbar-actions` becomes the navbar's `actions` slot).
            @binding {function} toggleSidebar Shows/hides the sidebar.
            @binding {boolean} sidebarHidden Whether the sidebar is currently hidden.
          -->
          <slot
            :name="originalName"
            v-bind="slotProps"
            :toggleSidebar="toggleSidebar"
            :sidebarHidden="hidden"
          />
        </template>
      </DXDashboardNavbar>

      <!-- Page Content -->
      <main class="dashboard-main p-4">
        <!-- Fluid: full-width, left-aligned content (for wide tables / admin
             pages). Default: a centred reading-width column. -->
        <DContainer v-if="fluid" fluid :class="contentClass">
          <!-- @slot Default slot for the main page content. Full-width when `fluid`, otherwise a centred reading-width column. -->
          <slot />
        </DContainer>
        <DContainer v-else fluid>
          <DRow class="justify-content-center">
            <!-- A genuine max-width cap (not the proportional col-xl-10), so the
                 reading column doesn't stretch to ~2000px on a wide display. The
                 centred row handles the horizontal centring. -->
            <DCol cols="12" :style="{ maxWidth: contentMaxWidth }" :class="contentClass">
              <slot />
            </DCol>
          </DRow>
        </DContainer>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, useSlots } from 'vue';
import DXDashboardSidebar from './DXDashboardSidebar.vue';
import DXDashboardNavbar from './DXDashboardNavbar.vue';
import DContainer from '../base/DContainer.vue';
import DRow from '../base/DRow.vue';
import DCol from '../base/DCol.vue';
import type { Navigation, NavbarActionsOnMobile, NavbarSearchAlign } from '../../types/navigation';

const slots = useSlots();

// Slot-binding precedence: the forwarded slots bind the child's own slot props
// FIRST and `toggleSidebar`/`sidebarHidden` after, so ours win a name clash.
// That's deliberate — the dashboard guarantees those two bindings on every
// forwarded slot, and a child that later grew a same-named prop must not be
// able to silently take the guarantee away. No child uses those names today.

interface Props {
  /** Navigation structure for sidebar */
  navigation: Navigation;

  /** Current URL path for active state */
  currentUrl: string;

  /** Dashboard title shown in sidebar brand */
  title?: string;

  /** Page title shown in navbar */
  pageTitle?: string;

  /**
   * Render the page content full-width and left-aligned instead of the default
   * centred, reading-width column. Use for data-heavy admin pages (wide tables).
   */
  fluid?: boolean;

  /**
   * Max width of the centred content column (any CSS length). A genuine cap, so
   * forms and text-heavy pages don't stretch to ~2000px on a wide display.
   * Ignored when `fluid`. Set a large value (or use `fluid`) for full width.
   */
  contentMaxWidth?: string;

  /** Extra class(es) applied to the content container/column. */
  contentClass?: string;

  /** User object for navbar dropdown */
  user?: { name: string; email: string } | null;

  /**
   * Horizontal alignment of the navbar search slot content (`"start"` = flush
   * left, `"center"` = centred), forwarded to DXDashboardNavbar.
   */
  searchAlign?: NavbarSearchAlign;

  /**
   * What the navbar actions slot does below `md`: `"wrap"` to its own
   * full-width row, `"hide"` to remove it (relocate actions into the page on
   * phones). Forwarded to DXDashboardNavbar.
   */
  actionsOnMobile?: NavbarActionsOnMobile;

  /** Accessible name for the navbar's user-menu trigger. Forwarded to DXDashboardNavbar. */
  userMenuLabel?: string;

  /**
   * Turn sidebar group headers into accordion toggles that collapse/expand
   * their items. When off (default), every group is permanently expanded.
   */
  collapsibleGroups?: boolean;

  /**
   * Only relevant when `collapsibleGroups` is on. `true` (default): only the
   * active-route group starts open and opening one closes the others
   * (single-open accordion). `false`: all groups start open, toggled independently.
   */
  autoCollapseInactiveGroups?: boolean;

  /** LocalStorage key for sidebar state persistence */
  storageKey?: string;

  /**
   * Unique ID for this dashboard instance (for nested dashboards)
   * Used to scope visibility state when multiple dashboards exist on same page
   * If not provided, uses global HTML class approach (for SSR compatibility)
   */
  dashboardId?: string;
}

const props = withDefaults(defineProps<Props>(), {
  title: 'Dashboard',
  pageTitle: '',
  user: null,
  collapsibleGroups: false,
  autoCollapseInactiveGroups: true,
  storageKey: 'dashboard-sidebar-hidden',
  dashboardId: '',
  contentMaxWidth: '1140px',
  searchAlign: 'start',
  actionsOnMobile: 'wrap',
  userMenuLabel: 'User menu',
});

const collapsed = ref(false);

// Compute sidebar slots (strip 'sidebar-' prefix)
const sidebarSlots = computed(() => {
  const result: Record<string, string> = {};
  Object.keys(slots).forEach(name => {
    if (name.startsWith('sidebar-')) {
      const strippedName = name.substring(8); // Remove 'sidebar-' prefix
      result[strippedName] = name;
    }
  });
  return result;
});

// Compute navbar slots (strip 'navbar-' prefix)
const navbarSlots = computed(() => {
  const result: Record<string, string> = {};
  Object.keys(slots).forEach(name => {
    if (name.startsWith('navbar-')) {
      const strippedName = name.substring(7); // Remove 'navbar-' prefix
      result[strippedName] = name;
    }
  });
  return result;
});

// Initialize sidebar visibility from localStorage
const getInitialHiddenState = (): boolean => {
  // Skip during SSR - no access to localStorage or document
  if (typeof window === 'undefined') {
    return !props.dashboardId; // Default: hidden for global, visible for scoped
  }

  try {
    const savedHidden = localStorage.getItem(props.storageKey);
    if (savedHidden !== null) {
      const isHidden = JSON.parse(savedHidden);

      // If no dashboard ID (global instance), update HTML class for SSR compatibility
      if (!props.dashboardId) {
        if (isHidden) {
          document.documentElement.classList.remove('sidebar-visible');
        } else {
          document.documentElement.classList.add('sidebar-visible');
        }
      }

      return isHidden;
    }
  } catch (error) {
    console.error('Error loading sidebar state:', error);
  }

  // Default: hidden for global instances (docs), visible for scoped instances (examples)
  if (!props.dashboardId) {
    document.documentElement.classList.remove('sidebar-visible');
    return true;
  }
  return false; // Show sidebar in scoped instances by default
};

const hidden = ref(getInitialHiddenState());

const toggleSidebar = () => {
  hidden.value = !hidden.value;

  // Skip during SSR
  if (typeof window === 'undefined') return;

  // If no dashboard ID (global instance), update HTML class
  if (!props.dashboardId) {
    if (hidden.value) {
      document.documentElement.classList.remove('sidebar-visible');
    } else {
      document.documentElement.classList.add('sidebar-visible');
    }
  }

  // Save to localStorage
  try {
    localStorage.setItem(props.storageKey, JSON.stringify(hidden.value));
  } catch (error) {
    console.error('Error saving sidebar state:', error);
  }
};

defineExpose({
  /**
   * Show/hide the sidebar (same as clicking the navbar's hamburger). The
   * dashboard owns the visibility state, so this is the supported way to drive
   * it from outside — page content, a custom brand row, a keyboard shortcut.
   * Also available as a slot binding on every forwarded `sidebar-*`/`navbar-*`
   * slot, which is usually more convenient.
   */
  toggleSidebar,

  /** Whether the sidebar is currently hidden. */
  sidebarHidden: computed(() => hidden.value),
});
</script>

<style scoped>
.dashboard-layout {
  min-height: 100vh;
  background-color: var(--bs-light);
}

.dashboard-content {
  display: flex;
  flex-direction: column;
  overflow-x: hidden;
}

.dashboard-main {
  flex: 1;
  max-width: 100%;
  /* A white content panel under the light grey top bar / layout, so forms and
     content sit on white (higher contrast than a grey-everywhere dashboard). */
  background-color: var(--bs-white);
}
</style>
