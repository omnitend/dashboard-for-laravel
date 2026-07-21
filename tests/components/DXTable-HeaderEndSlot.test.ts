import { describe, it, expect, beforeEach } from 'vitest';
import { render } from 'vitest-browser-vue';
import { h } from 'vue';
import { BApp } from 'bootstrap-vue-next';
import DXTable from '../../resources/js/components/extended/DXTable.vue';

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const ITEMS = [
  { id: 1, name: 'Alpha', total: 10 },
  { id: 2, name: 'Beta', total: 32 },
];

const FIELDS = [
  { key: 'name', label: 'Name', sortable: true },
  {
    key: 'total',
    label: 'Total',
    sortable: true,
    hint: 'Net of VAT',
  },
];

/** The header `<th>` whose label text matches, from the real header row. */
const headerCellFor = (container: Element, label: string): HTMLTableCellElement => {
  const cell = Array.from(container.querySelectorAll('thead th')).find(
    (th) => th.querySelector('.fw-semibold')?.textContent?.trim() === label,
  ) as HTMLTableCellElement;
  expect(cell).toBeTruthy();
  return cell;
};

describe('DXTable additive per-column header-end slot (#99)', () => {
  beforeEach(() => {
    // DXTable persists a per-page preference in localStorage, which makes these
    // tests order-dependent (see CLAUDE.md). Clear every table's key.
    Object.keys(localStorage)
      .filter((key) => key.startsWith('dxtable-perpage-'))
      .forEach((key) => localStorage.removeItem(key));
  });

  it('renders head-end content inside the column header, keeping the sort indicator and hint', async () => {
    const screen = render({
      render: () =>
        h(
          BApp,
          {},
          () =>
            h(
              DXTable,
              { items: ITEMS, clientSide: true, fields: FIELDS },
              {
                'head-end(total)': () =>
                  h('span', { class: 'period-total' }, '£42.00'),
              },
            ),
        ),
    });
    await flush();

    const totalHeader = headerCellFor(screen.container, 'Total');

    // The value is in the SAME header cell as the column title …
    const slotContent = totalHeader.querySelector('.period-total');
    expect(slotContent).toBeTruthy();
    expect(slotContent?.textContent).toBe('£42.00');

    // … and the built-in chrome a `head()` override would have destroyed is
    // still there. This is the whole reason the slot is additive.
    expect(totalHeader.querySelector('.sort-indicator')).toBeTruthy();
    expect(totalHeader.textContent).toContain('Net of VAT');
    expect(totalHeader.querySelector('.fw-semibold')?.textContent?.trim()).toBe('Total');
  });

  it('places the head-end content before the sort indicator', async () => {
    const screen = render({
      render: () =>
        h(
          BApp,
          {},
          () =>
            h(
              DXTable,
              { items: ITEMS, clientSide: true, fields: FIELDS },
              { 'head-end(total)': () => h('span', { class: 'period-total' }, '£42.00') },
            ),
        ),
    });
    await flush();

    const totalHeader = headerCellFor(screen.container, 'Total');
    const headEnd = totalHeader.querySelector('.dx-head-end') as HTMLElement;
    const sortIndicator = totalHeader.querySelector('.sort-indicator') as HTMLElement;
    expect(headEnd).toBeTruthy();
    expect(sortIndicator).toBeTruthy();

    // DOCUMENT_POSITION_FOLLOWING: the sort indicator comes AFTER the slot, so
    // the value sits at the end of the title area and the sort arrows stay put
    // on the far right.
    expect(
      headEnd.compareDocumentPosition(sortIndicator) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('binds the field and the resolved label into the slot scope', async () => {
    const screen = render({
      render: () =>
        h(
          BApp,
          {},
          () =>
            h(
              DXTable,
              { items: ITEMS, clientSide: true, fields: FIELDS },
              {
                'head-end(total)': (scope: { field: { key: string }; label: string }) =>
                  h('span', { class: 'scope-probe' }, `${scope.field.key}:${scope.label}`),
              },
            ),
        ),
    });
    await flush();

    const probe = screen.container.querySelector('.scope-probe');
    expect(probe?.textContent).toBe('total:Total');
  });

  it('renders once, in the named column only', async () => {
    const screen = render({
      render: () =>
        h(
          BApp,
          {},
          () =>
            h(
              DXTable,
              { items: ITEMS, clientSide: true, fields: FIELDS },
              { 'head-end(total)': () => h('span', { class: 'period-total' }, '£42.00') },
            ),
        ),
    });
    await flush();

    // Rendered exactly once — not once per column, and not duplicated by the
    // generic slot forwarding.
    //
    // Honest scope note: this does NOT prove `head-end(...)` is excluded from
    // `forwardableSlotNames`. Verified by experiment — adding `head-end(` to
    // `TABLE_SLOT_PREFIXES` leaves this whole file green, because bvn silently
    // ignores a slot name it doesn't know. The exclusion is a code-level
    // invariant (see the `isTableSlot` comment), not an observable one.
    expect(screen.container.querySelectorAll('.period-total').length).toBe(1);
    expect(screen.container.querySelectorAll('.dx-head-end').length).toBe(1);

    // The other column's header is untouched.
    const nameHeader = headerCellFor(screen.container, 'Name');
    expect(nameHeader.querySelector('.dx-head-end')).toBeNull();
    expect(nameHeader.querySelector('.sort-indicator')).toBeTruthy();

    // And the body still renders normally.
    expect(screen.container.querySelectorAll('tbody tr').length).toBe(2);
  });

  it('coexists with the inner table\'s own foot(<key>) slot for the same column', async () => {
    // `head-end(total)` and `foot(total)` name the same column through two
    // different mechanisms — one DXTable renders itself, one it forwards to the
    // inner table. Each must land in its own row.
    const screen = render({
      render: () =>
        h(
          BApp,
          {},
          () =>
            h(
              DXTable,
              { items: ITEMS, clientSide: true, fields: FIELDS, footClone: true },
              {
                'head-end(total)': () => h('span', { class: 'period-total' }, '£42.00'),
                'foot(total)': () => h('span', { class: 'foot-total' }, '42'),
              },
            ),
        ),
    });
    await flush();

    const headEndInHead = screen.container.querySelector('thead .period-total');
    const footInFoot = screen.container.querySelector('tfoot .foot-total');
    expect(headEndInHead).toBeTruthy();
    expect(footInFoot).toBeTruthy();
    expect(screen.container.querySelector('tfoot .period-total')).toBeNull();
    expect(screen.container.querySelector('thead .foot-total')).toBeNull();
  });

  it('emits no wrapper at all when no head-end slot is supplied', async () => {
    const screen = render({
      render: () =>
        h(BApp, {}, () => h(DXTable, { items: ITEMS, clientSide: true, fields: FIELDS })),
    });
    await flush();

    // A table without the slot must render as it always did — no extra element
    // in the header cell.
    expect(screen.container.querySelectorAll('.dx-head-end').length).toBe(0);
    const totalHeader = headerCellFor(screen.container, 'Total');
    expect(totalHeader.querySelector('.sort-indicator')).toBeTruthy();
    expect(totalHeader.textContent).toContain('Net of VAT');
  });
});
