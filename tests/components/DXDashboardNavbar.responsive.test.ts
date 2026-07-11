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
import { describe, it, expect, vi } from 'vitest';
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

/**
 * #102. The navbar lines up with the sidebar's fixed 64px header only while the
 * bar's single-row content stays inside its budget. That budget was arithmetic
 * over magic numbers spread across two files with nothing enforcing it, and the
 * only test used the DEFAULT avatar — so non-default slot content broke the
 * alignment silently. These use non-default content on purpose.
 *
 * The budget is published as `--dx-navbar-content-height`, and it is 47px, not
 * the 48px the old comment claimed: `.dashboard-navbar` is border-box, so its
 * 64px must contain the bar AND its own 1px `border-bottom`. That uncounted
 * pixel is exactly what pushed the header to 65px.
 */
describe('DXDashboardNavbar 64px budget with non-default content (#102)', () => {
  const renderNavbar = (slots: Record<string, any> = {}) =>
    render(
      defineComponent({
        setup() {
          return () =>
            h('div', {}, [
              h(DXDashboardNavbar, { pageTitle: 'Customers', user: sampleUser }, slots),
            ]);
        },
      }),
    );

  const headerHeight = (screen: any) =>
    (screen.container.querySelector('.dashboard-navbar') as HTMLElement).getBoundingClientRect()
      .height;

  it('publishes the content budget as a CSS variable', async () => {
    await page.viewport(1280, 800);
    const screen = renderNavbar();
    await settled();

    const header = screen.container.querySelector('.dashboard-navbar') as HTMLElement;
    const budget = getComputedStyle(header).getPropertyValue('--dx-navbar-content-height').trim();

    // Consumers size slot content against this rather than guessing at it.
    expect(budget).not.toBe('');

    // 47, not 48: `.dashboard-navbar` is border-box, so its 64px has to contain
    // the bar AND its own 1px border-bottom. That uncounted pixel is exactly
    // what used to push the header to 65.
    const toggle = screen.container.querySelector(
      '.dashboard-navbar__user-menu-toggle',
    ) as HTMLElement;
    expect(toggle.getBoundingClientRect().height).toBe(47);
  });

  it('holds the header at 64px with an oversized avatar in the user-icon slot', async () => {
    await page.viewport(1280, 800);
    // A 40px avatar used to make the toggle ~54px tall and push the bar past 64.
    const screen = renderNavbar({
      'user-icon': () =>
        h('div', { style: 'width:40px;height:40px;border-radius:50%;background:#333' }),
    });
    await settled();

    expect(headerHeight(screen)).toBe(64);

    // The toggle stays on budget; the oversized content centres inside it.
    const toggle = screen.container.querySelector(
      '.dashboard-navbar__user-menu-toggle',
    ) as HTMLElement;
    expect(toggle.getBoundingClientRect().height).toBe(47);
  });

  // The library can't cap arbitrary slot content without clipping it, which
  // would be worse than growing. What it CAN do is stop the breakage being
  // silent — which was the actual complaint in #102.
  it('warns (rather than silently misaligning) when slot content blows the budget', async () => {
    await page.viewport(1280, 800);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const screen = renderNavbar({
      actions: () => h('button', { class: 'btn btn-primary btn-lg' }, 'New customer'),
    });
    await settled();
    // ResizeObserver fires after layout, asynchronously.
    await new Promise((resolve) => setTimeout(resolve, 150));

    // It does still grow — that's the honest outcome, and it's now reported.
    expect(headerHeight(screen)).toBeGreaterThan(64);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('no longer lines up with the sidebar header'),
    );

    warn.mockRestore();
  });

  it('does not warn when the bar legitimately grows on a wrapped phone layout', async () => {
    // Below `md` the search and actions wrap onto their own rows and the bar is
    // MEANT to grow (#93). Warning there would cry wolf on every phone.
    await page.viewport(380, 800);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    renderNavbar({
      actions: () => h('button', { class: 'btn btn-primary' }, 'New customer'),
      search: () => h('input', { class: 'form-control' }),
    });
    await settled();

    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('does not warn for a navbar that fits', async () => {
    await page.viewport(1280, 800);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    renderNavbar();
    await settled();

    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('stays aligned with the sidebar header, which is a fixed 64px', async () => {
    await page.viewport(1280, 800);
    const screen = renderNavbar();
    await settled();

    // If these two ever disagree the shell is visibly misaligned — the invariant.
    expect(headerHeight(screen)).toBe(64);
  });
});
