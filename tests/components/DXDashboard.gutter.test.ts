/**
 * The dashboard's shared horizontal gutter: the navbar's first item and the
 * page content start at the same x, `$dashboard-gutter-x` (20px) in from the
 * edge of the content area. Before this, the content sat at 36px (`p-4` on
 * <main> plus the inner container's 12px) and the navbar at 12px, so the menu
 * toggle never lined up with anything on the page.
 *
 * Measures rendered rects rather than class names, at a wide viewport, in
 * both content branches (fluid and the centred reading column, whose row
 * margins and col padding must net out) and both sidebar states.
 *
 * NOTE: the gutter rules live in theme.scss and reach the tests through the
 * BUILT dist/style.css (tests/setup.ts). Locally the pretest hooks do not run
 * (ignore-scripts), so `npm run build:lib` after editing theme.scss.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-vue';
import { h } from 'vue';
import DXDashboard from '../../resources/js/components/extended/DXDashboard.vue';
import { sampleNavigation, sampleUser } from '../fixtures/navigationData';

const GUTTER = 20;
const STORAGE_KEY = 'dx-dashboard-gutter-test';

const settled = () =>
  new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

const mountDashboard = async (options: { sidebarHidden: boolean; fluid: boolean }) => {
  // A scoped instance reads its visibility from this key, so each test picks
  // its sidebar state without touching the global <html> class.
  localStorage.setItem(STORAGE_KEY, JSON.stringify(options.sidebarHidden));
  const screen = render(DXDashboard, {
    props: {
      navigation: sampleNavigation,
      currentUrl: '/dashboard',
      title: 'My App',
      pageTitle: 'Customers',
      user: sampleUser,
      fluid: options.fluid,
      dashboardId: 'gutter-test',
      storageKey: STORAGE_KEY,
    },
    slots: {
      default: () => h('h1', { class: 'gutter-probe' }, 'Customers'),
    },
  });
  await expect.element(screen.getByRole('heading', { level: 1, name: 'Customers' })).toBeVisible();
  await settled();
  return screen;
};

const left = (root: Element, selector: string): number => {
  const element = root.querySelector(selector);
  expect(element, `expected an element matching ${selector}`).toBeTruthy();
  return element!.getBoundingClientRect().left;
};

/** The first child of the navbar's bar that actually takes up space. */
const firstVisibleNavbarItemLeft = (root: Element): number => {
  const bar = root.querySelector('.dashboard-navbar__bar');
  expect(bar).toBeTruthy();
  const visible = Array.from(bar!.children).find(
    (child) => child.getBoundingClientRect().width > 0,
  );
  expect(visible, 'expected a visible navbar item').toBeTruthy();
  return visible!.getBoundingClientRect().left;
};

