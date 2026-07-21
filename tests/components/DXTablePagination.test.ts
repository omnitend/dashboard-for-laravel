import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-vue';
import { userEvent } from 'vitest/browser';
import { h, nextTick } from 'vue';
import { BApp } from 'bootstrap-vue-next';
import DXTablePagination from '../../resources/js/components/extended/DXTablePagination.vue';

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const pagination = (currentPage: number, total: number, perPage = 20) => ({
  current_page: currentPage,
  per_page: perPage,
  total,
  from: (currentPage - 1) * perPage + 1,
  to: Math.min(currentPage * perPage, total),
});

/**
 * The vitest browser viewport is phone-sized (414px), and since #162 a pager
 * row that narrow collapses to the compact variant. These tests are about the
 * DESKTOP windowed pager, so mount inside an explicitly wide host — otherwise
 * they would silently start asserting against the compact form.
 */
const DESKTOP_WIDTH = 900;

const mount = (currentPage: number, total: number, perPage = 20, onPageChange?: (p: number) => void) =>
  render({
    render: () =>
      h(BApp, {}, () =>
        h('div', { style: `width:${DESKTOP_WIDTH}px` }, [
          h(DXTablePagination, {
            pagination: pagination(currentPage, total, perPage),
            perPage,
            perPageOptions: [10, 20, 50, 100],
            showPagination: true,
            showPerPageSelector: false,
            showCount: false,
            singularItemName: 'item',
            pluralItemName: 'items',
            hasActiveFilters: false,
            'onPage-change': onPageChange,
          }),
        ]),
      ),
  });

// The ordered tokens in the pager: each button's text, and '…' for an ellipsis.
const sequence = (container: HTMLElement) => {
  const nav = container.querySelector('.dx-pager') as HTMLElement;
  return [...nav.querySelectorAll('.btn, .dx-pager-ellipsis')].map((el) =>
    el.classList.contains('dx-pager-ellipsis') ? '…' : (el.textContent ?? '').trim(),
  );
};

describe('DXTablePagination windowed pager (#155)', () => {
  it('mid-list (page 11 of 45): 1 2 … window … 44 45 with Previous/Next', async () => {
    const screen = mount(11, 891); // 891/20 = 45 pages
    await flush();
    expect(sequence(screen.container)).toEqual([
      '« Previous', '1', '2', '…', '8', '9', '10', '11', '12', '13', '14', '…', '44', '45', 'Next »',
    ]);
  });

  it('marks the current page active (primary) with aria-current', async () => {
    const screen = mount(11, 891);
    await flush();
    const active = [...screen.container.querySelectorAll('.dx-pager .btn')].find(
      (b) => (b.textContent ?? '').trim() === '11',
    ) as HTMLElement;
    expect(active.className).toContain('btn-primary');
    expect(active.getAttribute('aria-current')).toBe('page');
  });

  it('shows the LAST page number, not a > arrow', async () => {
    const screen = mount(11, 891);
    await flush();
    expect(sequence(screen.container)).toContain('45');
  });

  it('near the start (page 2): a full leading run, no leading ellipsis', async () => {
    const screen = mount(2, 891);
    await flush();
    const seq = sequence(screen.container);
    // window redistributes to a full width near the edge; no ellipsis before the run.
    expect(seq.slice(0, 9)).toEqual(['« Previous', '1', '2', '3', '4', '5', '6', '7', '…']);
    expect(seq).toContain('44');
    expect(seq).toContain('45');
  });

  it('collapses to all pages (no ellipsis) when they fit', async () => {
    const screen = mount(2, 60); // 60/20 = 3 pages
    await flush();
    expect(sequence(screen.container)).toEqual(['« Previous', '1', '2', '3', 'Next »']);
  });

  it('disables Previous on the first page and Next on the last', async () => {
    const first = mount(1, 891);
    await flush();
    const firstBtns = [...first.container.querySelectorAll('.dx-pager .btn')] as HTMLButtonElement[];
    expect(firstBtns[0].textContent?.includes('Previous')).toBe(true);
    expect(firstBtns[0].disabled).toBe(true);
    expect(firstBtns[firstBtns.length - 1].disabled).toBe(false); // Next enabled

    const last = mount(45, 891);
    await flush();
    const lastBtns = [...last.container.querySelectorAll('.dx-pager .btn')] as HTMLButtonElement[];
    expect(lastBtns[lastBtns.length - 1].textContent?.includes('Next')).toBe(true);
    expect(lastBtns[lastBtns.length - 1].disabled).toBe(true);
    expect(lastBtns[0].disabled).toBe(false); // Previous enabled
  });

  it('emits page-change with the clicked page and with Previous/Next', async () => {
    const pages: number[] = [];
    const screen = mount(11, 891, 20, (p) => pages.push(p));
    await flush();
    const btn = (text: string) =>
      [...screen.container.querySelectorAll('.dx-pager .btn')].find(
        (b) => (b.textContent ?? '').trim() === text,
      ) as HTMLElement;

    await userEvent.click(btn('12'));
    await userEvent.click(btn('« Previous'));
    await userEvent.click(btn('Next »'));
    expect(pages).toEqual([12, 10, 12]);
  });

  it('renders no pager when there is only one page', async () => {
    const screen = mount(1, 15); // 15 < perPage 20 -> one page
    await flush();
    expect(screen.container.querySelector('.dx-pager')).toBeNull();
  });
});

