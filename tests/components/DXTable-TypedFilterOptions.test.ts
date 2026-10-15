import { describe, it, expect, beforeEach } from 'vitest';
import { render } from 'vitest-browser-vue';
import { userEvent } from 'vitest/browser';
import { h } from 'vue';
import { BApp } from 'bootstrap-vue-next';
import DXTable from '../../resources/js/components/extended/DXTable.vue';

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/*
 * Static `filterOptions` built from records carry the record's own value type:
 * an id column offers NUMBER values, a flag column BOOLEAN ones. Picking one
 * used to hand that raw number/boolean to the filter map, where the "is this
 * filter active" check called `.trim()` on it and threw, so nothing filtered.
 */
const ITEMS = [
  { id: 1, name: 'Polish brass', unit_id: 1, is_current: true },
  { id: 2, name: 'Check softener', unit_id: 2, is_current: true },
  { id: 3, name: 'Wash towels', unit_id: 1, is_current: false },
];

const FIELDS = [
  { key: 'name', label: 'Name' },
  {
    key: 'unit_id',
    label: 'Unit',
    filter: 'select' as const,
    filterOptions: [
      { value: 1, text: 'Bar' },
      { value: 2, text: 'Brewery' },
    ],
  },
  {
    key: 'is_current',
    label: 'Current',
    filter: 'select' as const,
    filterOptions: [
      { value: true, text: 'current' },
      { value: false, text: 'not current' },
    ],
  },
];

const rowNames = (container: Element) =>
  Array.from(container.querySelectorAll('tbody tr td:first-child')).map((td) =>
    td.textContent?.trim(),
  );

const filterInputFor = (container: Element, columnIndex: number) =>
  container.querySelectorAll('.dx-table-filter-cell')[columnIndex].querySelector(
    'input',
  ) as HTMLInputElement;

/** Pick a select filter's option the way a user does: focus, type, click it. */
const pickOption = async (container: Element, columnIndex: number, text: string) => {
  const input = filterInputFor(container, columnIndex);
  await userEvent.click(input);
  await userEvent.fill(input, text);
  await wait(150);
  const option = Array.from(document.querySelectorAll('[role="option"]')).find(
    (el) => (el.textContent ?? '').trim() === text,
  ) as HTMLElement | undefined;
  expect(option, `option "${text}" should be offered`).toBeDefined();
  await userEvent.click(option!);
  await wait(150);
};

const renderTable = () =>
  render({
    render: () =>
      h(BApp, {}, () => h(DXTable, { items: ITEMS, clientSide: true, fields: FIELDS })),
  });

describe('DXTable client-side select filter with typed filterOptions', () => {
  beforeEach(() => {
    Object.keys(localStorage)
      .filter((key) => key.startsWith('dxtable-perpage-'))
      .forEach((key) => localStorage.removeItem(key));
  });

  it('filters by a numeric option value', async () => {
    const screen = renderTable();
    await flush();
    // Positive control: every row shows before the filter.
    expect(rowNames(screen.container)).toEqual(['Polish brass', 'Check softener', 'Wash towels']);

    await pickOption(screen.container, 1, 'Brewery');

    expect(rowNames(screen.container)).toEqual(['Check softener']);
    // The control shows what was picked, not a blank or the raw id.
    expect(filterInputFor(screen.container, 1).value).toBe('Brewery');
  });

  it('filters by a boolean option value, false included', async () => {
    const screen = renderTable();
    await flush();

    await pickOption(screen.container, 2, 'not current');

    expect(rowNames(screen.container)).toEqual(['Wash towels']);
    expect(filterInputFor(screen.container, 2).value).toBe('not current');
  });

  it('matches a numeric option against a controlled string filter', async () => {
    // A filter restored from a URL or v-model arrives as a string.
    const screen = render({
      render: () =>
        h(BApp, {}, () =>
          h(DXTable, {
            items: ITEMS,
            clientSide: true,
            fields: FIELDS,
            filters: { unit_id: '1' },
          }),
        ),
    });
    await flush();

    expect(rowNames(screen.container)).toEqual(['Polish brass', 'Wash towels']);
    expect(filterInputFor(screen.container, 1).value).toBe('Bar');
  });
});
