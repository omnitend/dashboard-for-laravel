export interface NavigationItem {
  label: string;
  url: string;
  icon?: string;
  badge?: string | number;
  badgeColor?: string;
  active?: boolean;
  visible?: boolean;
}

export interface NavigationGroup {
  label?: string;
  /**
   * Stable identifier for the group's collapsible open/closed state. Defaults
   * to `label` (then the array index). Set this when a menu can be reordered at
   * runtime, or two groups share a label, so a manually-opened group keeps its
   * state attached to the right group.
   */
  key?: string;
  items: NavigationItem[];
  /**
   * Per-group override for the sidebar's `collapsibleGroups` behaviour.
   * Set to `false` to keep a group permanently expanded (no toggle header)
   * even when the sidebar has collapsible groups enabled. Defaults to `true`.
   */
  collapsible?: boolean;
  /** Reserved for a future explicit initial-open hint; not currently wired. */
  collapsed?: boolean;
  visible?: boolean;
}

export type Navigation = NavigationGroup[];

/**
 * Horizontal alignment of the navbar search slot content within its region:
 * `"start"` = flush left (after the title from `md` up), `"center"` = centred.
 * Shared by DXDashboard (which forwards it) and DXDashboardNavbar.
 */
export type NavbarSearchAlign = "start" | "center";

/**
 * Colour scheme of the dashboard sidebar: `"light"` (the default: a white pane,
 * tinted group headers, a green active item, Poppins) or `"dark"` (the navy
 * rail dfl shipped before). Every colour comes from a `--dx-sidebar-*` custom
 * property, so either can be rebranded in CSS. Shared by DXDashboard (which
 * forwards it as `sidebarVariant`) and DXDashboardSidebar (`variant`).
 */
export type SidebarVariant = "light" | "dark";

/**
 * What the navbar actions slot does below the `md` breakpoint: `"wrap"` moves
 * it to its own full-width row (the bar grows), `"hide"` removes it entirely
 * (for apps that relocate page actions into the page on phones).
 * Shared by DXDashboard (which forwards it) and DXDashboardNavbar.
 */
export type NavbarActionsOnMobile = "wrap" | "hide";
