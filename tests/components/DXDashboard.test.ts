import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-vue';
import DXDashboard from '../../resources/js/components/extended/DXDashboard.vue';
import { sampleNavigation, sampleUser } from '../fixtures/navigationData';

describe('DXDashboard', () => {
  describe('Basic Rendering', () => {
    it('renders complete dashboard layout with sidebar and navbar', async () => {
      const screen = render(DXDashboard, {
        props: {
          navigation: sampleNavigation,
          currentUrl: '/dashboard',
          title: 'My Application',
        },
        slots: {
          default: '<div class="test-content">Main Content</div>',
        },
      });

      // Check sidebar is rendered
      const sidebar = screen.container.querySelector('.dashboard-sidebar');
      expect(sidebar).toBeTruthy();

      // Check navbar is rendered
      const navbar = screen.container.querySelector('.dashboard-navbar');
      expect(navbar).toBeTruthy();

      // Check main content is rendered
      await expect.element(screen.getByText('Main Content')).toBeVisible();
    });

    it('displays title in sidebar brand', async () => {
      const screen = render(DXDashboard, {
        props: {
          navigation: sampleNavigation,
          currentUrl: '/dashboard',
          title: 'Test App',
        },
      });

      // Title should appear in sidebar (when not collapsed)
      await expect.element(screen.getByText('Test App')).toBeVisible();
    });

    it('displays page title in navbar', async () => {
      const screen = render(DXDashboard, {
        props: {
          navigation: sampleNavigation,
          currentUrl: '/dashboard',
          title: 'My App',
          pageTitle: 'Customer List',
        },
      });

      // Page title should appear in navbar
      await expect.element(screen.getByText('Customer List')).toBeVisible();
    });
  });

  describe('User Integration', () => {
    it('displays user information when user prop is provided', async () => {
      const screen = render(DXDashboard, {
        props: {
          navigation: sampleNavigation,
          currentUrl: '/dashboard',
          title: 'My App',
          user: sampleUser,
        },
      });

      // User avatar should be rendered with initial
      const avatar = screen.container.querySelector('.user-avatar');
      expect(avatar).toBeTruthy();
      expect(avatar?.textContent?.trim()).toBe('J');
    });
  });

  describe('Sidebar Toggle', () => {
    it('starts with default hidden state', async () => {
      const screen = render(DXDashboard, {
        props: {
          navigation: sampleNavigation,
          currentUrl: '/dashboard',
          title: 'My App',
          dashboardId: 'test-dashboard', // Scoped instance
        },
      });

      // Check sidebar is visible by default for scoped instances
      const sidebar = screen.container.querySelector('.dashboard-sidebar');
      expect(sidebar?.classList.contains('sidebar-hidden')).toBe(false);
    });
  });

  describe('Navigation Rendering', () => {
    it('renders all navigation groups and items', async () => {
      const screen = render(DXDashboard, {
        props: {
          navigation: sampleNavigation,
          currentUrl: '/dashboard',
          title: 'My App',
        },
      });

      // Count navigation groups
      const navGroups = screen.container.querySelectorAll('.nav-group');
      expect(navGroups.length).toBe(2); // Main + Settings

      // Count total navigation items (5 items across both groups)
      const navItems = screen.container.querySelectorAll('.nav-item');
      expect(navItems.length).toBe(5);
    });

    it('marks current page as active', async () => {
      const screen = render(DXDashboard, {
        props: {
          navigation: sampleNavigation,
          currentUrl: '/customers',
          title: 'My App',
        },
      });

      // Find the Customers link
      const navLinks = screen.container.querySelectorAll('.nav-link');
      const customersLink = Array.from(navLinks).find(
        link => link.textContent?.includes('Customers')
      );

      // Should have active class
      expect(customersLink?.classList.contains('active')).toBe(true);
    });
  });

  describe('Custom Slots', () => {
    it('renders custom brand via sidebar-brand slot', async () => {
      const screen = render(DXDashboard, {
        props: {
          navigation: sampleNavigation,
          currentUrl: '/dashboard',
          title: 'My App',
        },
        slots: {
          'sidebar-brand': '<div class="custom-logo">🚀 Custom</div>',
        },
      });

      // Custom brand should be rendered
      const customLogo = screen.container.querySelector('.custom-logo');
      expect(customLogo).toBeTruthy();
      expect(customLogo?.textContent).toContain('Custom');
    });

    it('renders custom menu icon via navbar-menu-icon slot', async () => {
      const screen = render(DXDashboard, {
        props: {
          navigation: sampleNavigation,
          currentUrl: '/dashboard',
          title: 'My App',
        },
        slots: {
          'navbar-menu-icon': '<span class="custom-hamburger">≡</span>',
        },
      });

      // Custom menu icon should be rendered
      const customIcon = screen.container.querySelector('.custom-hamburger');
      expect(customIcon).toBeTruthy();
    });
  });
});
