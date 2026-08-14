import { describe, it, expect, vi, afterEach } from 'vitest';
import { render } from 'vitest-browser-vue';
import { h } from 'vue';
import { BApp } from 'bootstrap-vue-next';
import DXTable from '../../resources/js/components/extended/DXTable.vue';
import { api } from '../../resources/js/utils/api';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const FIELDS = [
  { key: 'name', label: 'Name', sortable: true, filter: 'text' as const },
];

const rowNames = (container: Element) =>
  Array.from(container.querySelectorAll('tbody tr td:first-child')).map(
    (td) => td.textContent?.trim(),
  );

/*
 * Changing a column filter in API mode must reset to page 1 (as the Inertia
 * branch always has). Without the reset, typing a filter while sitting on
 * page 2+ of the unfiltered set requests page 2+ of the NARROWED set — the
 * server returns an empty page, and the user sees "no rows match your
 * filters" over a non-zero footer total. Found live on beer-duty-returns:
 * searching "gold" from page 2 of the beers table showed nothing while the
 * footer said "2 beers.".
 */
describe('DXTable filter change resets api page', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // A 25-row server: "Item 01".."Item 24" plus one "Funky Gold". Paginates
  // and name-filters exactly like a Laravel index endpoint.
  const allRows = [
    ...Array.from({ length: 24 }, (_, i) => ({
      id: i + 1,
      name: `Item ${String(i + 1).padStart(2, '0')}`,
    })),
    { id: 25, name: 'Funky Gold' },
  ];

  const serveIndex = (requests: any[]) =>
    vi.spyOn(api, 'get').mockImplementation((_url: string, params: any) => {
      requests.push(params);
      const nameFilter = (params?.filters?.name ?? '').toLowerCase();
      const matching = nameFilter
        ? allRows.filter((row) => row.name.toLowerCase().includes(nameFilter))
        : allRows;
      const perPage = params?.perPage ?? 10;
      const page = params?.page ?? 1;
      const rows = matching.slice((page - 1) * perPage, page * perPage);
      return Promise.resolve({
        data: {
          data: rows,
          pagination: {
            current_page: page,
            per_page: perPage,
            total: matching.length,
            from: rows.length ? (page - 1) * perPage + 1 : 0,
            to: (page - 1) * perPage + rows.length,
          },
        },
      }) as any;
    });

  it('typing a filter on page 2 requests page 1 and shows the matches', async () => {
    const requests: any[] = [];
    serveIndex(requests);

    const screen = render({
      render: () =>
        h(BApp, {}, () =>
          h(DXTable, {
            apiUrl: '/api/items',
            fields: FIELDS,
          }),
        ),
    });
    await wait(120);
    expect(rowNames(screen.container)).toContain('Item 01');

    // Go to page 2 of the unfiltered set
    const pageTwo = Array.from(
      screen.container.querySelectorAll('button, a'),
    ).find((el) => el.textContent?.trim() === '2') as HTMLElement;
    expect(pageTwo).toBeTruthy();
    pageTwo.click();
    await wait(150);
    expect(rowNames(screen.container)).toContain('Item 11');

    // Type a filter that narrows the set to ONE row
    const filterInput = screen.container.querySelector(
      'thead input',
    ) as HTMLInputElement;
    expect(filterInput).toBeTruthy();
    filterInput.value = 'gold';
    filterInput.dispatchEvent(new Event('input', { bubbles: true }));
    // Past the 300ms filter debounce plus the fetch
    await wait(600);

    // The narrowed request went to page 1, not the stale page 2
    const lastRequest = requests[requests.length - 1];
    expect(lastRequest.filters).toMatchObject({ name: 'gold' });
    expect(lastRequest.page).toBe(1);

    // And the match is visible — not an empty "past the end" page
    expect(rowNames(screen.container)).toEqual(['Funky Gold']);
  });

  it('filtering while already on page 1 still fetches exactly once', async () => {
    const requests: any[] = [];
    serveIndex(requests);

    const screen = render({
      render: () =>
        h(BApp, {}, () =>
          h(DXTable, {
            apiUrl: '/api/items',
            fields: FIELDS,
          }),
        ),
    });
    await wait(120);
    const requestsBefore = requests.length;

    const filterInput = screen.container.querySelector(
      'thead input',
    ) as HTMLInputElement;
    filterInput.value = 'gold';
    filterInput.dispatchEvent(new Event('input', { bubbles: true }));
    await wait(600);

    expect(rowNames(screen.container)).toEqual(['Funky Gold']);
    // One debounced filter change -> one request (the page-1 reset must not
    // double-fetch when the page was already 1)
    expect(requests.length).toBe(requestsBefore + 1);
  });
});
