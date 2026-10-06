/**
 * The dashboard's top edge and phone chrome (2026-10-06 review):
 *
 * - the sidebar header and the navbar are the same height, from ONE token
 *   (`--dx-dashboard-header-height`), so their bottom edges meet without a
 *   step: in both sidebar variants, with the rail collapsed, and when a
 *   consumer retunes the token;
 * - the light sidebar draws no line along its edge or under its brand row;
 * - on a phone the navbar is ONE row (toggle, search, user menu), the search
 *   never narrower than 9rem, and a `<kbd>` hint in it drops out below 16rem;
 * - below `sm` the page gutter is 16px (the full-screen modal's), 20px above.
 *
 * Rendered rects and computed styles throughout. The rules live in
 * theme.scss and reach the tests through the BUILT dist/style.css
 * (tests/setup.ts): `npm run build:lib` first.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-vue';
import { h } from 'vue';
import DXDashboard from '../../resources/js/components/extended/DXDashboard.vue';
import DXDashboardSidebar from '../../resources/js/components/extended/DXDashboardSidebar.vue';
import { sampleNavigation, sampleUser } from '../fixtures/navigationData';

const STORAGE_KEY = 'dx-dashboard-header-test';

const settled = () =>
  new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

const mountDashboard = async (props: Record<string, unknown> = {}, withSearch = true) => {
  const screen = render(DXDashboard, {
    props: {
      navigation: sampleNavigation,
      currentUrl: '/dashboard',
      title: 'My App',
      user: sampleUser,
      dashboardId: 'header-test',
      storageKey: STORAGE_KEY,
      ...props,
    },
    slots: {
      ...(withSearch && {
        'navbar-search': () =>
          h('div', { class: 'probe-search', style: 'position: relative; width: 100%' }, [
            h('input', { class: 'form-control probe-input', placeholder: 'Search for anything...' }),
            h('kbd', { class: 'probe-kbd', style: 'position: absolute; right: 0.5rem; top: 0.4rem' }, '⌘K'),
          ]),
      }),
      default: () => h('h1', { class: 'probe-h1' }, 'Customers'),
    },
  });
  await expect.element(screen.getByRole('heading', { level: 1, name: 'Customers' })).toBeInTheDocument();
  await settled();
  return screen;
};

const rectOf = (root: Element, selector: string) => {
  const element = root.querySelector(selector);
  expect(element, `expected ${selector}`).toBeTruthy();
  return element!.getBoundingClientRect();
};

/** Rows on the navbar's bar: its visible children grouped by vertical centre. */
const barRows = (root: Element): number => {
  const bar = root.querySelector('.dashboard-navbar__bar')!;
  const centres = Array.from(bar.children)
    .filter((child) => child.getBoundingClientRect().width > 0)
    .map((child) => {
      const rect = child.getBoundingClientRect();
      return (rect.top + rect.bottom) / 2;
    })
    .sort((a, b) => a - b);
  let rows = 0;
  let previous = -Infinity;
  for (const centre of centres) {
    if (centre - previous > 3) rows += 1;
    previous = centre;
  }
  return rows;
};

