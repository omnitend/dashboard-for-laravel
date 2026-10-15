/**
 * Type-level test, compiled by `npm run typecheck` (tests/types/tsconfig.json),
 * never run. Pins the slot NAMES of DXDashboard, DXDashboardNavbar and
 * DXDashboardSidebar as a consumer's tooling sees them.
 *
 * Why names are pinned here and not in a template: Vue types every
 * component's `$slots` as `Readonly<InternalSlots> & <declared slots>`, and
 * `InternalSlots` has a string index signature, so vue-tsc (2.2, and 3.x has
 * no option for it either) never reports an unknown slot such as
 * `<DXDashboard><template #search>`, not even with `strictTemplates`. The
 * declared names are still what the editor autocompletes, so this file strips
 * the index signature and compares the remaining names exactly. Without the
 * components' `defineSlots` the declared set is empty and every check fails.
 *
 * A file of this name must not share its base name with a `.vue` file in this
 * folder: vue-tsc then drops the `.ts` file from the program without a word.
 */
import type DXDashboard from '../../resources/js/components/extended/DXDashboard.vue';
import type DXDashboardNavbar from '../../resources/js/components/extended/DXDashboardNavbar.vue';
import type DXDashboardSidebar from '../../resources/js/components/extended/DXDashboardSidebar.vue';

/** The declared slot names: every key except the string index signature. */
type DeclaredSlotNames<Component extends abstract new (...args: any) => any> = keyof {
  [Name in keyof InstanceType<Component>['$slots'] as string extends Name ? never : Name]: true;
};

/** Exact type equality (neither side may be wider). */
type Equal<Left, Right> =
  (<Probe>() => Probe extends Left ? 1 : 2) extends <Probe>() => Probe extends Right ? 1 : 2
    ? true
    : false;

type NavbarSlotName =
  | 'menu-icon'
  | 'search'
  | 'actions'
  | 'user-menu'
  | 'user-icon'
  | 'user-menu-items';

type SidebarSlotName = 'brand' | 'link' | 'footer';

export const navbarSlotNames: Equal<DeclaredSlotNames<typeof DXDashboardNavbar>, NavbarSlotName> =
  true;

export const sidebarSlotNames: Equal<
  DeclaredSlotNames<typeof DXDashboardSidebar>,
  SidebarSlotName
> = true;

// DXDashboard: its page content plus every child slot under the child's
// prefix, and nothing else (so no unprefixed `search`, no `navbar-brand`).
export const dashboardSlotNames: Equal<
  DeclaredSlotNames<typeof DXDashboard>,
  'default' | `navbar-${NavbarSlotName}` | `sidebar-${SidebarSlotName}`
> = true;
