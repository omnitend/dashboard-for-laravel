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
 *
 * #166 then moved the radius clipping OFF the card and onto the flush table
 * region, so the card no longer cuts off a consumer's non-teleported overlay in
 * a slot. Geometry can't see that at all — an overlay's rect is identical
 * clipped or not — so those assertions hit-test with `elementFromPoint` instead.
 *
 * One thing deliberately NOT asserted: an absolutely-positioned overlay in a
 * `cell(<key>)` slot escaping the table. Bootstrap's `.table-responsive` is a
 * scroll container (`overflow-x: auto`), so it clipped cell content before this
 * change and still does; only `:responsive="false"` ever let a cell overlay out,
 * and there the flush table now clips at its own (card-width) box instead.
 */

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

interface TableProps {
  card: boolean;
  title?: string;
  clientSide?: boolean;
  error?: string;
  responsive?: boolean;
}

const renderTable = (props: TableProps, slots?: Record<string, () => unknown>) =>
  render({
    render: () =>
      // The margin guarantees viewport room on every side of the card, so the
      // hit-tests below can probe points OUTSIDE it without falling off-screen
      // (elementFromPoint returns null for negative coordinates, which would
      // make an "is it reachable?" assertion fail for the wrong reason).
      h('div', { style: 'margin: 120px' }, [
        h(BApp, {}, () =>
          h(
            DXTable,
            {
              items: customerData,
              fields: customerFields,
              clientSide: true,
              striped: true,
              ...props,
            },
            slots,
          ),
        ),
      ]),
  });

/*
 * The theme's card radius is 0.5rem (8px), whose corner arc is too shallow to
 * hit-test against sub-pixel geometry: a point 3px in from the corner still
 * falls INSIDE an 8px arc. So the probe inflates the two Bootstrap card tokens
 * the rules under test actually read — `--bs-card-border-radius` for the card
 * and `--bs-card-inner-border-radius` for the flush table region — leaving the
 * rules themselves untouched. (Setting `--bs-border-radius` does nothing here:
 * Bootstrap compiles the card tokens from Sass values, not from that variable.)
 */
const PROBE_RADIUS = 24;
const PROBE_INNER_RADIUS = 23; // radius minus the card's 1px border

/**
 * Hit-test a point 3px inside a card corner — comfortably OUTSIDE a 24px arc
 * (distance from the arc centre is ~29.7px). Returns the topmost element
 * painted there.
 *
 * Presence would prove nothing here (the table is in the DOM clipped or not),
 * so this asks the question that actually differs: is the table region still
 * *reachable* in the corner the card border curves away from?
 */
const cornerHit = (card: HTMLElement, corner: 'top' | 'bottom' = 'top') => {
  card.style.setProperty('--bs-card-border-radius', `${PROBE_RADIUS}px`);
  card.style.setProperty('--bs-card-inner-border-radius', `${PROBE_INNER_RADIUS}px`);
  const rect = card.getBoundingClientRect();
  const y = corner === 'top' ? rect.top + 3 : rect.bottom - 3;
  return document.elementFromPoint(rect.left + 3, y);
};

