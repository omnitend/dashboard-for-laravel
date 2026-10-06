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
      :variant="sidebarVariant"
      @toggle="toggleSidebar"
      @close="closePhoneMenu"
      @navigate="onSidebarNavigate"
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

      <!-- Page Content. Vertical padding only: the horizontal edge is the
           shared dashboard gutter, applied to the container inside (see
           `$dashboard-gutter-x` in theme.scss) so it matches the navbar's. -->
      <main class="dashboard-main py-4">
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
import { ref, computed, useSlots, watch, onMounted, onBeforeUnmount } from 'vue';
import DXDashboardSidebar from './DXDashboardSidebar.vue';
import DXDashboardNavbar from './DXDashboardNavbar.vue';
import DContainer from '../base/DContainer.vue';
import DRow from '../base/DRow.vue';
import DCol from '../base/DCol.vue';
import type { Navigation, NavbarActionsOnMobile, NavbarSearchAlign, SidebarVariant } from '../../types/navigation';

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

  /**
   * Sidebar colour scheme, forwarded to DXDashboardSidebar as `variant`:
   * `'light'` (default: white pane, tinted group headers, green active item,
   * Poppins) or `'dark'` (the navy rail). Colours come from the
   * `--dx-sidebar-*` custom properties, so either can be rebranded in CSS.
   */
  sidebarVariant?: SidebarVariant;

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
  sidebarVariant: 'light',
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

/**
 * Phone width: below Bootstrap's `sm` breakpoint (576px), the same breakpoint
 * at which DModal goes full screen. There the open sidebar covers the whole
 * viewport (theme.scss), so it behaves as a menu rather than a rail: it always
 * starts closed, closes when a link is followed or on Escape, and its state is
 * never written to (or read from) `storageKey`, which keeps the desktop
 * preference. Consumer apps navigate with full page loads, so restoring an
 * "open" preference on a phone reopened the menu over every new page.
 */
const PHONE_MEDIA_QUERY = '(max-width: 575.98px)';

const phoneMediaQuery: MediaQueryList | null =
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(PHONE_MEDIA_QUERY)
    : null;

const isPhone = ref(phoneMediaQuery?.matches ?? false);

// Default with nothing stored: hidden for global instances (docs), visible for
// scoped instances (examples).
const defaultHidden = (): boolean => !props.dashboardId;

// The remembered desktop preference, or the default when none is stored.
const readDesktopHidden = (): boolean => {
  try {
    const savedHidden = localStorage.getItem(props.storageKey);
    if (savedHidden !== null) {
      return JSON.parse(savedHidden);
    }
  } catch (error) {
    console.error('Error loading sidebar state:', error);
  }
  return defaultHidden();
};

// The global instance (no dashboardId) mirrors visibility onto <html> so
// layout CSS can follow it before hydration (see the docs' inline script).
const syncHtmlClass = (isHidden: boolean): void => {
  if (props.dashboardId || typeof document === 'undefined') return;
  document.documentElement.classList.toggle('sidebar-visible', !isHidden);
};

// Initial state, decided synchronously so the first paint is already right:
// on a phone the menu is closed whatever is stored.
const getInitialHiddenState = (): boolean => {
  // Skip during SSR - no access to localStorage or document
  if (typeof window === 'undefined') {
    return defaultHidden();
  }
  const initialHidden = isPhone.value ? true : readDesktopHidden();
  syncHtmlClass(initialHidden);
  return initialHidden;
};

const hidden = ref(getInitialHiddenState());

const setHidden = (isHidden: boolean): void => {
  hidden.value = isHidden;
  if (typeof window === 'undefined') return;
  syncHtmlClass(isHidden);

  // Only desktop toggles are remembered; a phone's open/closed menu is not a
  // preference.
  if (isPhone.value) return;
  try {
    localStorage.setItem(props.storageKey, JSON.stringify(isHidden));
  } catch (error) {
    console.error('Error saving sidebar state:', error);
  }
};

const toggleSidebar = () => {
  setHidden(!hidden.value);
};

// Close the phone menu without touching the stored desktop preference.
const closePhoneMenu = (): void => {
  if (isPhone.value && !hidden.value) {
    setHidden(true);
  }
};

// A sidebar link was followed: on a phone, get the menu out of the way (for
// client-side routing, and so it is gone before a slow full page load).
const onSidebarNavigate = (): void => {
  closePhoneMenu();
};

const onKeydown = (event: KeyboardEvent): void => {
  if (event.key === 'Escape') {
    closePhoneMenu();
  }
};

// Crossing the breakpoint (rotation, a resized window): entering phone width
// closes the menu; leaving it restores the remembered desktop preference.
const onPhoneMediaChange = (event: MediaQueryListEvent): void => {
  isPhone.value = event.matches;
  hidden.value = event.matches ? true : readDesktopHidden();
  syncHtmlClass(hidden.value);
};

// While the phone menu is open the page behind it must not scroll. A class on
// <html> (styled in theme.scss, below `sm` only) rather than inline styles, so
// it is a no-op on desktop and removed on unmount.
const PHONE_MENU_OPEN_CLASS = 'dx-dashboard-menu-open';
watch(
  [isPhone, hidden],
  ([phone, isHidden]) => {
    if (typeof document === 'undefined') return;
    document.documentElement.classList.toggle(PHONE_MENU_OPEN_CLASS, phone && !isHidden);
  },
  { immediate: true },
);

onMounted(() => {
  phoneMediaQuery?.addEventListener('change', onPhoneMediaChange);
  document.addEventListener('keydown', onKeydown);
});

onBeforeUnmount(() => {
  phoneMediaQuery?.removeEventListener('change', onPhoneMediaChange);
  document.removeEventListener('keydown', onKeydown);
  document.documentElement.classList.remove(PHONE_MENU_OPEN_CLASS);
});

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
