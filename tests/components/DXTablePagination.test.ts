import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-vue';
import { userEvent } from 'vitest/browser';
import { h } from 'vue';
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

const mount = (currentPage: number, total: number, perPage = 20, onPageChange?: (p: number) => void) =>
  render({
    render: () =>
      h(BApp, {}, () =>
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
