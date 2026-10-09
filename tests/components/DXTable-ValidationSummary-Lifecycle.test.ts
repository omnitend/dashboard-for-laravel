import { describe, it, expect, vi, afterEach } from 'vitest';
import { render } from 'vitest-browser-vue';
import { h } from 'vue';
import { BApp } from 'bootstrap-vue-next';
import DXTable from '../../resources/js/components/extended/DXTable.vue';

/*
 * #194 review: DXTable's modal is reopened for another row (or for create)
 * after a failed save. Each open is a new session: the previous session's
 * failure summary must not show over it, and a response still in flight from
 * the previous session must not record onto it (or close it). Real responses
 * through the real API client, `fetch` stubbed.
 */

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const rows = [
  { id: 1, name: 'Electronics', slug: 'electronics' },
  { id: 2, name: 'Garden', slug: 'garden' },
];
const fields = [
  { key: 'name', label: 'Name' },
  { key: 'slug', label: 'Slug' },
];
const editFields = [
  { key: 'name', type: 'text', label: 'Name' },
  { key: 'slug', type: 'text', label: 'Slug' },
];

const GENERIC = 'The given data was invalid.';
// A key with no rendered field: only the summary can show it.
const UNRENDERED = { warehouse_id: ['The warehouse is closed for stocktake.'] };

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

/** Every fetch waits for the test; resolvers in call order. */
function deferredFetches() {
  const resolvers: Array<(response: Response) => void> = [];
  const spy = vi.spyOn(globalThis, 'fetch').mockImplementation(
    () => new Promise<Response>((resolve) => resolvers.push(resolve)),
  );
  return { resolvers, spy };
}

function immediate(...responses: Array<() => Response>) {
  const queue = [...responses];
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
    const next = queue.shift();
    if (!next) throw new Error('unexpected fetch');
    return next();
  });
}

function renderTable(listeners: Record<string, (...args: any[]) => void> = {}) {
  return render({
    render: () =>
      h(BApp, {}, () =>
        h(DXTable, {
          items: rows,
          fields,
          editFields,
          itemName: 'category',
          editUrl: '/api/categories/:id',
          createUrl: '/api/categories',
          ...listeners,
        }),
      ),
  });
}

const modalButton = (startsWith: string) =>
  Array.from(document.querySelectorAll<HTMLButtonElement>('.modal button')).find(
    (button) => button.offsetParent !== null && button.textContent?.trim()?.startsWith(startsWith),
  );

const visibleModal = () =>
  Array.from(document.querySelectorAll<HTMLElement>('.modal')).find(
    (modal) => modal.offsetParent !== null || getComputedStyle(modal).display === 'block',
  );

/** Visible alerts inside the open modal (summary or otherwise). */
const modalAlerts = () => {
  const modal = visibleModal();
  if (!modal) return [];
  return Array.from(modal.querySelectorAll<HTMLElement>('.alert')).filter(
    (alert) => alert.offsetParent !== null && alert.getBoundingClientRect().height > 0,
  );
};

const modalTitle = () => visibleModal()?.querySelector('.modal-title')?.textContent?.trim() ?? '';

async function openRow(screen: ReturnType<typeof renderTable>, index: number) {
  await flush();
  (screen.container.querySelectorAll('tbody tr')[index] as HTMLElement).click();
  await wait(150);
}

async function openCreate(screen: ReturnType<typeof renderTable>) {
  await flush();
  const newButton = Array.from(screen.container.querySelectorAll('button')).find(
    (button) => button.textContent?.trim() === 'New category',
  ) as HTMLElement;
  newButton.click();
  await wait(150);
}

async function cancel() {
  modalButton('Cancel')!.click();
  await wait(400);
}

