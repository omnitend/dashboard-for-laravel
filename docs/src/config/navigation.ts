/**
 * Static navigation configuration for documentation site
 * This replaces Astro.glob to avoid deprecation warnings
 */

import type { Navigation } from '@omnitend/dashboard-for-laravel';

// Base path for GitHub Pages deployment (empty string in dev, '/dashboard-for-laravel' in prod)
const base = import.meta.env.BASE_URL.replace(/\/$/, '');

export const navigationConfig: Navigation = [
  {
    label: 'Guide',
    items: [
      { label: 'Getting Started', url: '/guide/getting-started' },
      { label: 'Installation', url: '/guide/installation' },
      { label: 'Theming', url: '/guide/theming' },
      { label: 'Forms', url: '/guide/forms' },
      { label: 'TypeScript', url: '/guide/typescript' },
      { label: 'AI Integration', url: '/guide/ai-integration' },
      { label: 'Contributing', url: '/guide/contributing' },
    ],
  },
  {
    label: 'Components',
    items: [
      { label: 'Overview', url: '/components' },
    ],
  },
  {
    label: 'Extended Components',
    items: [
      { label: 'DXDashboard', url: '/components/extended/DXDashboard' },
      { label: 'DXBasicForm', url: '/components/extended/DXBasicForm' },
      { label: 'DXDashboardNavbar', url: '/components/extended/DXDashboardNavbar' },
      { label: 'DXDashboardSidebar', url: '/components/extended/DXDashboardSidebar' },
      { label: 'DXForm', url: '/components/extended/DXForm' },
      { label: 'DXTable', url: '/components/extended/DXTable' },
    ],
  },
  {
    label: 'Base Components',
    items: [
      { label: 'DAccordion', url: '/components/base/DAccordion' },
      { label: 'DAlert', url: '/components/base/DAlert' },
      { label: 'DAvatar', url: '/components/base/DAvatar' },
      { label: 'DBadge', url: '/components/base/DBadge' },
      { label: 'DBreadcrumb', url: '/components/base/DBreadcrumb' },
      { label: 'DButton', url: '/components/base/DButton' },
      { label: 'DButtonGroup', url: '/components/base/DButtonGroup' },
      { label: 'DButtonToolbar', url: '/components/base/DButtonToolbar' },
      { label: 'DCard', url: '/components/base/DCard' },
      { label: 'DCarousel', url: '/components/base/DCarousel' },
      { label: 'DCol', url: '/components/base/DCol' },
      { label: 'DCollapse', url: '/components/base/DCollapse' },
      { label: 'DContainer', url: '/components/base/DContainer' },
      { label: 'DDropdown', url: '/components/base/DDropdown' },
      { label: 'DDropdownDivider', url: '/components/base/DDropdownDivider' },
      { label: 'DDropdownItem', url: '/components/base/DDropdownItem' },
      { label: 'DForm', url: '/components/base/DForm' },
      { label: 'DFormCheckbox', url: '/components/base/DFormCheckbox' },
      { label: 'DFormGroup', url: '/components/base/DFormGroup' },
      { label: 'DFormInput', url: '/components/base/DFormInput' },
      { label: 'DFormRadio', url: '/components/base/DFormRadio' },
      { label: 'DFormSelect', url: '/components/base/DFormSelect' },
      { label: 'DFormSpinbutton', url: '/components/base/DFormSpinbutton' },
      { label: 'DFormTags', url: '/components/base/DFormTags' },
      { label: 'DFormTextarea', url: '/components/base/DFormTextarea' },
      { label: 'DImage', url: '/components/base/DImage' },
      { label: 'DInputGroup', url: '/components/base/DInputGroup' },
      { label: 'DLink', url: '/components/base/DLink' },
      { label: 'DListGroup', url: '/components/base/DListGroup' },
      { label: 'DModal', url: '/components/base/DModal' },
      { label: 'DNav', url: '/components/base/DNav' },
      { label: 'DNavbar', url: '/components/base/DNavbar' },
      { label: 'DNavItem', url: '/components/base/DNavItem' },
      { label: 'DOffcanvas', url: '/components/base/DOffcanvas' },
      { label: 'DOverlay', url: '/components/base/DOverlay' },
      { label: 'DPagination', url: '/components/base/DPagination' },
      { label: 'DPlaceholder', url: '/components/base/DPlaceholder' },
      { label: 'DPopover', url: '/components/base/DPopover' },
      { label: 'DProgress', url: '/components/base/DProgress' },
      { label: 'DRow', url: '/components/base/DRow' },
      { label: 'DSpinner', url: '/components/base/DSpinner' },
      { label: 'DTable', url: '/components/base/DTable' },
      { label: 'DTabs', url: '/components/base/DTabs' },
      { label: 'DToast', url: '/components/base/DToast' },
      { label: 'DToaster', url: '/components/base/DToaster' },
      { label: 'DTooltip', url: '/components/base/DTooltip' },
    ],
  },
];

/**
 * Helper to mark the active page in navigation and prefix URLs with base path
 * Normalizes URLs by removing trailing slashes and converting to lowercase
 */
export function getNavigationWithActive(currentPath: string): Navigation {
  const normalizedCurrentPath = currentPath.toLowerCase().replace(/\/$/, '');

  return navigationConfig.map(group => ({
    ...group,
    items: group.items.map(item => {
      const fullUrl = `${base}${item.url}`;
      return {
        ...item,
        url: fullUrl,
        active: normalizedCurrentPath === fullUrl.toLowerCase().replace(/\/$/, ''),
      };
    }),
  }));
}
