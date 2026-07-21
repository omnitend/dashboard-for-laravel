<!--
  @component
  Collapsible dashboard sidebar: renders a brand header plus grouped navigation
  from a `navigation` array, highlighting the item matching the current route.
  Groups can be plain labelled sections or accordion toggles that expand/collapse
  their items, and the active-route group opens automatically. The rail itself can
  collapse to an icons-only strip or hide entirely. Provides `brand` and `link`
  slots for custom rendering.
-->
<template>
  <aside
    ref="sidebarRef"
    class="dashboard-sidebar text-white"
    :class="{
      'sidebar-collapsed': collapsed,
      'sidebar-hidden': hidden,
      'sidebar-collapsible-groups': collapsibleGroups && !collapsed
    }"
  >
    <div class="sidebar-header p-3">
      <div class="d-flex align-items-center justify-content-between">
        <!--
          @slot Brand/logo area in the sidebar header. Defaults to the title's initial plus the full title (hidden when collapsed).
          @binding {boolean} collapsed Whether the sidebar rail is collapsed to icons only.
          @binding {string} title The sidebar title text.
        -->
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

    <nav ref="navRef" class="sidebar-nav p-3">
      <template v-for="(group, groupIndex) in navigation" :key="groupIndex">
        <div
          v-if="group.visible !== false"
          class="nav-group"
          :class="{ 'nav-group-open': isGroupExpanded(groupIndex, group) }"
        >
          <!-- Collapsible group header (accordion toggle) -->
          <button
            v-if="isGroupToggle(group)"
            type="button"
            class="nav-group-toggle fw-semibold mb-2 px-2"
            :aria-expanded="isGroupExpanded(groupIndex, group)"
            :aria-controls="groupItemsId(groupIndex)"
            @click="toggleGroup(groupKey(group, groupIndex))"
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
            class="nav-group-label fw-semibold mb-2 px-2"
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
                <!--
                  @slot Renders a single navigation item link. Defaults to an anchor with optional icon, label, and badge.
                  @binding {object} item The navigation item (label, url, icon, badge, badgeColor).
                  @binding {boolean} isActive Whether this item matches the current route.
                  @binding {boolean} collapsed Whether the sidebar rail is collapsed to icons only.
                  @binding {boolean} isExpanded Whether the item's group is currently expanded.
                -->
                <slot
                  name="link"
                  :item="item"
                  :isActive="isActive(item.url)"
                  :collapsed="collapsed"
                  :isExpanded="isGroupExpanded(groupIndex, group)"
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

    <div v-if="$slots.footer" class="sidebar-footer p-3">
      <!--
        @slot Utility/secondary links pinned to the bottom of the sidebar (help, changelog, sign-out, …), below the nav groups.
        @binding {boolean} collapsed Whether the sidebar rail is collapsed to icons only.
      -->
      <slot name="footer" :collapsed="collapsed" />
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, watch, nextTick, useId } from 'vue';
import type { Navigation, NavigationGroup } from '../../types/navigation';

const props = withDefaults(defineProps<{
  /** Grouped navigation to render: an array of groups, each with a label and items. */
  navigation: Navigation;
  /** The current route URL, used to highlight the matching nav item and open its group. */
  currentUrl: string;
  /** Collapse the rail to an icons-only strip, hiding labels and the brand title. */
  collapsed?: boolean;
  /** Hide the sidebar entirely (`display: none`). */
  hidden?: boolean;
  /** Sidebar title; its first letter is also used as the brand initial. */
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
  /** Emitted to request toggling the sidebar's collapsed/expanded state. */
  toggle: [];
}>();

const sidebarRef = ref<HTMLElement | null>(null);
const navRef = ref<HTMLElement | null>(null);

const uid = useId();
const groupItemsId = (index: number): string => `${uid}-nav-group-${index}`;

// Stable identity for a group's open/closed state. Keyed by `key` (explicit),
// else `label` (toggle groups always have one), else the index. Using a stable
// key means reordering `navigation` or flipping a group's `visible` at runtime
// keeps a manually-opened group's open state attached to the right group,
// instead of leaking to whatever now sits at that index.
const groupKey = (group: NavigationGroup, index: number): string =>
  group.key ?? group.label ?? `__group_${index}`;

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
  return openGroups.value.has(groupKey(group, index));
};

// Open groups tracked by stable key (see `groupKey`), not raw array index.
const openGroups = ref<Set<string>>(new Set());

// Key of the group containing the active route, or null if none.
const activeGroupKey = computed<string | null>(() => {
  const index = activeGroupIndex.value;
  if (index < 0) return null;
  return groupKey(props.navigation[index], index);
});

const computeInitialOpenGroups = (): Set<string> => {
  const next = new Set<string>();
  if (props.autoCollapseInactiveGroups) {
    if (activeGroupKey.value !== null) next.add(activeGroupKey.value);
  } else {
    props.navigation.forEach((group, index) => {
      if (group.visible !== false && group.collapsible !== false) {
        next.add(groupKey(group, index));
      }
    });
  }
  return next;
};

