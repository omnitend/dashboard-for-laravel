import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-vue';
import { userEvent } from 'vitest/browser';
import { h } from 'vue';
import { BApp } from 'bootstrap-vue-next';
import DXField from '../../resources/js/components/extended/DXField.vue';
import { useForm } from '../../resources/js/composables/useForm';
import type { FieldDefinition } from '../../resources/js/types';

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

// Popovers render through BVN's orchestrator, which needs a BApp ancestor.
const renderField = (field: FieldDefinition, data: Record<string, any>) => {
  const form = useForm(data);
  const screen = render({
    render: () => h(BApp, {}, () => h(DXField, { field, form })),
  });
  return { screen, form };
};

describe('DXField switch type', () => {
  it('shows the "false" contextual text and no on-state class when off', async () => {
    const { screen } = renderField(
      {
        key: 'is_default',
        type: 'switch',
        label: 'Default VAT rate',
        textWhenTrue: 'This is the default VAT rate',
        textWhenFalse: 'This is not the default VAT rate',
      },
      { is_default: false },
    );
    await flush();

    const wrapper = screen.container.querySelector('.dx-switch');
    expect(wrapper).not.toBeNull();
    expect(wrapper?.classList.contains('dx-switch--on')).toBe(false);
    expect(screen.container.textContent).toContain('This is not the default VAT rate');
    expect(screen.container.textContent).not.toContain('This is the default VAT rate');

    // Renders BVN's switch styling, not a plain checkbox.
    expect(screen.container.querySelector('.form-switch')).not.toBeNull();
  });

  it('shows the "true" text and on-state class when on', async () => {
    const { screen } = renderField(
      {
        key: 'is_default',
        type: 'switch',
        label: 'Default VAT rate',
        textWhenTrue: 'This is the default VAT rate',
        textWhenFalse: 'This is not the default VAT rate',
      },
      { is_default: true },
    );
    await flush();

    const wrapper = screen.container.querySelector('.dx-switch');
    expect(wrapper?.classList.contains('dx-switch--on')).toBe(true);
    expect(screen.container.textContent).toContain('This is the default VAT rate');
  });

  it('swaps text and on-state class reactively when toggled', async () => {
    const { screen, form } = renderField(
      {
        key: 'is_default',
        type: 'switch',
        label: 'Default VAT rate',
        textWhenTrue: 'On text',
        textWhenFalse: 'Off text',
      },
      { is_default: false },
    );
    await flush();

    const input = screen.container.querySelector<HTMLInputElement>('.form-check-input')!;
    await userEvent.click(input);
    await flush();

    expect(form.data.is_default).toBe(true);
    const wrapper = screen.container.querySelector('.dx-switch');
    expect(wrapper?.classList.contains('dx-switch--on')).toBe(true);
    expect(screen.container.textContent).toContain('On text');
  });

  it('keeps the toggle position, on-state, and text in agreement for a non-boolean truthy value', async () => {
    // Laravel commonly serialises a boolean column as the integer 1. The bvn
    // checkbox only treats a literal `true` as checked, so without
    // normalisation the toggle would render off while the on-style/text showed
    // on. Assert all three agree.
    const { screen } = renderField(
      {
        key: 'is_default',
        type: 'switch',
        label: 'Default VAT rate',
        textWhenTrue: 'On text',
        textWhenFalse: 'Off text',
      },
      { is_default: 1 },
    );
    await flush();

    const input = screen.container.querySelector<HTMLInputElement>('.form-check-input')!;
    expect(input.checked).toBe(true);
    expect(screen.container.querySelector('.dx-switch--on')).not.toBeNull();
    expect(screen.container.textContent).toContain('On text');
  });

  it('treats a "0" / "false" string value as off (not truthy)', async () => {
    for (const off of ['0', 'false', '']) {
      const { screen } = renderField(
        {
          key: 'is_default',
          type: 'switch',
          label: 'Default',
          textWhenTrue: 'On text',
          textWhenFalse: 'Off text',
        },
        { is_default: off },
      );
      await flush();
      const input = screen.container.querySelector<HTMLInputElement>('.form-check-input')!;
      expect(input.checked).toBe(false);
      expect(screen.container.querySelector('.dx-switch--on')).toBeNull();
      expect(screen.container.textContent).toContain('Off text');
    }
  });

  it('renders a #hint slot on a switch even without field.hint', async () => {
    const form = useForm({ s: true });
    const screen = render({
      render: () =>
        h(
          BApp,
          {},
          () =>
            h(
              DXField,
              { field: { key: 's', type: 'switch', label: 'S' }, form },
              { hint: () => 'Slotted switch hint' },
            ),
        ),
    });
    await flush();
    expect(screen.container.textContent).toContain('Slotted switch hint');
  });

  it('falls back to the label when contextual text is omitted', async () => {
    const { screen } = renderField(
      { key: 'active', type: 'switch', label: 'Active' },
      { active: true },
    );
    await flush();

    expect(screen.container.textContent).toContain('Active');
  });
});

