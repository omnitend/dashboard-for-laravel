import { describe, it, expect } from 'vitest';
import { defineForm } from '../../resources/js/composables/defineForm';

/**
 * #125. `defineForm` seeded initial data with `field.default ?? getDefaultValueForType(type)`,
 * a rule that cannot express a *null* default: `default: null` on a select became `''`
 * (the type default), which matches no option when the "none" option is modelled as
 * `value: null` — the exact case from #122. Presence, not nullishness, decides, so all
 * three seeding sites (DXTable, DXRepeater, defineForm) agree.
 */
describe('defineForm seeds initial data by presence, not nullishness (#125)', () => {
  it('seeds a null default as null, not the type default', () => {
    const { form } = defineForm([
      {
        key: 'rounding',
        type: 'select',
        label: 'Rounding',
        default: null,
        options: [
          { value: null, text: 'No rounding' },
          { value: 5, text: 'Nearest 5p' },
        ],
      },
    ]);

    // The whole bug: `field.default ?? getDefaultValueForType('select')` seeded '',
    // which matches no option.
    expect(form.data.rounding).toBeNull();
  });

  it('falls back to the type default for a field with no default at all', () => {
    const { form } = defineForm([
      { key: 'name', type: 'text', label: 'Name' } as any,
      { key: 'active', type: 'checkbox', label: 'Active' } as any,
      { key: 'qty', type: 'number', label: 'Quantity' } as any,
      { key: 'country', type: 'select', label: 'Country' } as any,
    ]);

    expect(form.data.name).toBe('');
    expect(form.data.active).toBe(false);
    expect(form.data.qty).toBe(0);
    expect(form.data.country).toBe('');
  });

  it('applies a non-null default unchanged', () => {
    const { form } = defineForm([
      { key: 'name', type: 'text', label: 'Name', default: 'Widget' },
      { key: 'qty', type: 'number', label: 'Quantity', default: 10 },
      { key: 'active', type: 'checkbox', label: 'Active', default: true },
    ]);

    expect(form.data.name).toBe('Widget');
    expect(form.data.qty).toBe(10);
    expect(form.data.active).toBe(true);
  });

  it('treats an explicit undefined default as absent (falls back to the type default)', () => {
    // `hasOwnProperty` is true for an explicit `default: undefined`, but seeding
    // literal `undefined` into form state is never intended — it drops the key
    // from the JSON payload. `?? ` collapsed this to the type default already;
    // keep that behaviour.
    const { form } = defineForm([
      { key: 'country', type: 'select', label: 'Country', default: undefined },
    ]);

    expect(form.data.country).toBe('');
  });
});
