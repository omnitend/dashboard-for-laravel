import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render } from 'vitest-browser-vue';
import { h, ref, nextTick } from 'vue';
import { BApp } from 'bootstrap-vue-next';
import DXTable from '../../resources/js/components/extended/DXTable.vue';

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// A stored per-page preference would win over the perPage prop (getInitialPerPage
// prefers localStorage), making these order-dependent. See CLAUDE.md.
const PER_PAGE_KEY = 'dxtable-perpage-table';
beforeEach(() => localStorage.removeItem(PER_PAGE_KEY));
afterEach(() => localStorage.removeItem(PER_PAGE_KEY));

const columnText = (container: HTMLElement, columnIndex: number) =>
  [...container.querySelectorAll('tbody tr')].map(
    (row) => row.querySelectorAll('td')[columnIndex]?.textContent?.trim() ?? '',
  );

const clickHeader = async (container: HTMLElement, label: string) => {
  const header = [...container.querySelectorAll('thead tr:last-child th')].find((th) =>
    th.textContent?.includes(label),
  ) as HTMLElement;
  header.click();
  await wait(120);
};

/**
 * #121. A field key containing a dot was unusable client-side.
 *
 * bootstrap-vue-next cannot render a dotted field key in EITHER payload shape:
 * its `mapItem` un-flattens any item key containing a dot
 * (`{'paid_by.card': v}` -> `{paid_by: {card: v}}`) and then the cell reads
 * `item['paid_by.card']` flat and gets undefined — so it breaks the one shape it
 * looks like it was meant to support. Meanwhile DXTable's own client-side sort
 * and filter read `item[key]` flat, which a NESTED payload (what Laravel
 * actually serialises for a relation) never satisfies.
 *
 * So consumers hand-rolled "flatten nested keys to _x aliases" in every
 * client-side port. DXTable now resolves a field's value itself — literal key
 * first, then dot-path — for cells, sort and filter.
 */
describe('DXTable client-side dotted field keys (#121)', () => {
  // The shape Laravel serialises for a relation.
  const nestedRows = [
    { id: 1, name: 'Beta', paid_by: { card: 'Visa' } },
    { id: 2, name: 'Alpha', paid_by: { card: 'Amex' } },
    { id: 3, name: 'Gamma', paid_by: { card: 'Maestro' } },
  ];

  const fields = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'paid_by.card', label: 'Card', sortable: true, filter: 'text' as const },
  ];

  const renderTable = (items: any[] = nestedRows, tableFields: any[] = fields) =>
    render({
      render: () =>
        h(BApp, {}, () => h(DXTable, { items, fields: tableFields, clientSide: true })),
    });

  it('renders a dotted key against a nested payload', async () => {
    const screen = renderTable();
    await flush();

    // The whole bug: bvn renders an empty <td> here, in both payload shapes.
    expect(columnText(screen.container, 1)).toEqual(['Visa', 'Amex', 'Maestro']);
  });

  it('renders a dotted key against a dots-flat payload too', async () => {
    // bvn's mapItem un-flattens this shape, so resolving by path still finds it.
    const screen = renderTable([
      { id: 1, name: 'Beta', 'paid_by.card': 'Visa' },
      { id: 2, name: 'Alpha', 'paid_by.card': 'Amex' },
    ]);
    await flush();

    expect(columnText(screen.container, 1)).toEqual(['Visa', 'Amex']);
  });

  it('sorts by a dotted key', async () => {
    const screen = renderTable();
    await flush();

    await clickHeader(screen.container, 'Card');

    // Sort read item['paid_by.card'] flat -> undefined for every row -> no reorder.
    expect(columnText(screen.container, 1)).toEqual(['Amex', 'Maestro', 'Visa']);
    expect(columnText(screen.container, 0)).toEqual(['Alpha', 'Gamma', 'Beta']);
  });

  it('sorts by a dotted key descending on the second click', async () => {
    const screen = renderTable();
    await flush();

    await clickHeader(screen.container, 'Card');
    await clickHeader(screen.container, 'Card');

    expect(columnText(screen.container, 1)).toEqual(['Visa', 'Maestro', 'Amex']);
  });

  it('filters by a dotted key', async () => {
    const screen = renderTable();
    await flush();

    const filterInput = screen.container.querySelector('.filter-row input') as HTMLInputElement;
    filterInput.value = 'ma';
    filterInput.dispatchEvent(new Event('input', { bubbles: true }));
    await wait(60);

    // Client-side filtering is immediate (no debounce), and matches Maestro only.
    expect(columnText(screen.container, 1)).toEqual(['Maestro']);
  });

  it('leaves plain (undotted) keys working exactly as before', async () => {
    const screen = renderTable();
    await flush();

    await clickHeader(screen.container, 'Name');

    expect(columnText(screen.container, 0)).toEqual(['Alpha', 'Beta', 'Gamma']);
  });

  it('does not override a consumer cell slot for a dotted key', async () => {
    const screen = render({
      render: () =>
        h(BApp, {}, () =>
          h(
            DXTable,
            { items: nestedRows, fields, clientSide: true },
            { 'cell(paid_by.card)': ({ item }: any) => h('em', `custom:${item.paid_by.card}`) },
          ),
        ),
    });
    await flush();

    expect(columnText(screen.container, 1)).toEqual([
      'custom:Visa',
      'custom:Amex',
      'custom:Maestro',
    ]);
  });

  it('renders an empty cell for a missing nested path rather than throwing', async () => {
    const screen = renderTable([
      { id: 1, name: 'Beta', paid_by: { card: 'Visa' } },
      { id: 2, name: 'Alpha', paid_by: null },
      { id: 3, name: 'Gamma' },
    ]);
    await flush();

    expect(columnText(screen.container, 1)).toEqual(['Visa', '', '']);
  });

  // bvn captures its cell-slot set at mount (#114), so a dotted column that only
  // appears AFTER mount (data-driven columns resolved by a fetch) would add a
  // `cell(...)` slot bvn ignores and render empty — unless the inner table
  // remounts. The dotted-cell field keys are folded into its remount signature
  // for exactly this, mirroring how a consumer's late `cell(...)` slot is handled.
  it('renders a dotted key that only appears after mount (data-driven columns)', async () => {
    const rows = [
      { id: 1, name: 'Beta', paid_by: { card: 'Visa' } },
      { id: 2, name: 'Alpha', paid_by: { card: 'Amex' } },
    ];
    const lateFields = ref<any[]>([{ key: 'name', label: 'Name' }]);

    const screen = render({
      render: () =>
        h(BApp, {}, () => h(DXTable, { items: rows, fields: lateFields.value, clientSide: true })),
    });
    await flush();

    // The dotted column arrives after a fetch would have resolved.
    lateFields.value = [
      { key: 'name', label: 'Name' },
      { key: 'paid_by.card', label: 'Card' },
    ];
    await nextTick();
    await wait(80);

    expect(columnText(screen.container, 1)).toEqual(['Visa', 'Amex']);
  });
});
