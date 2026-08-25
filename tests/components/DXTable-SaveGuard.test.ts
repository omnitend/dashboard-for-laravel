import { describe, it, expect, vi, afterEach } from 'vitest';
import { render } from 'vitest-browser-vue';
import { h } from 'vue';
import { BApp } from 'bootstrap-vue-next';
import DXTable from '../../resources/js/components/extended/DXTable.vue';

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const rows = [{ id: 1, name: 'Electronics', slug: 'electronics' }];
const fields = [
  { key: 'name', label: 'Name' },
  { key: 'slug', label: 'Slug' },
];
const editFields = [
  { key: 'name', type: 'text', label: 'Name' },
  { key: 'slug', type: 'text', label: 'Slug' },
];

/** Stub every request as a 200 JSON echo, and record what was sent. */
function stubFetch() {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
    new Response(JSON.stringify({ data: { id: 1, name: 'Electronics' } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
}

/** Only the writes — the table itself makes no requests in client-side mode. */
const writes = (spy: ReturnType<typeof stubFetch>) =>
  spy.mock.calls.filter(([, config]: any) =>
    ['POST', 'PUT', 'PATCH', 'DELETE'].includes(
      String(config?.method ?? 'GET').toUpperCase(),
    ),
  );

const baseProps = (extra: any = {}) => ({
  items: rows,
  fields,
  editFields,
  itemName: 'category',
  editUrl: '/api/categories/:id',
  createUrl: '/api/categories',
  ...extra,
});

const renderTable = (extra: any = {}) =>
  render({ render: () => h(BApp, {}, () => h(DXTable, baseProps(extra))) });

/** The edit modal teleports to body; find its buttons there. */
const modalButton = (startsWith: string) =>
  Array.from(document.querySelectorAll('.modal button')).find((b) =>
    b.textContent?.trim()?.startsWith(startsWith),
  ) as HTMLButtonElement | undefined;

/**
 * Open, not merely present: bvn leaves the modal element in the DOM and cycles
 * transition classes, so `querySelector('.modal')` is true in BOTH the open and
 * closed cases. Read the computed display instead.
 */
const modalIsOpen = () => {
  const modal = document.querySelector('.modal') as HTMLElement | null;
  if (!modal) return false;
  return getComputedStyle(modal).display !== 'none';
};

const nameInput = () =>
  document.querySelector('.modal input') as HTMLInputElement | null;

const typeInto = async (input: HTMLInputElement, text: string) => {
  input.value = text;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  await flush();
};

const openEdit = async (extra: any = {}) => {
  const screen = renderTable(extra);
  await flush();
  (screen.container.querySelector('tbody tr') as HTMLElement).click();
  await wait(80);
  return screen;
};

const openCreate = async (extra: any = {}) => {
  const screen = renderTable(extra);
  await flush();
  const newBtn = Array.from(screen.container.querySelectorAll('button')).find(
    (b) => b.textContent?.trim() === 'New category',
  ) as HTMLElement;
  newBtn.click();
  await wait(80);
  return screen;
};

/*
 * `saveGuard` (the Save-side twin of `deleteGuard`). The hole it closes: an
 * async control in an `edit-value` slot — an image upload — that has not
 * finished when Save is clicked. The form submits the stale media map, the
 * request SUCCEEDS, the toast says saved and the modal closes; the image is
 * gone with no error anywhere, because every individual step worked.
 */
describe('DXTable saveGuard — blocking', () => {
  afterEach(() => vi.restoreAllMocks());

  it('blocks the PUT, surfaces the message, and leaves the modal open with edits intact', async () => {
    const spy = stubFetch();
    await openEdit({
      saveGuard: () => 'The image is still uploading.',
    });

    await typeInto(nameInput()!, 'Edited name');
    modalButton('Save')!.click();
    await wait(150);

    expect(writes(spy)).toHaveLength(0);
    expect(document.body.textContent).toContain('The image is still uploading.');
    expect(modalIsOpen()).toBe(true);
    expect(nameInput()!.value).toBe('Edited name');
  });

  it('blocks the create POST too', async () => {
    const spy = stubFetch();
    await openCreate({ saveGuard: () => 'Still uploading.' });

    modalButton('Create')!.click();
    await wait(150);

    expect(writes(spy)).toHaveLength(0);
    expect(document.body.textContent).toContain('Still uploading.');
    expect(modalIsOpen()).toBe(true);
  });

  it('fails CLOSED when the guard rejects — no request, modal stays open', async () => {
    const spy = stubFetch();
    await openEdit({
      saveGuard: async () => {
        throw new Error('Upload failed.');
      },
    });

    modalButton('Save')!.click();
    await wait(150);

    expect(writes(spy)).toHaveLength(0);
    expect(modalIsOpen()).toBe(true);
    expect(document.body.textContent).toContain('Upload failed.');
  });
});

describe('DXTable saveGuard — awaited', () => {
  afterEach(() => vi.restoreAllMocks());

  it('waits for an async guard: nothing is sent until it resolves, then the save runs', async () => {
    const spy = stubFetch();
    let finishUpload: () => void = () => {};
    const uploaded = new Promise<void>((resolve) => {
      finishUpload = resolve;
    });

    await openEdit({
      saveGuard: async () => {
        await uploaded;
        return null;
      },
    });

    modalButton('Save')!.click();
    await wait(120);

    // Still in flight: a sync guard would already have fired the request.
    expect(writes(spy)).toHaveLength(0);
    expect(modalIsOpen()).toBe(true);

    finishUpload();
    await wait(200);

    // Positive control: the save really does go through afterwards.
    expect(writes(spy)).toHaveLength(1);
    expect(String(writes(spy)[0][1].method).toUpperCase()).toBe('PUT');
    expect(modalIsOpen()).toBe(false);
  });

  it('is not re-entrant: a second Save click while the guard is pending sends one request', async () => {
    const spy = stubFetch();
    let finishUpload: () => void = () => {};
    const uploaded = new Promise<void>((resolve) => {
      finishUpload = resolve;
    });
    let guardCalls = 0;

    await openEdit({
      saveGuard: async () => {
        guardCalls += 1;
        await uploaded;
        return null;
      },
    });

    const save = modalButton('Save')!;
    save.click();
    await flush();
    save.click();
    save.click();
    await wait(120);

    finishUpload();
    await wait(200);

    expect(guardCalls).toBe(1);
    expect(writes(spy)).toHaveLength(1);
  });
});

describe('DXTable saveGuard — the unguarded path is unchanged', () => {
  afterEach(() => vi.restoreAllMocks());

  it('saves normally when no saveGuard is given', async () => {
    const spy = stubFetch();
    await openEdit();

    modalButton('Save')!.click();
    await wait(200);

    expect(writes(spy)).toHaveLength(1);
    expect(modalIsOpen()).toBe(false);
  });
});
