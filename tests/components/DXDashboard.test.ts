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

      // Title should appear in sidebar brand (check DOM presence, may not be visible if collapsed or on small screens)
      const brandTitle = screen.container.querySelector('h5');
      expect(brandTitle).toBeTruthy();
      expect(brandTitle?.textContent).toBe('Test App');
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

      // Page title should appear in navbar (has d-none d-md-block so check DOM presence)
      const pageTitle = screen.container.querySelector('h4');
      expect(pageTitle).toBeTruthy();
      expect(pageTitle?.textContent).toBe('Customer List');
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

    it('centres content in a reading-width column by default', async () => {
      const screen = render(DXDashboard, {
        props: { navigation: sampleNavigation, currentUrl: '/dashboard' },
        slots: { default: '<div class="page-body">content</div>' },
      });

      const main = screen.container.querySelector('.dashboard-main');
      expect(main?.querySelector('.justify-content-center')).toBeTruthy();
      // The body sits inside a centred column.
      const col = main?.querySelector('.justify-content-center [class*="col"]');
      expect(col?.querySelector('.page-body')).toBeTruthy();
    });

    it('renders full-width left-aligned content when fluid, with contentClass', async () => {
      const screen = render(DXDashboard, {
        props: {
          navigation: sampleNavigation,
          currentUrl: '/dashboard',
          fluid: true,
          contentClass: 'my-wide',
        },
        slots: { default: '<div class="page-body">content</div>' },
      });

      const main = screen.container.querySelector('.dashboard-main');
      // No centring row/column in fluid mode.
      expect(main?.querySelector('.justify-content-center')).toBeNull();
      const wrap = main?.querySelector('.my-wide');
      expect(wrap).toBeTruthy();
      expect(wrap?.querySelector('.page-body')).toBeTruthy();
    });

    it('forwards page-level actions via the navbar-actions slot', async () => {
      const screen = render(DXDashboard, {
        props: {
          navigation: sampleNavigation,
          currentUrl: '/dashboard',
          title: 'My App',
          pageTitle: 'Customers',
        },
        slots: {
          'navbar-actions': '<button class="new-item-btn">New customer</button>',
        },
      });

      const actionButton = screen.container.querySelector('.new-item-btn');
      expect(actionButton).toBeTruthy();
      expect(actionButton?.textContent).toBe('New customer');
    });

    it('forwards searchAlign to the navbar search region (#92)', async () => {
      const screen = render(DXDashboard, {
        props: {
          navigation: sampleNavigation,
          currentUrl: '/dashboard',
          searchAlign: 'center',
        },
        slots: {
          'navbar-search': '<input class="custom-search" />',
        },
      });

      const region = screen.container.querySelector('.dashboard-navbar__search');
      expect(region?.classList.contains('justify-content-center')).toBe(true);
    });
  });

  describe('Content max-width (#88)', () => {
    // The centred content column sits inside .justify-content-center; the cap is
    // an inline max-width on that column (not the old proportional col-xl-10).
    const contentCol = (root) =>
      root.querySelector('.justify-content-center > [class*="col"]');

    it('caps the reading column at the default 1140px', async () => {
      const screen = render(DXDashboard, {
        props: { navigation: sampleNavigation, currentUrl: '/dashboard' },
        slots: { default: '<div>content</div>' },
      });
      const col = contentCol(screen.container);
      expect(col).toBeTruthy();
      expect((col).style.maxWidth).toBe('1140px');
      // No longer the proportional cap.
      expect((col).className).not.toMatch(/col-xl-10/);
    });

    it('honours a custom contentMaxWidth', async () => {
      const screen = render(DXDashboard, {
        props: { navigation: sampleNavigation, currentUrl: '/dashboard', contentMaxWidth: '800px' },
        slots: { default: '<div>content</div>' },
      });
      expect((contentCol(screen.container)).style.maxWidth).toBe('800px');
    });

    it('does not cap in fluid mode', async () => {
      const screen = render(DXDashboard, {
        props: { navigation: sampleNavigation, currentUrl: '/dashboard', fluid: true },
        slots: { default: '<div>content</div>' },
      });
      // Fluid renders no centred reading column.
      expect(contentCol(screen.container)).toBeNull();
    });
  });

});
