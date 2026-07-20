import { describe, it, expect, vi, afterEach } from 'vitest';
import { render } from 'vitest-browser-vue';
import { h } from 'vue';
import { BApp } from 'bootstrap-vue-next';
import DXTable from '../../resources/js/components/extended/DXTable.vue';
import { api } from '../../resources/js/utils/api';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const FIELDS = [{ key: 'name', label: 'Name', sortable: true }];
const ITEMS = [
  { id: 1, name: 'Acme' },
  { id: 2, name: 'Bolt' },
  { id: 3, name: 'Cyan' },
];

const rowNames = (container: Element) =>
  Array.from(container.querySelectorAll('tbody tr td:first-child')).map(
    (td) => td.textContent?.trim(),
  );

const mount = (props: Record<string, any>) =>
  render({
    render: () => h(BApp, {}, () => h(DXTable, { fields: FIELDS, ...props })),
  });

/*
 * The discriminated `source` prop (#130). Each mode must drive IDENTICAL
 * internal logic to the legacy prop it replaces — the resolution layer routes
 * every read (mode detection, provider, client-side pipeline, inertia nav)
 * through `resolved*` computeds. These tests exercise the property that could
 * silently break: that `source` actually reaches those reads for every mode,
 * not just that it type-checks. A wiring miss renders an empty table or never
 * calls the provider — both asserted against here.
 */
describe('DXTable source prop (#130)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('source.client renders + paginates items locally', async () => {
    const { container } = mount({
      source: { mode: 'client', items: ITEMS },
      perPage: 2,
    });
    await wait(30);
    // Client-side pagination slices to perPage: 2 of 3 rows on page 1.
    expect(rowNames(container)).toEqual(['Acme', 'Bolt']);
  });

  it('source.inertia renders items directly (server-paginated)', async () => {
    const { container } = mount({
      source: { mode: 'inertia', items: ITEMS, url: '/customers' },
    });
    await wait(30);
    // Inertia mode renders items verbatim — no local slicing.
    expect(rowNames(container)).toEqual(['Acme', 'Bolt', 'Cyan']);
  });

  it('source.api fetches from the source url via the built-in provider', async () => {
    const sent: string[] = [];
    vi.spyOn(api, 'get').mockImplementation((url: string) => {
      sent.push(url);
      return Promise.resolve({
        data: {
          data: [{ id: 9, name: 'FromApi' }],
          pagination: { current_page: 1, per_page: 10, total: 1, from: 1, to: 1 },
        },
      }) as any;
    });

    const { container } = mount({ source: { mode: 'api', url: '/api/widgets' } });
    await wait(80);

    // The url threaded through source.url must reach api.get — proves the
    // provider path is wired, not just typed.
    expect(sent).toContain('/api/widgets');
    expect(rowNames(container)).toEqual(['FromApi']);
  });

  it('source.provider calls the given provider function', async () => {
    const provider = vi.fn().mockResolvedValue([{ id: 5, name: 'ProvRow' }]);

    const { container } = mount({ source: { mode: 'provider', provider } });
    await wait(80);

    expect(provider).toHaveBeenCalled();
    expect(rowNames(container)).toEqual(['ProvRow']);
  });

  it('refetches when the provider function is swapped (reactivity)', async () => {
    const providerA = vi.fn().mockResolvedValue([{ id: 1, name: 'FromA' }]);
    const providerB = vi.fn().mockResolvedValue([{ id: 2, name: 'FromB' }]);

    const { container, rerender } = render(DXTable, {
      props: { fields: FIELDS, provider: providerA },
    });
    await wait(80);
    expect(rowNames(container)).toEqual(['FromA']);

    // Swap the provider. effectiveProvider's identity is stable (#82), so this
    // only refetches because the explicit resolvedProvider watcher forces it.
    await rerender({ fields: FIELDS, provider: providerB });
    await wait(80);

    expect(providerB).toHaveBeenCalled();
    expect(rowNames(container)).toEqual(['FromB']);
  });

  it('switches from a failed provider to client mode: error gone, local rows shown', async () => {
    const provider = vi.fn().mockRejectedValue(new Error('boom'));
    const { container, rerender } = render(DXTable, {
      props: { fields: FIELDS, provider },
    });
    await wait(80);
    expect(container.querySelector('.alert-danger')).toBeTruthy();

    // Switch to client mode: the stale provider error must not render (gated on
    // isProviderMode) AND the local rows must appear (the mode is in the table
    // `:key`, so the DTable remounts instead of clinging to bvn's cached empty
    // provider result — otherwise it shows "No items found").
    await rerender({ fields: FIELDS, source: { mode: 'client', items: ITEMS } });
    await wait(80);
    expect(container.querySelector('.alert-danger')).toBeFalsy();
    expect(rowNames(container)).toContain('Acme');
  });

  it('a superseded provider that rejects late does not clobber the newer rows', async () => {
    // Provider A hangs then rejects; provider B resolves first. A's late
    // rejection must not publish an error over B's rendered rows (generation
    // token in wrappedProvider).
    let rejectA!: (e: Error) => void;
    const providerA = vi.fn(
      () => new Promise<any[]>((_resolve, reject) => { rejectA = reject; }),
    );
    const providerB = vi.fn().mockResolvedValue([{ id: 2, name: 'FromB' }]);

    const { container, rerender } = render(DXTable, {
      props: { fields: FIELDS, provider: providerA },
    });
    await wait(40);
    await rerender({ fields: FIELDS, provider: providerB });
    await wait(60);
    expect(rowNames(container)).toEqual(['FromB']);

    // Now A rejects, superseded — must be ignored.
    rejectA(new Error('A failed late'));
    await wait(40);
    expect(container.querySelector('.alert-danger')).toBeFalsy();
    expect(rowNames(container)).toEqual(['FromB']);
  });

  it('legacy props still work unchanged when source is omitted', async () => {
    const { container } = mount({ clientSide: true, items: ITEMS, perPage: 2 });
    await wait(30);
    expect(rowNames(container)).toEqual(['Acme', 'Bolt']);
  });
});
