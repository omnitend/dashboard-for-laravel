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
