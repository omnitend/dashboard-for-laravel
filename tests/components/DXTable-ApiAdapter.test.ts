import { describe, it, expect, vi, afterEach } from 'vitest';
import { render } from 'vitest-browser-vue';
import { h } from 'vue';
import { BApp } from 'bootstrap-vue-next';
import DXTable from '../../resources/js/components/extended/DXTable.vue';
import { api } from '../../resources/js/utils/api';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const FIELDS = [{ key: 'name', label: 'Name', sortable: true }];

const rowNames = (container: Element) =>
  Array.from(container.querySelectorAll('tbody tr td:first-child')).map(
    (td) => td.textContent?.trim(),
  );

/*
 * The `api-adapter` prop (plan 2026-07-20-dxtable-033-provider-contract-
 * regression): consumers whose backend speaks a different convention (spatie
 * query-builder params, an envelope without dfl's `pagination` shape) used to
 * bridge via axios interceptors — a route #132 removed. The adapter is the
 * sanctioned seam: `request` maps the outgoing params, `response` maps the
 * body, and the built-in provider keeps its error handling and pager.
 */
describe('DXTable api-adapter', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('request adapter output is what actually goes on the wire', async () => {
    const sent: any[] = [];
    vi.spyOn(api, 'get').mockImplementation((_url: string, params: any) => {
      sent.push(params);
      return Promise.resolve({
        data: { data: [{ id: 1, name: 'A' }], pagination: { current_page: 1, per_page: 10, total: 1, from: 1, to: 1 } },
      }) as any;
    });

    render({
      render: () =>
        h(BApp, {}, () =>
          h(DXTable, {
            apiUrl: '/api/accounts',
            fields: FIELDS,
            sortBy: [{ key: 'name', order: 'asc' }],
            apiAdapter: {
              // The spatie-style translation a consumer shim performs.
              request: (params: Record<string, any>) => ({
                paginate: 'true',
                page: params.page,
                perPage: params.perPage,
                sort: (params.sortOrder === 'desc' ? '-' : '') + params.sortBy,
              }),
            },
          }),
        ),
    });
    await wait(80);

    expect(sent.length).toBeGreaterThan(0);
    expect(sent[0]).toEqual({ paginate: 'true', page: 1, perPage: 10, sort: 'name' });
    expect(sent[0]).not.toHaveProperty('sortBy');
  });

  it('response adapter maps a foreign envelope into rows + pagination, with the dfl params for context', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({
      // An LTApi-style body: total + rows, no dfl pagination object.
      data: { total: 42, data: [{ id: 1, name: 'Acme' }, { id: 2, name: 'Bolt' }] },
    } as any);

    const screen = render({
      render: () =>
        h(BApp, {}, () =>
          h(DXTable, {
            apiUrl: '/api/accounts',
            fields: FIELDS,
            apiAdapter: {
              response: (body: any, { params }: { params: Record<string, any> }) => ({
                data: body.data,
                pagination: {
                  current_page: params.page,
                  per_page: params.perPage,
                  total: body.total,
                  from: 1,
                  to: body.data.length,
                },
              }),
            },
          }),
        ),
    });
    await wait(120);

    expect(rowNames(screen.container)).toEqual(['Acme', 'Bolt']);
    // The synthesized pagination drives the footer (42 items over 10/page).
    expect(screen.container.textContent).toContain('42');
  });

  it('a bare-array response degrades to visible rows, not a silent empty table', async () => {
    // A backend that ignores pagination params and returns ALL rows as a bare
    // array used to render "No rows" — data present, nothing shown.
    vi.spyOn(api, 'get').mockResolvedValue({
      data: [{ id: 1, name: 'Acme' }, { id: 2, name: 'Bolt' }, { id: 3, name: 'Crux' }],
    } as any);

    const screen = render({
      render: () =>
        h(BApp, {}, () => h(DXTable, { apiUrl: '/api/accounts', fields: FIELDS })),
    });
    await wait(120);

    expect(rowNames(screen.container)).toEqual(['Acme', 'Bolt', 'Crux']);
  });
});