describe('DXTable modal: each open is a new session (#194 review)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.querySelectorAll('.toast').forEach((toast) => toast.remove());
  });

  it("row A's failure summary is not shown on row B, nor on create", async () => {
    immediate(() => json(422, { message: GENERIC, errors: UNRENDERED }));
    const screen = renderTable();

    await openRow(screen, 0);
    modalButton('Save')!.click();
    await wait(300);
    // Positive control: row A shows its summary.
    const alertsOnA = modalAlerts();
    expect(alertsOnA.length).toBe(1);
    expect(alertsOnA[0].textContent).toContain('The warehouse is closed for stocktake.');

    await cancel();
    await openRow(screen, 1);
    expect(visibleModal()).toBeTruthy();
    expect(modalButton('Save')).toBeTruthy();
    expect(modalAlerts()).toEqual([]);

    await cancel();
    await openCreate(screen);
    expect(modalButton('Create')).toBeTruthy();
    expect(modalAlerts()).toEqual([]);
  });

  it("a slow 422 from row A's save, arriving after row B opens, records nothing on B", async () => {
    const { resolvers } = deferredFetches();
    const screen = renderTable();

    await openRow(screen, 0);
    modalButton('Save')!.click();
    await wait(100);
    expect(resolvers.length).toBe(1);

    await cancel();
    await openRow(screen, 1);
    expect(modalTitle()).toContain('Edit');

    resolvers[0](json(422, { message: GENERIC, errors: UNRENDERED }));
    await wait(300);

    expect(visibleModal()).toBeTruthy();
    expect(modalAlerts()).toEqual([]);
    // B's own Save is usable: not stuck on A's pending save.
    const save = modalButton('Save');
    expect(save).toBeTruthy();
    expect(save!.disabled).toBe(false);
  });

  it("a slow success from row A's save does not close row B's modal; rowUpdated names row A", async () => {
    const { resolvers } = deferredFetches();
    const rowUpdated = vi.fn();
    const screen = renderTable({ onRowUpdated: rowUpdated });

    await openRow(screen, 0);
    modalButton('Save')!.click();
    await wait(100);
    await cancel();
    await openRow(screen, 1);

    resolvers[0](json(200, { data: { id: 1 } }));
    await wait(400);

    expect(rowUpdated).toHaveBeenCalledTimes(1);
    expect(rowUpdated.mock.calls[0][0].id).toBe(1);
    expect(visibleModal()).toBeTruthy();
    expect(modalButton('Save')).toBeTruthy();
  });

  it('row B can save while row A\'s abandoned save is still in flight', async () => {
    const { resolvers, spy } = deferredFetches();
    const screen = renderTable();

    await openRow(screen, 0);
    modalButton('Save')!.click();
    await wait(100);
    await cancel();
    await openRow(screen, 1);

    modalButton('Save')!.click();
    await wait(100);
    expect(spy.mock.calls.length).toBe(2);
    expect(String(spy.mock.calls[1][0])).toContain('/api/categories/2');

    // A settling while B's save is in flight leaves B's save pending.
    resolvers[0](json(200, { data: { id: 1 } }));
    await wait(300);
    expect(visibleModal()).toBeTruthy();
    expect(modalButton('Sav')!.getAttribute('aria-busy')).toBe('true');

    resolvers[1](json(422, { message: GENERIC, errors: UNRENDERED }));
    await wait(300);
    expect(modalAlerts().length).toBe(1);
    expect(modalButton('Save')!.getAttribute('aria-busy')).toBeNull();
    expect(modalButton('Save')!.disabled).toBe(false);
  });

  it('emits exactly one deleteError per failed delete', async () => {
    immediate(() => json(500, { message: 'Internal Server Error' }));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const deleteError = vi.fn();
    const screen = renderTable({ onDeleteError: deleteError, deleteUrl: '/api/categories/:id' });
    await openRow(screen, 0);
    modalButton('Delete')!.click();
    await wait(300);
    expect(deleteError).toHaveBeenCalledTimes(1);
    expect(deleteError.mock.calls[0][0].id).toBe(1);
  });

  it('emits exactly one createError per failed create', async () => {
    immediate(() => json(422, { message: GENERIC, errors: UNRENDERED }));
    const createError = vi.fn();
    const screen = renderTable({ onCreateError: createError });
    await openCreate(screen);
    modalButton('Create')!.click();
    await wait(300);
    expect(createError).toHaveBeenCalledTimes(1);
    expect(createError.mock.calls[0][0].status).toBe(422);
  });

  it('emits exactly one editError per failed edit, naming the edited row', async () => {
    immediate(() => json(422, { message: GENERIC, errors: UNRENDERED }));
    const editError = vi.fn();
    const screen = renderTable({ onEditError: editError });
    await openRow(screen, 0);
    modalButton('Save')!.click();
    await wait(300);
    expect(editError).toHaveBeenCalledTimes(1);
    expect(editError.mock.calls[0][0].id).toBe(1);
    expect(editError.mock.calls[0][1].status).toBe(422);
  });
});
