/**
 * Responsive geometry tests for DXDashboardNavbar (#93): with content in the
 * actions slot, the bar must grow to contain it on small screens instead of
 * spilling over the page content, and the actions must sit inline next to the
 * user menu from `md` up.
 *
 * These assert real rendered geometry (getBoundingClientRect) at controlled
 * viewports, because the original bug was invisible to DOM-structure tests:
 * theme.scss pinned the header to a fixed height while the flex bar wrapped
 * taller, overlapping the page h1.
 *
 * NOTE: the header's min-height and the user-menu toggle padding come from
 * theme.scss via the BUILT dist/style.css (imported in tests/setup.ts). The
 * `pretest` script rebuilds before `npm test`; if you run vitest directly
 * after editing theme.scss, `npm run build` first or these tests exercise
 * stale CSS.
 */
import { describe, it, expect } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-vue';
import { defineComponent, h } from 'vue';
import DXDashboardNavbar from '../../resources/js/components/extended/DXDashboardNavbar.vue';
import { sampleUser } from '../fixtures/navigationData';
import type { NavbarActionsOnMobile } from '../../resources/js/types/navigation';

interface PageOptions {
  actions?: boolean;
  search?: boolean;
  user?: typeof sampleUser | null;
  actionsOnMobile?: NavbarActionsOnMobile;
}

const makePage = (options: PageOptions) => {
  // Destructure default: applies only when `user` is omitted (undefined), so
  // the guest-layout test's explicit `null` passes through.
  const { user = sampleUser } = options;
  return defineComponent({
    setup() {
      return () =>
        h('div', {}, [
          h(
            DXDashboardNavbar,
            {
              pageTitle: 'Customers',
              user,
              actionsOnMobile: options.actionsOnMobile,
            },
            {
              ...(options.actions && {
                actions: () => [
                  h('button', { class: 'btn btn-primary act-btn' }, 'New customer'),
                  h('button', { class: 'btn btn-outline-secondary act-btn' }, 'Import'),
                  h('button', { class: 'btn btn-outline-secondary act-btn' }, 'Export'),
                ],
              }),
              ...(options.search && {
                search: () => h('input', { class: 'form-control', placeholder: 'Search…' }),
              }),
            },
          ),
          h('main', {}, [h('h1', { class: 'page-h1' }, 'Customers')]),
        ]);
    },
  });
};

const rect = (root: Element, selector: string) => {
  const el = root.querySelector(selector);
  expect(el, `expected an element matching ${selector}`).toBeTruthy();
  return el!.getBoundingClientRect();
};

const verticalCentre = (rectangle: DOMRect) => (rectangle.top + rectangle.bottom) / 2;

// Two animation frames: deterministic "style applied + layout done" without an
// arbitrary sleep.
const settled = () =>
  new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

