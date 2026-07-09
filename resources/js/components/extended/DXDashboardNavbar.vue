<!--
  @component
  Top navigation bar for the dashboard shell: menu toggle, page title, centred
  search, page-level actions, and the user menu. Usually rendered by
  `DXDashboard`, which forwards these slots with a `navbar-` prefix.
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
          class="dashboard-navbar__search d-flex justify-content-center"
        >
          <!-- @slot Search input or component. Centred in the bar on wider screens; drops to its own full-width row below the `md` breakpoint. -->
          <slot name="search" />
        </div>

        <div class="dashboard-navbar__end d-flex align-items-center gap-3">
          <!-- Page-level primary actions, right-aligned next to the user menu -->
          <div
            v-if="$slots.actions"
            class="dashboard-navbar__actions d-flex align-items-center gap-2"
          >
            <!--
              @slot Page-level primary actions (e.g. a Create button), right-aligned next to the user menu.
              @binding {string} pageTitle The current page title, for context.
            -->
            <slot name="actions" :pageTitle="pageTitle" />
          </div>

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
              no-caret
            >
              <template #button-content>
                <!--
                  @slot Custom user avatar/icon in the dropdown trigger.
                  @binding {string} initial The first letter of the user's name.
                -->
                <slot name="user-icon" :initial="getUserInitial(user)">
                  <div class="user-avatar">
                    {{ getUserInitial(user) }}
                  </div>
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
import DContainer from "../base/DContainer.vue";
import DButton from "../base/DButton.vue";
import DDropdown from "../base/DDropdown.vue";

withDefaults(
  defineProps<{
    /** The signed-in user shown in the avatar dropdown. `null` hides the menu. */
    user?: {
      name: string;
      email: string;
      [key: string]: any;
    } | null;
    /** Page title shown at the left of the navbar (hidden below the `md` breakpoint). */
    pageTitle?: string;
  }>(),
  {
    user: null,
    pageTitle: "",
  },
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

/* Push the user-menu / actions cluster to the right. */
.dashboard-navbar__end {
  margin-left: auto;
}

/*
 * Mobile-first: the search sits on its own full-width row below the toggle /
 * title / user-menu row (order after both, flex-basis 100% forces the wrap).
 * From `md` up it moves inline between the title and the user menu and grows to
 * fill the middle, centring its content.
 */
.dashboard-navbar__search {
  order: 3;
  flex: 0 0 100%;
  width: 100%;
}

@media (min-width: 768px) {
  .dashboard-navbar__search {
    order: 1;
    flex: 1 1 auto;
    width: auto;
  }

  .dashboard-navbar__end {
    order: 2;
  }
}

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: var(--bs-dark);
  color: var(--bs-white);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
}
</style>
