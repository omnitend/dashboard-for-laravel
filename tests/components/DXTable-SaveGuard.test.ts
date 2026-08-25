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

/*
 * Submit the modal's form directly — DXForm's own `@submit.prevent`, i.e. what
 * Enter in a field does. This is NOT the same path as clicking Save: DButton
 * disables itself the instant `pendingAction` is set, so a second BUTTON click
 * is swallowed by the DOM whether or not the composable guards re-entry. Only
 * the submit path reaches `save()` again, so only it can prove the guard.
 */
const submitModalForm = () => {
  const form = document.querySelector('.modal form') as HTMLFormElement | null;
  if (!form) throw new Error('No form in the modal — the harness is not live.');
  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
};

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

  it('is not re-entrant: repeated submits while the guard is pending send one request', async () => {
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

    // Driven through the form, not the button — see `submitModalForm`. Against
    // the unguarded composable this runs the guard three times and fires three
    // requests; the button-click version of this test passes either way.
    submitModalForm();
    await flush();
    submitModalForm();
    submitModalForm();
    await wait(120);

    finishUpload();
    await wait(200);

    expect(guardCalls).toBe(1);
    expect(writes(spy)).toHaveLength(1);
  });

  it('the Save BUTTON is also single-shot while the guard is pending', async () => {
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

    const save = modalButton('Save')!;
    save.click();
    await flush();
    save.click();
    save.click();
    await wait(120);

    finishUpload();
    await wait(200);

    expect(writes(spy)).toHaveLength(1);
  });
});

/*
 * The `showUrl` load window. `showUrl` exists BECAUSE the list row is thin, so a
 * guard that runs against that row sees `undefined` for exactly the fields it
 * was written to check — and waves the save through. `remove` has always
 * refused to evaluate its guard mid-load; `save` must too.
 */
describe('DXTable saveGuard vs the showUrl load window', () => {
  afterEach(() => vi.restoreAllMocks());

  it('does not run against the thin list row while the full record is loading', async () => {
    const seen: any[] = [];
    const spy = vi.spyOn(globalThis, 'fetch').mockImplementation(
      async (_url: any, config: any) => {
        const method = String(config?.method ?? 'GET').toUpperCase();
        if (method === 'GET') {
          await wait(250); // slow show fetch
          return new Response(
            JSON.stringify({ data: { id: 1, name: 'Electronics', archived: true } }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          );
        }
        return new Response(JSON.stringify({ data: { id: 1 } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      },
    );

    // A realistic guard: refuse to save an archived record. `archived` is only
    // on the FULL record — the list row has no such key.
    await openEdit({
      showUrl: '/api/categories/:id',
      saveGuard: (item: any) => {
        seen.push(item);
        return item?.archived ? 'This category is archived.' : null;
      },
    });

    // Mid-load: the button is disabled, but the submit path is not.
    submitModalForm();
    await wait(60);

    // The guard did not run at all — not "ran and happened to allow it".
    expect(seen).toEqual([]);
    expect(writes(spy)).toHaveLength(0);
    expect(modalIsOpen()).toBe(true);

    // Once the full record has landed, the guard sees `archived` and blocks.
    await wait(300);
    submitModalForm();
    await wait(150);

    // Positive control: it DID run this time, and against the full record.
    expect(seen).toHaveLength(1);
    expect(seen[0].archived).toBe(true);
    expect(writes(spy)).toHaveLength(0);
    expect(document.body.textContent).toContain('This category is archived.');
    expect(modalIsOpen()).toBe(true);
  });
});

/*
 * `deleteGuard` is awaited on the same path as `saveGuard`, so the two cannot
 * diverge. Unawaited, an `async` guard returns a merely-truthy promise, which
 * blocks EVERY delete and puts a Promise object in the toast.
 */
describe('DXTable deleteGuard is awaited too', () => {
  afterEach(() => vi.restoreAllMocks());

  it('lets an async guard that resolves null through to the confirm and DELETE', async () => {
    const spy = stubFetch();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);

    await openEdit({
      deleteUrl: '/api/categories/:id',
      deleteGuard: async () => null,
    });

    modalButton('Delete')!.click();
    await wait(200);

    expect(confirm).toHaveBeenCalledTimes(1);
    expect(writes(spy)).toHaveLength(1);
    expect(String(writes(spy)[0][1].method).toUpperCase()).toBe('DELETE');
  });

  it('blocks on an async guard\'s message — and never reaches the confirm', async () => {
    const spy = stubFetch();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);

    await openEdit({
      deleteUrl: '/api/categories/:id',
      deleteGuard: async () => 'It still has products.',
    });

    modalButton('Delete')!.click();
    await wait(200);

    expect(confirm).not.toHaveBeenCalled();
    expect(writes(spy)).toHaveLength(0);
    // The MESSAGE, not a stringified promise.
    expect(document.body.textContent).toContain('It still has products.');
    expect(modalIsOpen()).toBe(true);
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
