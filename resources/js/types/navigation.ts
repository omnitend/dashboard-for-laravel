export interface NavigationItem {
  label: string;
  url: string;
  icon?: string;
  badge?: string | number;
  badgeColor?: string;
  active?: boolean;
  visible?: boolean;
}

/**
 * A group of sidebar links. `TItem` is the app's own item type, for menus whose
 * items carry extra keys (a permission, a route name): DXDashboard and
 * DXDashboardSidebar infer it from the `navigation` prop, so the `link` slot's
 * `item` has those keys too. Defaults to `NavigationItem`.
 */
export interface NavigationGroup<TItem extends NavigationItem = NavigationItem> {
  label?: string;
  /**
   * Stable identifier for the group's collapsible open/closed state. Defaults
   * to `label` (then the array index). Set this when a menu can be reordered at
   * runtime, or two groups share a label, so a manually-opened group keeps its
   * state attached to the right group.
   */
  key?: string;
  items: TItem[];
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

/** The sidebar's navigation: its groups, in order. See `NavigationGroup` for `TItem`. */
export type Navigation<TItem extends NavigationItem = NavigationItem> = NavigationGroup<TItem>[];

/**
 * The item type of a navigation, as the `link` slot's `item` receives it:
 * `NavigationItemOf<Navigation<AppItem>>` is `AppItem`. An `any` navigation
 * (untyped page props) gives `any`, and an empty `[]` gives `NavigationItem`.
 *
 * DXDashboard and DXDashboardSidebar are generic over the whole navigation
 * (`TNavigation`) and derive the item from it, rather than generic over the
 * item: TypeScript infers `any` for a type parameter that IS the prop's type,
 * but not for one nested inside it (`{ items: TItem[] }[]`), where an `any`
 * navigation would have fallen back to `NavigationItem` and rejected the app's
 * extra keys.
 */
export type NavigationItemOf<TNavigation extends Navigation> = [
  TNavigation[number]["items"][number],
] extends [never]
  ? NavigationItem
  : TNavigation[number]["items"][number];

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

/**
 * Slots of DXDashboardSidebar, with their slot props. All are optional.
 * `TItem` is the navigation's item type (see `NavigationGroup`).
 */
export interface DashboardSidebarSlots<TItem extends NavigationItem = NavigationItem> {
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
    /**
     * The navigation item (label, url, icon, badge, badgeColor), typed as the
     * app's own item type when its items carry extra keys.
     */
    item: TItem;
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
 * `TItem` is the navigation's item type (see `NavigationGroup`).
 */
export type DashboardSlots<TItem extends NavigationItem = NavigationItem> = {
  /** The main page content. */
  default?(props: NoSlotProps): any;
} & PrefixedDashboardSlots<DashboardSidebarSlots<TItem>, "sidebar-"> &
  PrefixedDashboardSlots<DashboardNavbarSlots, "navbar-">;
