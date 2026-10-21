import { describe, it, expect, vi, afterEach } from 'vitest';
import { render } from 'vitest-browser-vue';
import { h } from 'vue';
import DXForm from '../../resources/js/components/extended/DXForm.vue';
import { useForm } from '../../resources/js/composables/useForm';
import type { FieldDefinition } from '../../resources/js/types';

/*
 * 0.47.0 review: a `span` or `value` slot that edits an array (rows it draws
 * itself) writes the whole array through `update`. `update` cleared only the
 * field's own key, so after a 422 on `lines.1.price` the per-row error stayed
 * in `form.errors` while the rows moved under it: a slot drawing its rows with
 * `form.getError('lines.N.price')` showed it on whichever row now sat at
 * index 1. The repeater's add/remove already clears everything under
 * `<key>.`; a slot's `update` now does the same. Errors on other keys stay,
 * including one whose key merely starts with the same letters (`lines_note`).
 *
 * The error SUMMARY is not what changes here: it is built from
 * `form.submitFailure` and by design lists the last failure until the next
 * submit, whatever is edited (DXFormErrorSummary's header).
 */

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const settle = async () => {
  for (let i = 0; i < 6; i += 1) await flush();
};

const invalid = (errors: Record<string, string[]>) =>
  new Response(JSON.stringify({ message: 'The given data was invalid.', errors }), {
    status: 422,
    headers: { 'Content-Type': 'application/json' },
  });

const ERRORS = {
  'lines.1.price': ['Enter a price.'],
  lines_note: ['Add a note.'],
  name: ['Enter a name.'],
};

const makeFormData = () => ({
  name: '',
  lines_note: '',
  lines: [
    { name: 'Chaucer Ale', price: '3' },
    { name: 'Mild', price: '' },
  ],
});

const makeForm = () => useForm(makeFormData());

/** Removes the first row through the slot's `update`, as a hand-drawn row list would. */
const removeFirstRow = (slotProps: any) =>
  h(
    'button',
    {
      type: 'button',
      class: 'dx-test-remove-first',
      onClick: () => slotProps.update(slotProps.value.slice(1)),
    },
    'Remove first row',
  );

const linesField = (kind: 'span' | 'value'): FieldDefinition =>
  kind === 'span'
    ? { key: 'lines', label: 'Lines', span: true, rowLabel: (row: any) => row?.name }
    : { key: 'lines', type: 'text', label: 'Lines' };

describe.each(['span', 'value'] as const)('a %s slot update clears errors under its key', (kind) => {
  afterEach(() => vi.restoreAllMocks());

  it('drops the errors under its key from the form; other keys keep theirs', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => invalid(ERRORS));
    const form = makeForm();
    const fields: FieldDefinition[] = [
      { key: 'name', type: 'text', label: 'Name' },
      { key: 'lines_note', type: 'text', label: 'Lines note' },
      linesField(kind),
    ];
    const screen = render(DXForm, {
      props: { form, fields, showSubmit: false },
      slots: { [`${kind}(lines)`]: removeFirstRow },
    });
    await settle();
    await expect(form.post('/api/orders')).rejects.toBeTruthy();
    await settle();
    await wait(50);

    // Positive control: the 422 arrived and the nested error is live.
    expect(screen.container.querySelector('.dx-form-error-summary')?.textContent).toContain(
      'Enter a price.',
    );
    expect(form.hasError('lines.1.price')).toBe(true);

    (screen.container.querySelector('.dx-test-remove-first') as HTMLElement).click();
    await settle();

    expect(form.data.lines).toEqual([{ name: 'Mild', price: '' }]);
    expect(form.errors['lines.1.price']).toBeUndefined();
    expect(form.hasError('lines.1.price')).toBe(false);
    // Control: unrelated keys, including a same-prefix sibling, keep their errors.
    expect(form.errors.lines_note).toEqual(['Add a note.']);
    expect(form.errors.name).toEqual(['Enter a name.']);
  });
});

/*
 * 0.47.2 review: clearing EVERY `<key>.` error on EVERY `update` was too
 * broad. A slot-drawn row editor calls `update` per keystroke with the same
 * rows, and that wiped the other rows' errors; an object field's value slot
 * (`address`) lost `address.postcode` when the street was edited. Nested
 * errors now clear only when the rows' identities or order change; other
 * updates behave like a plain setValue (the field's own error only).
 */

type SlotAction = (slotProps: any) => void;

/** A slot rendering one button per action, so a test can drive `update`. */
const actionButtons = (actions: Record<string, SlotAction>) => (slotProps: any) =>
  h(
    'div',
    Object.entries(actions).map(([name, action]) =>
      h('button', { type: 'button', class: `dx-test-${name}`, onClick: () => action(slotProps) }, name),
    ),
  );

