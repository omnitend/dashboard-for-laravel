/**
 * Field `append`/`prepend`: short unit text in an input-group cell beside the
 * input ("Online notice [120] minutes" rather than "Online notice (minutes)").
 * A field WITHOUT them keeps its bare markup: that is pinned separately, by
 * the snapshot in DXField-AffixMarkupUnchanged.test.ts.
 */
import { afterEach, describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-vue';
import { page, userEvent } from 'vitest/browser';
import { h } from 'vue';
import { BApp } from 'bootstrap-vue-next';
import DXField from '../../resources/js/components/extended/DXField.vue';
import DXForm from '../../resources/js/components/extended/DXForm.vue';
import { useForm } from '../../resources/js/composables/useForm';
import type { FieldDefinition } from '../../resources/js/types';

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

function renderField(
  field: FieldDefinition,
  data: Record<string, any>,
  extraProps: Record<string, any> = {},
) {
  const form = useForm(data);
  const screen = render({
    render: () => h(BApp, {}, () => h(DXField, { field, form, ...extraProps })),
  });
  return { screen, form, root: screen.container };
}

/** The `.input-group-text` cells around the field's input, in DOM order. */
function cellTexts(root: Element): string[] {
  return Array.from(root.querySelectorAll('.input-group > .input-group-text')).map(
    (cell) => cell.textContent ?? '',
  );
}

/** The texts the input's aria-describedby points at, in order. */
function describedByTexts(input: HTMLElement): string[] {
  const ids = (input.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean);
  return ids.map((id) => document.getElementById(id)?.textContent ?? `<missing #${id}>`);
}

describe('DXField append/prepend on a number field', () => {
  it('puts the unit in a cell after the input, inside one input group', async () => {
    const { root } = renderField(
      { key: 'notice', type: 'number', label: 'Online notice', append: 'minutes' },
      { notice: 120 },
    );
    await flush();

    const group = root.querySelector('.input-group.dx-field-affix');
    expect(group).not.toBeNull();
    const children = Array.from(group!.children);
    expect(children.map((el) => el.tagName)).toEqual(['INPUT', 'SPAN']);
    expect(children[1].textContent).toBe('minutes');
    expect((children[0] as HTMLInputElement).value).toBe('120');
    // The label stays the label: no unit in it.
    expect(root.querySelector('label')?.textContent?.trim()).toBe('Online notice');
  });

  it('puts the prepend before the input', async () => {
    const { root } = renderField(
      { key: 'every', type: 'number', label: 'Repeat', prepend: 'every', append: 'weeks' },
      { every: 2 },
    );
    await flush();

    const group = root.querySelector('.input-group.dx-field-affix')!;
    expect(Array.from(group.children).map((el) => el.tagName)).toEqual(['SPAN', 'INPUT', 'SPAN']);
    expect(cellTexts(root)).toEqual(['every', 'weeks']);
  });

  it('names the cells in the input’s aria-describedby, after the consumer’s own id', async () => {
    const { root } = renderField(
      {
        key: 'every',
        type: 'number',
        label: 'Repeat',
        prepend: 'every',
        append: 'weeks',
        inputProps: { 'aria-describedby': 'outside-note' },
      },
      { every: 2 },
    );
    const note = document.createElement('p');
    note.id = 'outside-note';
    note.textContent = 'Counted from the first booking';
    document.body.appendChild(note);
    await flush();

    const input = root.querySelector('input') as HTMLInputElement;
    expect(describedByTexts(input)).toEqual(['Counted from the first booking', 'every', 'weeks']);
    note.remove();
  });

  it('labels the input by the field label, so the unit is not part of the name', async () => {
    const { root } = renderField(
      { key: 'notice', type: 'number', label: 'Online notice', append: 'minutes' },
      { notice: 120 },
    );
    await flush();

    const input = root.querySelector('input') as HTMLInputElement;
    expect(input.labels?.[0]?.textContent?.trim()).toBe('Online notice');
    expect(describedByTexts(input)).toEqual(['minutes']);
  });

  it('follows a function of the model, like hint', async () => {
    const { root, form } = renderField(
      {
        key: 'notice',
        type: 'number',
        label: 'Online notice',
        append: (model) => (Number(model.notice) === 1 ? 'minute' : 'minutes'),
      },
      { notice: 1 },
    );
    await flush();
    expect(cellTexts(root)).toEqual(['minute']);

    form.data.notice = 5;
    await flush();
    expect(cellTexts(root)).toEqual(['minutes']);
  });

  it('keeps the value numeric when typed into', async () => {
    const { root, form } = renderField(
      { key: 'notice', type: 'number', label: 'Online notice', append: 'minutes' },
      { notice: 120 },
    );
    await flush();

    const input = root.querySelector('.dx-field-affix > input') as HTMLInputElement;
    await userEvent.fill(input, '45');
    expect(form.data.notice).toBe(45);
  });

  it('treats an empty affix as none: the bare input', async () => {
    const { root } = renderField(
      { key: 'notice', type: 'number', label: 'Online notice', append: '', prepend: () => '' },
      { notice: 120 },
    );
    await flush();

    expect(root.querySelector('input')).not.toBeNull();
    expect(root.querySelector('.input-group')).toBeNull();
    expect(root.querySelector('input')?.hasAttribute('aria-describedby')).toBe(false);

    // Control: the same field with a unit does get the group.
    const withUnit = renderField(
      { key: 'notice', type: 'number', label: 'Online notice', append: 'minutes', prepend: () => '' },
      { notice: 120 },
    );
    await flush();
    expect(cellTexts(withUnit.root)).toEqual(['minutes']);
  });

  it('shows the validation state on the input and the message below the group', async () => {
    const { root, form } = renderField(
      { key: 'notice', type: 'number', label: 'Online notice', append: 'minutes' },
      { notice: 120 },
    );
    form.setErrors({ notice: ['Online notice may not be more than 60 minutes.'] });
    await flush();

    const group = root.querySelector('.input-group.dx-field-affix')!;
    const input = group.querySelector('input')!;
    expect(input.classList.contains('is-invalid')).toBe(true);
    const feedback = root.querySelector('.invalid-feedback')!;
    expect(feedback.textContent).toContain('may not be more than 60 minutes');
    expect(group.contains(feedback)).toBe(false);
    expect(group.nextElementSibling).toBe(feedback);
  });

  it('keeps the group on a readonly field, with a readonly input', async () => {
    const { root } = renderField(
      { key: 'notice', type: 'number', label: 'Online notice', append: 'minutes', readonly: true },
      { notice: 120 },
    );
    await flush();

    const input = root.querySelector('.dx-field-affix input') as HTMLInputElement;
    expect(input.readOnly).toBe(true);
    expect(cellTexts(root)).toEqual(['minutes']);
  });
});

describe('DXField append/prepend on a plaintext field', () => {
  it('shows the value followed by the unit as text', async () => {
    const { root } = renderField(
      { key: 'notice', type: 'number', label: 'Online notice', append: 'minutes', plaintext: true },
      { notice: 120 },
    );
    await flush();

    const text = root.querySelector('.form-control-plaintext.dx-field-affix-plaintext');
    expect(text?.textContent).toBe('120 minutes');
    expect(root.querySelector('.input-group')).toBeNull();
    expect(root.querySelector('input')).toBeNull();
  });

  it('puts the prepend first', async () => {
    const { root } = renderField(
      { key: 'every', type: 'number', label: 'Repeat', prepend: 'every', append: 'weeks', plaintext: true },
      { every: 2 },
    );
    await flush();
    expect(root.querySelector('.dx-field-affix-plaintext')?.textContent).toBe('every 2 weeks');
  });

  it('shows nothing for an empty value, not a unit on its own', async () => {
    for (const empty of [null, undefined, '']) {
      const { root, screen } = renderField(
        { key: 'notice', type: 'number', label: 'Online notice', append: 'minutes', plaintext: true },
        { notice: empty },
      );
      await flush();
      const text = root.querySelector('.dx-field-affix-plaintext');
      expect(text).not.toBeNull();
      expect(text?.textContent).toBe('');
      screen.unmount();
    }
  });

  it('shows a zero, which is a value', async () => {
    const { root } = renderField(
      { key: 'notice', type: 'number', label: 'Online notice', append: 'minutes', plaintext: true },
      { notice: 0 },
    );
    await flush();
    expect(root.querySelector('.dx-field-affix-plaintext')?.textContent).toBe('0 minutes');
  });

  it('cannot be made editable through inputProps', async () => {
    const { root } = renderField(
      {
        key: 'notice',
        type: 'number',
        label: 'Online notice',
        append: 'minutes',
        plaintext: true,
        inputProps: { readonly: false, plaintext: false },
      },
      { notice: 120 },
    );
    await flush();
    expect(root.querySelector('input')).toBeNull();
    expect(root.querySelector('.dx-field-affix-plaintext')?.textContent).toBe('120 minutes');
  });
});

describe('DXField append/prepend on text-like fields', () => {
  it.each(['text', 'email', 'url', 'tel'] as const)('renders the cells on a %s field', async (type) => {
    const { root } = renderField(
      { key: 'value', type, label: 'Value', prepend: 'before', append: 'after' },
      { value: 'x' },
    );
    await flush();

    const group = root.querySelector('.input-group.dx-field-affix')!;
    expect(group).not.toBeNull();
    const input = group.querySelector('input')!;
    expect(input.type).toBe(type);
    expect(cellTexts(root)).toEqual(['before', 'after']);
    expect(describedByTexts(input)).toEqual(['before', 'after']);
  });

  it('writes typed text back to the model', async () => {
    const { root, form } = renderField(
      { key: 'handle', type: 'text', label: 'Handle', prepend: '@' },
      { handle: '' },
    );
    await flush();

    await userEvent.fill(root.querySelector('.dx-field-affix > input')!, 'omnitend');
    expect(form.data.handle).toBe('omnitend');
  });

  it('shows a plaintext text value with its affixes', async () => {
    const { root } = renderField(
      { key: 'handle', type: 'text', label: 'Handle', prepend: '@', plaintext: true },
      { handle: 'omnitend' },
    );
    await flush();
    expect(root.querySelector('.dx-field-affix-plaintext')?.textContent).toBe('@ omnitend');
  });

  it.each([
    ['password', 'secret'],
    ['date', '2026-11-22'],
    ['autocomplete', 'main'],
    ['textarea', 'notes'],
  ] as const)('is ignored on a %s field', async (type, value) => {
    const { root } = renderField(
      { key: 'value', type, label: 'Value', append: 'unit', prepend: 'lead', options: [] },
      { value },
    );
    await flush();
    expect(root.querySelector('input, textarea')).not.toBeNull();
    expect(root.querySelector('.dx-field-affix')).toBeNull();
    expect(root.textContent).not.toContain('unit');
    expect(root.textContent).not.toContain('lead');

    // Control: the same definition on a text field shows both.
    const text = renderField(
      { key: 'value', type: 'text', label: 'Value', append: 'unit', prepend: 'lead' },
      { value: 'x' },
    );
    await flush();
    expect(cellTexts(text.root)).toEqual(['lead', 'unit']);
  });
});

describe('DXField append/prepend on percentage and currency fields', () => {
  it('replaces a percentage’s "%" with its append', async () => {
    const { root } = renderField(
      { key: 'share', type: 'percentage', label: 'Share', append: '% of takings' },
      { share: 20 },
    );
    await flush();
    expect(cellTexts(root)).toEqual(['% of takings']);
  });

  it('keeps the "%" when a percentage has only a prepend', async () => {
    const { root } = renderField(
      { key: 'share', type: 'percentage', label: 'Share', prepend: 'about' },
      { share: 20 },
    );
    await flush();
    expect(cellTexts(root)).toEqual(['about', '%']);
  });

  it('keeps asFraction scaling inside the group, both ways', async () => {
    const { root, form } = renderField(
      { key: 'share', type: 'percentage', label: 'Share', asFraction: true, append: '% of takings' },
      { share: 0.2 },
    );
    await flush();

    const input = root.querySelector('.dx-field-affix input') as HTMLInputElement;
    expect(input.value).toBe('20');
    await userEvent.fill(input, '35');
    expect(form.data.share).toBe(0.35);
  });

  it('shows a plaintext percentage with the sign against the number', async () => {
    const { root } = renderField(
      { key: 'share', type: 'percentage', label: 'Share', asFraction: true, append: '% of takings', plaintext: true },
      { share: 0.2 },
    );
    await flush();
    expect(root.querySelector('.dx-field-affix-plaintext')?.textContent).toBe('20% of takings');
  });

  it('passes a currency’s append to its per-unit cell', async () => {
    const { root } = renderField(
      { key: 'cost', type: 'currency', label: 'Cost', append: (model) => `per ${model.unit}` },
      { cost: 12, unit: 'case' },
    );
    await flush();
    expect(cellTexts(root)).toEqual(['£', 'per case']);
  });

  it('lets a currency’s inputProps append win, as inputProps always does', async () => {
    const { root } = renderField(
      { key: 'cost', type: 'currency', label: 'Cost', append: 'per case', inputProps: { append: 'each' } },
      { cost: 12 },
    );
    await flush();
    expect(cellTexts(root)).toEqual(['£', 'each']);
  });

  it('ignores prepend on a currency, whose leading cell is the symbol', async () => {
    const { root } = renderField(
      { key: 'cost', type: 'currency', label: 'Cost', prepend: 'from', append: 'each' },
      { cost: 12 },
    );
    await flush();
    expect(cellTexts(root)).toEqual(['£', 'each']);
  });
});

describe('DXField append in a form layout', () => {
  // The vitest window defaults to a phone's width, where a horizontal form
  // stacks its labels; a desktop window shows the label column.
  afterEach(async () => {
    await page.viewport(414, 896);
  });

  async function renderForm(layout: 'vertical' | 'horizontal', plaintext = false) {
    await page.viewport(1280, 900);
    const form = useForm({ notice: 120, name: 'Ada' });
    const fields: FieldDefinition[] = [
      { key: 'name', type: 'text', label: 'Name', plaintext },
      { key: 'notice', type: 'number', label: 'Online notice', append: 'minutes', plaintext },
    ];
    const screen = render({
      render: () =>
        h(BApp, {}, () =>
          h('div', { style: 'width: 640px' }, [h(DXForm, { form, fields, layout, submitText: 'Save' })]),
        ),
    });
    await flush();
    return screen.container;
  }

  it.each(['vertical', 'horizontal'] as const)(
    'joins the unit to the input at the input’s height (%s)',
    async (layout) => {
      const root = await renderForm(layout);
      const field = root.querySelector('[data-dx-field-key="notice"]')!;
      const input = field.querySelector('input')!.getBoundingClientRect();
      const cell = field.querySelector('.input-group-text')!.getBoundingClientRect();
      // Joined: Bootstrap overlaps the shared 1px border.
      expect(Math.abs(cell.left - input.right)).toBeLessThanOrEqual(1);
      expect(Math.abs(cell.top - input.top)).toBeLessThan(1);
      expect(Math.abs(cell.height - input.height)).toBeLessThan(1);

      // The group fills the same width as a bare input in the same form.
      const bare = root.querySelector('[data-dx-field-key="name"] input')!.getBoundingClientRect();
      const group = field.querySelector('.input-group')!.getBoundingClientRect();
      expect(Math.abs(group.left - bare.left)).toBeLessThan(1);
      expect(Math.abs(group.right - bare.right)).toBeLessThan(1);
    },
  );

  it('keeps room for the value when a long unit meets a narrow column', async () => {
    const form = useForm({ volume: 3 });
    const field: FieldDefinition = { key: 'volume', type: 'number', label: 'Volume', append: 'per 10L Bag in Box' };
    const screen = render({
      render: () => h(BApp, {}, () => h('div', { style: 'width: 160px' }, [h(DXField, { field, form })])),
    });
    await flush();
    const group = screen.container.querySelector('.dx-field-affix')!;
    const input = group.querySelector('input')!.getBoundingClientRect();
    const cell = group.querySelector('.input-group-text')!.getBoundingClientRect();
    // The theme's 5.5rem floor, as for a currency amount; the unit wraps.
    expect(input.width).toBeGreaterThanOrEqual(88);
    const lineHeight = parseFloat(getComputedStyle(group.querySelector('.input-group-text')!).lineHeight);
    expect(cell.height).toBeGreaterThan(2 * lineHeight);
    expect(cell.right).toBeLessThanOrEqual(group.getBoundingClientRect().right + 0.5);
  });

  it('lines the label up with the input in a horizontal row', async () => {
    const root = await renderForm('horizontal');
    const field = root.querySelector('[data-dx-field-key="notice"]')!;
    const label = field.querySelector('label')!.getBoundingClientRect();
    const input = field.querySelector('.dx-field-affix > input')!.getBoundingClientRect();
    // Beside it, not above it.
    expect(label.right).toBeLessThanOrEqual(input.left + 1);
    expect(Math.abs(label.top - input.top)).toBeLessThan(2);
  });

  it.each(['vertical', 'horizontal'] as const)(
    'starts a plaintext "120 minutes" where a plaintext text value starts (%s)',
    async (layout) => {
      const root = await renderForm(layout, true);
      const bareText = root.querySelector('[data-dx-field-key="name"] .form-control-plaintext')!;
      const affixText = root.querySelector('[data-dx-field-key="notice"] .dx-field-affix-plaintext')!;
      expect(affixText.textContent).toBe('120 minutes');
      const range = document.createRange();
      range.selectNodeContents(affixText);
      const textBox = range.getBoundingClientRect();
      expect(Math.abs(textBox.left - bareText.getBoundingClientRect().left)).toBeLessThan(1);

      if (layout === 'horizontal') {
        // The value's text sits on the label's line, as "Ada" does on its
        // row: the same offset from the label's centre, to the pixel.
        const centre = (box: DOMRect) => box.top + box.height / 2;
        const offsetFromLabel = (key: string, valueBox: DOMRect) =>
          centre(valueBox) -
          centre(root.querySelector(`[data-dx-field-key="${key}"] .dx-field-label__text`)!.getBoundingClientRect());
        const bareOffset = offsetFromLabel('name', bareText.getBoundingClientRect());
        const affixOffset = offsetFromLabel('notice', affixText.getBoundingClientRect());
        expect(Math.abs(affixOffset - bareOffset)).toBeLessThan(1);
      }
    },
  );
});
