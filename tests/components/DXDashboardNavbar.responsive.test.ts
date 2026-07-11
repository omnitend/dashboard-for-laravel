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
 * NOTE: the header's min-height comes from theme.scss via the BUILT
 * dist/style.css (imported in tests/setup.ts), so run `npm run build` after
 * editing theme.scss or these tests exercise stale CSS.
 */
import { describe, it, expect } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-vue';
import { defineComponent, h } from 'vue';
import DXDashboardNavbar from '../../resources/js/components/extended/DXDashboardNavbar.vue';

const makePage = (options: { actions: boolean; search: boolean }) =>
  defineComponent({
    setup() {
      return () =>
        h('div', {}, [
          h(
            DXDashboardNavbar,
            { pageTitle: 'Customers', user: { name: 'Jo', email: 'jo@x.com' } },
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

const rect = (root: Element, selector: string) => {
  const el = root.querySelector(selector);
  expect(el, `expected an element matching ${selector}`).toBeTruthy();
  return el!.getBoundingClientRect();
};

const settle = () => new Promise((resolve) => setTimeout(resolve, 50));

describe('DXDashboardNavbar responsive layout (#93)', () => {
  it('grows to contain wrapped actions and search on a phone viewport', async () => {
    await page.viewport(380, 800);
    const screen = render(makePage({ actions: true, search: true }));
    await settle();

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
    await settle();

    const header = rect(screen.container, '.dashboard-navbar');
    const actions = rect(screen.container, '.dashboard-navbar__actions');
    const end = rect(screen.container, '.dashboard-navbar__end');
    const search = rect(screen.container, '.dashboard-navbar__search');

    // Single row at the 64px sidebar-aligned height.
    expect(header.height).toBe(64);

    // Actions sit on the same row as the user menu, immediately to its left,
    // with the search region occupying the middle before them.
    expect(Math.abs(actions.top - end.top)).toBeLessThan(actions.height);
    expect(actions.right).toBeLessThanOrEqual(end.left);
    expect(search.right).toBeLessThanOrEqual(actions.left);
  });

  it('keeps the user menu right-aligned when there are no actions', async () => {
    await page.viewport(1200, 800);
    const screen = render(makePage({ actions: false, search: false }));
    await settle();

    const bar = rect(screen.container, '.dashboard-navbar__bar');
    const end = rect(screen.container, '.dashboard-navbar__end');

    // margin-left: auto still pushes the user-menu cluster to the right edge.
    expect(bar.right - end.right).toBeLessThan(8);
  });
});
