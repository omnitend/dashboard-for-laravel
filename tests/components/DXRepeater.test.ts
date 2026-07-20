import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-vue';
import { userEvent } from 'vitest/browser';
import { h } from 'vue';
import DXRepeater from '../../resources/js/components/extended/DXRepeater.vue';
import { useForm } from '../../resources/js/composables/useForm';
import type { FieldDefinition } from '../../resources/js/types';

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

/** Polls (real ResizeObserver callbacks are async) until `check()` returns
 *  true, or throws on timeout. Table/cards are mounted via v-if/v-else (only
 *  one exists in the DOM at a time), so tests poll for presence/absence via
 *  a querySelector-based check rather than a computed `display` value. */
async function waitFor(check: () => boolean, timeoutMs = 2000) {
  const start = Date.now();
  while (!check()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error('Timed out waiting for condition');
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}

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

  describe('showRowIndex', () => {
    it('does not render a row index by default', async () => {
      const form = useForm({
        lines: [
          { name: 'First', qty: 1 },
          { name: 'Second', qty: 2 },
        ],
      });
      const screen = render(DXRepeater, {
        props: { form, field: lineField, keyPath: 'lines' },
      });

      expect(screen.container.querySelector('.dx-repeater-row-index')).toBeFalsy();
    });

    it('renders the 1-based row index when showRowIndex is set', async () => {
      const form = useForm({
        lines: [
          { name: 'First', qty: 1 },
          { name: 'Second', qty: 2 },
        ],
      });
      const screen = render(DXRepeater, {
        props: { form, field: { ...lineField, showRowIndex: true }, keyPath: 'lines' },
      });

      const indices = Array.from(
        screen.container.querySelectorAll('.dx-repeater-row-index'),
      ).map((el) => el.textContent?.trim());
      expect(indices).toEqual(['1', '2']);
    });
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

  // The cards markup was extracted into DXRepeaterCards (#135), so the custom
  // `row` slot now forwards across an extra component hop. A dropped binding
  // there is a silent regression — assert the slot renders with its bindings.
  it('forwards the custom `row` slot (with bindings) through DXRepeaterCards', async () => {
    const form = useForm({
      lines: [
        { name: 'First', qty: 1 },
        { name: 'Second', qty: 2 },
      ],
    });

    const screen = render(DXRepeater, {
      props: { form, field: lineField, keyPath: 'lines' },
      slots: {
        row: (binds: any) =>
          h(
            'div',
            { class: 'custom-row', 'data-path': binds.path },
            [
              `#${binds.index} ${binds.row.name}`,
              h('button', { class: 'custom-remove', onClick: () => binds.remove() }, 'X'),
            ],
          ),
      },
    });

    // Default sub-field stack is replaced by the custom row content.
    const custom = Array.from(screen.container.querySelectorAll('.custom-row'));
    expect(custom.length).toBe(2);
    // Bindings arrive: index, row data, and the dot path.
    expect(custom[0].textContent).toContain('#0 First');
    expect(custom[0].getAttribute('data-path')).toBe('lines.0');
    // The `remove` binding works through the hop.
    (custom[0].querySelector('.custom-remove') as HTMLButtonElement).click();
    await flush();
    expect(form.data.lines.map((l: any) => l.name)).toEqual(['Second']);
  });

  describe('table layout (#68)', () => {
    const tableField: FieldDefinition = { ...lineField, repeaterLayout: 'table' };

    it('renders one <tr> per row with a header per sub-field', async () => {
      const form = useForm({
        lines: [
          { name: 'First', qty: 1 },
          { name: 'Second', qty: 2 },
        ],
      });
      const screen = render(DXRepeater, {
        props: { form, field: tableField, keyPath: 'lines' },
      });

      expect(screen.container.querySelector('.dx-repeater-container')).toBeTruthy();
      expect(screen.container.querySelector('table.dx-repeater-table')).toBeTruthy();
      const headers = Array.from(screen.container.querySelectorAll('thead th')).map(
        (th) => th.textContent?.trim(),
      );
      expect(headers).toEqual(['Line name', 'Quantity', '']);
      expect(screen.container.querySelectorAll('tbody tr').length).toBe(2);
      // Sub-field labels are hidden per-row (the column header names them).
      expect(screen.container.querySelector('tbody .form-label')).toBeFalsy();
    });

    it('does not wrap in a container or add a ResizeObserver in cards mode', async () => {
      const form = useForm({ lines: [{ name: 'First', qty: 1 }] });
      const screen = render(DXRepeater, {
        props: { form, field: lineField, keyPath: 'lines' },
      });

      expect(screen.container.querySelector('.dx-repeater-container')).toBeFalsy();
      expect(screen.container.querySelector('.dx-repeater-table-wrapper')).toBeFalsy();
    });

    it('shows the table when the container is wide enough for its columns, and only mounts the table (not the cards fallback)', async () => {
      const form = useForm({
        lines: [
          { name: 'First', qty: 1 },
          { name: 'Second', qty: 2 },
        ],
      });
      // 2 sub-fields need ~130*2+70=330px; give it plenty of room.
      const screen = render({
        render: () =>
          h('div', { style: 'width: 900px' }, [h(DXRepeater, { form, field: tableField, keyPath: 'lines' })]),
      });

      await waitFor(() => screen.container.querySelector('.dx-repeater-table-wrapper') !== null);
      // Mutually exclusive via v-if/v-else — the cards fallback must not
      // also be mounted just because table mode is configured.
      expect(screen.container.querySelector('.dx-repeater-container .dx-repeater')).toBeFalsy();
    });

    it('falls back to cards when the container is too narrow for the table, and only mounts the cards fallback (not the table)', async () => {
      const form = useForm({
        lines: [
          { name: 'First', qty: 1 },
          { name: 'Second', qty: 2 },
        ],
      });
      // 2 sub-fields need ~330px; 150px is well under that.
      const screen = render({
        render: () =>
          h('div', { style: 'width: 150px' }, [h(DXRepeater, { form, field: tableField, keyPath: 'lines' })]),
      });

      await waitFor(
        () => screen.container.querySelector('.dx-repeater-container .dx-repeater') !== null,
      );
      const cards = screen.container.querySelector('.dx-repeater-container .dx-repeater')!;
      expect(cards.querySelectorAll('.dx-repeater-row').length).toBe(2);
      expect(screen.container.querySelector('.dx-repeater-table-wrapper')).toBeFalsy();
    });

    it('requires more width for a repeater with more columns', async () => {
      const form = useForm({ rows: [{ a: '', b: '', c: '', d: '', e: '' }] });
      const wideColumnField: FieldDefinition = {
        key: 'rows',
        type: 'repeater',
        repeaterLayout: 'table',
        fields: [
          { key: 'a', type: 'text', label: 'A' },
          { key: 'b', type: 'text', label: 'B' },
          { key: 'c', type: 'text', label: 'C' },
          { key: 'd', type: 'text', label: 'D' },
          { key: 'e', type: 'text', label: 'E' },
        ],
      };
      // 5 columns need ~130*5+70=720px — 400px is enough for a 2-column
      // repeater (see the test above) but not this one.
      const screen = render({
        render: () =>
          h('div', { style: 'width: 400px' }, [h(DXRepeater, { form, field: wideColumnField, keyPath: 'rows' })]),
      });

      await waitFor(
        () => screen.container.querySelector('.dx-repeater-container .dx-repeater') !== null,
      );
      expect(screen.container.querySelector('.dx-repeater-table-wrapper')).toBeFalsy();
    });

    it('requires more width for a currency/percentage column (extra room for the affix)', async () => {
      const form = useForm({ lines: [{ name: '', price: 0 }] });
      const currencyField: FieldDefinition = {
        key: 'lines',
        type: 'repeater',
        repeaterLayout: 'table',
        fields: [
          { key: 'name', type: 'text', label: 'Name' },
          { key: 'price', type: 'currency', label: 'Price' },
        ],
      };
      // A plain 2-text-field repeater needs ~130*2+70=330px and would show
      // the table at 350px; a currency field bumps that column to ~160px
      // (330+30=360px needed), so the same 350px falls back to cards.
      const screen = render({
        render: () =>
          h('div', { style: 'width: 350px' }, [h(DXRepeater, { form, field: currencyField, keyPath: 'lines' })]),
      });

      await waitFor(
        () => screen.container.querySelector('.dx-repeater-container .dx-repeater') !== null,
      );
      expect(screen.container.querySelector('.dx-repeater-table-wrapper')).toBeFalsy();
    });

    it('appends a row when the add button is clicked', async () => {
      const form = useForm({ lines: [] as Array<Record<string, any>> });
      const screen = render(DXRepeater, {
        props: { form, field: tableField, keyPath: 'lines' },
      });

      expect(screen.container.querySelectorAll('tbody tr').length).toBe(0);

      // Two "Add line" buttons exist (table + cards fallback, both always in
      // the DOM) — scope to the table's own. A raw `.click()` (not
      // userEvent.click, which enforces real visibility) since which one is
      // actually visible depends on the ResizeObserver measurement timing —
      // this test only cares that the handler still works.
      const addButton = Array.from(
        screen.container.querySelectorAll('.dx-repeater-table-wrapper button'),
      ).find((b) => b.textContent?.trim() === 'Add line') as HTMLButtonElement;
      addButton.click();
      await flush();

      expect(screen.container.querySelectorAll('tbody tr').length).toBe(1);
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
        props: { form, field: tableField, keyPath: 'lines' },
      });

      const removeButtons = screen.container.querySelectorAll('tbody tr button');
      (removeButtons[0] as HTMLButtonElement).click();
      await flush();

      expect(form.data.lines.length).toBe(1);
      expect(form.data.lines[0].name).toBe('Second');
    });

    it('respects maxItems (add disabled at the limit)', async () => {
      const form = useForm({ lines: [{ name: 'Only', qty: 1 }] });
      const screen = render(DXRepeater, {
        props: {
          form,
          field: { ...tableField, maxItems: 1 },
          keyPath: 'lines',
        },
      });

      const addButton = Array.from(
        screen.container.querySelectorAll('.dx-repeater-table-wrapper button'),
      ).find((b) => b.textContent?.trim() === 'Add line') as HTMLButtonElement;
      expect(addButton.disabled).toBe(true);
    });

    it('binds nested sub-field inputs to form.data via dotted paths', async () => {
      const form = useForm({ lines: [{ name: 'First', qty: 1 }] });
      const screen = render(DXRepeater, {
        props: { form, field: tableField, keyPath: 'lines' },
      });

      const firstInput = screen.container.querySelector('input[type="text"]') as HTMLInputElement;
      expect(firstInput.value).toBe('First');

      firstInput.value = 'Renamed';
      firstInput.dispatchEvent(new Event('input', { bubbles: true }));
      await flush();

      expect(form.data.lines[0].name).toBe('Renamed');
    });

    it('resolves a function-valued sub-field label against the outer model for the column header', async () => {
      const form = useForm({ lines: [{ name: 'First', qty: 1 }] });
      const field: FieldDefinition = {
        ...tableField,
        fields: [
          { key: 'name', type: 'text', label: (model: any) => `Name (${model.currency})` },
          { key: 'qty', type: 'number', label: 'Quantity' },
        ],
      };
      const screen = render(DXRepeater, {
        props: { form, field, keyPath: 'lines', model: { currency: 'GBP' } },
      });

      const headers = Array.from(screen.container.querySelectorAll('thead th')).map(
        (th) => th.textContent?.trim(),
      );
      expect(headers).toContain('Name (GBP)');
    });
  });
});
