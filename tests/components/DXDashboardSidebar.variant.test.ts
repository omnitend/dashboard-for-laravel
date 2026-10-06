/**
 * Sidebar colour schemes: `light` (the default) and `dark` (the navy rail dfl
 * shipped before). Every colour, the typeface and the weights come from the
 * `--dx-sidebar-*` custom properties in theme.scss.
 *
 * Asserts on RENDERED computed styles, not on class names, so a rule that
 * ships but loses a specificity fight (the scoped styles land after the theme
 * in dist/style.css) still fails here. Contrast is computed from what the
 * browser actually painted for the default tokens.
 *
 * NOTE: the variant rules live in theme.scss and reach the tests through the
 * BUILT dist/style.css (tests/setup.ts): `npm run build:lib` first.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-vue';
import DXDashboardSidebar from '../../resources/js/components/extended/DXDashboardSidebar.vue';
import DXDashboard from '../../resources/js/components/extended/DXDashboard.vue';
import { sampleNavigation } from '../fixtures/navigationData';

type Rgba = [number, number, number, number];

const parseColour = (value: string): Rgba => {
  const parts = value.match(/[\d.]+/g)!.map(Number);
  return [parts[0], parts[1], parts[2], parts[3] ?? 1];
};

// Composite a (possibly translucent) colour over an opaque one.
const over = (top: Rgba, bottom: Rgba): Rgba => [
  top[0] * top[3] + bottom[0] * (1 - top[3]),
  top[1] * top[3] + bottom[1] * (1 - top[3]),
  top[2] * top[3] + bottom[2] * (1 - top[3]),
  1,
];

const luminance = ([red, green, blue]: Rgba): number => {
  const channel = (value: number) => {
    const normalised = value / 255;
    return normalised <= 0.03928 ? normalised / 12.92 : ((normalised + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue);
};

const contrast = (foreground: Rgba, background: Rgba): number => {
  const light = Math.max(luminance(foreground), luminance(background));
  const dark = Math.min(luminance(foreground), luminance(background));
  return (light + 0.05) / (dark + 0.05);
};

const renderSidebar = (props: Record<string, unknown> = {}) =>
  render(DXDashboardSidebar, {
    props: { navigation: sampleNavigation, currentUrl: '/dashboard', title: 'My App', ...props },
  });

const parts = (root: Element) => {
  const sidebar = root.querySelector('.dashboard-sidebar') as HTMLElement;
  const links = Array.from(root.querySelectorAll('.dashboard-sidebar .nav-link')) as HTMLElement[];
  return {
    sidebar,
    link: links.find((link) => !link.classList.contains('active'))!,
    active: links.find((link) => link.classList.contains('active'))!,
    group: root.querySelector('.nav-group-label, .nav-group-toggle') as HTMLElement,
    title: root.querySelector('.brand-container h5') as HTMLElement,
    closeButton: root.querySelector('.sidebar-close') as HTMLElement,
  };
};

describe('DXDashboardSidebar variants', () => {
  beforeEach(async () => {
    await page.viewport(1280, 800);
  });

  it('is light by default', async () => {
    // `phoneMenu` renders the close button (DXDashboard sets it); it changes
    // nothing at this width.
    const screen = renderSidebar({ phoneMenu: true });
    const { sidebar, closeButton } = parts(screen.container);
    expect(sidebar.classList.contains('dashboard-sidebar--light')).toBe(true);
    expect(sidebar.classList.contains('dashboard-sidebar--dark')).toBe(false);
    // The light pane takes a dark close X; the white one would vanish on it.
    expect(closeButton.classList.contains('btn-close-white')).toBe(false);
  });

  it('renders the light default from the tokens', async () => {
    const screen = renderSidebar({ collapsibleGroups: true });
    const { sidebar, link, active, group, title } = parts(screen.container);

    expect(getComputedStyle(sidebar).backgroundColor).toBe('rgb(255, 255, 255)');
    // No line between the menu and the page (2026-10-06 review).
    expect(getComputedStyle(sidebar).borderRightWidth).toBe('0px');
    expect(getComputedStyle(title).color).toBe('rgb(18, 20, 25)');

    const linkStyle = getComputedStyle(link);
    expect(linkStyle.color).toBe('rgb(107, 113, 130)');
    expect(linkStyle.fontFamily).toMatch(/^"?Poppins/);
    expect(linkStyle.fontWeight).toBe('500');
    expect(linkStyle.fontSize).toBe('15px');
    expect(linkStyle.paddingLeft).toBe('16px');

    const activeStyle = getComputedStyle(active);
    expect(activeStyle.color).toBe('rgb(18, 20, 25)');
    expect(activeStyle.backgroundColor).toBe('rgb(195, 250, 170)');
    expect(activeStyle.fontWeight).toBe('600');

    const groupStyle = getComputedStyle(group);
    expect(groupStyle.color).toBe('rgb(18, 20, 25)');
    expect(groupStyle.backgroundColor).toBe('rgb(245, 248, 254)');
    expect(groupStyle.fontWeight).toBe('600');
    expect(groupStyle.paddingLeft).toBe('16px');
    expect(groupStyle.marginBottom).toBe('0px');
    expect(Math.round(group.getBoundingClientRect().height)).toBeGreaterThanOrEqual(35);
  });

  it('gives static group labels the same pill as toggles', async () => {
    const screen = renderSidebar();
    const label = screen.container.querySelector('.nav-group-label') as HTMLElement;
    expect(label).toBeTruthy();
    expect(getComputedStyle(label).backgroundColor).toBe('rgb(245, 248, 254)');
    expect(getComputedStyle(label).paddingLeft).toBe('16px');
  });

  it('meets WCAG AA (4.5:1) for links, the active item and group headers', async () => {
    const screen = renderSidebar();
    const { sidebar, link, active, group } = parts(screen.container);
    const pane = parseColour(getComputedStyle(sidebar).backgroundColor);
    const groupBg = over(parseColour(getComputedStyle(group).backgroundColor), pane);
    const activeBg = over(parseColour(getComputedStyle(active).backgroundColor), pane);

    const ratios = {
      link: contrast(over(parseColour(getComputedStyle(link).color), pane), pane),
      active: contrast(over(parseColour(getComputedStyle(active).color), activeBg), activeBg),
      group: contrast(over(parseColour(getComputedStyle(group).color), groupBg), groupBg),
    };
    // Positive control: the legacy link grey this replaced must FAIL the same
    // check, so a broken contrast helper cannot pass everything.
    expect(contrast(parseColour('rgb(124, 130, 147)'), pane)).toBeLessThan(4.5);
    expect(ratios.link).toBeGreaterThanOrEqual(4.5);
    expect(ratios.active).toBeGreaterThanOrEqual(4.5);
    expect(ratios.group).toBeGreaterThanOrEqual(4.5);
  });

  it('spaces light pills like the legacy menu: 0.25rem to the first item, 1rem between closed groups', async () => {
    const screen = renderSidebar({ collapsibleGroups: true });
    await expect.element(screen.getByText('Settings')).toBeVisible();
    const toggles = Array.from(screen.container.querySelectorAll('.nav-group-toggle')) as HTMLElement[];
    const [openToggle, closedToggle] = toggles;
    expect(openToggle.getAttribute('aria-expanded')).toBe('true');
    expect(closedToggle.getAttribute('aria-expanded')).toBe('false');

    const firstItem = openToggle.parentElement!.querySelector('.nav-link')!;
    expect(firstItem.getBoundingClientRect().top - openToggle.getBoundingClientRect().bottom).toBeCloseTo(4, 0);

    // A third, closed group: the gap between two closed pills is the group gap alone.
    const screenWithThree = renderSidebar({
      collapsibleGroups: true,
      navigation: [...sampleNavigation, { label: 'Reports', items: [{ label: 'Sales', url: '/reports/sales' }] }],
    });
    await expect.element(screenWithThree.getByText('Reports')).toBeVisible();
    const pills = Array.from(screenWithThree.container.querySelectorAll('.nav-group-toggle')) as HTMLElement[];
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(pills[2].getBoundingClientRect().top - pills[1].getBoundingClientRect().bottom).toBeCloseTo(16, 0);
  });

  it('can be rebranded through the tokens', async () => {
    document.documentElement.style.setProperty('--dx-sidebar-active-bg', 'rgb(1, 2, 3)');
    try {
      const screen = renderSidebar();
      expect(getComputedStyle(parts(screen.container).active).backgroundColor).toBe('rgb(1, 2, 3)');
    } finally {
      document.documentElement.style.removeProperty('--dx-sidebar-active-bg');
    }
  });

  it('keeps the collapsed rail centred in light', async () => {
    const screen = renderSidebar({ collapsed: true });
    const { link, sidebar } = parts(screen.container);
    expect(Math.round(sidebar.getBoundingClientRect().width)).toBe(80);
    expect(getComputedStyle(link).paddingLeft).toBe('10px');
  });

  it('renders the dark variant exactly as the old rail', async () => {
    const screen = renderSidebar({ variant: 'dark', collapsibleGroups: true, phoneMenu: true });
    const { sidebar, link, active, group, title, closeButton } = parts(screen.container);
    expect(sidebar.classList.contains('dashboard-sidebar--dark')).toBe(true);
    expect(closeButton.classList.contains('btn-close-white')).toBe(true);

    const bodyStyle = getComputedStyle(document.body);
    expect(getComputedStyle(sidebar).backgroundColor).toBe('rgb(21, 30, 45)');
    expect(getComputedStyle(sidebar).borderRightWidth).toBe('0px');
    expect(getComputedStyle(title).color).toBe('rgb(255, 255, 255)');

    const linkStyle = getComputedStyle(link);
    expect(linkStyle.color).toBe('rgba(255, 255, 255, 0.75)');
    expect(linkStyle.fontFamily).toBe(bodyStyle.fontFamily);
    expect(linkStyle.fontSize).toBe(bodyStyle.fontSize);
    expect(linkStyle.fontWeight).toBe('400');
    expect(linkStyle.paddingLeft).toBe('12px');

    expect(getComputedStyle(active).backgroundColor).toBe('rgba(255, 255, 255, 0.15)');
    expect(getComputedStyle(active).fontWeight).toBe('500');

    const groupStyle = getComputedStyle(group);
    expect(groupStyle.color).toBe('rgba(255, 255, 255, 0.55)');
    expect(groupStyle.backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect(groupStyle.paddingLeft).toBe('8px');
    expect(groupStyle.marginBottom).toBe('8px');
    expect(groupStyle.fontWeight).toBe('600');
  });
});

describe('DXDashboard sidebarVariant', () => {
  const STORAGE_KEY = 'dx-sidebar-variant-test';
  beforeEach(async () => {
    await page.viewport(1280, 800);
    localStorage.setItem(STORAGE_KEY, 'false');
  });
  afterEach(() => localStorage.removeItem(STORAGE_KEY));

  it.each([
    { sidebarVariant: undefined, expected: 'dashboard-sidebar--light' },
    { sidebarVariant: 'light', expected: 'dashboard-sidebar--light' },
    { sidebarVariant: 'dark', expected: 'dashboard-sidebar--dark' },
  ])('forwards sidebarVariant=$sidebarVariant', async ({ sidebarVariant, expected }) => {
    const screen = render(DXDashboard, {
      props: {
        navigation: sampleNavigation,
        currentUrl: '/dashboard',
        dashboardId: 'variant-test',
        storageKey: STORAGE_KEY,
        ...(sidebarVariant ? { sidebarVariant } : {}),
      },
    });
    const sidebar = screen.container.querySelector('.dashboard-sidebar')!;
    expect(sidebar.classList.contains(expected)).toBe(true);
  });
});
