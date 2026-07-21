import { describe, it, expect, beforeEach } from 'vitest';
import { render } from 'vitest-browser-vue';
import { h } from 'vue';
import { BApp } from 'bootstrap-vue-next';
import DXTable from '../../resources/js/components/extended/DXTable.vue';
import DXTableShell from '../../resources/js/components/extended/DXTableShell.vue';
import { customerData, customerFields } from '../fixtures/tableData';

/*
 * Part A of plans/2026-07-21-card-table-flush-and-totals.md: in card mode the
 * table must sit FLUSH against the card border (rows/stripes reach the edge),
 * while the header and the pagination keep the inset the old `.card-body`
 * provided.
 *
 * These assertions are GEOMETRIC on purpose. `querySelector('table')` finds the
 * table in the broken build and the fixed one alike — presence proves nothing
 * here. What was broken is the horizontal distance between the table's edge and
 * the card's edge (24px of `.card-body` padding), so that distance is what is
 * measured. Verified red against the unfixed component: the flush assertions
 * reported ~24px.
 */

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

interface TableProps {
  card: boolean;
  title?: string;
  clientSide?: boolean;
  error?: string;
}

const renderTable = (props: TableProps) =>
  render({
    render: () =>
      h(BApp, {}, () =>
        h(DXTable, {
          items: customerData,
          fields: customerFields,
          clientSide: true,
          striped: true,
          ...props,
        }),
      ),
  });

/** Distance from an element's left edge to the *inside* of the card's left border. */
const insetFromCardLeft = (card: HTMLElement, element: HTMLElement) =>
  element.getBoundingClientRect().left -
  card.getBoundingClientRect().left -
  parseFloat(getComputedStyle(card).borderLeftWidth);

/** Distance from the inside of the card's right border to an element's right edge. */
const insetFromCardRight = (card: HTMLElement, element: HTMLElement) =>
  card.getBoundingClientRect().right -
  parseFloat(getComputedStyle(card).borderRightWidth) -
  element.getBoundingClientRect().right;

describe('DXTable card mode renders the table flush to the card border', () => {
  beforeEach(() => {
    // getInitialPerPage prefers a stored per-page over the prop, which makes
    // DXTable tests order-dependent (see CLAUDE.md / #124).
    localStorage.removeItem('dxtable-perpage-table');
  });

  it('the table region reaches both card borders (no .card-body gutter)', async () => {
    const screen = renderTable({ card: true, title: 'Customers' });
    await flush();

    const card = screen.container.querySelector('.card') as HTMLElement;
    // The `.table-responsive` scroll container, NOT the `<table>`, is what is
    // measured on the right: a wide table overflows its scroll container, so a
    // right-edge check against the `<table>` reports a NEGATIVE inset and would
    // pass with the 24px gutter still in place — a vacuous assertion.
    const region = screen.container.querySelector('.table-responsive') as HTMLElement;
    const table = screen.container.querySelector('table') as HTMLElement;
    expect(region).toBeTruthy();
    expect(table).toBeTruthy();

    // Both were 24px (--bs-card-spacer-x) before the no-body change.
    expect(insetFromCardLeft(card, region)).toBeLessThan(1);
    expect(insetFromCardRight(card, region)).toBeLessThan(1);
    expect(insetFromCardLeft(card, table)).toBeLessThan(1);
  });

  it('the striped rows themselves reach the card border, not just the table box', async () => {
    const screen = renderTable({ card: true, title: 'Customers' });
    await flush();

    const card = screen.container.querySelector('.card') as HTMLElement;
    const row = screen.container.querySelector('tbody tr') as HTMLElement;
    expect(row).toBeTruthy();

    // Left edge only — see the note above: a wide row overflows the scroll
    // container, so its right inset is negative in both the broken and fixed
    // renders and proves nothing.
    expect(insetFromCardLeft(card, row)).toBeLessThan(1);
  });

  it('the error alert stays inset — it must not bleed into the card corners', async () => {
    const screen = renderTable({ card: true, title: 'Customers', error: 'Could not load' });
    await flush();

    const card = screen.container.querySelector('.card') as HTMLElement;
    const header = screen.container.querySelector('.card-header') as HTMLElement;
    const alert = screen.container.querySelector('.alert') as HTMLElement;
    expect(alert.textContent).toContain('Could not load');

    const padPx = parseFloat(getComputedStyle(header).paddingLeft);
    expect(insetFromCardLeft(card, alert)).toBeCloseTo(padPx, 0);
    expect(insetFromCardRight(card, alert)).toBeCloseTo(padPx, 0);
  });

  it('renders DCard in no-body mode — no .card-body wraps the content', async () => {
    const screen = renderTable({ card: true, title: 'Customers' });
    await flush();

    const card = screen.container.querySelector('.card') as HTMLElement;
    expect(card.querySelector(':scope > .card-body')).toBeNull();
  });

  it('clips the card so the flush table follows the border radius', async () => {
    const screen = renderTable({ card: true, title: 'Customers' });
    await flush();

    const card = screen.container.querySelector('.card') as HTMLElement;
    expect(getComputedStyle(card).overflow).toBe('hidden');
  });

  it('the card header keeps its padding', async () => {
    const screen = renderTable({ card: true, title: 'Customers' });
    await flush();

    const card = screen.container.querySelector('.card') as HTMLElement;
    const header = screen.container.querySelector('.card-header') as HTMLElement;
    const heading = header.querySelector('h4') as HTMLElement;
    expect(heading.textContent).toContain('Customers');

    // Bootstrap ties --bs-card-cap-padding-x to --bs-card-spacer-x, so the
    // header's own padding is the reference inset for "padded, not flush".
    const padPx = parseFloat(getComputedStyle(header).paddingLeft);
    expect(padPx).toBeGreaterThan(8);
    expect(insetFromCardLeft(card, heading)).toBeCloseTo(padPx, 0);
  });

  it('the pagination footer keeps its padding', async () => {
    const screen = renderTable({ card: true, title: 'Customers' });
    await flush();

    const card = screen.container.querySelector('.card') as HTMLElement;
    const header = screen.container.querySelector('.card-header') as HTMLElement;
    const pagination = screen.container.querySelector('.dx-table-pagination') as HTMLElement;
    expect(pagination).toBeTruthy();

    const padPx = parseFloat(getComputedStyle(header).paddingLeft);
    expect(parseFloat(getComputedStyle(pagination).paddingLeft)).toBeCloseTo(padPx, 0);
    expect(parseFloat(getComputedStyle(pagination).paddingRight)).toBeCloseTo(padPx, 0);
    expect(parseFloat(getComputedStyle(pagination).paddingBottom)).toBeGreaterThan(8);

    // And geometrically: the pager row is inset from the card border.
    const pagerRow = pagination.firstElementChild as HTMLElement;
    expect(insetFromCardLeft(card, pagerRow)).toBeCloseTo(padPx, 0);
  });
});