// Initialise synchronously so the active group is already open on first paint —
// no post-mount height measurement, so no open/close flicker on load.
openGroups.value = computeInitialOpenGroups();

const toggleGroup = (key: string): void => {
  const wasOpen = openGroups.value.has(key);
  if (props.autoCollapseInactiveGroups) {
    openGroups.value = wasOpen ? new Set() : new Set([key]);
    return;
  }
  const next = new Set(openGroups.value);
  if (wasOpen) next.delete(key);
  else next.add(key);
  openGroups.value = next;
};

// Ensure the active-route group is open. In single-open mode this switches to
// it (closing others); otherwise it just adds it to the open set. No-op when
// there is no active group (e.g. a detail page not present in the nav).
const openActiveGroup = (): void => {
  if (!props.collapsibleGroups || activeGroupKey.value === null) return;
  if (props.autoCollapseInactiveGroups) {
    openGroups.value = new Set([activeGroupKey.value]);
  } else {
    const next = new Set(openGroups.value);
    next.add(activeGroupKey.value);
    openGroups.value = next;
  }
};

const scrollToActiveItem = async (smooth = false) => {
  await nextTick();
  const container = navRef.value;
  if (!container) return;

  const activeLink = container.querySelector('.nav-link.active') as HTMLElement | null;
  if (!activeLink) return;

  // Centre the active item. `offsetTop` is relative to the nav (its offset
  // parent — `.sidebar-nav` is positioned), so it measures correctly whether or
  // not a footer is pinned below.
  const scrollTop =
    activeLink.offsetTop - container.clientHeight / 2 + activeLink.offsetHeight / 2;

  container.scrollTo({
    top: scrollTop,
    behavior: smooth ? 'smooth' : 'instant',
  });
};

// Scroll to active item on initial mount (instant, no animation)
onMounted(() => {
  scrollToActiveItem(false);
});

// Client-side route change: open the newly active group, then scroll to it.
// Scrolling into a group that was collapsed kicks off its 0.2s expand, so the
// first scroll centres against a still-growing group; re-centre once it settles.
watch(() => props.currentUrl, () => {
  openActiveGroup();
  scrollToActiveItem(true);
  if (typeof window !== 'undefined') {
    window.setTimeout(() => scrollToActiveItem(true), 250);
  }
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
  /* Column layout: fixed header, scrolling nav, pinned footer. */
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex-shrink: 0;
}

.sidebar-header {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.sidebar-footer {
  flex-shrink: 0;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
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
  /* The nav is the scroll region (header + footer stay put). `position:
     relative` makes it the offset parent for scroll-to-active measurements.
     `min-height: 0` lets this flex item shrink below its content height so
     `overflow-y: auto` actually scrolls (without it, a flex item's default
     `min-height: auto` keeps it at content height and it overflows the rail). */
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
}

/* Dense rhythm (#95): values proven in a production dashboard, adopted as the default —
   natural-case headers at 0.875rem (no uppercase/letter-spacing), tight group
   spacing. */
.nav-group {
  margin-bottom: 0.25rem;
}

.nav-group-label {
  font-size: 0.875rem;
}

/* When collapsible groups are on, give the static (non-collapsible) group
   labels the same height as the toggle headers so a sidebar mixing both keeps
   an even vertical rhythm. */
.sidebar-collapsible-groups .nav-group-label {
  display: flex;
  align-items: center;
  min-height: 2rem;
}

/* Collapsible group toggle header */
.nav-group-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  /* Comfortable click target at the dense rhythm (#95). `px-2` on the element
     sets only left/right padding, so vertical padding here does not fight
     Bootstrap's utility `!important`. */
  min-height: 2rem;
  padding-top: 0.25rem;
  padding-bottom: 0.25rem;
  font-size: 0.875rem;
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
  /* `inert` (set in the template) removes closed links from tab order in modern
     browsers; `visibility: hidden` is the fallback that also removes them where
     `inert` is unsupported. Delay the visibility flip until after the fade so
     the close animation still plays. */
  visibility: hidden;
  transition: grid-template-rows 0.2s ease, opacity 0.2s ease,
    visibility 0s linear 0.2s;
}

.nav-group-open > .nav-group-items--collapsible {
  grid-template-rows: 1fr;
  opacity: 1;
  visibility: visible;
  transition: grid-template-rows 0.2s ease, opacity 0.2s ease,
    visibility 0s linear 0s;
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
  padding: 0.3rem 0.75rem;
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
  padding: 0.3rem 0.625rem;
}

/* Custom scrollbar (the nav is the scroll region) */
.sidebar-nav::-webkit-scrollbar {
  width: 6px;
}

.sidebar-nav::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.1);
}

.sidebar-nav::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}

.sidebar-nav::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}

.sidebar-hidden {
  display: none;
}
</style>