describe('DXDashboardNavbar responsive layout (#93)', () => {
  it('grows to contain wrapped actions and search on a phone viewport', async () => {
    await page.viewport(380, 800);
    const screen = render(makePage({ actions: true, search: true }));
    await settled();

    const header = rect(screen.container, '.dashboard-navbar');
    const actions = rect(screen.container, '.dashboard-navbar__actions');
    const search = rect(screen.container, '.dashboard-navbar__search');
    const end = rect(screen.container, '.dashboard-navbar__end');
    const h1 = rect(screen.container, '.page-h1');

    // The bar grew past its desktop floor and contains every region.
    expect(header.height).toBeGreaterThan(64);
    for (const region of [actions, search, end]) {
      expect(region.bottom).toBeLessThanOrEqual(header.bottom + 1);
    }

    // Page content starts below the header — the original bug rendered the
    // action buttons on top of the page h1.
    expect(h1.top).toBeGreaterThanOrEqual(header.bottom - 1);

    // Nothing overflows the viewport horizontally: the action buttons wrap
    // within their own full-width row.
    const buttons = screen.container.querySelectorAll('.act-btn');
    expect(buttons.length).toBe(3);
    for (const button of buttons) {
      expect(button.getBoundingClientRect().right).toBeLessThanOrEqual(380);
    }
    expect(end.right).toBeLessThanOrEqual(380);
  });

  it('keeps the desktop bar single-row with actions inline next to the user menu', async () => {
    await page.viewport(1200, 800);
    const screen = render(makePage({ actions: true, search: true }));
    await settled();

    const header = rect(screen.container, '.dashboard-navbar');
    const actions = rect(screen.container, '.dashboard-navbar__actions');
    const end = rect(screen.container, '.dashboard-navbar__end');
    const search = rect(screen.container, '.dashboard-navbar__search');

    // Single row at the 64px sidebar-aligned height.
    expect(header.height).toBe(64);

    // Same row: regions of differing heights are centre-aligned in the bar,
    // so compare vertical centres (a wrapped second row would shift one by
    // roughly a full row height).
    expect(Math.abs(verticalCentre(actions) - verticalCentre(end))).toBeLessThan(3);
    expect(Math.abs(verticalCentre(search) - verticalCentre(end))).toBeLessThan(3);

    // Left-to-right: search fills the middle, then actions, then user menu,
    // without overlap.
    expect(search.right).toBeLessThanOrEqual(actions.left);
    expect(actions.right).toBeLessThanOrEqual(end.left);
  });

  it('keeps the user menu right-aligned when there are no actions', async () => {
    await page.viewport(1200, 800);
    const screen = render(makePage({ actions: false, search: false }));
    await settled();

    const bar = rect(screen.container, '.dashboard-navbar__bar');
    const end = rect(screen.container, '.dashboard-navbar__end');

    // margin-left: auto still pushes the user-menu cluster to the right edge.
    expect(bar.right - end.right).toBeLessThan(8);
  });

  it('omits the user-menu cluster in guest layouts so actions sit flush right', async () => {
    await page.viewport(1200, 800);
    const screen = render(makePage({ actions: true, user: null }));
    await settled();

    // No empty flex item: it would still cost a bar gap before the right edge.
    expect(screen.container.querySelector('.dashboard-navbar__end')).toBeNull();

    const bar = rect(screen.container, '.dashboard-navbar__bar');
    const actions = rect(screen.container, '.dashboard-navbar__actions');
    expect(bar.right - actions.right).toBeLessThan(8);
  });

  it("actionsOnMobile: 'hide' removes the actions row entirely on phones (no phantom gap)", async () => {
    await page.viewport(380, 800);

    const hidden = render(makePage({ actions: true, search: true, actionsOnMobile: 'hide' }));
    await settled();
    const hiddenBarHeight = rect(hidden.container, '.dashboard-navbar__bar').height;
    const actionsEl = hidden.container.querySelector('.dashboard-navbar__actions')!;
    expect(getComputedStyle(actionsEl).display).toBe('none');
    hidden.unmount();

    // The bar must be exactly as tall as with no actions slot at all — a
    // hidden-content-but-rendered wrapper used to leave a 16px row-gap.
    const none = render(makePage({ actions: false, search: true }));
    await settled();
    expect(rect(none.container, '.dashboard-navbar__bar').height).toBe(hiddenBarHeight);
  });

  it("actionsOnMobile: 'hide' still shows the actions inline from md up", async () => {
    await page.viewport(1200, 800);
    const screen = render(makePage({ actions: true, search: true, actionsOnMobile: 'hide' }));
    await settled();

    const actionsEl = screen.container.querySelector('.dashboard-navbar__actions')!;
    expect(getComputedStyle(actionsEl).display).toBe('flex');
    expect(rect(screen.container, '.dashboard-navbar').height).toBe(64);
  });

  it('gives the avatar toggle an adequate tap target while fitting the 64px bar', async () => {
    await page.viewport(1200, 800);
    const screen = render(makePage({ actions: false, search: false }));
    await settled();

    const toggle = rect(screen.container, '.dashboard-navbar__user-menu-toggle');
    // ≥44px per the WCAG target-size guideline; ≤48px so the single-row bar
    // stays at the 64px sidebar-aligned height (64 minus the bar's padding).
    expect(toggle.height).toBeGreaterThanOrEqual(44);
    expect(toggle.height).toBeLessThanOrEqual(48);
    expect(rect(screen.container, '.dashboard-navbar').height).toBe(64);
  });
});
