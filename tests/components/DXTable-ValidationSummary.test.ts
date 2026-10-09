import { describe, it, expect, vi, afterEach } from 'vitest';
import { render } from 'vitest-browser-vue';
import { h } from 'vue';
import { BApp } from 'bootstrap-vue-next';
import DXTable from '../../resources/js/components/extended/DXTable.vue';

/*
 * #194: a failed save in DXTable's create/edit modal must show EVERY message
 * next to the Save button, for as long as the user needs, rather than a toast
 * of one message that disappears after 5 s. Non-validation failures keep a
 * toast. Real responses through the real API client (`fetch` stubbed).
 */

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const rows = [{ id: 1, name: 'Electronics', slug: 'electronics', code: 'EL' }];
const fields = [
  { key: 'name', label: 'Name' },
  { key: 'slug', label: 'Slug' },
];
const editFields = [
  { key: 'name', type: 'text', label: 'Name' },
  { key: 'slug', type: 'text', label: 'Slug' },
  { key: 'code', type: 'text', label: 'Code' },
];

const THREE_ERRORS = {
  name: ['The name field is required.'],
  slug: ['The slug has already been taken.'],
  code: ['The code must be 2 characters.'],
};

function stubFailure(status: number, body: Record<string, unknown>) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
}

const renderTable = () =>
  render({
    render: () =>
      h(BApp, {}, () =>
        h(DXTable, {
          items: rows,
          fields,
          editFields,
          itemName: 'category',
          editUrl: '/api/categories/:id',
          createUrl: '/api/categories',
        }),
      ),
  });

const modalButton = (startsWith: string) =>
  Array.from(document.querySelectorAll('.modal button')).find((button) =>
    button.textContent?.trim()?.startsWith(startsWith),
  ) as HTMLButtonElement | undefined;

const toastTexts = () =>
  Array.from(document.querySelectorAll<HTMLElement>('.toast'))
    .filter((toast) => toast.offsetParent !== null)
    .map((toast) => toast.textContent ?? '');

const footer = () => document.querySelector<HTMLElement>('.modal .modal-footer');

async function openCreate(screen: ReturnType<typeof renderTable>) {
  await flush();
  const newButton = Array.from(screen.container.querySelectorAll('button')).find(
    (button) => button.textContent?.trim() === 'New category',
  ) as HTMLElement;
  newButton.click();
  await wait(80);
}

async function openEdit(screen: ReturnType<typeof renderTable>) {
  await flush();
  (screen.container.querySelector('tbody tr') as HTMLElement).click();
  await wait(80);
}

describe('DXTable modal validation summary (#194)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.querySelectorAll('.toast').forEach((toast) => toast.remove());
  });

  it('create: all three messages stay visible in the modal footer after 5 s, with no toast', async () => {
    stubFailure(422, { message: 'The given data was invalid.', errors: THREE_ERRORS });
    const screen = renderTable();
    await openCreate(screen);
    modalButton('Create')!.click();
    await wait(150);

    // Positive control: the request failed and the form holds all three.
    expect((globalThis.fetch as any).mock.calls.length).toBe(1);

    await wait(5200);

    const modalFooter = footer();
    expect(modalFooter).not.toBeNull();
    const summary = modalFooter!.querySelector<HTMLElement>('.dx-form-error-summary');
    expect(summary).not.toBeNull();
    expect(summary!.offsetParent).not.toBeNull();
    for (const [message] of Object.values(THREE_ERRORS)) {
      expect(summary!.textContent).toContain(message);
    }
    // Exactly one alert in the modal: the inner form shows none of its own.
    const alerts = Array.from(document.querySelectorAll<HTMLElement>('.modal .alert')).filter(
      (alert) => alert.offsetParent !== null,
    );
    expect(alerts.length).toBe(1);
    // And no toast for a validation failure.
    expect(toastTexts()).toEqual([]);
  }, 15000);

  it('edit: a 422 shows the summary and no toast', async () => {
    stubFailure(422, { message: 'The given data was invalid.', errors: THREE_ERRORS });
    const screen = renderTable();
    await openEdit(screen);
    modalButton('Save')!.click();
    await wait(300);

    const summary = footer()?.querySelector<HTMLElement>('.dx-form-error-summary');
    expect(summary).not.toBeNull();
    expect(summary!.textContent).toContain('The code must be 2 characters.');
    expect(toastTexts()).toEqual([]);
  });

  it('a summary row in the modal footer focuses its field in the form', async () => {
    stubFailure(422, { message: 'The given data was invalid.', errors: { code: THREE_ERRORS.code } });
    const screen = renderTable();
    await openEdit(screen);
    modalButton('Save')!.click();
    await wait(300);

    const row = footer()!.querySelector<HTMLButtonElement>('.dx-form-error-summary__target');
    expect(row).not.toBeNull();
    row!.click();
    await wait(100);
    const field = document.querySelector('.modal [data-dx-field-key="code"]');
    expect(field).not.toBeNull();
    expect(field!.contains(document.activeElement)).toBe(true);
  });

  it('create: a 500 still toasts the server error', async () => {
    stubFailure(500, { message: 'Internal Server Error' });
    const screen = renderTable();
    await openCreate(screen);
    modalButton('Create')!.click();
    await wait(300);

    const toasts = toastTexts();
    expect(toasts.length).toBe(1);
    expect(toasts[0]).toContain('Server error. Please try again later.');
  });

  it('edit: a 500 still toasts the server error', async () => {
    stubFailure(500, { message: 'Internal Server Error' });
    const screen = renderTable();
    await openEdit(screen);
    modalButton('Save')!.click();
    await wait(300);

    const toasts = toastTexts();
    expect(toasts.length).toBe(1);
    expect(toasts[0]).toContain('Server error. Please try again later.');
  });
});