describe('DXDashboard shared horizontal gutter', () => {
  beforeEach(async () => {
    await page.viewport(1400, 900);
    localStorage.removeItem(STORAGE_KEY);
  });
  afterEach(() => localStorage.removeItem(STORAGE_KEY));

  for (const fluid of [true, false]) {
    const branch = fluid ? 'fluid content' : 'centred reading column';

    it(`lines the navbar up with the page content at ${GUTTER}px with the sidebar hidden (${branch})`, async () => {
      const screen = await mountDashboard({ sidebarHidden: true, fluid });
      const root = screen.container;

      const navbarLeft = firstVisibleNavbarItemLeft(root);
      const toggleLeft = left(root, '.dashboard-navbar button[aria-label="Toggle sidebar"]');
      const contentLeft = left(root, '.gutter-probe');
      const areaLeft = left(root, '.dashboard-content');

      expect(areaLeft).toBeCloseTo(0, 0);
      expect(Math.abs(navbarLeft - GUTTER), `navbar first item at ${navbarLeft}`).toBeLessThanOrEqual(0.5);
      expect(Math.abs(toggleLeft - GUTTER), `toggle at ${toggleLeft}`).toBeLessThanOrEqual(0.5);
      if (fluid) {
        // The centred column is centred, not left-aligned, at this width.
        expect(Math.abs(contentLeft - GUTTER), `content at ${contentLeft}`).toBeLessThanOrEqual(0.5);
      }
    });

    it(`starts the navbar and page content ${GUTTER}px from the sidebar when it is open (${branch})`, async () => {
      const screen = await mountDashboard({ sidebarHidden: false, fluid });
      const root = screen.container;

      const sidebar = root.querySelector('.dashboard-sidebar')!;
      const sidebarRight = sidebar.getBoundingClientRect().right;
      expect(sidebarRight).toBeGreaterThan(0);

      const navbarLeft = firstVisibleNavbarItemLeft(root);
      const areaLeft = left(root, '.dashboard-content');
      expect(Math.abs(navbarLeft - (sidebarRight + GUTTER)), `navbar first item at ${navbarLeft}, sidebar right ${sidebarRight}`).toBeLessThanOrEqual(0.5);
      expect(areaLeft).toBeCloseTo(sidebarRight, 0);

      if (fluid) {
        // Holds whether or not a consumer hides the toggle: the content edge
        // is measured on its own, not via the navbar.
        const contentLeft = left(root, '.gutter-probe');
        expect(Math.abs(contentLeft - (sidebarRight + GUTTER)), `content at ${contentLeft}`).toBeLessThanOrEqual(0.5);
      }
    });
  }

  it('gives the centred reading column the same gutter when it fills the width', async () => {
    // At a width under the column's max-width cap the centred column spans
    // the area, so its left edge is exactly where the gutter puts it. This is
    // the case where the row's negative margins and the col's padding have to
    // net out.
    await page.viewport(1000, 900);
    const screen = await mountDashboard({ sidebarHidden: true, fluid: false });
    const root = screen.container;

    const contentLeft = left(root, '.gutter-probe');
    const contentRight = root.querySelector('.gutter-probe')!.getBoundingClientRect().right;
    const areaRight = root.querySelector('.dashboard-content')!.getBoundingClientRect().right;

    expect(Math.abs(contentLeft - GUTTER), `content at ${contentLeft}`).toBeLessThanOrEqual(0.5);
    expect(Math.abs(areaRight - contentRight - GUTTER), `right gutter ${areaRight - contentRight}`).toBeLessThanOrEqual(0.5);
    expect(Math.abs(firstVisibleNavbarItemLeft(root) - contentLeft)).toBeLessThanOrEqual(0.5);
  });

  it('keeps the gutter on the wrapped navbar rows below md', async () => {
    await page.viewport(380, 800);
    localStorage.setItem(STORAGE_KEY, 'true');
    const screen = render(DXDashboard, {
      props: {
        navigation: sampleNavigation,
        currentUrl: '/dashboard',
        user: sampleUser,
        fluid: true,
        dashboardId: 'gutter-test',
        storageKey: STORAGE_KEY,
      },
      slots: {
        'navbar-search': () => h('input', { class: 'form-control gutter-search', placeholder: 'Search' }),
        default: () => h('h1', { class: 'gutter-probe' }, 'Customers'),
      },
    });
    await expect.element(screen.getByRole('heading', { level: 1, name: 'Customers' })).toBeVisible();
    await settled();
    const root = screen.container;
    expect(root.querySelector('.dashboard-sidebar')!.classList.contains('sidebar-hidden')).toBe(true);

    const searchLeft = left(root, '.gutter-search');
    const searchRight = root.querySelector('.gutter-search')!.getBoundingClientRect().right;
    const toggleLeft = left(root, '.dashboard-navbar button[aria-label="Toggle sidebar"]');
    const contentLeft = left(root, '.gutter-probe');

    expect(Math.abs(toggleLeft - GUTTER)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(searchLeft - GUTTER)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(contentLeft - GUTTER)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(window.innerWidth - searchRight - GUTTER)).toBeLessThanOrEqual(0.5);
  });
});
