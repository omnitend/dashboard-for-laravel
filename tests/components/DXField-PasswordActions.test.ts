import { describe, it, expect, vi, afterEach } from 'vitest';
import { render } from 'vitest-browser-vue';
import { userEvent } from 'vitest/browser';
import { computed, h } from 'vue';
import { BApp } from 'bootstrap-vue-next';
import DXField from '../../resources/js/components/extended/DXField.vue';
import DXForm from '../../resources/js/components/extended/DXForm.vue';
import DXTable from '../../resources/js/components/extended/DXTable.vue';
import { useForm } from '../../resources/js/composables/useForm';
import type {
  FieldDefinition,
  PasswordActionsSlotProps,
  EditPasswordActionsSlotProps,
} from '../../resources/js/types';
import {
  GOLDEN_PASSWORD_FORM_HTML,
  GOLDEN_PASSWORD_FORM_REVEALED_HTML,
} from '../fixtures/passwordFieldGolden';

/*
 * The `password-actions` slot (DXField), `password-actions(<key>)` (DXForm)
 * and `edit-password-actions(<key>)` (DXTable's edit/create modal): content
 * placed after the password input group (input and eye), in
 * `.dx-password-field__actions`, wrapping below it when the row is narrow,
 * with slot props that can write the value and drive dfl's own reveal (eye)
 * state. The need
 * it exists for: a "Generate password" button on a create-user form that
 * fills the field and reveals it so an admin can read it out.
 */

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const GENERATED = 'Gen-Secret-4821';

/** A slot body: one Generate button that writes the value and reveals it. */
const generateButton = (slotProps: PasswordActionsSlotProps | EditPasswordActionsSlotProps) =>
  h(
    'button',
    {
      type: 'button',
      class: 'btn btn-outline-secondary dx-test-generate',
      disabled: slotProps.disabled,
      onClick: () => {
        slotProps.update(GENERATED);
        slotProps.setRevealed(true);
      },
    },
    'Generate',
  );

const passwordInput = (root: ParentNode) =>
  root.querySelector('input[autocomplete], input[type="password"], input[type="text"]') as HTMLInputElement;

const eye = (root: ParentNode) =>
  root.querySelector(
    'button[aria-label="Show password"], button[aria-label="Hide password"]',
  ) as HTMLButtonElement | null;

/**
 * Golden render: dfl's password variants inside a DXForm with NO
 * password-actions slot. The HTML was captured from main @ 9e24e18 (before
 * the slot existed). A field that does not use the slot renders as before
 * apart from 0.47.0's deliberate field styling (the `.dx-password-field`
 * wrapper and the eye's classes), which the test asserts on its own and then
 * undoes before the byte-for-byte comparison. Normalised: generated ids, scoped-style
 * attributes (their hash follows the file's source), and the TEMPLATE
 * comments a dev build keeps (a production build drops them). The `v-if`
 * placeholder comments are kept, since they are real render output: a
 * `v-if`'d slot would add one even when unused.
 */
function normaliseHtml(html: string): string {
  return html
    .replace(/ data-v-[0-9a-f]+=""/g, '')
    .replace(/(id|for|aria-describedby|aria-labelledby|aria-controls|list)="[^"]*"/g, '$1="X"')
    .replace(/<!--(?!v-if-->|-->)[\s\S]*?-->/g, '');
}

/**
 * Undo 0.47.0's deliberate password-field markup changes, and nothing else,
 * so the rest of the render can still be compared byte for byte with 0.46.0's
 * golden: unwrap `.dx-password-field` (the unused actions box leaves its
 * `v-if` placeholder), drop the group's `dx-password-field__group` class, and
 * the eye's `d-button--icon-only dx-password-reveal` classes. Each pattern is
 * counted by the test before this runs, so a change that stops matching fails
 * there rather than slipping through here.
 */
