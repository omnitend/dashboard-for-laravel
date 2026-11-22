/**
 * `append`/`prepend` (field affixes) must not change the markup of a field
 * that does not use them: wrapping every input in an input group would
 * regress every consumer's layout. The snapshot below was recorded on the
 * code BEFORE the affix feature existed (0.48.2), so it pins today's markup
 * for every field type the feature touches, in every display state.
 *
 * Generated ids (bvn's and Vue's `useId`) and scoped-style attributes are
 * normalised, since they move with render order and file paths, and
 * comments are dropped (development builds keep template comments, which
 * production strips).
 */
import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-vue';
import { h } from 'vue';
import { BApp } from 'bootstrap-vue-next';
import DXField from '../../resources/js/components/extended/DXField.vue';
import { useForm } from '../../resources/js/composables/useForm';
import type { FieldDefinition } from '../../resources/js/types';

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

function normalise(html: string): string {
  return html
    .replace(/ data-v-[0-9a-f]+=""/g, '')
    .replace(/ (id|for|list|aria-describedby|aria-labelledby|aria-controls)="[^"]*"/g, ' $1="…"')
    .replace(/<!--[\s\S]*?-->/g, '');
}

async function markupOf(
  field: FieldDefinition,
  value: unknown,
  options: { layout?: 'vertical' | 'horizontal'; error?: string } = {},
): Promise<string> {
  const form = useForm({ [field.key]: value });
  if (options.error !== undefined) {
    form.setErrors({ [field.key]: [options.error] });
  }
  const screen = render({
    render: () =>
      h(BApp, {}, () => h(DXField, { field, form, layout: options.layout })),
  });
  await flush();
  const root = screen.container.querySelector('[data-dx-field-key]');
  expect(root).not.toBeNull();
  const html = normalise(root!.outerHTML);
  screen.unmount();
  return html;
}

const cases: Array<[string, FieldDefinition, unknown, { layout?: 'vertical' | 'horizontal'; error?: string }?]> = [
  ['number', { key: 'notice', type: 'number', label: 'Online notice' }, 120],
  ['number, plaintext', { key: 'notice', type: 'number', label: 'Online notice', plaintext: true }, 120],
  ['number, readonly', { key: 'notice', type: 'number', label: 'Online notice', readonly: true }, 120],
  ['number, invalid', { key: 'notice', type: 'number', label: 'Online notice' }, 120, { error: 'Too long.' }],
  ['number, horizontal', { key: 'notice', type: 'number', label: 'Online notice', hint: 'Before the slot' }, 120, { layout: 'horizontal' }],
  ['number, inputProps', { key: 'notice', type: 'number', label: 'Online notice', inputProps: { step: 5, append: 'ignored' } }, 120],
  ['text', { key: 'name', type: 'text', label: 'Name', placeholder: 'Ada' }, 'Ada'],
  ['text, plaintext', { key: 'name', type: 'text', label: 'Name', plaintext: true }, 'Ada'],
  ['email', { key: 'email', type: 'email', label: 'Email' }, 'a@example.com'],
  ['url', { key: 'site', type: 'url', label: 'Site' }, 'https://example.com'],
  ['tel', { key: 'phone', type: 'tel', label: 'Phone' }, '01234'],
  ['date', { key: 'day', type: 'date', label: 'Day' }, '2026-11-22'],
  ['percentage', { key: 'rate', type: 'percentage', label: 'Rate' }, 20],
  ['percentage, plaintext', { key: 'rate', type: 'percentage', label: 'Rate', plaintext: true }, 20],
  ['percentage, invalid', { key: 'rate', type: 'percentage', label: 'Rate' }, 20, { error: 'Too high.' }],
  ['currency', { key: 'price', type: 'currency', label: 'Price' }, 3.8],
  ['currency, plaintext', { key: 'price', type: 'currency', label: 'Price', plaintext: true }, 3.8],
  ['currency, inputProps append', { key: 'price', type: 'currency', label: 'Price', inputProps: { append: 'per case' } }, 3.8],
  ['autocomplete', { key: 'branch', type: 'autocomplete', label: 'Branch', options: [] }, 'main'],
  ['password', { key: 'secret', type: 'password', label: 'Password' }, 'x'],
  ['textarea', { key: 'notes', type: 'textarea', label: 'Notes' }, 'x'],
];

describe('DXField markup without affixes', () => {
  it.each(cases)('is unchanged: %s', async (_name, field, value, options) => {
    expect(await markupOf(field, value, options ?? {})).toMatchSnapshot();
  });
});