describe('DXTable plain mode (:card="false") is unchanged', () => {
  beforeEach(() => {
    localStorage.removeItem('dxtable-perpage-table');
  });

  it('renders no card at all', async () => {
    const screen = renderTable({ card: false, title: 'Customers' });
    await flush();

    expect(screen.container.querySelector('.card')).toBeNull();
    expect(screen.container.querySelector('.card-body')).toBeNull();
    expect(screen.container.querySelector('.dx-table-plain')).toBeTruthy();
  });

  it('the table still aligns with the plain wrapper, which is not clipped', async () => {
    const screen = renderTable({ card: false, title: 'Customers' });
    await flush();

    const plain = screen.container.querySelector('.dx-table-plain') as HTMLElement;
    const table = screen.container.querySelector('table') as HTMLElement;

    expect(table.getBoundingClientRect().left - plain.getBoundingClientRect().left).toBeLessThan(1);
    // The card-only `overflow: hidden` must not leak into the plain variant.
    expect(getComputedStyle(plain).overflow).toBe('visible');
  });

  it('the pagination footer gains no card padding', async () => {
    const screen = renderTable({ card: false, title: 'Customers' });
    await flush();

    const pagination = screen.container.querySelector('.dx-table-pagination') as HTMLElement;
    expect(parseFloat(getComputedStyle(pagination).paddingLeft)).toBe(0);
    expect(parseFloat(getComputedStyle(pagination).paddingRight)).toBe(0);
    expect(parseFloat(getComputedStyle(pagination).paddingBottom)).toBe(0);
  });
});

/*
 * `DXTableShell` is exercised directly here because DXTable always renders a
 * pager (its `pagination` prop carries a default), so the "table is the card's
 * last child" case — where a trailing margin would show as a white band inside
 * the clipped card — can't be reached through DXTable's props.
 */
describe('DXTableShell card mode leaves no trailing margin at the card bottom', () => {
  it('the last child sits on the card border', async () => {
    const screen = render({
      render: () =>
        h(BApp, {}, () =>
          h(DXTableShell, { card: true }, () => [
            h('div', { class: 'table-responsive' }, [
              h('table', { class: 'table' }, [h('tbody', [h('tr', [h('td', 'x')])])]),
            ]),
          ]),
        ),
    });
    await flush();

    const card = screen.container.querySelector('.card') as HTMLElement;
    const region = screen.container.querySelector('.table-responsive') as HTMLElement;
    expect(card.lastElementChild).toBe(region);
    // bvn gives `.table-responsive` a 1rem bottom margin; unclipped that shows
    // as a white band under the flush table.
    const bottomGap =
      card.getBoundingClientRect().bottom -
      parseFloat(getComputedStyle(card).borderBottomWidth) -
      region.getBoundingClientRect().bottom;
    expect(bottomGap).toBeLessThan(1);
  });
});
