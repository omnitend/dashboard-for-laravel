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

const makeForm = () =>
  useForm({
    name: '',
    lines_note: '',
    lines: [
      { name: 'Chaucer Ale', price: '3' },
      { name: 'Mild', price: '' },
    ],
  });

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
