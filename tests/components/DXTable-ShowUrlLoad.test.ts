import { describe, it, expect, vi, afterEach } from 'vitest';
import { render } from 'vitest-browser-vue';
import { userEvent } from 'vitest/browser';
import { h } from 'vue';
import { BApp } from 'bootstrap-vue-next';
import DXTable from '../../resources/js/components/extended/DXTable.vue';

/*
 * The `showUrl` load window, seen from the user's side. When the edit modal
 * opens, the form shows the thin list row and the full record is fetched; when
 * it lands, it reseeds the form. Anything the user typed in between was
 * silently replaced by the response — a supplier renamed before the GET came
 * back kept its old name, with no error anywhere.
 *
 * The rule: while the full record is loading the form is not editable (its
 * controls are disabled and the subtree is inert), so there is no edit for the
 * response to overwrite; once it lands the form is editable again.
 */

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const rows = [
  { id: 1, name: 'Acme' },
  { id: 2, name: 'Bravo' },
];

type Pending = { id: string; resolve: (record: Record<string, any>) => void };

/**
 * Every show GET is held until the test resolves it, so the test controls the
 * order responses arrive in. Writes are recorded and answered at once.
 */
function holdShowRequests() {
  const pending: Pending[] = [];
  const spy = vi.spyOn(globalThis, 'fetch').mockImplementation(
    (input: any, config: any) => {
      const method = String(config?.method ?? 'GET').toUpperCase();
      const url = String(input);
      if (method === 'GET') {
        const id = url.split('/').pop()!;
        return new Promise<Response>((resolveResponse) => {
          pending.push({
            id,
            resolve: (record) =>
              resolveResponse(
                new Response(JSON.stringify({ data: record }), {
                  status: 200,
                  headers: { 'Content-Type': 'application/json' },
                }),
              ),
          });
        });
      }
      return Promise.resolve(
        new Response(JSON.stringify({ data: { id: 1 } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    },
  );
  const writes = () =>
    spy.mock.calls.filter(([, config]: any) =>
      ['POST', 'PUT', 'PATCH', 'DELETE'].includes(
        String(config?.method ?? 'GET').toUpperCase(),
      ),
    );
  const respond = async (id: string, record: Record<string, any>) => {
    const request = pending.find((p) => p.id === id);
    if (!request) throw new Error(`No pending show request for id ${id}`);
    request.resolve(record);
    await wait(60);
  };
  return { pending, writes, respond };
}

const renderTable = (extra: any = {}) =>
  render({
    render: () =>
      h(BApp, {}, () =>
        h(
          DXTable,
          {
            items: rows,
            fields: [{ key: 'name', label: 'Name' }],
            editFields: [
              { key: 'name', type: 'text', label: 'Name' },
              { key: 'notes', type: 'text', label: 'Notes' },
            ],
            itemName: 'supplier',
            showUrl: '/api/suppliers/:id',
            editUrl: '/api/suppliers/:id',
            ...extra,
          },
          extra.slots ?? {},
        ),
      ),
  });

const openRow = async (screen: ReturnType<typeof renderTable>, index: number) => {
  (screen.container.querySelectorAll('tbody tr')[index] as HTMLElement).click();
  await wait(80);
};

const modalInputs = () =>
  Array.from(document.querySelectorAll('.modal input')) as HTMLInputElement[];

const nameInput = () => {
  const input = modalInputs()[0];
  if (!input) throw new Error('No input in the modal — the harness is not live.');
  return input;
};

const modalButton = (startsWith: string) =>
  Array.from(document.querySelectorAll('.modal button')).find((b) =>
    b.textContent?.trim()?.startsWith(startsWith),
  ) as HTMLButtonElement | undefined;

const modalIsOpen = () => {
  const modal = document.querySelector('.modal') as HTMLElement | null;
  if (!modal) return false;
  return getComputedStyle(modal).display !== 'none';
};

/** What a user does: put the caret in the field and type real keystrokes. */
const typeLikeAUser = async (input: HTMLInputElement, text: string) => {
  input.focus();
  await userEvent.keyboard(text);
  await flush();
};

describe('DXTable edit modal while the full record is loading (showUrl)', () => {
  afterEach(() => vi.restoreAllMocks());

  it('never loses what the user typed before the record landed', async () => {
    const server = holdShowRequests();
    const screen = renderTable();
    await flush();
    await openRow(screen, 0);

    // Harness live: the GET is in flight and the form shows the row's value.
    expect(server.pending.map((p) => p.id)).toEqual(['1']);
    expect(nameInput().value).toBe('Acme');

    await typeLikeAUser(nameInput(), ' Ltd');
    const typedLanded = nameInput().value !== 'Acme';

    await server.respond('1', { id: 1, name: 'Acme', notes: 'Full notes' });

    // Either the keystrokes were refused (the form was not editable) or they
    // survived the response. Silently replacing them is the bug.
    if (typedLanded) {
      expect(nameInput().value).toBe('Acme Ltd');
    } else {
      expect(nameInput().value).toBe('Acme');
    }
    expect(modalInputs()[1].value).toBe('Full notes');
  });

  it('keeps the form uneditable until the record lands, then editable', async () => {
    const server = holdShowRequests();
    const screen = renderTable();
    await flush();
    await openRow(screen, 0);

    // Mid-load: the controls are disabled and keystrokes do not land.
    expect(nameInput().matches(':disabled')).toBe(true);
    expect(document.querySelector('.modal .dx-edit-loading')).toBeTruthy();
    await typeLikeAUser(nameInput(), 'X');
    expect(nameInput().value).toBe('Acme');

    await server.respond('1', { id: 1, name: 'Acme Full', notes: 'n' });

    // Positive control: the same typing lands once the record is in.
    expect(nameInput().matches(':disabled')).toBe(false);
    expect(document.querySelector('.modal .dx-edit-loading')).toBeNull();
    expect(nameInput().value).toBe('Acme Full');
    await typeLikeAUser(nameInput(), 'X');
    expect(nameInput().value).toBe('Acme FullX');
  });

  it('makes a custom edit-value control unreachable too, not just native inputs', async () => {
    const server = holdShowRequests();
    const screen = renderTable({
      slots: {
        'edit-value(notes)': ({ value, update }: any) =>
          h('div', {
            class: 'custom-notes',
            contenteditable: 'true',
            onInput: (event: Event) => update((event.target as HTMLElement).textContent),
          }, value ?? ''),
      },
    });
    await flush();
    await openRow(screen, 0);

    const custom = document.querySelector('.modal .custom-notes') as HTMLElement;
    expect(custom).toBeTruthy();
    // inert: no focus, no clicks, no keystrokes for anything in the form.
    expect(custom.closest('[inert]')).toBeTruthy();

    await server.respond('1', { id: 1, name: 'Acme', notes: 'Loaded' });
    const loaded = document.querySelector('.modal .custom-notes') as HTMLElement;
    expect(loaded.closest('[inert]')).toBeNull();
    expect(loaded.textContent).toBe('Loaded');
  });

  it('cannot save before the record lands', async () => {
    const server = holdShowRequests();
    const screen = renderTable();
    await flush();
    await openRow(screen, 0);

    const save = modalButton('Save');
    expect(save).toBeTruthy();
    expect(save!.disabled).toBe(true);
    save!.click();
    await wait(60);
    expect(server.writes()).toHaveLength(0);
    expect(modalIsOpen()).toBe(true);

    // Positive control: after the record lands the same click saves.
    await server.respond('1', { id: 1, name: 'Acme', notes: 'n' });
    expect(modalButton('Save')!.disabled).toBe(false);
    modalButton('Save')!.click();
    await wait(150);
    expect(server.writes()).toHaveLength(1);
  });

  it('ignores a late response for a row the user has since closed and replaced', async () => {
    const server = holdShowRequests();
    const screen = renderTable();
    await flush();

    await openRow(screen, 0);
    modalButton('Cancel')!.click();
    await wait(300);
    await openRow(screen, 1);
    expect(server.pending.map((p) => p.id)).toEqual(['1', '2']);
    expect(nameInput().value).toBe('Bravo');

    // Row 1's response arrives first, while row 2 is open and still loading.
    await server.respond('1', { id: 1, name: 'Acme Full', notes: 'Acme notes' });
    expect(nameInput().value).toBe('Bravo');
    expect(nameInput().matches(':disabled')).toBe(true);

    await server.respond('2', { id: 2, name: 'Bravo Full', notes: 'Bravo notes' });
    expect(nameInput().value).toBe('Bravo Full');
    expect(modalInputs()[1].value).toBe('Bravo notes');
    expect(nameInput().matches(':disabled')).toBe(false);
  });
});