/**
 * Compact pager for narrow CONTAINERS (#162).
 *
 * What makes these assertions real rather than decorative:
 *
 * - "the pager renders" holds in both states, so it proves nothing. Every test
 *   here asserts the rendered CONTROL SET changes: the numbered page buttons
 *   must disappear and the status must appear, while Previous/Next survive.
 * - The viewport is asserted UNCHANGED across every resize, so a pass cannot be
 *   a media query firing — only the container moves. That is the whole point of
 *   driving this from `useContainerWidth` rather than a breakpoint.
 * - Compact paging is exercised by CLICKING, not by inspecting markup: a
 *   compact pager that looks right but cannot page is the obvious failure mode.
 */
const HOST = 'dx-pager-host';

/**
 * Resolve once a `ResizeObserver` delivery for `element` has been dispatched,
 * then let Vue flush. A fresh observer's first delivery lands in the same
 * dispatch pass as the component's own (observers fire in creation order, and
 * the component's is older), so by the time this resolves the composable has
 * already published the new width. Awaiting the real observer rather than
 * sleeping on a magic number.
 */
async function settleResize(element: Element): Promise<void> {
  // Let Vue's post-render effects run first — that is where the component
  // registers its own observer, and we need ours to be the younger one.
  await nextTick();
  await new Promise<void>((resolve) => {
    const observer = new ResizeObserver(() => {
      observer.disconnect();
      resolve();
    });
    observer.observe(element);
  });
  await nextTick();
  await nextTick();
}

function mountInHost(
  hostWidth: number,
  currentPage: number,
  total: number,
  extraProps: Record<string, unknown> = {},
  onPageChange?: (page: number) => void,
) {
  const perPage = 20;
  const screen = render({
    render: () =>
      h(BApp, {}, () =>
        h('div', { class: HOST, style: `width:${hostWidth}px` }, [
          h(DXTablePagination, {
            pagination: pagination(currentPage, total, perPage),
            perPage,
            perPageOptions: [10, 20, 50, 100],
            showPagination: true,
            // The selector shares the pager row, so keep it on — this is the
            // real footer layout the threshold was chosen against.
            showPerPageSelector: true,
            showCount: false,
            singularItemName: 'item',
            pluralItemName: 'items',
            hasActiveFilters: false,
            'onPage-change': onPageChange,
            ...extraProps,
          }),
        ]),
      ),
  });
  const host = screen.container.querySelector(`.${HOST}`) as HTMLElement;
  const row = screen.container.querySelector('.dx-pager-row') as HTMLElement;
  return { screen, host, row };
}

async function setHostWidth(host: HTMLElement, row: HTMLElement, width: number) {
  host.style.width = `${width}px`;
  await settleResize(row);
}

/** The numbered page buttons (excludes Previous/Next, which carry words). */
const numberButtons = (container: HTMLElement) =>
  [...container.querySelectorAll('.dx-pager .btn')].filter((button) =>
    /^\d+$/.test((button.textContent ?? '').trim()),
  ) as HTMLButtonElement[];

const prevNextButtons = (container: HTMLElement) => {
  const buttons = [...container.querySelectorAll('.dx-pager .btn')] as HTMLButtonElement[];
  return { previous: buttons[0], next: buttons[buttons.length - 1] };
};

const statusEl = (container: HTMLElement) =>
  container.querySelector('.dx-pager .dx-pager-status') as HTMLElement | null;