describe('DXField touched tracking', () => {
  it('marks form.touched on a plain field write', async () => {
    const { screen, form } = renderField(
      { key: 'name', type: 'text', label: 'Name' },
      { name: '' },
    );
    await flush();

    expect(form.touched.name).toBeUndefined();

    const input = screen.container.querySelector('input[type="text"]') as HTMLInputElement;
    await userEvent.fill(input, 'Ada');
    await flush();

    expect(form.data.name).toBe('Ada');
    expect(form.touched.name).toBe(true);
  });

  it('marks form.touched at the keyPath for a nested/repeater-style field', async () => {
    const form = useForm({ lines: [{ price: 0 }] });
    const screen = render({
      render: () =>
        h(BApp, {}, () =>
          h(DXField, {
            field: { key: 'price', type: 'number', label: 'Price' },
            form,
            keyPath: 'lines.0.price',
          }),
        ),
    });
    await flush();

    const input = screen.container.querySelector('input[type="number"]') as HTMLInputElement;
    await userEvent.fill(input, '12');
    await flush();

    expect(form.data.lines[0].price).toBe(12);
    expect(form.touched['lines.0.price']).toBe(true);
    // The bare field key must not be touched instead of the full path.
    expect(form.touched.price).toBeUndefined();
  });

  it('marks form.touched on a switch toggle', async () => {
    const { screen, form } = renderField(
      { key: 'active', type: 'switch', label: 'Active' },
      { active: false },
    );
    await flush();

    const input = screen.container.querySelector<HTMLInputElement>('.form-check-input')!;
    await userEvent.click(input);
    await flush();

    expect(form.touched.active).toBe(true);
  });
});

describe('DXField info tooltip', () => {
  it('renders an info trigger on the label when `info` is set', async () => {
    const { screen } = renderField(
      {
        key: 'vat_rate',
        type: 'percentage',
        label: 'VAT Rate',
        info: 'How much VAT to add when selling products of this type.',
      },
      { vat_rate: 20 },
    );
    await flush();

    const trigger = screen.container.querySelector<HTMLButtonElement>(
      '.dx-field-label__info',
    );
    expect(trigger).not.toBeNull();
    expect(trigger?.getAttribute('aria-label')).toBe('More information: VAT Rate');
    // The help text lives in a popover (rendered but hidden until triggered),
    // not as always-visible inline hint/help text.
    expect(
      screen.container.querySelector('.form-text')?.textContent ?? '',
    ).not.toContain('How much VAT to add');
  });

  it('has no info trigger when `info` is absent', async () => {
    const { screen } = renderField(
      { key: 'vat_rate', type: 'percentage', label: 'VAT Rate' },
      { vat_rate: 20 },
    );
    await flush();

    expect(screen.container.querySelector('.dx-field-label__info')).toBeNull();
  });

  it('supports an info trigger on checkbox fields', async () => {
    const { screen } = renderField(
      {
        key: 'terms',
        type: 'checkbox',
        label: 'Accept terms',
        info: 'You must accept to continue.',
      },
      { terms: false },
    );
    await flush();

    expect(screen.container.querySelector('.dx-field-label__info')).not.toBeNull();
  });
});

describe('DXField autocomplete type', () => {
  const options = [
    { value: 'main', text: 'main' },
    { value: 'develop', text: 'develop' },
    { value: 'release/1.0', text: 'release/1.0' },
  ];

  it('renders a text input linked to a datalist of the options', async () => {
    const { screen } = renderField(
      { key: 'branch', type: 'autocomplete', label: 'Branch', options },
      { branch: '' },
    );
    await flush();

    const input = screen.container.querySelector('input[type="text"]') as HTMLInputElement;
    expect(input).not.toBeNull();
    const listId = input.getAttribute('list');
    expect(listId).toBeTruthy();

    const datalist = screen.container.querySelector(`datalist[id="${listId}"]`);
    expect(datalist).not.toBeNull();
    const values = Array.from(datalist!.querySelectorAll('option')).map((o) =>
      o.getAttribute('value'),
    );
    expect(values).toEqual(['main', 'develop', 'release/1.0']);
  });

  it('binds free text that is not one of the options', async () => {
    const { screen, form } = renderField(
      { key: 'branch', type: 'autocomplete', label: 'Branch', options },
      { branch: '' },
    );
    await flush();

    const input = screen.container.querySelector('input[type="text"]') as HTMLInputElement;
    await userEvent.fill(input, 'feature/not-in-list');
    expect(form.data.branch).toBe('feature/not-in-list');
  });

  it('populates the datalist from an async optionsLoader', async () => {
    const { screen } = renderField(
      {
        key: 'branch',
        type: 'autocomplete',
        label: 'Branch',
        optionsLoader: async () => options,
      },
      { branch: '' },
    );
    // Let the on-mounted loader promise resolve and the datalist re-render.
    await flush();
    await flush();

    const datalist = screen.container.querySelector('datalist');
    const values = Array.from(datalist!.querySelectorAll('option')).map((o) =>
      o.getAttribute('value'),
    );
    expect(values).toEqual(['main', 'develop', 'release/1.0']);
  });
});