function undoPasswordFieldChanges(html: string): string {
  return html
    .replace(
      /<div class="dx-password-field">(<div class="input-group dx-password-field__group" role="group">[\s\S]*?<\/button><\/div>)<!--v-if--><\/div>/g,
      '$1',
    )
    .replace(/<div class="input-group dx-password-field__group"/g, '<div class="input-group"')
    .replace(/ d-button--icon-only dx-password-reveal dx-password-reveal"/g, '"');
}

const goldenFields: FieldDefinition[] = [
  { key: 'name', type: 'text', label: 'Name' },
  { key: 'password', type: 'password', label: 'Password', hint: 'At least 8 characters' },
  { key: 'pin', type: 'password', label: 'PIN', revealable: false },
  { key: 'shown', type: 'password', label: 'Shown', plaintext: true },
  { key: 'h', type: 'password', label: 'Horizontal', layout: 'horizontal' },
];

describe('password-actions: an unused slot adds nothing', () => {
  it('renders 0.46.0\'s HTML for password fields without the slot, apart from the 0.47.0 field styling', async () => {
    const form = useForm({ name: 'Ann', password: 'hunter2', pin: '1234', shown: 'x', h: '' });
    const screen = render({
      render: () => h(BApp, {}, () => h(DXForm, { form, fields: goldenFields, showSubmit: false })),
    });
    await flush();
    await wait(50);

    const html = normaliseHtml(screen.container.innerHTML);

    // And once revealed by the eye.
    (screen.container.querySelector(
      '[data-dx-field-key="password"] button[aria-label="Show password"]',
    ) as HTMLElement).click();
    await flush();
    const revealedHtml = normaliseHtml(screen.container.innerHTML);

    // The deliberate 0.47.0 changes, asserted on their own: every password
    // group now sits in a `.dx-password-field` wrapper (the box a
    // `password-actions` slot wraps inside), and the eye is an icon-only
    // square styled as part of the input (`dx-password-reveal`). The class
    // appears twice because DButton both binds `$attrs` and inherits them.
    // Two fields here have an eye (password, h); the others must not change.
    for (const rendered of [html, revealedHtml]) {
      expect(rendered.match(/<div class="dx-password-field">/g)).toHaveLength(2);
      expect(rendered.match(/<div class="input-group dx-password-field__group" role="group">/g)).toHaveLength(2);
      expect(rendered.match(/ d-button--icon-only dx-password-reveal dx-password-reveal"/g)).toHaveLength(2);
    }
    // Everything else is still 0.46.0's markup, byte for byte: with exactly
    // those changes undone, the golden matches.
    expect(undoPasswordFieldChanges(html)).toBe(GOLDEN_PASSWORD_FORM_HTML);
    expect(undoPasswordFieldChanges(revealedHtml)).toBe(GOLDEN_PASSWORD_FORM_REVEALED_HTML);
    // Positive control: the revealed render really differs (the click landed).
    expect(revealedHtml).not.toBe(html);
  });
});

describe('DXField password-actions slot', () => {
  const renderField = (field: FieldDefinition, data: Record<string, any>) => {
    const form = useForm(data);
    const screen = render({
      render: () =>
        h(BApp, {}, () =>
          h(DXField, { field, form }, { 'password-actions': generateButton }),
        ),
    });
    return { screen, form };
  };

  it('renders the slot after the password input group (input, then eye), in the actions box', async () => {
    const { screen } = renderField(
      { key: 'password', type: 'password', label: 'Password' },
      { password: '' },
    );
    await flush();

    const wrapper = screen.container.querySelector('.dx-password-field') as HTMLElement;
    expect(wrapper).not.toBeNull();
    // The wrapper holds exactly two boxes: the input group, then the actions.
    expect(Array.from(wrapper.children).map((child) => child.className)).toEqual([
      expect.stringContaining('input-group'),
      'dx-password-field__actions',
    ]);
    // The group is the input and the eye, nothing else.
    const group = wrapper.querySelector('.input-group') as HTMLElement;
    expect(
      Array.from(group.querySelectorAll('input, button')).map(
        (el) => el.getAttribute('aria-label') ?? el.className,
      ),
    ).toEqual([expect.stringContaining('form-control'), 'Show password']);
    expect(group.querySelector('.dx-test-generate')).toBeNull();
    expect(wrapper.querySelector('.dx-password-field__actions .dx-test-generate')).not.toBeNull();

    // The label still names the input (label/for unaffected).
    const label = screen.container.querySelector('label') as HTMLLabelElement;
    const input = passwordInput(screen.container);
    expect(label.htmlFor).toBe(input.id);
  });

  it('update + setRevealed fills the value and unmasks it; the eye reads "Hide"', async () => {
    const { screen, form } = renderField(
      { key: 'password', type: 'password', label: 'Password' },
      { password: '' },
    );
    await flush();

    (screen.container.querySelector('.dx-test-generate') as HTMLElement).click();
    await flush();

    const input = passwordInput(screen.container);
    expect(form.data.password).toBe(GENERATED);
    expect(input.value).toBe(GENERATED);
    expect(input.type).toBe('text');
    expect(eye(screen.container)?.getAttribute('aria-label')).toBe('Hide password');
    expect(eye(screen.container)?.getAttribute('aria-pressed')).toBe('true');

    // The eye still works by itself: toggling hides it again.
    eye(screen.container)!.click();
    await flush();
    expect(input.type).toBe('password');
    expect(eye(screen.container)?.getAttribute('aria-label')).toBe('Show password');
    expect(eye(screen.container)?.getAttribute('aria-pressed')).toBe('false');
  });

  it('hands the slot the live revealed state as the eye changes it', async () => {
    const seen: boolean[] = [];
    const form = useForm({ password: 'abc' });
    const screen = render({
      render: () =>
        h(BApp, {}, () =>
          h(
            DXField,
            { field: { key: 'password', type: 'password', label: 'Password' }, form },
            {
              'password-actions': (slotProps: PasswordActionsSlotProps) => {
                seen.push(slotProps.revealed);
                return h('span', { class: 'dx-test-state' }, slotProps.revealed ? 'on' : 'off');
              },
            },
          ),
        ),
    });
    await flush();
    expect(screen.container.querySelector('.dx-test-state')?.textContent).toBe('off');

    eye(screen.container)!.click();
    await flush();
    expect(screen.container.querySelector('.dx-test-state')?.textContent).toBe('on');
    expect(seen).toContain(false);
    expect(seen).toContain(true);
  });

  it('passes disabled to the slot when the field is disabled or readonly', async () => {
    const { screen } = renderField(
      { key: 'password', type: 'password', label: 'Password', readonly: true },
      { password: '' },
    );
    await flush();
    expect((screen.container.querySelector('.dx-test-generate') as HTMLButtonElement).disabled).toBe(true);
  });

  it('still renders the slot on a revealable: false field, but cannot unmask it', async () => {
    const { screen, form } = renderField(
      { key: 'pin', type: 'password', label: 'PIN', revealable: false },
      { pin: '' },
    );
    await flush();

    // No eye: revealable: false keeps meaning "never unmask".
    expect(eye(screen.container)).toBeNull();
    const generate = screen.container.querySelector('.dx-password-field__actions .dx-test-generate') as HTMLElement;
    expect(generate).not.toBeNull();

    generate.click();
    await flush();
    const input = passwordInput(screen.container);
    expect(form.data.pin).toBe(GENERATED);
    expect(input.value).toBe(GENERATED);
    expect(input.type).toBe('password');
  });

  it('is not rendered on a plaintext password field (display-only, no input group)', async () => {
    const { screen } = renderField(
      { key: 'password', type: 'password', label: 'Password', plaintext: true },
      { password: 'x' },
    );
    await flush();
    expect(screen.container.querySelector('.dx-test-generate')).toBeNull();
    expect(screen.container.querySelector('.input-group')).toBeNull();
    expect(screen.container.querySelector('.dx-password-field')).toBeNull();

    // Positive control: the same harness and slot DO render on an editable
    // password field, so the absence above is not a dead harness.
    const control = renderField(
      { key: 'password', type: 'password', label: 'Password' },
      { password: 'x' },
    );
    await flush();
    expect(control.screen.container.querySelector('.dx-password-field__actions .dx-test-generate')).not.toBeNull();
  });
});

describe('DXForm password-actions(<key>) slot', () => {
  it('reaches the keyed password field and drives its reveal', async () => {
    const form = useForm({ email: '', password: '' });
    const screen = render({
      render: () =>
        h(BApp, {}, () =>
          h(
            DXForm,
            {
              form,
              showSubmit: false,
              fields: [
                { key: 'email', type: 'email', label: 'Email' },
                { key: 'password', type: 'password', label: 'Password' },
              ],
            },
            { 'password-actions(password)': generateButton },
          ),
        ),
    });
    await flush();

    const generate = screen.container.querySelector(
      '[data-dx-field-key="password"] .dx-password-field__actions .dx-test-generate',
    ) as HTMLElement;
    expect(generate).not.toBeNull();
    // Only the keyed field gets it.
    expect(screen.container.querySelectorAll('.dx-test-generate')).toHaveLength(1);

    generate.click();
    await flush();
    const input = screen.container.querySelector(
      '[data-dx-field-key="password"] input',
    ) as HTMLInputElement;
    expect(form.data.password).toBe(GENERATED);
    expect(input.type).toBe('text');
    expect(input.value).toBe(GENERATED);
  });
});

describe('DXTable edit-password-actions(<key>) slot', () => {
  afterEach(() => vi.restoreAllMocks());

  const rows = [{ id: 1, name: 'Ann', email: 'ann@example.com' }];
  const editFields = [
    { key: 'name', type: 'text', label: 'Name' },
    { key: 'password', type: 'password', label: 'Password' },
  ];

  function stubFetch() {
    return vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
      new Response(JSON.stringify({ data: { id: 2, name: 'Bob' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
  }

  const writes = (spy: ReturnType<typeof stubFetch>) =>
    spy.mock.calls.filter(([, config]: any) =>
      ['POST', 'PUT', 'PATCH'].includes(String(config?.method ?? 'GET').toUpperCase()),
    );

  const seenItems: any[] = [];

  const renderTable = () =>
    render({
      render: () =>
        h(BApp, {}, () =>
          h(
            DXTable,
            {
              items: rows,
              fields: [{ key: 'name', label: 'Name' }],
              editFields,
              itemName: 'user',
              editUrl: '/api/users/:id',
              createUrl: '/api/users',
            },
            {
              'edit-password-actions(password)': (slotProps: EditPasswordActionsSlotProps) => {
                seenItems.push(slotProps.item);
                return generateButton(slotProps);
              },
            },
          ),
        ),
    });

  const modal = () => document.querySelector('.modal') as HTMLElement;
  const modalPasswordInput = () =>
    modal().querySelector('[data-dx-field-key="password"] input') as HTMLInputElement;
  const modalButton = (startsWith: string) =>
    Array.from(document.querySelectorAll('.modal button')).find((b) =>
      b.textContent?.trim()?.startsWith(startsWith),
    ) as HTMLButtonElement;

  const openCreate = async () => {
    const screen = renderTable();
    await flush();
    (Array.from(screen.container.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'New user',
    ) as HTMLElement).click();
    await wait(80);
    return screen;
  };

  it('create modal: Generate fills + reveals, the eye reads Hide, the POST carries it, the eye re-masks', async () => {
    const spy = stubFetch();
    seenItems.length = 0;
    await openCreate();

    const generate = modal().querySelector(
      '[data-dx-field-key="password"] .dx-password-field__actions .dx-test-generate',
    ) as HTMLElement;
    expect(generate).not.toBeNull();
    expect(modalPasswordInput().type).toBe('password');

    generate.click();
    await flush();

    expect(modalPasswordInput().value).toBe(GENERATED);
    expect(modalPasswordInput().type).toBe('text');
    expect(eye(modal())?.getAttribute('aria-label')).toBe('Hide password');
    expect(eye(modal())?.getAttribute('aria-pressed')).toBe('true');
    // Create mode: no row.
    expect(seenItems.at(-1)).toBeNull();

    // The eye toggles back by itself.
    eye(modal())!.click();
    await flush();
    expect(modalPasswordInput().type).toBe('password');
    expect(eye(modal())?.getAttribute('aria-label')).toBe('Show password');

    modalButton('Create').click();
    await wait(150);

    const posts = writes(spy);
    expect(posts).toHaveLength(1);
    expect(String(posts[0][0])).toContain('/api/users');
    expect(String((posts[0][1] as any).method).toUpperCase()).toBe('POST');
    expect(JSON.parse((posts[0][1] as any).body).password).toBe(GENERATED);
  });

  it('edit modal: the slot gets the row and Generate fills + reveals; the PUT carries it', async () => {
    const spy = stubFetch();
    seenItems.length = 0;
    const screen = renderTable();
    await flush();
    (screen.container.querySelector('tbody tr') as HTMLElement).click();
    await wait(80);

    expect(seenItems.at(-1)).toMatchObject({ id: 1, name: 'Ann' });

    (modal().querySelector('.dx-test-generate') as HTMLElement).click();
    await flush();
    expect(modalPasswordInput().type).toBe('text');
    expect(modalPasswordInput().value).toBe(GENERATED);
    expect(eye(modal())?.getAttribute('aria-label')).toBe('Hide password');

    modalButton('Save').click();
    await wait(150);
    const puts = writes(spy);
    expect(puts).toHaveLength(1);
    expect(String((puts[0][1] as any).method).toUpperCase()).toBe('PUT');
    expect(JSON.parse((puts[0][1] as any).body).password).toBe(GENERATED);
  });

  it('a revealed password is masked again when the modal is reopened', async () => {
    stubFetch();
    const screen = await openCreate();
    (modal().querySelector('.dx-test-generate') as HTMLElement).click();
    await flush();
    expect(modalPasswordInput().type).toBe('text');

    modalButton('Cancel').click();
    await wait(80);
    (Array.from(screen.container.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'New user',
    ) as HTMLElement).click();
    await wait(80);
    expect(modalPasswordInput().type).toBe('password');
  });
});

/*
 * 0.47.0 review: the reveal-reset watch compared a fresh `[form, key]` array on
 * every run, so it fired on ANY change it depended on, including a new `field`
 * object. A consumer whose `fields` are computed from `form.data` rebuilds the
 * field on every edit, so `update(); setRevealed(true)` re-masked at once, and
 * so did the first keystroke after the eye. Only a new form or a new key may
 * reset the reveal; the row-switch test below is the control for that.
 */
describe('the reveal survives a consumer rebuilding its fields from form data', () => {
  afterEach(() => vi.restoreAllMocks());

  /** Fields re-created on every change to the password (a new object each time). */
  const fieldsFromFormData = (form: ReturnType<typeof useForm<{ password: string }>>) =>
    computed<FieldDefinition[]>(() => [
      {
        key: 'password',
        type: 'password',
        label: 'Password',
        hint: form.data.password ? `${form.data.password.length} characters` : 'Pick one',
      },
    ]);

  const renderForm = (withGenerate: boolean) => {
    const form = useForm({ password: '' });
    const fields = fieldsFromFormData(form);
    const screen = render({
      render: () =>
        h(BApp, {}, () =>
          h(
            DXForm,
            { form, fields: fields.value, showSubmit: false },
            withGenerate ? { 'password-actions(password)': generateButton } : {},
          ),
        ),
    });
    const input = () =>
      screen.container.querySelector('[data-dx-field-key="password"] input') as HTMLInputElement;
    return { screen, form, input };
  };

  it('Generate (update + setRevealed) reveals and stays revealed', async () => {
    const { screen, form, input } = renderForm(true);
    await wait(50);
    (screen.container.querySelector('.dx-test-generate') as HTMLElement).click();
    await wait(50);

    // Positive control: the field really was rebuilt (its hint follows the value).
    expect(screen.container.textContent).toContain(`${GENERATED.length} characters`);
    expect(form.data.password).toBe(GENERATED);
    expect(input().value).toBe(GENERATED);
    expect(input().type).toBe('text');
    expect(eye(screen.container)?.getAttribute('aria-label')).toBe('Hide password');
  });

  it('the eye, then a keystroke, stays revealed', async () => {
    const { screen, form, input } = renderForm(false);
    await wait(50);
    await userEvent.click(eye(screen.container)!);
    await wait(50);
    expect(input().type).toBe('text');

    await userEvent.type(input(), 'a');
    await wait(50);

    expect(form.data.password).toBe('a');
    expect(screen.container.textContent).toContain('1 characters');
    expect(input().type).toBe('text');
    expect(eye(screen.container)?.getAttribute('aria-label')).toBe('Hide password');
  });

  it('control: opening the edit modal on another row still re-masks', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
      new Response(JSON.stringify({ data: {} }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const screen = render({
      render: () =>
        h(BApp, {}, () =>
          h(DXTable, {
            items: [
              { id: 1, name: 'Ann' },
              { id: 2, name: 'Bob' },
            ],
            fields: [{ key: 'name', label: 'Name' }],
            editFields: [
              { key: 'name', type: 'text', label: 'Name' },
              { key: 'password', type: 'password', label: 'Password' },
            ],
            itemName: 'user',
            editUrl: '/api/users/:id',
          }),
        ),
    });
    await flush();
    const modal = () => document.querySelector('.modal') as HTMLElement;
    const modalInput = () =>
      modal().querySelector('[data-dx-field-key="password"] input') as HTMLInputElement;
    const openRow = async (index: number) => {
      (screen.container.querySelectorAll('tbody tr')[index] as HTMLElement).click();
      await wait(80);
    };

    await openRow(0);
    eye(modal())!.click();
    await flush();
    expect(modalInput().type).toBe('text');

    (Array.from(document.querySelectorAll('.modal button')).find(
      (b) => b.textContent?.trim() === 'Cancel',
    ) as HTMLButtonElement).click();
    await wait(80);

    await openRow(1);
    expect((modal().querySelector('[data-dx-field-key="name"] input') as HTMLInputElement).value).toBe('Bob');
    expect(modalInput().type).toBe('password');
    expect(eye(modal())?.getAttribute('aria-label')).toBe('Show password');
  });
});