describe('DXTablePagination compact variant (#162)', () => {
  const viewport = { width: 0, height: 0 };

  const rememberViewport = () => {
    viewport.width = window.innerWidth;
    viewport.height = window.innerHeight;
  };

  /**
   * If this ever drifts, a "the container query works" pass could really be a
   * media query firing and the feature would be unproven.
   */
  const expectViewportUnchanged = () => {
    expect(window.innerWidth).toBe(viewport.width);
    expect(window.innerHeight).toBe(viewport.height);
  };

  it('collapses the number window to a "current / last" status when the container narrows', async () => {
    rememberViewport();
    const { screen, host, row } = mountInHost(900, 11, 891); // 45 pages
    await settleResize(row);

    // Wide: the full window is present.
    expect(numberButtons(screen.container).length).toBeGreaterThan(5);
    expect(statusEl(screen.container)).toBeNull();

    await setHostWidth(host, row, 360);

    // Narrow: the numbered buttons are GONE — not merely wrapped or hidden.
    expect(numberButtons(screen.container)).toEqual([]);
    expect(screen.container.querySelector('.dx-pager .dx-pager-ellipsis')).toBeNull();

    // ...replaced by the compact status showing current / last.
    const status = statusEl(screen.container);
    expect(status).not.toBeNull();
    expect((status as HTMLElement).textContent).toContain('11 / 45');

    // ...and Previous/Next survive as real buttons.
    const { previous, next } = prevNextButtons(screen.container);
    expect(previous.tagName).toBe('BUTTON');
    expect(next.tagName).toBe('BUTTON');
    expect(previous.textContent).toContain('Previous');
    expect(next.textContent).toContain('Next');

    expectViewportUnchanged();
  });

  it('restores the full window when the container widens again', async () => {
    rememberViewport();
    const { screen, host, row } = mountInHost(360, 11, 891);
    await settleResize(row);
    expect(numberButtons(screen.container)).toEqual([]);

    // Comfortably past threshold + hysteresis (576 + 24).
    await setHostWidth(host, row, 900);

    expect(numberButtons(screen.container).length).toBeGreaterThan(5);
    expect(statusEl(screen.container)).toBeNull();
    expectViewportUnchanged();
  });

  it('leaves a desktop-width container on the unchanged windowed sequence', async () => {
    rememberViewport();
    const { screen, row } = mountInHost(900, 11, 891);
    await settleResize(row);

    // Byte-identical to the pre-#162 expectation in the #155 suite above.
    expect(sequence(screen.container)).toEqual([
      '« Previous', '1', '2', '…', '8', '9', '10', '11', '12', '13', '14', '…', '44', '45', 'Next »',
    ]);
    expectViewportUnchanged();
  });

  it('still pages in compact mode: Next and Previous emit the right page', async () => {
    rememberViewport();
    const pages: number[] = [];
    const { screen, row } = mountInHost(360, 11, 891, {}, (page) => pages.push(page));
    await settleResize(row);
    expect(numberButtons(screen.container)).toEqual([]);

    const { previous, next } = prevNextButtons(screen.container);
    await userEvent.click(next);
    await userEvent.click(previous);

    expect(pages).toEqual([12, 10]);
    expectViewportUnchanged();
  });

  it('disables Previous on the first page and Next on the last in compact mode', async () => {
    rememberViewport();
    const first = mountInHost(360, 1, 891);
    await settleResize(first.row);
    expect(numberButtons(first.screen.container)).toEqual([]);
    expect(prevNextButtons(first.screen.container).previous.disabled).toBe(true);
    expect(prevNextButtons(first.screen.container).next.disabled).toBe(false);

    const last = mountInHost(360, 45, 891);
    await settleResize(last.row);
    expect(numberButtons(last.screen.container)).toEqual([]);
    expect(prevNextButtons(last.screen.container).next.disabled).toBe(true);
    expect(prevNextButtons(last.screen.container).previous.disabled).toBe(false);
    expectViewportUnchanged();
  });

  it('announces the position as a polite live status, in words', async () => {
    rememberViewport();
    const { screen, row } = mountInHost(360, 11, 891);
    await settleResize(row);

    const status = statusEl(screen.container) as HTMLElement;
    expect(status.getAttribute('role')).toBe('status');
    expect(status.getAttribute('aria-live')).toBe('polite');

    // The announced text is the long form; the terse "11 / 45" is aria-hidden,
    // because a screen reader would otherwise read "eleven slash forty-five".
    const spoken = status.querySelector('.visually-hidden') as HTMLElement;
    expect((spoken.textContent ?? '').trim()).toBe('Page 11 of 45');
    const seen = status.querySelector('[aria-hidden="true"]') as HTMLElement;
    expect((seen.textContent ?? '').trim()).toBe('11 / 45');

    // With no page buttons there is no aria-current left to carry "you are
    // here" — the status is what replaces it.
    expect(screen.container.querySelector('.dx-pager [aria-current="page"]')).toBeNull();
    expectViewportUnchanged();
  });

  it('keeps the numbers on a phone when the whole pager still fits (3 pages)', async () => {
    rememberViewport();
    // The regression this guards: collapsing purely on container width would
    // turn a perfectly comfortable "1 2 3" into "2 / 3", which is strictly
    // worse. Compact must need BOTH a narrow row and a strip that won't fit.
    const { screen, row } = mountInHost(360, 2, 60); // 60/20 = 3 pages
    await settleResize(row);

    expect(sequence(screen.container)).toEqual(['« Previous', '1', '2', '3', 'Next »']);
    expect(statusEl(screen.container)).toBeNull();
    expectViewportUnchanged();
  });

  it('honours compactThreshold as a cap: below it, compact never engages', async () => {
    rememberViewport();
    // 500px collapses a 45-page pager at the 576 default (asserted first, so
    // this cannot pass vacuously); a 400 cap must keep the numbers instead.
    const withDefault = mountInHost(500, 11, 891);
    await settleResize(withDefault.row);
    expect(numberButtons(withDefault.screen.container)).toEqual([]);

    const capped = mountInHost(500, 11, 891, { compactThreshold: 400 });
    await settleResize(capped.row);
    expect(numberButtons(capped.screen.container).length).toBeGreaterThan(5);
    expect(statusEl(capped.screen.container)).toBeNull();
    expectViewportUnchanged();
  });
});
