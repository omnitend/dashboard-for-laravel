/**
 * The dashboard menu on phones (below `sm`, 576px). There the open sidebar
 * covers the whole screen, so it behaves as a menu, not a rail:
 *
 * - it always starts closed, whatever `storageKey` remembers. Consumer apps
 *   navigate with full page loads, so restoring a desktop "open" preference
 *   reopened the menu over every page a phone user tapped through to;
 * - toggling it on a phone is not written to `storageKey`, so the desktop
 *   preference survives;
 * - following a link or pressing Escape closes it;
 * - while it is open the page behind it cannot scroll.
 *
 * Desktop keeps restoring and persisting as before; those cases are here too
 * so a fix for the phone cannot quietly change them.
 *
 * NOTE: the full-screen rules live in theme.scss and reach the tests through
 * the BUILT dist/style.css (tests/setup.ts): `npm run build:lib` first.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-vue';
import DXDashboard from '../../resources/js/components/extended/DXDashboard.vue';
import { sampleNavigation } from '../fixtures/navigationData';

const STORAGE_KEY = 'dx-dashboard-phone-test';
const PHONE = { width: 390, height: 844 };
const DESKTOP = { width: 1280, height: 800 };

const settled = () =>
  new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

// Real link clicks would navigate the test frame away. Cancelled at the
// window, after the sidebar's own (bubbling) listener has seen the click.
const cancelNavigation = (event: MouseEvent) => event.preventDefault();

const mountDashboard = async (options: { dashboardId?: string } = {}) => {
  const screen = render(DXDashboard, {
    props: {
      navigation: sampleNavigation,
      currentUrl: '/dashboard',
      title: 'My App',
      dashboardId: options.dashboardId ?? 'phone-test',
      storageKey: STORAGE_KEY,
    },
    slots: { default: '<p class="page-probe">Page</p>' },
  });
  await expect.element(screen.getByText('Page')).toBeInTheDocument();
  await settled();
  return screen;
};

const sidebarOf = (root: Element) => root.querySelector('.dashboard-sidebar') as HTMLElement;
const isHidden = (root: Element) => sidebarOf(root).classList.contains('sidebar-hidden');
const navbarToggle = (root: Element) =>
  root.querySelector('.dashboard-navbar button[aria-label="Toggle sidebar"]') as HTMLElement;

describe('DXDashboard on a phone', () => {
  beforeEach(async () => {
    await page.viewport(PHONE.width, PHONE.height);
    localStorage.removeItem(STORAGE_KEY);
    window.addEventListener('click', cancelNavigation);
  });

  afterEach(() => {
    localStorage.removeItem(STORAGE_KEY);
    window.removeEventListener('click', cancelNavigation);
    document.documentElement.classList.remove('sidebar-visible', 'dx-dashboard-menu-open');
  });

  it('starts closed even when the stored desktop preference is "visible"', async () => {
    localStorage.setItem(STORAGE_KEY, 'false');
    const screen = await mountDashboard();

    expect(isHidden(screen.container)).toBe(true);
    // Positive control: the same stored value opens it on a desktop (below).
    expect(localStorage.getItem(STORAGE_KEY)).toBe('false');
  });

  it('starts closed for a scoped instance with nothing stored (its desktop default is open)', async () => {
    const screen = await mountDashboard();
    expect(isHidden(screen.container)).toBe(true);
  });

  it('keeps the global <html> class closed on first paint', async () => {
    localStorage.setItem(STORAGE_KEY, 'false');
    document.documentElement.classList.add('sidebar-visible');
    const screen = await mountDashboard({ dashboardId: '' });

    expect(isHidden(screen.container)).toBe(true);
    expect(document.documentElement.classList.contains('sidebar-visible')).toBe(false);
  });

  it('opens full screen, locks page scrolling, and does not write the preference', async () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    const screen = await mountDashboard();

    navbarToggle(screen.container).click();
    await settled();

    expect(isHidden(screen.container)).toBe(false);
    const rect = sidebarOf(screen.container).getBoundingClientRect();
    expect(Math.round(rect.left)).toBe(0);
    expect(Math.round(rect.top)).toBe(0);
    expect(Math.round(rect.width)).toBe(window.innerWidth);
    expect(Math.round(rect.height)).toBe(window.innerHeight);
    expect(document.documentElement.classList.contains('dx-dashboard-menu-open')).toBe(true);
    expect(getComputedStyle(document.body).overflow).toBe('hidden');

    // Untouched by the phone toggle.
    expect(localStorage.getItem(STORAGE_KEY)).toBe('true');
  });

  it('closes from its own close button', async () => {
    const screen = await mountDashboard();
    navbarToggle(screen.container).click();
    await settled();
    expect(isHidden(screen.container)).toBe(false);

    const closeButton = screen.container.querySelector('.sidebar-close') as HTMLElement;
    expect(closeButton.getBoundingClientRect().width).toBeGreaterThan(0);
    closeButton.click();
    await settled();

    expect(isHidden(screen.container)).toBe(true);
    expect(document.documentElement.classList.contains('dx-dashboard-menu-open')).toBe(false);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('closes when a nav link is followed', async () => {
    const screen = await mountDashboard();
    navbarToggle(screen.container).click();
    await settled();
    expect(isHidden(screen.container)).toBe(false);

    await userEvent.click(screen.getByRole('link', { name: 'Customers' }));
    await settled();

    expect(isHidden(screen.container)).toBe(true);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('closes on Escape', async () => {
    const screen = await mountDashboard();
    navbarToggle(screen.container).click();
    await settled();
    expect(isHidden(screen.container)).toBe(false);

    await userEvent.keyboard('{Escape}');
    await settled();

    expect(isHidden(screen.container)).toBe(true);
  });
});

describe('DXDashboard on a desktop', () => {
  beforeEach(async () => {
    await page.viewport(DESKTOP.width, DESKTOP.height);
    localStorage.removeItem(STORAGE_KEY);
    window.addEventListener('click', cancelNavigation);
  });

  afterEach(() => {
    localStorage.removeItem(STORAGE_KEY);
    window.removeEventListener('click', cancelNavigation);
    document.documentElement.classList.remove('sidebar-visible', 'dx-dashboard-menu-open');
  });

  it('restores a stored "visible" preference', async () => {
    localStorage.setItem(STORAGE_KEY, 'false');
    const screen = await mountDashboard();
    expect(isHidden(screen.container)).toBe(false);
  });

  it('restores a stored "hidden" preference', async () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    const screen = await mountDashboard();
    expect(isHidden(screen.container)).toBe(true);
  });

  it('persists a toggle and keeps the rail beside the page', async () => {
    const screen = await mountDashboard();
    expect(isHidden(screen.container)).toBe(false);
    expect(Math.round(sidebarOf(screen.container).getBoundingClientRect().width)).toBe(280);
    expect(document.documentElement.classList.contains('dx-dashboard-menu-open')).toBe(false);

    navbarToggle(screen.container).click();
    await settled();
    expect(isHidden(screen.container)).toBe(true);
    expect(localStorage.getItem(STORAGE_KEY)).toBe('true');
  });

  it('stays open when a nav link is followed, and on Escape', async () => {
    const screen = await mountDashboard();
    expect(isHidden(screen.container)).toBe(false);

    await userEvent.click(screen.getByRole('link', { name: 'Customers' }));
    await userEvent.keyboard('{Escape}');
    await settled();

    expect(isHidden(screen.container)).toBe(false);
    // The close button is a phone affordance only.
    expect((screen.container.querySelector('.sidebar-close') as HTMLElement).getBoundingClientRect().width).toBe(0);
  });
});
