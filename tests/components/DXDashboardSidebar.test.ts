import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-vue';
import DXDashboardSidebar from '../../resources/js/components/extended/DXDashboardSidebar.vue';
import { sampleNavigation, manyGroupsNavigation } from '../fixtures/navigationData';

// Helper: find a group's <div class="nav-group"> by its label text.
const findGroupByLabel = (container: Element, label: string): Element | undefined =>
  Array.from(container.querySelectorAll('.nav-group')).find((group) =>
    group.querySelector('.nav-group-toggle, .nav-group-label')?.textContent?.includes(label)
  );

describe('DXDashboardSidebar', () => {
  describe('Basic Rendering', () => {
    it('renders navigation items from navigation prop', async () => {
      const screen = render(DXDashboardSidebar, {
        props: {
          navigation: sampleNavigation,
          currentUrl: '/dashboard',
          title: 'My App',
        },
      });

      // Check group labels
      await expect.element(screen.getByText('Main')).toBeVisible();
      await expect.element(screen.getByText('Settings')).toBeVisible();

      // Check navigation items
      await expect.element(screen.getByText('Dashboard')).toBeVisible();
      await expect.element(screen.getByText('Customers')).toBeVisible();
      await expect.element(screen.getByText('Orders')).toBeVisible();
      await expect.element(screen.getByText('Profile')).toBeVisible();
      await expect.element(screen.getByText('Security')).toBeVisible();
    });

    it('renders brand initial when not collapsed', async () => {
      const screen = render(DXDashboardSidebar, {
        props: {
          navigation: sampleNavigation,
          currentUrl: '/dashboard',
          title: 'My Application',
          collapsed: false,
        },
      });

      // Title should be visible when not collapsed
      await expect.element(screen.getByText('My Application')).toBeVisible();

      // Brand initial should also be visible
      const brandInitial = screen.container.querySelector('.brand-initial');
      expect(brandInitial?.textContent?.trim()).toBe('M'); // First letter of "My Application"
    });
  });

  describe('Collapsed State', () => {
    it('hides navigation labels when collapsed', async () => {
      const screen = render(DXDashboardSidebar, {
        props: {
          navigation: sampleNavigation,
          currentUrl: '/dashboard',
          title: 'My App',
          collapsed: true,
        },
      });

      // Navigation labels should be hidden (CSS hides them)
      // But the nav links should still exist in DOM
      const navLinks = screen.container.querySelectorAll('.nav-link');
      expect(navLinks.length).toBeGreaterThan(0);

      // Group labels should also be hidden when collapsed
      const groupLabels = screen.container.querySelectorAll('.nav-group-label');
      expect(groupLabels.length).toBe(0); // Hidden via v-if when collapsed
    });
  });

  describe('Hidden State', () => {
    it('applies sidebar-hidden class when hidden prop is true', async () => {
      const screen = render(DXDashboardSidebar, {
        props: {
          navigation: sampleNavigation,
          currentUrl: '/dashboard',
          title: 'My App',
          hidden: true,
        },
      });

      // Sidebar should have sidebar-hidden class
      const sidebar = screen.container.querySelector('.dashboard-sidebar');
      expect(sidebar?.classList.contains('sidebar-hidden')).toBe(true);
    });
  });

  describe('Active State', () => {
    it('marks current page as active', async () => {
      const screen = render(DXDashboardSidebar, {
        props: {
          navigation: sampleNavigation,
          currentUrl: '/customers',
          title: 'My App',
        },
      });

      // Find the Customers nav link
      const navLinks = screen.container.querySelectorAll('.nav-link');
      const customersLink = Array.from(navLinks).find(
        link => link.textContent?.includes('Customers')
      );

      // Should have active class
      expect(customersLink?.classList.contains('active')).toBe(true);
    });

    it('marks the ancestor item active on a detail-page route (e.g. /staff/rotas/507)', async () => {
      const screen = render(DXDashboardSidebar, {
        props: {
          navigation: manyGroupsNavigation,
          currentUrl: '/staff/rotas/507',
          title: 'My App',
        },
      });

      const navLinks = Array.from(screen.container.querySelectorAll('.nav-link'));
      const rotas = navLinks.find((link) => link.textContent?.includes('Rotas'));
      expect(rotas?.classList.contains('active')).toBe(true);

      // Exactly one item is active (no sibling/parent double-highlight).
      const active = screen.container.querySelectorAll('.nav-link.active');
      expect(active.length).toBe(1);
    });

    it('picks the longest ancestor when nested items share a prefix', async () => {
      const navigation = [
        {
          label: 'Shop',
          items: [
            { label: 'Products', url: '/products' },
            { label: 'Product Options', url: '/products/options' },
          ],
        },
      ];

      const screen = render(DXDashboardSidebar, {
        props: { navigation, currentUrl: '/products/options/3', title: 'My App' },
      });

      const navLinks = Array.from(screen.container.querySelectorAll('.nav-link'));
      const options = navLinks.find((link) => link.textContent?.includes('Product Options'));
      const products = navLinks.find((link) => link.textContent === 'Products');
      expect(options?.classList.contains('active')).toBe(true);
      expect(products?.classList.contains('active')).toBe(false);
    });

    it('ignores query string and hash when matching the active item', async () => {
      const screen = render(DXDashboardSidebar, {
        props: {
          navigation: manyGroupsNavigation,
          currentUrl: '/staff/rotas?page=2&filter=active#top',
          title: 'My App',
        },
      });

      const navLinks = Array.from(screen.container.querySelectorAll('.nav-link'));
      const rotas = navLinks.find((link) => link.textContent?.includes('Rotas'));
      expect(rotas?.classList.contains('active')).toBe(true);
    });

    it('only matches root "/" exactly, never as an ancestor prefix', async () => {
      const navigation = [
        {
          label: 'Main',
          items: [
            { label: 'Home', url: '/' },
            { label: 'Orders', url: '/orders' },
          ],
        },
      ];

      const screen = render(DXDashboardSidebar, {
        props: { navigation, currentUrl: '/orders', title: 'My App' },
      });

      const navLinks = Array.from(screen.container.querySelectorAll('.nav-link'));
      const home = navLinks.find((link) => link.textContent === 'Home');
      const orders = navLinks.find((link) => link.textContent === 'Orders');
      expect(home?.classList.contains('active')).toBe(false);
      expect(orders?.classList.contains('active')).toBe(true);
    });
  });

  describe('Collapsible Groups', () => {
    it('renders no toggle headers when collapsibleGroups is off (default)', async () => {
      const screen = render(DXDashboardSidebar, {
        props: {
          navigation: manyGroupsNavigation,
          currentUrl: '/staff/rotas',
        },
      });

      const toggles = screen.container.querySelectorAll('.nav-group-toggle');
      expect(toggles.length).toBe(0);

      // All groups render as always-open (items expanded).
      const openGroups = screen.container.querySelectorAll('.nav-group.nav-group-open');
      expect(openGroups.length).toBe(manyGroupsNavigation.length);
    });

    it('renders a toggle header per labelled group when enabled', async () => {
      const screen = render(DXDashboardSidebar, {
        props: {
          navigation: manyGroupsNavigation,
          currentUrl: '/staff/rotas',
          collapsibleGroups: true,
        },
      });

      const toggles = screen.container.querySelectorAll('.nav-group-toggle');
      expect(toggles.length).toBe(manyGroupsNavigation.length);
    });

    it('opens only the active-route group on load', async () => {
      const screen = render(DXDashboardSidebar, {
        props: {
          navigation: manyGroupsNavigation,
          currentUrl: '/staff/rotas',
          collapsibleGroups: true,
        },
      });

      const staff = findGroupByLabel(screen.container, 'Staff');
      const accounting = findGroupByLabel(screen.container, 'Accounting');
      const settings = findGroupByLabel(screen.container, 'Settings');

      expect(staff?.classList.contains('nav-group-open')).toBe(true);
      expect(accounting?.classList.contains('nav-group-open')).toBe(false);
      expect(settings?.classList.contains('nav-group-open')).toBe(false);

      // aria-expanded reflects open state.
      expect(staff?.querySelector('.nav-group-toggle')?.getAttribute('aria-expanded')).toBe('true');
      expect(accounting?.querySelector('.nav-group-toggle')?.getAttribute('aria-expanded')).toBe('false');
    });

    it('opens a group and closes the active one when clicked (single-open accordion)', async () => {
      const screen = render(DXDashboardSidebar, {
        props: {
          navigation: manyGroupsNavigation,
          currentUrl: '/staff/rotas',
          collapsibleGroups: true,
        },
      });

      const accounting = findGroupByLabel(screen.container, 'Accounting');
      (accounting?.querySelector('.nav-group-toggle') as HTMLElement).click();
      await new Promise((resolve) => setTimeout(resolve, 0));

      const staff = findGroupByLabel(screen.container, 'Staff');
      expect(accounting?.classList.contains('nav-group-open')).toBe(true);
      expect(staff?.classList.contains('nav-group-open')).toBe(false);
    });

    it('toggles the active group closed when its own header is clicked', async () => {
      const screen = render(DXDashboardSidebar, {
        props: {
          navigation: manyGroupsNavigation,
          currentUrl: '/staff/rotas',
          collapsibleGroups: true,
        },
      });

      const staff = findGroupByLabel(screen.container, 'Staff');
      expect(staff?.classList.contains('nav-group-open')).toBe(true);

      (staff?.querySelector('.nav-group-toggle') as HTMLElement).click();
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(staff?.classList.contains('nav-group-open')).toBe(false);
    });

    it('opens all groups on load when autoCollapseInactiveGroups is false', async () => {
      const screen = render(DXDashboardSidebar, {
        props: {
          navigation: manyGroupsNavigation,
          currentUrl: '/staff/rotas',
          collapsibleGroups: true,
          autoCollapseInactiveGroups: false,
        },
      });

      const openGroups = screen.container.querySelectorAll('.nav-group.nav-group-open');
      expect(openGroups.length).toBe(manyGroupsNavigation.length);
    });

    it('opens the ancestor group on a detail-page route not present in the nav', async () => {
      const screen = render(DXDashboardSidebar, {
        props: {
          navigation: manyGroupsNavigation,
          currentUrl: '/staff/rotas/507',
          collapsibleGroups: true,
        },
      });

      const staff = findGroupByLabel(screen.container, 'Staff');
      const accounting = findGroupByLabel(screen.container, 'Accounting');
      expect(staff?.classList.contains('nav-group-open')).toBe(true);
      expect(accounting?.classList.contains('nav-group-open')).toBe(false);
    });

    it('keeps group items stacked (flex-wrap:nowrap) so they never reflow side-by-side while collapsing', async () => {
      const screen = render(DXDashboardSidebar, {
        props: {
          navigation: manyGroupsNavigation,
          currentUrl: '/staff/rotas',
          collapsibleGroups: true,
        },
      });

      // Bootstrap's `.nav` defaults to flex-wrap:wrap; while the grid row height
      // collapses toward 0 a wrapping flex-column reflows its items into
      // side-by-side columns. `nowrap` on the collapse wrapper's list prevents it.
      const list = screen.container.querySelector('.nav-group-items > .nav');
      expect(list).toBeTruthy();
      expect(getComputedStyle(list as Element).flexWrap).toBe('nowrap');
    });

    it('keeps a group with collapsible:false permanently expanded and headerless', async () => {
      const navigation = [
        { label: 'Pinned', collapsible: false, items: [{ label: 'Home', url: '/home' }] },
        { label: 'Staff', items: [{ label: 'Rotas', url: '/staff/rotas' }] },
      ];

      const screen = render(DXDashboardSidebar, {
        props: {
          navigation,
          currentUrl: '/staff/rotas',
          collapsibleGroups: true,
        },
      });

      const pinned = findGroupByLabel(screen.container, 'Pinned');
      // No toggle header, but always open.
      expect(pinned?.querySelector('.nav-group-toggle')).toBeNull();
      expect(pinned?.classList.contains('nav-group-open')).toBe(true);
    });
  });

  describe('Custom Brand Slot', () => {
    it('renders custom brand content via slot', async () => {
      const screen = render(DXDashboardSidebar, {
        props: {
          navigation: sampleNavigation,
          currentUrl: '/dashboard',
          title: 'My App',
        },
        slots: {
          brand: '<div class="custom-brand">Custom Logo</div>',
        },
      });

      // Custom brand should be rendered
      const customBrand = screen.container.querySelector('.custom-brand');
      expect(customBrand).toBeTruthy();
      expect(customBrand?.textContent).toBe('Custom Logo');
    });
  });
});
