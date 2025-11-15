import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-vue';
import DXDashboardNavbar from '../../resources/js/components/extended/DXDashboardNavbar.vue';
import { sampleUser } from '../fixtures/navigationData';

describe('DXDashboardNavbar', () => {
  describe('Basic Rendering', () => {
    it('renders navbar with page title', async () => {
      const screen = render(DXDashboardNavbar, {
        props: {
          pageTitle: 'Customer Management',
        },
      });

      // Page title has d-none d-md-block so it's hidden on small screens
      // Just check it exists in the DOM
      const pageTitle = screen.container.querySelector('h4');
      expect(pageTitle).toBeTruthy();
      expect(pageTitle?.textContent).toBe('Customer Management');
    });

    it('renders without page title when not provided', async () => {
      const screen = render(DXDashboardNavbar, {
        props: {
          pageTitle: '',
        },
      });

      // Page title area should be empty (no h4 with text)
      const headings = screen.container.querySelectorAll('h4');
      expect(headings.length).toBe(0);
    });
  });

  describe('User Menu', () => {
    it('renders user dropdown when user prop is provided', async () => {
      const screen = render(DXDashboardNavbar, {
        props: {
          user: sampleUser,
        },
      });

      // User avatar with initial should be visible
      const avatar = screen.container.querySelector('.user-avatar');
      expect(avatar).toBeTruthy();
      expect(avatar?.textContent?.trim()).toBe('J'); // First letter of "John"
    });

    it('does not render user menu when user is null', async () => {
      const screen = render(DXDashboardNavbar, {
        props: {
          user: null,
        },
      });

      // User avatar should not exist
      const avatar = screen.container.querySelector('.user-avatar');
      expect(avatar).toBeNull();
    });
  });

  describe('Sidebar Toggle', () => {
    it('emits toggleSidebar event when menu icon is clicked', async () => {
      const screen = render(DXDashboardNavbar, {
        props: {
          pageTitle: 'Dashboard',
        },
      });

      // Find the menu button (first button in navbar)
      const menuButton = screen.container.querySelector('button[aria-label="Toggle sidebar"]');
      expect(menuButton).toBeTruthy();

      // Click it
      (menuButton as HTMLElement).click();
      await new Promise(resolve => setTimeout(resolve, 50));

      // Check event was emitted
      const toggleEvents = screen.emitted('toggleSidebar');
      expect(toggleEvents).toBeTruthy();
      expect(toggleEvents!.length).toBe(1);
    });
  });

  describe('Slots', () => {
    it('renders custom menu icon via slot', async () => {
      const screen = render(DXDashboardNavbar, {
        props: {
          pageTitle: 'Dashboard',
        },
        slots: {
          'menu-icon': '<div class="custom-menu-icon">☰</div>',
        },
      });

      // Custom icon should be rendered
      const customIcon = screen.container.querySelector('.custom-menu-icon');
      expect(customIcon).toBeTruthy();
      expect(customIcon?.textContent).toBe('☰');
    });

    it('renders custom search component via slot', async () => {
      const screen = render(DXDashboardNavbar, {
        props: {
          pageTitle: 'Dashboard',
        },
        slots: {
          search: '<input type="search" placeholder="Custom search..." class="custom-search" />',
        },
      });

      // Custom search should be rendered
      const customSearch = screen.container.querySelector('.custom-search');
      expect(customSearch).toBeTruthy();
    });
  });
});
