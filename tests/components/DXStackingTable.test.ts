/**
 * DXStackingTable — a hand-built table that stacks into one card per row when
 * its CONTAINER (not the window) is narrower than `stackBelow`.
 *
 * What keeps these assertions honest:
 * - The window is fixed at a desktop size and asserted unchanged, so a pass can
 *   never be a media query firing. Only the host element's width moves.
 * - Resizes wait on a real ResizeObserver delivery, not a sleep.
 * - Layout is read from computed styles and rendered geometry (thead hidden,
 *   cells as blocks, the label's `::before` content), not from the class alone.
 *   The stacked CSS lives in theme.scss, so these read the BUILT dist/style.css
 *   (tests/setup.ts): run `npm run build:lib` after changing it.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-vue';
import { h, nextTick, ref } from 'vue';
import DXStackingTable from '../../resources/js/components/extended/DXStackingTable.vue';

const HOST = 'stacking-table-host';

async function settleResize(element: Element): Promise<void> {
  // Our observer must be younger than the component's, so its delivery lands
  // after the component has published the new width.
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

interface Line {
  id: number;
  name: string;
  note: string | null;
}

/**
 * An order-lines table shaped like the consumer's: a product-name title cell,
 * a price input group, a quantity input, a total, an optional full-width note
 * row joined to its line, and a footer total beside an `&nbsp;` filler.
 */
function mountOrderLines(
  hostWidth: number,
  props: Record<string, unknown> = {},
  lines = ref<Line[]>([
    { id: 1, name: 'Espresso beans 1kg', note: 'Price changed from £18.00' },
    { id: 2, name: 'Oat milk', note: null },
  ]),
) {
  const screen = render({
    setup() {
      return () =>
        h('div', { class: HOST, style: `width:${hostWidth}px` }, [
          h(DXStackingTable, props, () =>
            h('table', { class: 'table align-middle mb-0' }, [
              h('thead', [
                h('tr', [
                  h('th', 'Product'),
                  // Header markup that is NOT the column name: a sub-line the
                  // th's data-label overrides, and screen-reader-only text.
                  h('th', { 'data-label': 'Price' }, ['Price ', h('small', 'inc VAT')]),
                  h('th', ['Quantity', h('span', { class: 'visually-hidden' }, ' (units)')]),
                  h('th', { class: 'text-end' }, 'Total'),
                  h('th', h('span', { class: 'visually-hidden' }, 'Actions')),
                ]),
              ]),
              h(
                'tbody',
                lines.value.flatMap((line) => {
                  const rows = [
                    h('tr', { key: `line-${line.id}`, 'data-line': line.id }, [
                      h('td', { class: 'dx-stack-span' }, line.name),
                      h('td', [
                        h('div', { class: 'input-group' }, [
                          h('span', { class: 'input-group-text' }, '£'),
                          h('input', { class: 'form-control', value: '18.00' }),
                          h('span', { class: 'input-group-text' }, 'each'),
                        ]),
                      ]),
                      h('td', { 'data-label': 'Qty' }, [
                        h('input', { class: 'form-control', type: 'number', value: '2' }),
                      ]),
                      h('td', { class: 'text-end' }, '£36.00'),
                      h('td', { class: 'dx-stack-hide' }, h('button', 'x')),
                    ]),
                  ];
                  if (line.note !== null) {
                    rows.push(
                      h('tr', { key: `note-${line.id}`, class: 'dx-stack-continue' }, [
                        h('td', { colspan: 5 }, line.note),
                      ]),
                    );
                  }
                  return rows;
                }),
              ),
              h('tfoot', [
                h('tr', [
                  h('th', { colspan: 3 }, ' '),
                  h('th', { class: 'text-end' }, '£54.00'),
                  h('th'),
                ]),
              ]),
            ]),
          ),
        ]);
    },
  });
  const host = screen.container.querySelector(`.${HOST}`) as HTMLElement;
  const wrapper = screen.container.querySelector('.dx-stacking-table') as HTMLElement;
  const table = wrapper.querySelector('table') as HTMLTableElement;
  return { screen, host, wrapper, table, lines };
}

async function setHostWidth(host: HTMLElement, wrapper: HTMLElement, width: number) {
  host.style.width = `${width}px`;
  await settleResize(wrapper);
}

const isStackedClass = (wrapper: HTMLElement) =>
  wrapper.classList.contains('dx-stacking-table--stacked');

/** The label text the stacked layout paints before a cell ("none" when there is none). */
const labelOf = (cell: Element) => getComputedStyle(cell, '::before').content;

const firstLineCells = (table: HTMLTableElement) =>
  Array.from(table.tBodies[0].rows[0].cells);