/** True when `element` is the hit target or an ancestor of it. */
const hitLandsInside = (hit: Element | null, element: Element | null) =>
  Boolean(hit && element && (hit === element || element.contains(hit)));

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

  it('the flush table region follows the card radius (responsive)', async () => {
    // No title => no `.card-header`, so the table region IS the card's first
    // child and therefore the thing sitting on the rounded top corners.
    const screen = renderTable({ card: true });
    await flush();

    const card = screen.container.querySelector('.card') as HTMLElement;
    const region = screen.container.querySelector('.table-responsive') as HTMLElement;
    expect(card.firstElementChild).toBe(region);

    // Unrounded, the table's square corner paints over the card border and this
    // hit-test lands on a <th>. Measured: `TH` unrounded, `DIV.card` rounded.
    expect(hitLandsInside(cornerHit(card), region)).toBe(false);
  });

  it('the flush table region follows the card radius with :responsive="false"', async () => {
    const screen = renderTable({ card: true, responsive: false });
    await flush();

    const card = screen.container.querySelector('.card') as HTMLElement;
    const table = screen.container.querySelector('table') as HTMLElement;
    // With responsive off there is no `.table-responsive` wrapper — the bare
    // table sits at the card edge, and `border-radius` alone does NOT round the
    // collapsed-border cell backgrounds, so the shell has to clip it explicitly.
    expect(screen.container.querySelector('.table-responsive')).toBeNull();
    expect(card.firstElementChild).toBe(table);

    expect(hitLandsInside(cornerHit(card), table)).toBe(false);
  });

  it('the card itself does not clip — slot overlays stay reachable (#166)', async () => {
    const screen = renderTable({ card: true, title: 'Customers' }, {
      header: () =>
        h('div', { style: 'position: relative' }, [
          h('div', {
            class: 'flush-probe-overlay',
            style:
              'position: absolute; top: 0; left: -80px; width: 60px; height: 40px; background: red',
          }),
        ]),
    });
    await flush();

    const card = screen.container.querySelector('.card') as HTMLElement;
    const overlay = screen.container.querySelector('.flush-probe-overlay') as HTMLElement;
    expect(overlay).toBeTruthy();

    // The rect is IDENTICAL clipped or not, so geometry alone proves nothing —
    // and `querySelector` finding the overlay proves less than nothing. What
    // differs is whether the overlay is painted/hit-testable outside the card,
    // so probe its centre, first checking that centre really is outside.
    const overlayRect = overlay.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    const probeX = overlayRect.left + overlayRect.width / 2;
    const probeY = overlayRect.top + overlayRect.height / 2;
    expect(probeX).toBeGreaterThan(0);
    expect(probeX).toBeLessThan(cardRect.left);

    expect(hitLandsInside(document.elementFromPoint(probeX, probeY), overlay)).toBe(true);
    expect(getComputedStyle(card).overflow).not.toBe('hidden');
  });

  it('the flush table region still scrolls horizontally', async () => {
    // Trap in #166: `.table-responsive` carries `overflow-x: auto`, so clipping
    // the radius by adding `overflow: hidden` there would kill scrolling — and
    // the flush look would survive, hiding the breakage. Assert the scroll.
    const screen = renderTable({ card: true, title: 'Customers' });
    await flush();

    const region = screen.container.querySelector('.table-responsive') as HTMLElement;
    const table = screen.container.querySelector('table') as HTMLElement;
    table.style.width = '3000px';

    expect(region.scrollWidth).toBeGreaterThan(region.clientWidth);
    region.scrollLeft = 50;
    expect(region.scrollLeft).toBe(50);
    // The load-bearing assertion: `scrollLeft` is settable on an
    // `overflow: hidden` box too, so the two lines above stay GREEN if the
    // radius is ever "fixed" by clipping here. Only the computed overflow
    // distinguishes a scrollable region from a clipped one. Verified: adding
    // `overflow: hidden` to `.table-responsive` fails this line and no other.
    expect(getComputedStyle(region).overflowX).toBe('auto');
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
    // No card, no corners to follow — nothing in the plain variant may clip.
    expect(getComputedStyle(plain).overflow).toBe('visible');
    expect(getComputedStyle(table).overflow).toBe('visible');
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

  it('rounds the BOTTOM corners when the table region is the last child', async () => {
    const screen = render({
      render: () =>
        h('div', { style: 'margin: 120px' }, [
          h(BApp, {}, () =>
            h(DXTableShell, { card: true }, () => [
              h('div', { class: 'table-responsive' }, [
                h('table', { class: 'table' }, [h('tbody', [h('tr', [h('td', 'x')])])]),
              ]),
            ]),
          ),
        ]),
    });
    await flush();

    const card = screen.container.querySelector('.card') as HTMLElement;
    const region = screen.container.querySelector('.table-responsive') as HTMLElement;
    expect(hitLandsInside(cornerHit(card, 'bottom'), region)).toBe(false);
  });
});
