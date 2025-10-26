/**
 * Static navigation configuration for documentation site
 * This replaces Astro.glob to avoid deprecation warnings
 */

import type { Navigation } from '../../../resources/js/types/navigation';

export const navigationConfig: Navigation = [
  {
    label: 'Guide',
    items: [
      { label: 'Getting Started', url: '/guide/getting-started' },
      { label: 'Installation', url: '/guide/installation' },
      { label: 'Theming', url: '/guide/theming' },
      { label: 'Forms', url: '/guide/forms' },
      { label: 'TypeScript', url: '/guide/typescript' },
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
      { label: 'DXDashboard', url: '/components/extended/dxdashboard' },
      { label: 'DXBasicForm', url: '/components/extended/dxbasicform' },
      { label: 'DXDashboardNavbar', url: '/components/extended/dxdashboardnavbar' },
      { label: 'DXDashboardSidebar', url: '/components/extended/dxdashboardsidebar' },
      { label: 'DXForm', url: '/components/extended/dxform' },
      { label: 'DXTable', url: '/components/extended/dxtable' },
    ],
  },
  {
    label: 'Base Components',
    items: [
      { label: 'DAccordion', url: '/components/base/daccordion' },
      { label: 'DAlert', url: '/components/base/dalert' },
      { label: 'DAvatar', url: '/components/base/davatar' },
      { label: 'DBadge', url: '/components/base/dbadge' },
      { label: 'DBreadcrumb', url: '/components/base/dbreadcrumb' },
      { label: 'DButton', url: '/components/base/dbutton' },
      { label: 'DButtonGroup', url: '/components/base/dbuttongroup' },
      { label: 'DButtonToolbar', url: '/components/base/dbuttontoolbar' },
      { label: 'DCard', url: '/components/base/dcard' },
      { label: 'DCarousel', url: '/components/base/dcarousel' },
      { label: 'DCol', url: '/components/base/dcol' },
      { label: 'DCollapse', url: '/components/base/dcollapse' },
      { label: 'DContainer', url: '/components/base/dcontainer' },
      { label: 'DDropdown', url: '/components/base/ddropdown' },
      { label: 'DDropdownDivider', url: '/components/base/ddropdowndivider' },
      { label: 'DDropdownItem', url: '/components/base/ddropdownitem' },
      { label: 'DForm', url: '/components/base/dform' },
      { label: 'DFormCheckbox', url: '/components/base/dformcheckbox' },
      { label: 'DFormGroup', url: '/components/base/dformgroup' },
      { label: 'DFormInput', url: '/components/base/dforminput' },
      { label: 'DFormRadio', url: '/components/base/dformradio' },
      { label: 'DFormSelect', url: '/components/base/dformselect' },
      { label: 'DFormSpinbutton', url: '/components/base/dformspinbutton' },
      { label: 'DFormTags', url: '/components/base/dformtags' },
      { label: 'DFormTextarea', url: '/components/base/dformtextarea' },
      { label: 'DImage', url: '/components/base/dimage' },
      { label: 'DInputGroup', url: '/components/base/dinputgroup' },
      { label: 'DLink', url: '/components/base/dlink' },
      { label: 'DListGroup', url: '/components/base/dlistgroup' },
      { label: 'DModal', url: '/components/base/dmodal' },
      { label: 'DNav', url: '/components/base/dnav' },
      { label: 'DNavbar', url: '/components/base/dnavbar' },
      { label: 'DNavItem', url: '/components/base/dnavitem' },
      { label: 'DOffcanvas', url: '/components/base/doffcanvas' },
      { label: 'DOverlay', url: '/components/base/doverlay' },
      { label: 'DPagination', url: '/components/base/dpagination' },
      { label: 'DPlaceholder', url: '/components/base/dplaceholder' },
      { label: 'DPopover', url: '/components/base/dpopover' },
      { label: 'DProgress', url: '/components/base/dprogress' },
      { label: 'DRow', url: '/components/base/drow' },
      { label: 'DSpinner', url: '/components/base/dspinner' },
      { label: 'DTable', url: '/components/base/dtable' },
      { label: 'DTabs', url: '/components/base/dtabs' },
      { label: 'DToast', url: '/components/base/dtoast' },
      { label: 'DToaster', url: '/components/base/dtoaster' },
      { label: 'DTooltip', url: '/components/base/dtooltip' },
    ],
  },
];

/**
 * Helper to mark the active page in navigation
 * Normalizes URLs by removing trailing slashes and converting to lowercase
 */
export function getNavigationWithActive(currentPath: string): Navigation {
  const normalizedCurrentPath = currentPath.toLowerCase().replace(/\/$/, '');

  return navigationConfig.map(group => ({
    ...group,
    items: group.items.map(item => ({
      ...item,
      active: normalizedCurrentPath === item.url.replace(/\/$/, ''),
    })),
  }));
}
