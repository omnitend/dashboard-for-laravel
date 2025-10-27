import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-vue';
import DXDashboardSidebar from '../../resources/js/components/extended/DXDashboardSidebar.vue';
import { sampleNavigation } from '../fixtures/navigationData';

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
