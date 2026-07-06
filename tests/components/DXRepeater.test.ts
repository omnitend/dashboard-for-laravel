import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-vue';
import { userEvent } from 'vitest/browser';
import DXRepeater from '../../resources/js/components/extended/DXRepeater.vue';
import { useForm } from '../../resources/js/composables/useForm';
import type { FieldDefinition } from '../../resources/js/types';

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const lineField: FieldDefinition = {
  key: 'lines',
  type: 'repeater',
  label: 'Product Lines',
  addLabel: 'Add line',
  fields: [
    { key: 'name', type: 'text', label: 'Line name' },
    { key: 'qty', type: 'number', label: 'Quantity' },
  ],
};

describe('DXRepeater', () => {
  it('renders one row per existing array item', async () => {
    const form = useForm({
      lines: [
        { name: 'First', qty: 1 },
        { name: 'Second', qty: 2 },
      ],
    });

    const screen = render(DXRepeater, {
      props: { form, field: lineField, keyPath: 'lines' },
    });

    expect(screen.container.querySelectorAll('.dx-repeater-row').length).toBe(2);
  });

  it('appends a row when the add button is clicked', async () => {
    const form = useForm({ lines: [] as Array<Record<string, any>> });

    const screen = render(DXRepeater, {
      props: { form, field: lineField, keyPath: 'lines' },
    });

    expect(screen.container.querySelectorAll('.dx-repeater-row').length).toBe(0);

    await userEvent.click(screen.getByRole('button', { name: 'Add line' }));
    await flush();

    expect(screen.container.querySelectorAll('.dx-repeater-row').length).toBe(1);
    // Form data gained a row seeded with type defaults.
    expect(form.data.lines.length).toBe(1);
    expect(form.data.lines[0]).toEqual({ name: '', qty: 0 });
  });

  it('removes a row when its remove button is clicked', async () => {
    const form = useForm({
      lines: [
        { name: 'First', qty: 1 },
        { name: 'Second', qty: 2 },
      ],
    });

    const screen = render(DXRepeater, {
      props: { form, field: lineField, keyPath: 'lines' },
    });

    const removeButtons = screen.container.querySelectorAll('.dx-repeater-row button');
    (removeButtons[0] as HTMLButtonElement).click();
    await flush();

    expect(form.data.lines.length).toBe(1);
    expect(form.data.lines[0].name).toBe('Second');
  });

  it('keeps the correct data when a middle row is removed', async () => {
    const form = useForm({
      lines: [
        { name: 'A', qty: 1 },
        { name: 'B', qty: 2 },
        { name: 'C', qty: 3 },
      ],
    });
    const screen = render(DXRepeater, {
      props: { form, field: lineField, keyPath: 'lines' },
    });

    // Remove the middle row (B).
    const removeButtons = screen.container.querySelectorAll('.dx-repeater-row button');
    (removeButtons[1] as HTMLButtonElement).click();
    await flush();

    expect(form.data.lines.map((l) => l.name)).toEqual(['A', 'C']);
    // The rendered inputs reflect the surviving rows in order.
    const textInputs = screen.container.querySelectorAll('input[type="text"]');
    expect((textInputs[0] as HTMLInputElement).value).toBe('A');
    expect((textInputs[1] as HTMLInputElement).value).toBe('C');
  });

  it('respects maxItems (add disabled at the limit)', async () => {
    const form = useForm({ lines: [{ name: 'Only', qty: 1 }] });
    const screen = render(DXRepeater, {
      props: {
        form,
        field: { ...lineField, maxItems: 1 },
        keyPath: 'lines',
      },
    });

    const addButton = screen.getByRole('button', { name: 'Add line' }).element() as HTMLButtonElement;
    expect(addButton.disabled).toBe(true);
  });

  it('clears stale nested array errors when a row is removed', async () => {
    const form = useForm({
      lines: [
        { name: 'A', qty: 1 },
        { name: 'B', qty: 2 },
      ],
    });
    // Server-style nested error on the second row.
    form.setErrors({ 'lines.1.name': ['Required.'] });
    expect(form.hasError('lines.1.name')).toBe(true);

    const screen = render(DXRepeater, {
      props: { form, field: lineField, keyPath: 'lines' },
    });
    const removeButtons = screen.container.querySelectorAll('.dx-repeater-row button');
    (removeButtons[0] as HTMLButtonElement).click();
    await flush();

    // Indices shifted, so the per-index error is cleared rather than misattributed.
    expect(form.hasError('lines.1.name')).toBe(false);
  });

  it('does not share object/array defaults across added rows', async () => {
    // `tags` is a nested repeater so its array default ([]) renders cleanly
    // while still exercising the deep-clone of object/array defaults.
    const field: FieldDefinition = {
      key: 'groups',
      type: 'repeater',
      addLabel: 'Add group',
      fields: [
        { key: 'label', type: 'text', label: 'Label' },
        {
          key: 'tags',
          type: 'repeater',
          label: 'Tags',
          default: [] as unknown[],
          fields: [{ key: 'value', type: 'text', label: 'Value' }],
        },
      ],
    };
    const form = useForm({ groups: [] as Array<Record<string, any>> });
    const screen = render(DXRepeater, { props: { form, field, keyPath: 'groups' } });

    const findAdd = () =>
      Array.from(screen.container.querySelectorAll('button')).find(
        (b) => b.textContent?.trim() === 'Add group',
      ) as HTMLButtonElement;

    findAdd().click();
    await flush();
    findAdd().click();
    await flush();

    expect(form.data.groups.length).toBe(2);
    // Each row's array default is a distinct reference.
    expect(form.data.groups[0].tags).not.toBe(form.data.groups[1].tags);
  });

  describe('softDeleteKey', () => {
    const softDeleteField: FieldDefinition = {
      ...lineField,
      softDeleteKey: 'to_delete',
    };

    it('flags a persisted row instead of splicing it, and hides it from the UI', async () => {
      const form = useForm({
        lines: [
          { id: 1, name: 'First', qty: 1 },
          { id: 2, name: 'Second', qty: 2 },
        ],
      });
      const screen = render(DXRepeater, {
        props: { form, field: softDeleteField, keyPath: 'lines' },
      });

      const removeButtons = screen.container.querySelectorAll('.dx-repeater-row button');
      (removeButtons[0] as HTMLButtonElement).click();
      await flush();

      // Still in form.data (so it's submitted), flagged, and no longer spliced away.
      expect(form.data.lines.length).toBe(2);
      expect(form.data.lines[0]).toEqual({ id: 1, name: 'First', qty: 1, to_delete: true });
      // Hidden from the UI.
      expect(screen.container.querySelectorAll('.dx-repeater-row').length).toBe(1);
    });

    it('splices a never-persisted (id-less) row as before', async () => {
      const form = useForm({ lines: [{ name: 'Draft', qty: 1 }] });
      const screen = render(DXRepeater, {
        props: { form, field: softDeleteField, keyPath: 'lines' },
      });

      const removeButtons = screen.container.querySelectorAll('.dx-repeater-row button');
      (removeButtons[0] as HTMLButtonElement).click();
      await flush();

      expect(form.data.lines.length).toBe(0);
      expect(screen.container.querySelectorAll('.dx-repeater-row').length).toBe(0);
    });

    it('excludes soft-deleted rows from minItems/maxItems counts', async () => {
      const form = useForm({
        lines: [
          { id: 1, name: 'First', qty: 1 },
          { id: 2, name: 'Second', qty: 2 },
        ],
      });
      const screen = render(DXRepeater, {
        props: {
          form,
          field: { ...softDeleteField, minItems: 1, maxItems: 2 },
          keyPath: 'lines',
        },
      });

      // Soft-delete the first row: one visible row remains, at minItems, so
      // its own remove button is disabled — but the add button, which counts
      // against maxItems, is enabled since only one row is now visible.
      const removeButtons = screen.container.querySelectorAll('.dx-repeater-row button');
      (removeButtons[0] as HTMLButtonElement).click();
      await flush();

      const remainingRemove = screen.container.querySelector(
        '.dx-repeater-row button',
      ) as HTMLButtonElement;
      expect(remainingRemove.disabled).toBe(true);

      const addButton = screen.getByRole('button', { name: 'Add line' }).element() as HTMLButtonElement;
      expect(addButton.disabled).toBe(false);
    });
  });

  it('binds nested sub-field inputs to form.data via dotted paths', async () => {
    const form = useForm({ lines: [{ name: 'First', qty: 1 }] });
    const screen = render(DXRepeater, {
      props: { form, field: lineField, keyPath: 'lines' },
    });

    const firstInput = screen.container.querySelector('input[type="text"]') as HTMLInputElement;
    expect(firstInput.value).toBe('First');

    // Drive the input natively — the generated id makes userEvent's locator
    // flaky, and we only care that the dotted-path v-model writes back.
    firstInput.value = 'Renamed';
    firstInput.dispatchEvent(new Event('input', { bubbles: true }));
    await flush();

    expect(form.data.lines[0].name).toBe('Renamed');
  });
});
