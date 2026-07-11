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

    it('wraps the search slot in the responsive search region', async () => {
      const screen = render(DXDashboardNavbar, {
        props: { pageTitle: 'Dashboard' },
        slots: {
          search: '<input class="custom-search" />',
        },
      });

      // The search sits in its own flex region so it can drop to a full-width
      // row below the `md` breakpoint (CSS-driven).
      const region = screen.container.querySelector('.dashboard-navbar__search');
      expect(region).toBeTruthy();
      expect(region?.querySelector('.custom-search')).toBeTruthy();
    });

    it('left-aligns the search region by default', async () => {
      const screen = render(DXDashboardNavbar, {
        props: { pageTitle: 'Dashboard' },
        slots: {
          search: '<input class="custom-search" />',
        },
      });

      const region = screen.container.querySelector('.dashboard-navbar__search');
      expect(region?.classList.contains('justify-content-start')).toBe(true);
      expect(region?.classList.contains('justify-content-center')).toBe(false);
    });

    it('centres the search region when searchAlign is "center"', async () => {
      const screen = render(DXDashboardNavbar, {
        props: { pageTitle: 'Dashboard', searchAlign: 'center' },
        slots: {
          search: '<input class="custom-search" />',
        },
      });

      const region = screen.container.querySelector('.dashboard-navbar__search');
      expect(region?.classList.contains('justify-content-center')).toBe(true);
    });

    it('omits the search region when no search slot is provided', async () => {
      const screen = render(DXDashboardNavbar, {
        props: { pageTitle: 'Dashboard' },
      });

      expect(screen.container.querySelector('.dashboard-navbar__search')).toBeNull();
    });

    it('renders page-level primary actions via the actions slot', async () => {
      const screen = render(DXDashboardNavbar, {
        props: {
          pageTitle: 'Customers',
        },
        slots: {
          actions: '<button class="new-item-btn">New customer</button>',
        },
      });

      const actionButton = screen.container.querySelector('.new-item-btn');
      expect(actionButton).toBeTruthy();
      expect(actionButton?.textContent).toBe('New customer');
      // Wrapper only appears when the slot is provided.
      expect(screen.container.querySelector('.dashboard-navbar__actions')).toBeTruthy();
    });

    it('omits the actions wrapper when no actions slot is provided', async () => {
      const screen = render(DXDashboardNavbar, {
        props: { pageTitle: 'Customers', user: { name: 'Jo', email: 'jo@x.com' } },
      });

      expect(screen.container.querySelector('.dashboard-navbar__actions')).toBeNull();
    });

    it('exposes pageTitle to the actions slot', async () => {
      const screen = render(DXDashboardNavbar, {
        props: {
          pageTitle: 'Customers',
        },
        slots: {
          actions: `<template #actions="{ pageTitle }"><span class="ctx">{{ pageTitle }}</span></template>`,
        },
      });

      expect(screen.container.querySelector('.ctx')?.textContent).toBe('Customers');
    });
  });
});

/**
 * #113. The user-menu trigger had no accessible name: its name came from its
 * content, which is just the avatar disc, so a screen reader announced the
 * control as the user's initial ("J") rather than as a menu.
 *
 * Deliberately NOT an `aria-label` — that REPLACES an element's content for
 * assistive tech, which would silence the avatar's notification-badge text.
 */
describe('User menu accessible name (#113)', () => {
  const toggle = (screen: any) =>
    screen.container.querySelector('.dashboard-navbar__user-menu-toggle') as HTMLElement;

  // The accessible name of a button is its content, minus aria-hidden subtrees.
  const accessibleName = (element: HTMLElement) =>
    element.textContent?.replace(/\s+/g, ' ').trim() ?? '';

  const visibleName = (element: HTMLElement) =>
    [...element.querySelectorAll('*')]
      .filter((node) => !node.classList.contains('visually-hidden'))
      .map((node) => node.textContent)
      .join('');

  it('names the trigger, rather than announcing the user initial', async () => {
    const screen = render(DXDashboardNavbar, { props: { user: sampleUser } });

    expect(accessibleName(toggle(screen))).toContain('User menu');
  });

  it('does not announce the decorative initial', async () => {
    const screen = render(DXDashboardNavbar, { props: { user: sampleUser } });

    const disc = screen.container.querySelector('.user-avatar') as HTMLElement;
    expect(disc.getAttribute('aria-hidden')).toBe('true');
    // The letter is still there for sighted users.
    expect(disc.textContent?.trim()).toBe('J');
  });

  it('honours a custom userMenuLabel', async () => {
    const screen = render(DXDashboardNavbar, {
      props: { user: sampleUser, userMenuLabel: 'Account and settings' },
    });

    expect(accessibleName(toggle(screen))).toContain('Account and settings');
  });

  it('keeps the notification badge announced alongside the name', async () => {
    // The reason this is a visually-hidden span and not an aria-label: an
    // aria-label would have silenced the badge entirely.
    const screen = render(DXDashboardNavbar, {
      props: { user: sampleUser },
      slots: {
        'user-icon': `
          <template #default="{ user }">
            <DXUserAvatar :user="user" badge badge-label="3 unread updates" />
          </template>
        `,
      },
      global: {
        components: {
          DXUserAvatar: (await import('../../resources/js/components/extended/DXUserAvatar.vue'))
            .default,
        },
      },
    });

    const name = accessibleName(toggle(screen));
    expect(name).toContain('User menu');
    expect(name).toContain('3 unread updates');
  });

  it('adds nothing visible to the bar', async () => {
    const screen = render(DXDashboardNavbar, { props: { user: sampleUser } });

    expect(visibleName(toggle(screen))).not.toContain('User menu');
  });
});
