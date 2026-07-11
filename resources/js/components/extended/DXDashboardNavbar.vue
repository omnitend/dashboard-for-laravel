<!--
  @component
  Top navigation bar for the dashboard shell: menu toggle, page title, search
  (aligned per `searchAlign`, left by default), page-level actions, and the
  user menu. Usually rendered by `DXDashboard`, which forwards these slots
  with a `navbar-` prefix.
-->
<template>
  <header class="dashboard-navbar border-bottom">
    <DContainer fluid>
      <!-- Flex bar that wraps: below `md` the search drops to its own
           full-width row beneath the toggle/title/user-menu row. -->
      <div class="dashboard-navbar__bar d-flex flex-wrap align-items-center gap-3">
        <div class="dashboard-navbar__start d-flex align-items-center gap-3">
          <DButton
            variant="link"
            class="text-dark p-0"
            @click="$emit('toggleSidebar')"
            aria-label="Toggle sidebar"
          >
            <!-- @slot Custom hamburger/menu icon. Defaults to a three-line SVG. -->
            <slot name="menu-icon">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                fill="currentColor"
                viewBox="0 0 16 16"
              >
                <path
                  fill-rule="evenodd"
                  d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5m0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5m0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5"
                />
              </svg>
            </slot>
          </DButton>

          <h4 v-if="pageTitle" class="mb-0 fw-semibold d-none d-md-block">{{ pageTitle }}</h4>
        </div>

        <div
          v-if="$slots.search"
          class="dashboard-navbar__search d-flex"
          :class="searchAlignClass"
        >
          <!-- @slot Search input or component. Aligned per `searchAlign` within its region (inline in the bar from `md` up; its own full-width row below). -->
          <slot name="search" />
        </div>

        <!-- Page-level primary actions: right-aligned next to the user menu
             from `md` up; their own wrappable full-width row below (#93),
             or hidden below `md` when `actionsOnMobile` is "hide". -->
        <div
          v-if="$slots.actions"
          class="dashboard-navbar__actions align-items-center gap-2"
          :class="actionsDisplayClass"
        >
          <!--
            @slot Page-level primary actions (e.g. a Create button). Right-aligned next to the user menu from `md` up; below, wraps to its own full-width row or is hidden entirely per `actionsOnMobile`.
            @binding {string} pageTitle The current page title, for context.
          -->
          <slot name="actions" :pageTitle="pageTitle" />
        </div>

        <!-- Only render the user-menu cluster when it has content: an empty
             flex item would still cost a bar gap, pushing actions off the
             right edge in guest (user-less) layouts. -->
        <div
          v-if="$slots['user-menu'] || user"
          class="dashboard-navbar__end d-flex align-items-center gap-3"
        >
          <!--
            @slot Replaces the entire user menu (the default avatar dropdown).
            @binding {object} user The signed-in user.
          -->
          <slot name="user-menu" :user="user">
            <DDropdown
              v-if="user"
              variant="link"
              class="text-dark"
              menu-class="dropdown-menu-end"
              toggle-class="dashboard-navbar__user-menu-toggle"
              no-caret
            >
              <template #button-content>
                <!-- Names the control. A visually-hidden label rather than an
                     `aria-label`, because an aria-label REPLACES the element's
                     content for assistive tech — it would silence the avatar's
                     notification-badge text, which is the one thing in there
                     worth announcing (#113). -->
                <span class="visually-hidden">{{ userMenuLabel }}</span>
                <!--
                  @slot Custom user avatar/icon in the dropdown trigger. To decorate the default avatar (e.g. add a notification dot) rather than replace it, render `DXUserAvatar` — the same component used here, so the styling comes with it.
                  @binding {string} initial The first letter of the user's name.
                  @binding {object} user The signed-in user.
                -->
                <slot name="user-icon" :initial="getUserInitial(user)" :user="user">
                  <DXUserAvatar :user="user" />
                </slot>
              </template>

              <!--
                @slot Items for the default user dropdown menu.
                @binding {object} user The signed-in user.
              -->
              <slot name="user-menu-items" :user="user" />
            </DDropdown>
          </slot>
        </div>
      </div>
    </DContainer>
  </header>
</template>

<script setup lang="ts">
import { computed } from "vue";
import DContainer from "../base/DContainer.vue";
import DButton from "../base/DButton.vue";
import DDropdown from "../base/DDropdown.vue";
import DXUserAvatar from "./DXUserAvatar.vue";
import type { NavbarActionsOnMobile, NavbarSearchAlign } from "../../types/navigation";

const props = withDefaults(
  defineProps<{
    /** The signed-in user shown in the avatar dropdown. `null` hides the menu. */
    user?: {
      name: string;
      email: string;
      [key: string]: any;
    } | null;
    /** Page title shown at the left of the navbar (hidden below the `md` breakpoint). */
    pageTitle?: string;
    /**
     * Horizontal alignment of the search slot content within its region
     * (`"start"` = flush left, `"center"` = centred). Applies at every size:
     * the region sits inline after the title from `md` up, and is its own
     * full-width row below.
     */
    searchAlign?: NavbarSearchAlign;
    /**
     * What the actions slot does below the `md` breakpoint: `"wrap"` moves it
     * to its own full-width row (the bar grows), `"hide"` removes it entirely
     * (for apps that relocate page actions into the page on phones).
     */
    actionsOnMobile?: NavbarActionsOnMobile;
    /**
     * Accessible name for the user-menu trigger. Without one, a screen reader
     * announces the trigger as the avatar's initial ("J") rather than as a menu.
     */
    userMenuLabel?: string;
  }>(),
  {
    user: null,
    pageTitle: "",
    searchAlign: "start",
    actionsOnMobile: "wrap",
    userMenuLabel: "User menu",
  },
);

// Explicit map (not string interpolation) so an out-of-union value at runtime
// falls back to a valid class instead of a silent Bootstrap no-op, and the
// full class names stay greppable.
const SEARCH_ALIGN_CLASSES: Record<NavbarSearchAlign, string> = {
  start: "justify-content-start",
  center: "justify-content-center",
};

const searchAlignClass = computed(
  () => SEARCH_ALIGN_CLASSES[props.searchAlign] ?? SEARCH_ALIGN_CLASSES.start,
);

// "hide" swaps d-flex for d-none/d-md-flex on the WRAPPER — hiding only the
// slot content would leave a zero-height full-width row still costing a flex
// row-gap on phones. Explicit map + fallback, same rationale as
// SEARCH_ALIGN_CLASSES above.
const ACTIONS_DISPLAY_CLASSES: Record<NavbarActionsOnMobile, string> = {
  wrap: "d-flex",
  hide: "d-none d-md-flex",
};

const actionsDisplayClass = computed(
  () => ACTIONS_DISPLAY_CLASSES[props.actionsOnMobile] ?? ACTIONS_DISPLAY_CLASSES.wrap,
);

defineEmits<{
  /** Emitted when the hamburger menu button is clicked. */
  toggleSidebar: [];
}>();

const getUserInitial = (user: { name: string } | null) => {
  if (!user?.name) return "";
  return user.name.charAt(0).toUpperCase();
};
</script>

<style scoped>
.dashboard-navbar {
  position: sticky;
  top: 0;
  z-index: 1000;
}

.dashboard-navbar__bar {
  min-height: 3.5rem;
  padding: 0.5rem 0;
}

/*
 * The bar's responsive LAYOUT (the order/flex rules and the `md` switch) lives
 * in theme.scss, not here — see "Dashboard navbar layout" there.
 *
 * It has to: the `md` breakpoint is expressed twice in this component, once as
 * Bootstrap utility classes (`d-none d-md-block` on the title, `d-md-flex` from
 * `actionsOnMobile: "hide"`) and once as a media query. A media query in a
 * scoped SFC block is compiled at OUR build with OUR `$grid-breakpoints` and
 * baked into `dist/`, so a consumer who overrides `$grid-breakpoints` and
 * compiles `theme.scss` from source would move the utilities and NOT the media
 * query — leaving a band of viewport widths where the two disagree (#101).
 * Compiling the layout from `media-breakpoint-up(md)` in theme.scss keeps both
 * derived from the same variable in any build.
 */
</style>
