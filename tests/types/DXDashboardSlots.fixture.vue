<!--
  Type-level test, compiled by `npm run typecheck` (tests/types/tsconfig.json),
  never rendered. Pins the slot types of DXDashboard, DXDashboardNavbar and
  DXDashboardSidebar as a consumer sees them. Each `@vue-expect-error` is a
  misuse that must stay an error: without the components' `defineSlots`, slot
  props are `any`, the directive is unused, and vue-tsc fails.
-->
<template>
  <DXDashboard :navigation="[]" current-url="/">
    <!-- Forwarded slots carry the child's props plus the dashboard's two. -->
    <template #navbar-actions="{ pageTitle, sidebarHidden, toggleSidebar }">
      {{ takesString(pageTitle) }} {{ takesBoolean(sidebarHidden) }} {{ toggleSidebar() }}
      <!-- @vue-expect-error sidebarHidden is a boolean -->
      {{ takesString(sidebarHidden) }}
    </template>
    <template #sidebar-link="{ item, isActive }">
      {{ takesString(item.label) }} {{ takesBoolean(isActive) }}
      <!-- @vue-expect-error isActive is a boolean -->
      {{ takesString(isActive) }}
    </template>
    <template #navbar-user-icon="slotProps">
      {{ takesString(slotProps.user.name) }} {{ takesString(slotProps.initial) }}
      <!-- @vue-expect-error the navbar's user-icon slot has no `title` -->
      {{ slotProps.title }}
    </template>
    <template #sidebar-brand="slotProps">
      <!-- @vue-expect-error `title` belongs to sidebar-brand, `pageTitle` does not -->
      {{ takesString(slotProps.pageTitle) }}
    </template>
  </DXDashboard>

  <DXDashboardNavbar>
    <template #actions="{ pageTitle }">
      <!-- @vue-expect-error pageTitle is a string -->
      {{ takesBoolean(pageTitle) }}
    </template>
  </DXDashboardNavbar>

  <DXDashboardSidebar :navigation="[]" current-url="/">
    <template #footer="{ collapsed }">
      <!-- @vue-expect-error collapsed is a boolean -->
      {{ takesString(collapsed) }}
    </template>
  </DXDashboardSidebar>
</template>

<script setup lang="ts">
import DXDashboard from '../../resources/js/components/extended/DXDashboard.vue';
import DXDashboardNavbar from '../../resources/js/components/extended/DXDashboardNavbar.vue';
import DXDashboardSidebar from '../../resources/js/components/extended/DXDashboardSidebar.vue';

const takesString = (value: string) => value;
const takesBoolean = (value: boolean) => value;
</script>