describe('Dashboard header height token', () => {
  beforeEach(async () => {
    await page.viewport(1280, 800);
    localStorage.setItem(STORAGE_KEY, 'false');
  });
  afterEach(() => {
    localStorage.removeItem(STORAGE_KEY);
    document.documentElement.style.removeProperty('--dx-dashboard-header-height');
  });

  it.each(['light', 'dark'])('lines up the sidebar header and the navbar (%s)', async (sidebarVariant) => {
    const screen = await mountDashboard({ sidebarVariant });
    const header = rectOf(screen.container, '.sidebar-header');
    const navbar = rectOf(screen.container, '.dashboard-navbar');

    expect(getComputedStyle(document.documentElement).getPropertyValue('--dx-dashboard-header-height').trim()).toBe('64px');
    expect(header.height).toBe(64);
    expect(navbar.height).toBe(64);
    expect(header.bottom).toBe(navbar.bottom);
  });

  it('moves both edges together when the token is retuned', async () => {
    document.documentElement.style.setProperty('--dx-dashboard-header-height', '52px');
    const screen = await mountDashboard({}, false);
    const header = rectOf(screen.container, '.sidebar-header');
    const navbar = rectOf(screen.container, '.dashboard-navbar');

    expect(header.height).toBe(52);
    expect(navbar.height).toBe(52);
    expect(header.bottom).toBe(navbar.bottom);
  });

  it('centres a guest bar (no user menu) in the full header height', async () => {
    const screen = await mountDashboard({ user: null }, false);
    const navbar = rectOf(screen.container, '.dashboard-navbar');
    const toggle = rectOf(screen.container, 'button[aria-label="Toggle sidebar"]');
    expect(navbar.height).toBe(64);
    // The bar spans the header less its 1px bottom border; the toggle sits in its middle.
    expect(Math.abs((toggle.top + toggle.bottom) / 2 - (navbar.top + navbar.bottom - 1) / 2)).toBeLessThanOrEqual(0.5);
  });

  it('sizes the collapsed rail header from the same token', async () => {
    const screen = render(DXDashboardSidebar, {
      props: { navigation: sampleNavigation, currentUrl: '/dashboard', collapsed: true },
    });
    await settled();
    expect(rectOf(screen.container, '.sidebar-header').height).toBe(64);
  });
});

describe('Light sidebar lines', () => {
  beforeEach(async () => {
    await page.viewport(1280, 800);
  });

  it('draws no edge line and no line under the brand row', async () => {
    const screen = render(DXDashboardSidebar, {
      props: { navigation: sampleNavigation, currentUrl: '/dashboard' },
    });
    await settled();
    expect(getComputedStyle(screen.container.querySelector('.dashboard-sidebar')!).borderRightWidth).toBe('0px');
    expect(getComputedStyle(screen.container.querySelector('.sidebar-header')!).borderBottomWidth).toBe('0px');
  });

  it('keeps the dark rail\'s line under the brand row', async () => {
    const screen = render(DXDashboardSidebar, {
      props: { navigation: sampleNavigation, currentUrl: '/dashboard', variant: 'dark' },
    });
    await settled();
    const header = screen.container.querySelector('.sidebar-header')!;
    expect(getComputedStyle(header).borderBottomWidth).toBe('1px');
    expect(getComputedStyle(header).borderBottomColor).toBe('rgba(255, 255, 255, 0.1)');
  });
});

describe('Navbar on a phone', () => {
  beforeEach(() => localStorage.setItem(STORAGE_KEY, 'true'));
  afterEach(() => localStorage.removeItem(STORAGE_KEY));

  it.each([360, 390])('is one row at %ipx, with the kbd hint dropped', async (width) => {
    await page.viewport(width, 800);
    const screen = await mountDashboard();

    expect(barRows(screen.container)).toBe(1);
    expect(rectOf(screen.container, '.dashboard-navbar').height).toBe(64);
    const toggle = rectOf(screen.container, 'button[aria-label="Toggle sidebar"]');
    const search = rectOf(screen.container, '.dashboard-navbar__search');
    const end = rectOf(screen.container, '.dashboard-navbar__end');
    expect(toggle.right).toBeLessThan(search.left);
    expect(search.right).toBeLessThan(end.left);
    expect(search.width).toBeGreaterThanOrEqual(144);
    expect(getComputedStyle(screen.container.querySelector('.probe-kbd')!).display).toBe('none');
  });

  it('keeps the kbd hint where there is room', async () => {
    await page.viewport(1280, 800);
    const screen = await mountDashboard();
    expect(barRows(screen.container)).toBe(1);
    expect(getComputedStyle(screen.container.querySelector('.probe-kbd')!).display).not.toBe('none');
  });

  it('wraps the search to its own row rather than squeezing it below 9rem', async () => {
    await page.viewport(250, 800);
    const screen = await mountDashboard();
    expect(barRows(screen.container)).toBe(2);
    expect(rectOf(screen.container, '.dashboard-navbar__search').width).toBeGreaterThanOrEqual(144);
  });
});

