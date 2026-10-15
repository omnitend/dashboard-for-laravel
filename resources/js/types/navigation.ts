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

/**
 * The signed-in user DXDashboardNavbar (and DXDashboard, which forwards it)
 * shows in the avatar dropdown. Extra keys are allowed and reach the
 * user-menu slots.
 */
export interface DashboardUser {
  name: string;
  email: string;
  [key: string]: any;
}

/** A slot that receives no props. */
type NoSlotProps = Record<never, never>;

/*
 * The slot interfaces below are what `defineSlots` uses and what an editor
 * shows on hover. The API docs (`docs:generate:ai`) still read each slot from
 * the `@slot`/`@binding` comments in the component's template: vue-docgen-api
 * only reads `defineSlots` members whose keys are bare identifiers, and it
 * drops the binding types when it does, so every key here is QUOTED on
 * purpose. Keep the text in step with the template comments.
 */

/** Slots of DXDashboardNavbar, with their slot props. All are optional. */
export interface DashboardNavbarSlots {
  /** Custom hamburger/menu icon. Defaults to a three-line SVG. */
  "menu-icon"?(props: NoSlotProps): any;
  /**
   * Search input or component. Fills the middle of the bar at every width,
   * aligned per `searchAlign`. The region is a size container named
   * `dx-navbar-search`; a `<kbd>` hint inside it is hidden when it is
   * narrower than 16rem.
   */
  "search"?(props: NoSlotProps): any;
  /**
   * Page-level primary actions (e.g. a Create button). Right-aligned next to
   * the user menu from `md` up; below, wraps to its own full-width row or is
   * hidden entirely per `actionsOnMobile`.
   */
  "actions"?(props: {
    /** The current page title, for context. */
    pageTitle: string;
  }): any;
  /** Replaces the entire user menu (the default avatar dropdown). */
  "user-menu"?(props: {
    /** The signed-in user; `null` for a guest. */
    user: DashboardUser | null;
  }): any;
  /**
   * Custom user avatar/icon in the dropdown trigger. To decorate the default
   * avatar (e.g. add a notification dot) rather than replace it, render
   * `DXUserAvatar`. Only rendered for a signed-in user.
   */
  "user-icon"?(props: {
    /** The first letter of the user's name. */
    initial: string;
    /** The signed-in user. */
    user: DashboardUser;
  }): any;
  /** Items for the default user dropdown menu. Only rendered for a signed-in user. */
  "user-menu-items"?(props: {
    /** The signed-in user. */
    user: DashboardUser;
  }): any;
}

/** Slots of DXDashboardSidebar, with their slot props. All are optional. */
export interface DashboardSidebarSlots {
  /**
   * Brand/logo area in the sidebar header. Defaults to the title's initial
   * plus the full title (hidden when collapsed).
   */
  "brand"?(props: {
    /** Whether the sidebar rail is collapsed to icons only. */
    collapsed: boolean;
    /** The sidebar title text. */
    title: string;
  }): any;
  /**
   * Renders a single navigation item link. Defaults to an anchor with
   * optional icon, label, and badge.
   */
  "link"?(props: {
    /** The navigation item (label, url, icon, badge, badgeColor). */
    item: NavigationItem;
    /** Whether this item matches the current route. */
    isActive: boolean;
    /** Whether the sidebar rail is collapsed to icons only. */
    collapsed: boolean;
    /** Whether the item's group is currently expanded. */
    isExpanded: boolean;
  }): any;
  /**
   * Utility/secondary links pinned to the bottom of the sidebar (help,
   * changelog, sign-out, …), below the nav groups.
   */
  "footer"?(props: {
    /** Whether the sidebar rail is collapsed to icons only. */
    collapsed: boolean;
  }): any;
}

/**
 * The two bindings DXDashboard adds to every forwarded `sidebar-*` and
 * `navbar-*` slot. They are bound after the child's own slot props, so they
 * win a name clash.
 */
export interface DashboardSlotExtras {
  /** Shows/hides the sidebar. */
  toggleSidebar: () => void;
  /** Whether the sidebar is currently hidden. */
  sidebarHidden: boolean;
}

/** The props a (possibly optional) slot function receives. */
type SlotPropsOf<Slot> = NonNullable<Slot> extends (props: infer Props) => any ? Props : never;

/**
 * A child component's slots renamed with `Prefix` and given the dashboard's
 * extra bindings: `{ brand(props: P) }` becomes
 * `{ "sidebar-brand"(props: P & DashboardSlotExtras) }`. Derived from the
 * child's slot types, so a slot added to the child is typed here for free.
 */
export type PrefixedDashboardSlots<Slots, Prefix extends string> = {
  [Name in keyof Slots as `${Prefix}${Name & string}`]?: (
    props: Omit<SlotPropsOf<Slots[Name]>, keyof DashboardSlotExtras> & DashboardSlotExtras,
  ) => any;
};

/**
 * Slots of DXDashboard: the page content (`default`), every
 * DXDashboardSidebar slot as `sidebar-<name>` and every DXDashboardNavbar
 * slot as `navbar-<name>`. An unprefixed name (`#search`) is not forwarded.
 */
export type DashboardSlots = {
  /** The main page content. */
  default?(props: NoSlotProps): any;
} & PrefixedDashboardSlots<DashboardSidebarSlots, "sidebar-"> &
  PrefixedDashboardSlots<DashboardNavbarSlots, "navbar-">;
