<!--
  Type-level test, compiled by `npm run typecheck` (tests/types/tsconfig.json),
  never rendered. Pins that the `link` slot's `item` takes the app's own
  navigation item type, inferred from the `navigation` prop, on DXDashboard
  (`#sidebar-link`) and DXDashboardSidebar (`#link`): extra keys are typed,
  a typo is still an error, an `any` navigation gives an `any` item (as the
  forwarded slots were before they were typed), and a plain `Navigation` or an
  empty `[]` gives `NavigationItem`. Without the components' generic
  `TNavigation`, every `item.permission` read below is an error.
-->
<template>
  <!-- Items inferred from a literal with an extra backend key. -->
  <DXDashboard :navigation="inferredNavigation" current-url="/">
    <template #sidebar-link="{ item, toggleSidebar }">
      {{ takesString(item.permission) }} {{ takesString(item.label) }} {{ toggleSidebar() }}
      <!-- @vue-expect-error a typo is still an error -->
      {{ item.lable }}
    </template>
  </DXDashboard>
  <DXDashboardSidebar :navigation="inferredNavigation" current-url="/">
    <template #link="{ item }">
      {{ takesString(item.permission) }}
      <!-- @vue-expect-error a typo is still an error -->
      {{ item.lable }}
    </template>
  </DXDashboardSidebar>

  <!-- Items typed through the generic `Navigation<TItem>`. -->
  <DXDashboard :navigation="typedNavigation" current-url="/">
    <template #sidebar-link="{ item }">
      {{ takesString(item.permission) }}
      <!-- @vue-expect-error a typo is still an error -->
      {{ item.lable }}
    </template>
  </DXDashboard>
  <DXDashboardSidebar :navigation="typedNavigation" current-url="/">
    <template #link="{ item }">
      {{ takesString(item.permission) }}
      <!-- @vue-expect-error a typo is still an error -->
      {{ item.lable }}
    </template>
  </DXDashboardSidebar>

  <!-- Untyped navigation (e.g. page props typed `any`): the item is `any`. -->
  <DXDashboard :navigation="untypedNavigation" current-url="/">
    <template #sidebar-link="{ item }">{{ takesString(item.permission) }}</template>
  </DXDashboard>
  <DXDashboardSidebar :navigation="untypedNavigation" current-url="/">
    <template #link="{ item }">{{ takesString(item.permission) }}</template>
  </DXDashboardSidebar>

  <!-- A plain `Navigation`, or `[]`: the item is a `NavigationItem`. -->
  <DXDashboard :navigation="plainNavigation" current-url="/">
    <template #sidebar-link="{ item }">
      {{ takesString(item.label) }}
      <!-- @vue-expect-error NavigationItem has no `permission` -->
      {{ item.permission }}
    </template>
  </DXDashboard>
  <DXDashboardSidebar :navigation="[]" current-url="/">
    <template #link="{ item }">
      {{ takesString(item.label) }}
      <!-- @vue-expect-error NavigationItem has no `permission` -->
      {{ item.permission }}
    </template>
  </DXDashboardSidebar>

  <!-- @vue-expect-error an item without `url` is not navigation -->
  <DXDashboard :navigation="[{ items: [{ label: 'No url' }] }]" current-url="/" />
</template>

<script setup lang="ts">
import DXDashboard from '../../resources/js/components/extended/DXDashboard.vue';
import DXDashboardSidebar from '../../resources/js/components/extended/DXDashboardSidebar.vue';
import type { Navigation, NavigationItem } from '../../resources/js/types/navigation';

interface AppNavigationItem extends NavigationItem {
  permission: string;
}

const inferredNavigation = [
  { label: 'Admin', items: [{ label: 'Users', url: '/users', permission: 'users.view' }] },
];
const typedNavigation: Navigation<AppNavigationItem> = [
  { items: [{ label: 'Users', url: '/users', permission: 'users.view' }] },
];
const untypedNavigation: any = [];
const plainNavigation: Navigation = [];

const takesString = (value: string) => value;
</script>