describe('Page gutter', () => {
  beforeEach(() => localStorage.setItem(STORAGE_KEY, 'true'));
  afterEach(() => localStorage.removeItem(STORAGE_KEY));

  it.each([
    { width: 390, gutter: 16 },
    { width: 575, gutter: 16 },
    { width: 576, gutter: 20 },
    { width: 1280, gutter: 20 },
  ])('is $gutter px at $width px', async ({ width, gutter }) => {
    await page.viewport(width, 800);
    const screen = await mountDashboard({ fluid: true });
    const area = rectOf(screen.container, '.dashboard-content');
    expect(rectOf(screen.container, '.probe-h1').left - area.left).toBe(gutter);
    expect(rectOf(screen.container, 'button[aria-label="Toggle sidebar"]').left - area.left).toBe(gutter);
  });
});

/*
 * The top band (2026-10-06, "A2"): one background, `--dx-dashboard-header-bg`,
 * for the navbar and the light sidebar's brand row, so it runs the full width;
 * no line under it. The dark sidebar keeps its navy brand row and the line
 * under both.
 */
describe('Header band', () => {
  beforeEach(async () => {
    await page.viewport(1280, 800);
    localStorage.setItem(STORAGE_KEY, 'false');
  });
  afterEach(() => {
    localStorage.removeItem(STORAGE_KEY);
    document.documentElement.style.removeProperty('--dx-dashboard-header-bg');
  });

  const styleOf = (root: Element, selector: string) => getComputedStyle(root.querySelector(selector)!);

  it('paints the light brand row and the navbar from one token, with no line', async () => {
    const screen = await mountDashboard();
    const navbar = styleOf(screen.container, '.dashboard-navbar');
    const brandRow = styleOf(screen.container, '.sidebar-header');
    expect(navbar.backgroundColor).toBe('rgb(248, 250, 252)');
    expect(brandRow.backgroundColor).toBe(navbar.backgroundColor);
    expect(navbar.borderBottomWidth).toBe('0px');
    expect(brandRow.borderBottomWidth).toBe('0px');
  });

  it('moves both when the token is overridden', async () => {
    document.documentElement.style.setProperty('--dx-dashboard-header-bg', 'rgb(1, 2, 3)');
    const screen = await mountDashboard();
    expect(styleOf(screen.container, '.dashboard-navbar').backgroundColor).toBe('rgb(1, 2, 3)');
    expect(styleOf(screen.container, '.sidebar-header').backgroundColor).toBe('rgb(1, 2, 3)');
  });

  it('keeps the dark brand row navy and the line under both', async () => {
    const screen = await mountDashboard({ sidebarVariant: 'dark' });
    const navbar = styleOf(screen.container, '.dashboard-navbar');
    const brandRow = styleOf(screen.container, '.sidebar-header');
    expect(navbar.backgroundColor).toBe('rgb(248, 250, 252)');
    expect(brandRow.backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect(navbar.borderBottomWidth).toBe('1px');
    expect(brandRow.borderBottomWidth).toBe('1px');
    expect(rectOf(screen.container, '.dashboard-navbar').bottom).toBe(rectOf(screen.container, '.sidebar-header').bottom);
  });

  it('gives the collapsed rail and the phone menu the band colour', async () => {
    const rail = render(DXDashboardSidebar, {
      props: { navigation: sampleNavigation, currentUrl: '/dashboard', collapsed: true },
    });
    await settled();
    expect(styleOf(rail.container, '.sidebar-header').backgroundColor).toBe('rgb(248, 250, 252)');
    rail.unmount();

    await page.viewport(390, 844);
    localStorage.setItem(STORAGE_KEY, 'true');
    const screen = await mountDashboard();
    (screen.container.querySelector('button[aria-label="Toggle sidebar"]') as HTMLElement).click();
    await settled();
    expect(rectOf(screen.container, '.dashboard-sidebar').width).toBe(390);
    expect(styleOf(screen.container, '.sidebar-header').backgroundColor).toBe('rgb(248, 250, 252)');
  });
});
