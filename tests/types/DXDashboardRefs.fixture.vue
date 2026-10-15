<!--
  Type-level test, compiled by `npm run typecheck` (tests/types/tsconfig.json),
  never rendered. Pins what a consumer's template ref to DXDashboard and
  DXDashboardSidebar can read. Both are generic SFCs, so the ref carries ONLY
  the exposed members: `$el`/`$props` are gone, and the DOM node is the exposed
  `el`. Without the components' `defineExpose({ el })`, every `.el` read below
  is an error.
-->
<template>
  <DXDashboard ref="dashboard" :navigation="navigation" current-url="/" />
  <DXDashboardSidebar ref="sidebar" :navigation="navigation" current-url="/" />
</template>

<script setup lang="ts">
import { useTemplateRef } from 'vue';
import DXDashboard from '../../resources/js/components/extended/DXDashboard.vue';
import DXDashboardSidebar from '../../resources/js/components/extended/DXDashboardSidebar.vue';
import type { Navigation } from '../../resources/js/types/navigation';

const navigation: Navigation = [];

const dashboard = useTemplateRef('dashboard');
const sidebar = useTemplateRef('sidebar');

const takesElement = (element: HTMLElement | null | undefined) => element;
const takesBoolean = (value: boolean | undefined) => value;

// The DOM nodes, through the exposed `el`.
takesElement(dashboard.value?.el);
takesElement(sidebar.value?.el);

// `el` is an element, not `any`: a non-element member is an error.
// @ts-expect-error `el` is an HTMLElement, which has no `toggleSidebar`
dashboard.value?.el?.toggleSidebar();

// DXDashboard's other exposed members.
dashboard.value?.toggleSidebar();
takesBoolean(dashboard.value?.sidebarHidden);

// Not exposed, so not on the ref (the accepted 0.46 upgrade note).
// @ts-expect-error `$el` is not on a generic component's ref; use `el`
void dashboard.value?.$el;
// @ts-expect-error `$el` is not on a generic component's ref; use `el`
void sidebar.value?.$el;
</script>