async function renderWith(
  kind: 'span' | 'value',
  errors: Record<string, string[]>,
  data: Record<string, any>,
  field: FieldDefinition,
  actions: Record<string, SlotAction>,
) {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async () => invalid(errors));
  const form = useForm(data);
  const screen = render(DXForm, {
    props: { form, fields: [field], showSubmit: false },
    slots: { [`${kind}(${field.key})`]: actionButtons(actions) },
  });
  await settle();
  await expect(form.post('/api/orders')).rejects.toBeTruthy();
  await settle();
  const press = async (name: string) => {
    (screen.container.querySelector(`.dx-test-${name}`) as HTMLElement).click();
    await settle();
  };
  return { form, press };
}

const ROW_ERRORS = {
  'lines.0.price': ['Enter a price for row 1.'],
  'lines.1.price': ['Enter a price for row 2.'],
};

describe.each(['span', 'value'] as const)('a %s slot update keeps nested errors when the rows stay put', (kind) => {
  afterEach(() => vi.restoreAllMocks());

  const rowActions: Record<string, SlotAction> = {
    // A row editor typing into row 0, then writing the same array back.
    'type-in-place': (slotProps) => {
      slotProps.value[0].price = '4';
      slotProps.update(slotProps.value);
    },
    // The same edit through a shallow copy: a new array of the same rows.
    'type-copy': (slotProps) => {
      slotProps.value[0].price = '5';
      slotProps.update([...slotProps.value]);
    },
    // Removing a row in place, then writing the same array back.
    'remove-in-place': (slotProps) => {
      slotProps.value.splice(0, 1);
      slotProps.update(slotProps.value);
    },
    // Reordering.
    reverse: (slotProps) => slotProps.update([...slotProps.value].reverse()),
  };

  it('update(sameArray) per keystroke keeps every row error', async () => {
    const { form, press } = await renderWith(kind, ROW_ERRORS, makeFormData(), linesField(kind), rowActions);
    expect(form.hasError('lines.1.price')).toBe(true);
    await press('type-in-place');
    await press('type-in-place');
    expect(form.data.lines[0].price).toBe('4');
    expect(form.errors['lines.0.price']).toEqual(['Enter a price for row 1.']);
    expect(form.errors['lines.1.price']).toEqual(['Enter a price for row 2.']);
  });

  it('update([...sameRows]) keeps every row error', async () => {
    const { form, press } = await renderWith(kind, ROW_ERRORS, makeFormData(), linesField(kind), rowActions);
    await press('type-copy');
    expect(form.data.lines[0].price).toBe('5');
    expect(form.errors['lines.1.price']).toEqual(['Enter a price for row 2.']);
  });

  it('control: a row removed in place, then update(sameArray), clears them', async () => {
    const { form, press } = await renderWith(kind, ROW_ERRORS, makeFormData(), linesField(kind), rowActions);
    expect(form.hasError('lines.1.price')).toBe(true);
    await press('remove-in-place');
    expect(form.data.lines).toHaveLength(1);
    expect(form.errors['lines.0.price']).toBeUndefined();
    expect(form.errors['lines.1.price']).toBeUndefined();
  });

  it('control: reordered rows clear them', async () => {
    const { form, press } = await renderWith(kind, ROW_ERRORS, makeFormData(), linesField(kind), rowActions);
    await press('reverse');
    expect(form.data.lines[0].name).toBe('Mild');
    expect(form.errors['lines.0.price']).toBeUndefined();
    expect(form.errors['lines.1.price']).toBeUndefined();
  });
});

describe.each(['span', 'value'] as const)('a %s slot for an object field', (kind) => {
  afterEach(() => vi.restoreAllMocks());

  const addressField: FieldDefinition =
    kind === 'span'
      ? { key: 'address', label: 'Address', span: true }
      : { key: 'address', type: 'text', label: 'Address' };
  const actions: Record<string, SlotAction> = {
    street: (slotProps) => slotProps.update({ ...slotProps.value, street: '1 High St' }),
    'street-in-place': (slotProps) => {
      slotProps.value.street = '2 High St';
      slotProps.update(slotProps.value);
    },
  };

  it('keeps address.postcode when the street is edited; its own error clears', async () => {
    const { form, press } = await renderWith(
      kind,
      { address: ['Check the address.'], 'address.postcode': ['Enter a postcode.'] },
      { address: { street: '', postcode: '' } },
      addressField,
      actions,
    );
    expect(form.hasError('address')).toBe(true);
    await press('street');
    expect(form.data.address.street).toBe('1 High St');
    expect(form.errors['address.postcode']).toEqual(['Enter a postcode.']);
    // As a plain setValue: the field's own error clears.
    expect(form.errors.address).toBeUndefined();
    await press('street-in-place');
    expect(form.data.address.street).toBe('2 High St');
    expect(form.errors['address.postcode']).toEqual(['Enter a postcode.']);
  });
});
