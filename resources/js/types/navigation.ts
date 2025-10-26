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
  collapsible?: boolean;
  collapsed?: boolean;
  visible?: boolean;
}

export type Navigation = NavigationGroup[];