describe('DXStackingTable', () => {
  let viewport: { width: number; height: number };

  beforeEach(async () => {
    await page.viewport(1280, 900);
    viewport = { width: window.innerWidth, height: window.innerHeight };
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const expectViewportUnchanged = () => {
    expect(window.innerWidth).toBe(viewport.width);
    expect(window.innerHeight).toBe(viewport.height);
  };

  it('is a normal table in a wide container and stacks into cards when the container narrows', async () => {
    const { screen, host, wrapper, table } = mountOrderLines(900);
    await settleResize(wrapper);

    expect(isStackedClass(wrapper)).toBe(false);
    expect(getComputedStyle(table.tHead!).display).toBe('table-header-group');
    expect(getComputedStyle(table.tBodies[0].rows[0]).display).toBe('table-row');
    // The labels exist on the cells but paint nothing in the wide layout.
    expect(labelOf(firstLineCells(table)[1])).toBe('none');
    expect(getComputedStyle(table.tFoot!.rows[0].cells[0]).display).toBe('table-cell');

    await setHostWidth(host, wrapper, 400);
    expectViewportUnchanged();

    expect(isStackedClass(wrapper)).toBe(true);
    expect(getComputedStyle(table.tHead!).display).toBe('none');
    const firstRow = table.tBodies[0].rows[0];
    const rowStyle = getComputedStyle(firstRow);
    expect(rowStyle.display).toBe('block');
    expect(rowStyle.borderTopStyle).toBe('solid');
    expect(parseFloat(rowStyle.borderTopWidth)).toBeGreaterThan(0);
    expect(parseFloat(rowStyle.borderTopLeftRadius)).toBeGreaterThan(0);

    // Every cell of the card sits inside the 400px container: nothing overflows.
    const wrapperRect = wrapper.getBoundingClientRect();
    expect(wrapperRect.width).toBeCloseTo(400, 0);
    for (const cell of firstLineCells(table).slice(0, 4)) {
      const rect = cell.getBoundingClientRect();
      expect(rect.left).toBeGreaterThanOrEqual(wrapperRect.left - 0.5);
      expect(rect.right).toBeLessThanOrEqual(wrapperRect.right + 0.5);
    }
    expect(wrapper.scrollWidth).toBeLessThanOrEqual(wrapper.clientWidth);

    screen.unmount();
  });

  it('defaults to stacking below 576px', async () => {
    const above = mountOrderLines(577);
    await settleResize(above.wrapper);
    expect(isStackedClass(above.wrapper)).toBe(false);
    above.screen.unmount();

    const below = mountOrderLines(575);
    await settleResize(below.wrapper);
    expect(isStackedClass(below.wrapper)).toBe(true);
    below.screen.unmount();
  });

  it('honours a custom stackBelow', async () => {
    const { screen, wrapper } = mountOrderLines(700, { stackBelow: 800 });
    await settleResize(wrapper);
    expect(isStackedClass(wrapper)).toBe(true);
    screen.unmount();
  });

  it('holds a crossing until the container grows past the hysteresis band', async () => {
    const { screen, host, wrapper } = mountOrderLines(900);
    await settleResize(wrapper);
    expect(isStackedClass(wrapper)).toBe(false);

    await setHostWidth(host, wrapper, 570);
    expect(isStackedClass(wrapper)).toBe(true);

    // Back over 576 but inside the 24px band: still stacked.
    await setHostWidth(host, wrapper, 590);
    expect(isStackedClass(wrapper)).toBe(true);

    await setHostWidth(host, wrapper, 610);
    expect(isStackedClass(wrapper)).toBe(false);

    screen.unmount();
  });

  it('labels each stacked cell with its column header', async () => {
    const { screen, wrapper, table } = mountOrderLines(400);
    await settleResize(wrapper);
    expect(isStackedClass(wrapper)).toBe(true);

    const [nameCell, priceCell, quantityCell, totalCell] = firstLineCells(table);

    // Derived from the header: th data-label beats the th's text ("Price",
    // not "Price inc VAT"); visually-hidden header text is not part of it.
    expect(priceCell.getAttribute('data-dx-stack-label')).toBe('Price');
    expect(quantityCell.getAttribute('data-dx-stack-label')).toBe('Quantity');
    expect(totalCell.getAttribute('data-dx-stack-label')).toBe('Total');

    expect(labelOf(priceCell)).toBe('"Price"');
    // A cell's own data-label wins over the derived one.
    expect(labelOf(quantityCell)).toBe('"Qty"');
    expect(labelOf(totalCell)).toBe('"Total"');

    // Label and content share one line of the card: the input group sits to
    // the right of the label, on the same row.
    const priceStyle = getComputedStyle(priceCell);
    expect(priceStyle.display).toBe('flex');
    const priceCellRect = priceCell.getBoundingClientRect();
    const inputGroupRect = priceCell.querySelector('.input-group')!.getBoundingClientRect();
    expect(inputGroupRect.left).toBeGreaterThan(priceCellRect.left + 20);
    expect(inputGroupRect.top).toBeLessThan(priceCellRect.top + 12);

    // The span cell is the card's title: no label, the full card width.
    expect(labelOf(nameCell)).toBe('none');
    expect(getComputedStyle(nameCell).display).toBe('block');
    expect(nameCell.getBoundingClientRect().width).toBeCloseTo(
      table.tBodies[0].rows[0].getBoundingClientRect().width -
        parseFloat(getComputedStyle(table.tBodies[0].rows[0]).paddingLeft) * 2 -
        parseFloat(getComputedStyle(table.tBodies[0].rows[0]).borderLeftWidth) * 2,
      0,
    );

    screen.unmount();
  });

  it('spans colspan cells, joins continuation rows, hides opted-out and empty filler cells', async () => {
    const { screen, wrapper, table } = mountOrderLines(400);
    await settleResize(wrapper);
    expect(isStackedClass(wrapper)).toBe(true);

    const [lineRow, noteRow] = Array.from(table.tBodies[0].rows);
    const noteCell = noteRow.cells[0];

    // colspan: belongs to no column, so no label and a plain block.
    expect(noteCell.hasAttribute('data-dx-stack-label')).toBe(false);
    expect(labelOf(noteCell)).toBe('none');
    expect(getComputedStyle(noteCell).display).toBe('block');

    // The note row continues the line's card: no gap, no seam between them.
    expect(noteRow.getBoundingClientRect().top).toBeCloseTo(
      lineRow.getBoundingClientRect().bottom,
      0,
    );
    expect(getComputedStyle(lineRow).borderBottomWidth).toBe('0px');
    expect(getComputedStyle(noteRow).borderTopWidth).toBe('0px');
    expect(parseFloat(getComputedStyle(noteRow).borderBottomWidth)).toBeGreaterThan(0);

    // .dx-stack-hide is gone when stacked.
    expect(getComputedStyle(lineRow.cells[4]).display).toBe('none');

    // Footer: the &nbsp; filler (no label, blank) is hidden; the total reads
    // "Total £54.00"; the blank cell under a visually-hidden header is hidden.
    const [filler, total, trailing] = Array.from(table.tFoot!.rows[0].cells);
    expect(getComputedStyle(filler).display).toBe('none');
    expect(labelOf(total)).toBe('"Total"');
    expect(getComputedStyle(total).display).toBe('flex');
    expect(getComputedStyle(trailing).display).toBe('none');

    // The second line has no note, so it is a separate card with its own gap.
    const secondLine = table.tBodies[0].rows[2];
    expect(parseFloat(getComputedStyle(noteRow).marginBottom)).toBeGreaterThan(0);
    expect(secondLine.getBoundingClientRect().top).toBeGreaterThan(
      noteRow.getBoundingClientRect().bottom + 4,
    );

    screen.unmount();
  });

  it('labels rows added after mount', async () => {
    const { screen, wrapper, table, lines } = mountOrderLines(400);
    await settleResize(wrapper);

    lines.value = [...lines.value, { id: 3, name: 'Decaf', note: null }];
    await nextTick();
    // MutationObserver callbacks are microtasks after the DOM change.
    await new Promise((resolve) => setTimeout(resolve, 0));

    const addedRow = table.querySelector('tr[data-line="3"]') as HTMLTableRowElement;
    expect(addedRow).not.toBeNull();
    expect(addedRow.cells[1].getAttribute('data-dx-stack-label')).toBe('Price');
    expect(labelOf(addedRow.cells[3])).toBe('"Total"');

    screen.unmount();
  });

  it('renders stacked when there is no ResizeObserver (SSR / unmeasured), like DXForm auto', async () => {
    vi.stubGlobal('ResizeObserver', undefined);
    const { screen, wrapper, table } = mountOrderLines(1000);
    await nextTick();
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(isStackedClass(wrapper)).toBe(true);
    expect(getComputedStyle(table.tHead!).display).toBe('none');
    screen.unmount();
  });

  it('disconnects its observers on unmount', async () => {
    const NativeResizeObserver = globalThis.ResizeObserver;
    const NativeMutationObserver = globalThis.MutationObserver;
    const resizeObservers: Array<{ disconnected: boolean }> = [];
    const mutationObservers: Array<{ disconnected: boolean }> = [];

    class TrackedResizeObserver extends NativeResizeObserver {
      disconnected = false;
      constructor(callback: ResizeObserverCallback) {
        super(callback);
        resizeObservers.push(this);
      }
      disconnect(): void {
        this.disconnected = true;
        super.disconnect();
      }
    }
    class TrackedMutationObserver extends NativeMutationObserver {
      disconnected = false;
      constructor(callback: MutationCallback) {
        super(callback);
        mutationObservers.push(this);
      }
      disconnect(): void {
        this.disconnected = true;
        super.disconnect();
      }
    }
    vi.stubGlobal('ResizeObserver', TrackedResizeObserver);
    vi.stubGlobal('MutationObserver', TrackedMutationObserver);

    const { screen, wrapper } = mountOrderLines(900);
    await settleResize(wrapper);
    // settleResize's own observer is one of these; it disconnects itself.
    const componentResizeObservers = resizeObservers.slice(0, 1);
    expect(componentResizeObservers.length).toBe(1);
    expect(mutationObservers.length).toBe(1);
    // Positive control: alive before unmount.
    expect(componentResizeObservers[0].disconnected).toBe(false);
    expect(mutationObservers[0].disconnected).toBe(false);

    screen.unmount();

    expect(componentResizeObservers[0].disconnected).toBe(true);
    expect(mutationObservers[0].disconnected).toBe(true);
  });
});
