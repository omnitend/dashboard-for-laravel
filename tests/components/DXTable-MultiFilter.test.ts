import { describe, it, expect, vi, afterEach } from 'vitest';
import { render } from 'vitest-browser-vue';
import { userEvent } from 'vitest/browser';
import { h, ref, reactive } from 'vue';
import { BApp } from 'bootstrap-vue-next';
import DXTable from '../../resources/js/components/extended/DXTable.vue';
import { api } from '../../resources/js/utils/api';

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const ITEMS = [
  { id: 1, name: 'Alpha', status: 'active' },
  { id: 2, name: 'Beta', status: 'pending' },
  { id: 3, name: 'Gamma', status: 'archived' },
  { id: 4, name: 'Delta', status: null },
];

const FIELDS = [
  { key: 'name', label: 'Name' },
  {
    key: 'status',
    label: 'Status',
    filter: 'select' as const,
    filterMultiple: true,
    filterNullText: 'No status',
    filterOptions: [
      { value: 'active', text: 'Active' },
      { value: 'pending', text: 'Pending' },
      { value: 'archived', text: 'Archived' },
    ],
  },
];

const rowNames = (container: Element) =>
  Array.from(container.querySelectorAll('tbody tr td:first-child')).map(
    (td) => td.textContent?.trim(),
  );

describe('DXTable multi-value select filters (#51)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('client-side: an array filter matches the UNION of its values', async () => {
    const screen = render({
      render: () =>
        h(BApp, {}, () =>
          h(DXTable, {
            items: ITEMS,
            clientSide: true,
            fields: FIELDS,
            filters: { status: ['active', 'pending'] },
          }),
        ),
    });
    await flush();

    expect(rowNames(screen.container)).toEqual(['Alpha', 'Beta']);
  });

  it('client-side: the null sentinel inside the array matches absent values', async () => {
    const screen = render({
      render: () =>
        h(BApp, {}, () =>
          h(DXTable, {
            items: ITEMS,
            clientSide: true,
            fields: FIELDS,
            filters: { status: ['archived', 'null'] },
          }),
        ),
    });
    await flush();

    expect(rowNames(screen.container)).toEqual(['Gamma', 'Delta']);
  });

  it('client-side: an EMPTY array filter shows every row', async () => {
    const screen = render({
      render: () =>
        h(BApp, {}, () =>
          h(DXTable, {
            items: ITEMS,
            clientSide: true,
            fields: FIELDS,
            filters: { status: [] },
          }),
        ),
    });
    await flush();

    expect(rowNames(screen.container).length).toBe(4);
  });

  it('selecting options in the multi filter emits an accumulating array', async () => {
    // Real v-model usage: a listener flips DXTable into controlled-filters
    // mode, so the consumer must feed the emitted map back for the selection
    // to accumulate — bind, don't just listen.
    const filters = ref<Record<string, string | string[]>>({});
    const emitted: Array<Record<string, unknown>> = [];
    const screen = render({
      render: () =>
        h(BApp, {}, () =>
          h(DXTable, {
            items: ITEMS,
            clientSide: true,
            fields: FIELDS,
            filters: filters.value,
            'onUpdate:filters': (f: Record<string, string | string[]>) => {
              filters.value = f;
              emitted.push(f);
            },
          }),
        ),
    });
    await flush();

    const filterInput = screen.container.querySelector(
      '.filter-row input',
    ) as HTMLInputElement;
    expect(filterInput).not.toBeNull();

    // bvn's option list only mounts once the user TYPES (see CLAUDE.md).
    await userEvent.click(filterInput);
    await userEvent.fill(filterInput, 'act');
    await wait(120);
    const option = Array.from(
      document.querySelectorAll('[role="option"]'),
    ).find((el) => el.textContent?.includes('Active')) as HTMLElement;
    expect(option).toBeTruthy();
    await userEvent.click(option);
    await wait(120);

    expect(emitted.at(-1)).toEqual({ status: ['active'] });

    await userEvent.fill(filterInput, 'pen');
    await wait(120);
    const pending = Array.from(
      document.querySelectorAll('[role="option"]'),
    ).find((el) => el.textContent?.includes('Pending')) as HTMLElement;
    expect(pending).toBeTruthy();
    await userEvent.click(pending);
    await wait(120);

    expect(emitted.at(-1)).toEqual({ status: ['active', 'pending'] });
    expect(rowNames(screen.container)).toEqual(['Alpha', 'Beta']);
  });

  it('a controlled filter array mutated IN PLACE still refreshes provider data (Codex P2)', async () => {
    // The old watcher compared JSON of the same object reference, so a
    // consumer doing `filters.status.push(...)` never triggered a refetch.
    const requests: any[] = [];
    vi.spyOn(api, 'get').mockImplementation((_url: string, params: any) => {
      requests.push(JSON.parse(JSON.stringify(params ?? {})));
      return Promise.resolve({
        data: { data: [], pagination: { current_page: 1, per_page: 10, total: 0, from: 0, to: 0 } },
      }) as any;
    });

    const filters = reactive<Record<string, string | string[]>>({ status: ['active'] });
    render({
      render: () =>
        h(BApp, {}, () =>
          h(DXTable, {
            apiUrl: '/api/things',
            fields: FIELDS,
            filters,
            'onUpdate:filters': () => {},
          }),
        ),
    });
    await wait(80);
    const before = requests.length;
    expect(before).toBeGreaterThan(0);

    (filters.status as string[]).push('pending');
    await wait(120);

    const after = requests.filter(
      (p) => JSON.stringify(p.filters?.status) === JSON.stringify(['active', 'pending']),
    );
    expect(requests.length).toBeGreaterThan(before);
    expect(after.length).toBeGreaterThan(0);
  });

  it('multiple mode omits the "All …" sentinel row from the options', async () => {
    const screen = render({
      render: () =>
        h(BApp, {}, () => h(DXTable, { items: ITEMS, clientSide: true, fields: FIELDS })),
    });
    await flush();

    const filterInput = screen.container.querySelector(
      '.filter-row input',
    ) as HTMLInputElement;
    await userEvent.click(filterInput);
    await userEvent.fill(filterInput, 'a');
    await wait(120);

    const optionTexts = Array.from(document.querySelectorAll('[role="option"]')).map(
      (el) => el.textContent ?? '',
    );
    expect(optionTexts.some((t) => t.includes('All Status'))).toBe(false);
  });
});
