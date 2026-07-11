import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-vue';
import { userEvent } from 'vitest/browser';
import { h, ref } from 'vue';
import { BApp } from 'bootstrap-vue-next';
import DXField from '../../resources/js/components/extended/DXField.vue';
import { useForm } from '../../resources/js/composables/useForm';
import type { FieldDefinition } from '../../resources/js/types';

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

// Popovers render through BVN's orchestrator, which needs a BApp ancestor.
const renderField = (
  field: FieldDefinition,
  data: Record<string, any>,
  extraProps: Record<string, any> = {},
) => {
  const form = useForm(data);
  const screen = render({
    render: () => h(BApp, {}, () => h(DXField, { field, form, ...extraProps })),
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

describe('DXField switch box sizing and click target (#64)', () => {
  it('sizes the box to its content instead of stretching full width, like the plain checkbox type', async () => {
    const { screen } = renderField(
      { key: 'active', type: 'switch', label: 'Active' },
      { active: true },
    );
    await flush();

    const box = screen.container.querySelector<HTMLElement>('.dx-switch .form-check')!;
    const wrapper = screen.container.querySelector<HTMLElement>('.dx-switch')!;
    const boxRect = box.getBoundingClientRect();
    const wrapperRect = wrapper.getBoundingClientRect();

    // Block-level `flex` (not `inline-flex`) so the box stays shrink-to-fit yet
    // still takes its own line — see the hint-placement test below (#79).
    expect(getComputedStyle(box).display).toBe('flex');
    // A short label shouldn't stretch the box anywhere near the full field width.
    expect(boxRect.width).toBeLessThan(wrapperRect.width * 0.6);
  });

  it('renders a switch hint in the label column, beneath the label (horizontal)', async () => {
    const { screen } = renderField(
      {
        key: 'collect_allergens',
        type: 'switch',
        label: 'Collect allergen information',
        hint: 'Whether to collect and display allergen information for products',
      },
      { collect_allergens: true },
      { layout: 'horizontal', labelCols: { sm: 4, lg: 3 } },
    );
    await flush();

    const box = screen.container.querySelector<HTMLElement>('.dx-switch .form-check')!;
    const label = screen.container.querySelector<HTMLElement>('.dx-field-label')!;
    const hint = screen.container.querySelector<HTMLElement>('.dx-field-hint')!;

    // In horizontal layout the hint lives in the label column, beneath the
    // label — so it renders BEFORE the control in DOM order (the label column
    // precedes the content column), not below the control on the right. (The
    // grid CSS isn't loaded in the test env, so assert structure, not geometry.)
    expect(hint).not.toBeNull();
    expect(
      box.compareDocumentPosition(hint) & Node.DOCUMENT_POSITION_PRECEDING,
    ).toBeTruthy();
    expect(
      hint.compareDocumentPosition(label) & Node.DOCUMENT_POSITION_PRECEDING,
    ).toBeTruthy();
  });

  it('matches standard input height', async () => {
    const { screen: textScreen } = renderField(
      { key: 'name', type: 'text', label: 'Name' },
      { name: '' },
    );
    const { screen: switchScreen } = renderField(
      { key: 'active', type: 'switch', label: 'Active' },
      { active: true },
    );
    await flush();

    const textInput = textScreen.container.querySelector('input[type="text"]')!;
    const switchBox = switchScreen.container.querySelector('.dx-switch .form-check')!;

    expect(switchBox.getBoundingClientRect().height).toBeCloseTo(
      textInput.getBoundingClientRect().height,
      0,
    );
  });

  it('toggles when clicking the label text, not just the small toggle control', async () => {
    const { screen, form } = renderField(
      { key: 'active', type: 'switch', label: 'Active' },
      { active: false },
    );
    await flush();

    const labelText = screen.container.querySelector<HTMLElement>('.dx-field-label__text')!;
    await userEvent.click(labelText);
    await flush();

    expect(form.data.active).toBe(true);
  });
});

describe('DXField currency display formatting (#69)', () => {
  it('formats the initial seed value to minor-unit precision', async () => {
    const { screen } = renderField(
      { key: 'price', type: 'currency', label: 'Price' },
      { price: 3.8 },
    );
    await flush();

    const input = screen.container.querySelector<HTMLInputElement>('input[type="number"]')!;
    expect(input.value).toBe('3.80');
  });

  it('does not reformat mid-edit, but reformats on blur, keeping the model numeric', async () => {
    const { screen, form } = renderField(
      { key: 'price', type: 'currency', label: 'Price' },
      { price: 3.8 },
    );
    await flush();

    const input = screen.container.querySelector<HTMLInputElement>('input[type="number"]')!;
    await userEvent.fill(input, '12.5');
    await flush();

    // Not reformatted while focused — the user can still type more digits.
    expect(input.value).toBe('12.5');
    expect(form.data.price).toBe(12.5);

    input.blur();
    input.dispatchEvent(new Event('blur', { bubbles: true }));
    await flush();

    expect(input.value).toBe('12.50');
    expect(form.data.price).toBe(12.5);
  });

  it('respects a custom `decimals` option (e.g. 0dp for a currency with no minor unit)', async () => {
    const { screen } = renderField(
      { key: 'price', type: 'currency', label: 'Price', decimals: 0 },
      { price: 1200 },
    );
    await flush();

    const input = screen.container.querySelector<HTMLInputElement>('input[type="number"]')!;
    expect(input.value).toBe('1200');
  });

  it('leaves the display blank for an empty seed value rather than forcing "0.00"', async () => {
    const { screen } = renderField(
      { key: 'price', type: 'currency', label: 'Price' },
      { price: '' },
    );
    await flush();

    const input = screen.container.querySelector<HTMLInputElement>('input[type="number"]')!;
    expect(input.value).toBe('');
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

describe('DXField horizontal layout (#66)', () => {
  it('renders a standard field vertically by default (no row/column classes)', async () => {
    const { screen } = renderField(
      { key: 'name', type: 'text', label: 'Name' },
      { name: '' },
    );
    await flush();

    expect(screen.container.querySelector('.row')).toBeFalsy();
    expect(screen.container.querySelector('.col-form-label')).toBeFalsy();
  });

  it('renders a standard field horizontally with a label/content column split', async () => {
    const { screen } = renderField(
      { key: 'name', type: 'text', label: 'Name' },
      { name: '' },
      { layout: 'horizontal' },
    );
    await flush();

    expect(screen.container.querySelector('.row')).toBeTruthy();
    const label = screen.container.querySelector('.col-form-label');
    expect(label).toBeTruthy();
    expect(label?.textContent).toContain('Name');
    // Defaults to a 3-column label when no labelCols is configured.
    expect(label?.classList.contains('col-3')).toBe(true);
  });

  it('honours a numeric labelCols for the label column width', async () => {
    const { screen } = renderField(
      { key: 'name', type: 'text', label: 'Name' },
      { name: '' },
      { layout: 'horizontal', labelCols: 4 },
    );
    await flush();

    expect(screen.container.querySelector('.col-form-label.col-4')).toBeTruthy();
  });

  it('activates horizontal layout for a numeric-string labelCols (e.g. from an unbound template attribute or JSON config)', async () => {
    const { screen } = renderField(
      { key: 'name', type: 'text', label: 'Name' },
      { name: '' },
      { layout: 'horizontal', labelCols: '4' as any },
    );
    await flush();

    expect(screen.container.querySelector('.col-form-label.col-4')).toBeTruthy();
  });

  it('honours a per-breakpoint labelCols object', async () => {
    const { screen } = renderField(
      { key: 'name', type: 'text', label: 'Name' },
      { name: '' },
      { layout: 'horizontal', labelCols: { md: 3, lg: 2 } },
    );
    await flush();

    const label = screen.container.querySelector('.col-form-label');
    expect(label?.classList.contains('col-md-3')).toBe(true);
    expect(label?.classList.contains('col-lg-2')).toBe(true);
  });

  it('keeps a span field full-width even when the layout is horizontal', async () => {
    const screen = render({
      render: () =>
        h(BApp, {}, () =>
          h(
            DXField,
            {
              field: { key: 'custom', type: 'text', span: true },
              form: useForm({ custom: '' }),
              layout: 'horizontal',
            },
            { span: () => h('div', { class: 'custom-span' }, 'custom') },
          ),
        ),
    });
    await flush();

    expect(screen.container.querySelector('.custom-span')).toBeTruthy();
    expect(screen.container.querySelector('.row')).toBeFalsy();
  });

  it('renders a checkbox vertically by default with no DFormGroup wrapper', async () => {
    const { screen } = renderField(
      { key: 'active', type: 'checkbox', label: 'Active' },
      { active: false },
    );
    await flush();

    expect(screen.container.querySelector('.row')).toBeFalsy();
    expect(screen.container.querySelector('fieldset')).toBeFalsy();
  });

  it('wraps a checkbox in a label/content column split when horizontal', async () => {
    const { screen } = renderField(
      { key: 'active', type: 'checkbox', label: 'Active' },
      { active: false },
      { layout: 'horizontal' },
    );
    await flush();

    expect(screen.container.querySelector('.row')).toBeTruthy();
    const label = screen.container.querySelector('.col-form-label');
    expect(label?.textContent).toContain('Active');
    // The checkbox control itself still renders in the content column.
    expect(screen.container.querySelector('.form-check-input[type="checkbox"]')).toBeTruthy();
  });

  it('renders the info popover trigger only once on a horizontal checkbox (not duplicated)', async () => {
    const { screen } = renderField(
      { key: 'active', type: 'checkbox', label: 'Active', info: 'Extra detail' },
      { active: false },
      { layout: 'horizontal' },
    );
    await flush();

    expect(screen.container.querySelectorAll('.dx-field-label__info').length).toBe(1);
  });

  it('wraps a switch in a label/content column split when horizontal', async () => {
    const { screen } = renderField(
      { key: 'is_default', type: 'switch', label: 'Default VAT rate' },
      { is_default: false },
      { layout: 'horizontal' },
    );
    await flush();

    expect(screen.container.querySelector('.row')).toBeTruthy();
    const label = screen.container.querySelector('.col-form-label');
    expect(label?.textContent).toContain('Default VAT rate');
    expect(screen.container.querySelector('.dx-switch')).toBeTruthy();
  });

  it('renders the info popover trigger only once on a horizontal switch (not duplicated)', async () => {
    const { screen } = renderField(
      { key: 'is_default', type: 'switch', label: 'Default VAT rate', info: 'Extra detail' },
      { is_default: false },
      { layout: 'horizontal' },
    );
    await flush();

    expect(screen.container.querySelectorAll('.dx-field-label__info').length).toBe(1);
  });

  it('adds column classes to a repeater field when horizontal', async () => {
    const { screen } = renderField(
      {
        key: 'lines',
        type: 'repeater',
        label: 'Line items',
        fields: [{ key: 'name', type: 'text', label: 'Name' }],
      },
      { lines: [] },
      { layout: 'horizontal' },
    );
    await flush();

    expect(screen.container.querySelector('.row')).toBeTruthy();
    const label = screen.container.querySelector('.col-form-label');
    expect(label?.textContent).toContain('Line items');
  });

  it('keeps a table-layout repeater label above the table even when horizontal (a table is too wide for a narrow label column)', async () => {
    const { screen } = renderField(
      {
        key: 'lines',
        type: 'repeater',
        label: 'Line items',
        repeaterLayout: 'table',
        fields: [{ key: 'name', type: 'text', label: 'Name' }],
      },
      { lines: [] },
      { layout: 'horizontal' },
    );
    await flush();

    // No `.row`/column split — the label renders above the table, not to its
    // left. (A repeater's legend always carries `.col-form-label` even when
    // NOT horizontal — BFormGroup applies it to any label with no `label-for`
    // target, not just horizontal ones — so `.row`'s absence is the reliable
    // signal here, not the label's own class.)
    expect(screen.container.querySelector('.row')).toBeFalsy();
    const label = screen.container.querySelector('.dx-field-label__text');
    expect(label?.textContent).toContain('Line items');
  });
});

describe('DXField hideLabel (#68)', () => {
  it('omits the label entirely on a standard field when hideLabel is set', async () => {
    const { screen } = renderField(
      { key: 'name', type: 'text', label: 'Name' },
      { name: '' },
      { hideLabel: true },
    );
    await flush();

    expect(screen.container.querySelector('.form-label')).toBeFalsy();
    expect(screen.container.querySelector('.dx-field-label')).toBeFalsy();
    // The control itself still renders.
    expect(screen.container.querySelector('input[type="text"]')).toBeTruthy();
  });

  it('renders the label as usual when hideLabel is not set', async () => {
    const { screen } = renderField(
      { key: 'name', type: 'text', label: 'Name' },
      { name: '' },
    );
    await flush();

    expect(screen.container.querySelector('.dx-field-label')).toBeTruthy();
  });

  it('drops the redundant outer row label on a horizontal switch when hideLabel is set (#78)', async () => {
    const { screen } = renderField(
      { key: 'collect_allergens', type: 'switch', label: 'Collect allergen information' },
      { collect_allergens: true },
      { layout: 'horizontal', hideLabel: true },
    );
    await flush();

    // No outer label column…
    expect(screen.container.querySelector('.col-form-label')).toBeFalsy();
    // …but the switch (with its own inner label) still renders in the input column.
    expect(screen.container.querySelector('.dx-switch')).toBeTruthy();
    expect(screen.container.textContent).toContain('Collect allergen information');
  });

  it('renders the outer label on a horizontal switch when hideLabel is not set (#78)', async () => {
    const { screen } = renderField(
      { key: 'collect_allergens', type: 'switch', label: 'Collect allergen information' },
      { collect_allergens: true },
      { layout: 'horizontal' },
    );
    await flush();

    expect(screen.container.querySelector('.col-form-label')).toBeTruthy();
  });

  it('drops the redundant outer row label on a horizontal checkbox when hideLabel is set (#78)', async () => {
    const { screen } = renderField(
      { key: 'active', type: 'checkbox', label: 'Active' },
      { active: false },
      { layout: 'horizontal', hideLabel: true },
    );
    await flush();

    expect(screen.container.querySelector('.col-form-label')).toBeFalsy();
    expect(screen.container.querySelector('.form-check-input[type="checkbox"]')).toBeTruthy();
  });
});

describe('DXField repeater table-layout responsiveness via the async DXRepeater loader (#68 regression)', () => {
  // DXField lazy-loads DXRepeater via defineAsyncComponent (to break a
  // circular import). That async-resolved boundary is the exact path where
  // DXRepeater's ResizeObserver setup previously never ran — its template
  // ref was still null when `onMounted` fired, only surfacing when rendered
  // this way (not via a direct, synchronous `render(DXRepeater, ...)`).
  it('falls back to cards when the container is too narrow, when reached through DXField', async () => {
    const form = useForm({ lines: [{ name: 'First', qty: 1 }] });
    const field: FieldDefinition = {
      key: 'lines',
      type: 'repeater',
      repeaterLayout: 'table',
      fields: [
        { key: 'name', type: 'text', label: 'Name' },
        { key: 'qty', type: 'number', label: 'Qty' },
      ],
    };
    // 2 columns need ~130*2+70=330px; 150px is well under that.
    const screen = render({
      render: () =>
        h(BApp, {}, () =>
          h('div', { style: 'width: 150px' }, [h(DXField, { field, form })]),
        ),
    });

    const start = Date.now();
    let cards: Element | null = null;
    while (Date.now() - start < 2000) {
      cards = screen.container.querySelector('.dx-repeater-container .dx-repeater');
      if (cards) break;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    expect(cards).toBeTruthy();
    // Mutually exclusive via v-if/v-else — the table must not also be
    // mounted (double-running every DXField/optionsLoader inside it).
    expect(screen.container.querySelector('.dx-repeater-table-wrapper')).toBeFalsy();
  });
});

describe('DXField date/datetime seeding (#85)', () => {
  it('shows an ISO-8601 (Z) timestamp in a datetime-local input (was empty)', async () => {
    const { screen } = renderField(
      { key: 'requested_at', type: 'datetime', label: 'Requested' },
      { requested_at: '2026-08-01T09:30:00.000000Z' },
    );
    await flush();

    const input = screen.container.querySelector('input[type="datetime-local"]') as HTMLInputElement;
    expect(input.value).toBe('2026-08-01T09:30');
  });

  it('shows a `Y-m-d H:i:s` timestamp in a datetime-local input', async () => {
    const { screen } = renderField(
      { key: 'requested_at', type: 'datetime', label: 'Requested' },
      { requested_at: '2026-08-01 09:30:00' },
    );
    await flush();

    const input = screen.container.querySelector('input[type="datetime-local"]') as HTMLInputElement;
    expect(input.value).toBe('2026-08-01T09:30');
  });

  it('slices a timestamp down to YYYY-MM-DD for a date input', async () => {
    const { screen } = renderField(
      { key: 'starts_on', type: 'date', label: 'Starts' },
      { starts_on: '2026-08-01T00:00:00.000000Z' },
    );
    await flush();

    const input = screen.container.querySelector('input[type="date"]') as HTMLInputElement;
    expect(input.value).toBe('2026-08-01');
  });

  it('slices a timestamp down to HH:MM for a time input', async () => {
    const { screen } = renderField(
      { key: 'at', type: 'time', label: 'At' },
      { at: '09:30:00' },
    );
    await flush();

    const input = screen.container.querySelector('input[type="time"]') as HTMLInputElement;
    expect(input.value).toBe('09:30');
  });

  it('passes an already-correct value through unchanged', async () => {
    const { screen } = renderField(
      { key: 'requested_at', type: 'datetime', label: 'Requested' },
      { requested_at: '2026-08-01T09:30' },
    );
    await flush();

    const input = screen.container.querySelector('input[type="datetime-local"]') as HTMLInputElement;
    expect(input.value).toBe('2026-08-01T09:30');
  });

  it('renders empty (not the placeholder-rejecting raw value) for null', async () => {
    const { screen } = renderField(
      { key: 'requested_at', type: 'datetime', label: 'Requested' },
      { requested_at: null },
    );
    await flush();

    const input = screen.container.querySelector('input[type="datetime-local"]') as HTMLInputElement;
    expect(input.value).toBe('');
  });

  it('writes the input\'s native value straight back to the model on edit', async () => {
    const { screen, form } = renderField(
      { key: 'requested_at', type: 'datetime', label: 'Requested' },
      { requested_at: '2026-08-01T09:30:00Z' },
    );
    await flush();

    const input = screen.container.querySelector('input[type="datetime-local"]') as HTMLInputElement;
    await userEvent.fill(input, '2026-09-15T14:00');
    await flush();

    expect(form.data.requested_at).toBe('2026-09-15T14:00');
  });
});

describe('DXField password reveal (#100)', () => {
  it('renders a reveal toggle by default and starts masked', async () => {
    const { screen } = renderField(
      { key: 'password', type: 'password', label: 'Password' },
      { password: '' },
    );
    await flush();

    const input = screen.container.querySelector('input') as HTMLInputElement;
    expect(input.type).toBe('password');

    const toggle = screen.container.querySelector('button[aria-label="Show password"]');
    expect(toggle).not.toBeNull();
    expect(toggle?.getAttribute('aria-pressed')).toBe('false');
  });

  it('unmasks the input when the toggle is clicked, and re-masks on a second click', async () => {
    const { screen } = renderField(
      { key: 'password', type: 'password', label: 'Password' },
      { password: 'hunter2' },
    );
    await flush();

    const input = screen.container.querySelector('input') as HTMLInputElement;

    await userEvent.click(
      screen.container.querySelector('button[aria-label="Show password"]') as HTMLElement,
    );
    await flush();
    expect(input.type).toBe('text');
    expect(input.value).toBe('hunter2');

    const hideToggle = screen.container.querySelector('button[aria-label="Hide password"]');
    expect(hideToggle).not.toBeNull();
    expect(hideToggle?.getAttribute('aria-pressed')).toBe('true');

    await userEvent.click(hideToggle as HTMLElement);
    await flush();
    expect(input.type).toBe('password');
  });

  it('keeps editing the model while revealed', async () => {
    const { screen, form } = renderField(
      { key: 'password', type: 'password', label: 'Password' },
      { password: '' },
    );
    await flush();

    await userEvent.click(
      screen.container.querySelector('button[aria-label="Show password"]') as HTMLElement,
    );
    await flush();

    await userEvent.fill(screen.container.querySelector('input') as HTMLElement, 'correct-horse');
    await flush();

    expect(form.data.password).toBe('correct-horse');
  });

  it('renders a bare password input when revealable is false', async () => {
    const { screen } = renderField(
      { key: 'password', type: 'password', label: 'Password', revealable: false },
      { password: '' },
    );
    await flush();

    expect((screen.container.querySelector('input') as HTMLInputElement).type).toBe('password');
    expect(screen.container.querySelector('button[aria-label="Show password"]')).toBeNull();
  });

  it('only applies to password fields', async () => {
    const { screen } = renderField(
      { key: 'email', type: 'email', label: 'Email' },
      { email: '' },
    );
    await flush();

    expect(screen.container.querySelector('button[aria-label="Show password"]')).toBeNull();
  });
});

describe('DXField plaintext (#100)', () => {
  it('renders the value as static text rather than an input box', async () => {
    const { screen } = renderField(
      { key: 'username', type: 'text', label: 'Username', plaintext: true },
      { username: 'jpickard' },
    );
    await flush();

    const input = screen.container.querySelector('input') as HTMLInputElement;
    expect(input.classList.contains('form-control-plaintext')).toBe(true);
    expect(input.classList.contains('form-control')).toBe(false);
    expect(input.value).toBe('jpickard');
  });

  it('implies readonly — bvn only swaps the class, so the value must not stay editable', async () => {
    const { screen } = renderField(
      { key: 'username', type: 'text', label: 'Username', plaintext: true },
      { username: 'jpickard' },
    );
    await flush();

    expect((screen.container.querySelector('input') as HTMLInputElement).readOnly).toBe(true);
  });

  it('is computable from the model', async () => {
    const { screen } = renderField(
      {
        key: 'username',
        type: 'text',
        label: 'Username',
        plaintext: (model: any) => model.locked === true,
      },
      { username: 'jpickard', locked: false },
    );
    await flush();

    const input = screen.container.querySelector('input') as HTMLInputElement;
    expect(input.classList.contains('form-control-plaintext')).toBe(false);
    expect(input.readOnly).toBe(false);
  });

  it('applies to a textarea too', async () => {
    const { screen } = renderField(
      { key: 'bio', type: 'textarea', label: 'Bio', plaintext: true },
      { bio: 'Hello' },
    );
    await flush();

    const textarea = screen.container.querySelector('textarea') as HTMLTextAreaElement;
    expect(textarea.classList.contains('form-control-plaintext')).toBe(true);
    expect(textarea.readOnly).toBe(true);
  });

  it('a readonly field still renders a bordered control (plaintext is the opt-in)', async () => {
    const { screen } = renderField(
      { key: 'username', type: 'text', label: 'Username', readonly: true },
      { username: 'jpickard' },
    );
    await flush();

    const input = screen.container.querySelector('input') as HTMLInputElement;
    expect(input.classList.contains('form-control')).toBe(true);
    expect(input.classList.contains('form-control-plaintext')).toBe(false);
    expect(input.readOnly).toBe(true);
  });
});

/**
 * Codex review of the #100 work found these three. Each is the same shape: a
 * guarantee the field makes (masked by default, plaintext is not editable) that
 * an escape hatch or a reused component instance could silently defeat.
 */
describe('DXField password/plaintext invariants (#100 review)', () => {
  it('re-masks a revealed password when the form instance is swapped', async () => {
    // Covers a consumer driving DXForm/DXField directly and swapping forms.
    // The DXTable path is different (it mutates one form in place) and is
    // covered by its own regression test in DXTable.test.ts.
    const field: FieldDefinition = { key: 'password', type: 'password', label: 'Password' };
    const formA = useForm({ password: 'row-a-secret' });
    const formB = useForm({ password: 'row-b-secret' });
    const activeForm = ref(formA);

    const screen = render({
      render: () =>
        h(BApp, {}, () => h(DXField, { field, form: activeForm.value })),
    });
    await flush();

    await userEvent.click(
      screen.container.querySelector('button[aria-label="Show password"]') as HTMLElement,
    );
    await flush();
    expect((screen.container.querySelector('input') as HTMLInputElement).type).toBe('text');

    // Same DXField instance, different record.
    activeForm.value = formB;
    await flush();

    const input = screen.container.querySelector('input') as HTMLInputElement;
    expect(input.value).toBe('row-b-secret');
    expect(input.type).toBe('password');
    expect(
      screen.container.querySelector('button[aria-label="Show password"]'),
    ).not.toBeNull();
  });

  it('keeps a plaintext select disabled, even against inputProps', async () => {
    // inputProps is an escape hatch that wins over the field's own bindings —
    // but not over the guarantee that a plaintext field is not editable.
    const { screen } = renderField(
      {
        key: 'plan',
        type: 'select',
        label: 'Plan',
        plaintext: true,
        options: [{ value: 'pro', text: 'Pro' }],
        inputProps: { disabled: false },
      },
      { plan: 'pro' },
    );
    await flush();

    expect((screen.container.querySelector('select') as HTMLSelectElement).disabled).toBe(true);
  });

  it('still lets inputProps make a plain field readonly (the escape hatch is intact)', async () => {
    const { screen } = renderField(
      { key: 'name', type: 'text', label: 'Name', inputProps: { readonly: true } },
      { name: 'Sarah' },
    );
    await flush();

    expect((screen.container.querySelector('input') as HTMLInputElement).readOnly).toBe(true);
  });

  it('applies plaintext to currency and autocomplete, so the contract holds for every type', async () => {
    const currency = renderField(
      { key: 'price', type: 'currency', label: 'Price', plaintext: true },
      { price: 12.5 },
    );
    await flush();
    const currencyInput = currency.screen.container.querySelector('input') as HTMLInputElement;
    expect(currencyInput.readOnly).toBe(true);
    expect(currencyInput.classList.contains('form-control-plaintext')).toBe(true);

    const autocomplete = renderField(
      { key: 'branch', type: 'autocomplete', label: 'Branch', plaintext: true, options: [] },
      { branch: 'main' },
    );
    await flush();
    const autocompleteInput = autocomplete.screen.container.querySelector(
      'input',
    ) as HTMLInputElement;
    expect(autocompleteInput.readOnly).toBe(true);
    expect(autocompleteInput.classList.contains('form-control-plaintext')).toBe(true);
  });

  it('keeps the reveal toggle in charge of the password type, even against inputProps', async () => {
    const { screen } = renderField(
      {
        key: 'password',
        type: 'password',
        label: 'Password',
        inputProps: { type: 'text', autocomplete: 'new-password' },
      },
      { password: 'hunter2' },
    );
    await flush();

    const input = screen.container.querySelector('input') as HTMLInputElement;
    // The toggle owns `type`; inputProps must not silently unmask the field.
    expect(input.type).toBe('password');
    // Unrelated inputProps still pass through.
    expect(input.getAttribute('autocomplete')).toBe('new-password');
  });

  it('keeps a plaintext field non-editable, even against inputProps', async () => {
    const { screen } = renderField(
      {
        key: 'username',
        type: 'text',
        label: 'Username',
        plaintext: true,
        inputProps: { readonly: false },
      },
      { username: 'jpickard' },
    );
    await flush();

    const input = screen.container.querySelector('input') as HTMLInputElement;
    expect(input.readOnly).toBe(true);
    expect(input.classList.contains('form-control-plaintext')).toBe(true);
  });

  it('disables a select/radio marked plaintext, so "implies read-only" holds for every type', async () => {
    const { screen } = renderField(
      {
        key: 'plan',
        type: 'select',
        label: 'Plan',
        plaintext: true,
        options: [{ value: 'pro', text: 'Pro' }],
      },
      { plan: 'pro' },
    );
    await flush();

    expect((screen.container.querySelector('select') as HTMLSelectElement).disabled).toBe(true);
  });
});

/**
 * #105. A plain `select` is fine for ten options and unusable for hundreds; the
 * `autocomplete` type filters but models the TYPED TEXT, so it can't back a
 * foreign key (picking "Tesco" gives you "Tesco", not 37). Accounting pages had
 * to drop type-to-filter on a long account list because of that gap.
 */
describe('DXField searchable select (#105)', () => {
  const accounts = [
    { value: 37, text: 'Tesco' },
    { value: 42, text: 'Sainsbury' },
    { value: 51, text: 'Waitrose' },
  ];

  const searchableField: FieldDefinition = {
    key: 'account_id',
    type: 'select',
    label: 'Payee',
    searchable: true,
    options: accounts,
  };

  it('displays the option text for the id it is holding', async () => {
    const { screen } = renderField(searchableField, { account_id: 37 });
    await flush();

    const input = screen.container.querySelector('input') as HTMLInputElement;
    expect(input.value).toBe('Tesco');
  });

  it('filters as you type and models the option id, not the typed text', async () => {
    const { screen, form } = renderField(searchableField, { account_id: null });
    await flush();

    const input = screen.container.querySelector('input') as HTMLInputElement;
    await userEvent.click(input);
    await userEvent.fill(input, 'Sains');
    await flush();

    const option = [...document.querySelectorAll('[role="option"]')].find((element) =>
      element.textContent?.includes('Sainsbury'),
    ) as HTMLElement;
    expect(option).toBeTruthy();
    option.click();
    await flush();

    // The whole point: an id, not "Sainsbury".
    expect(form.data.account_id).toBe(42);
    expect(typeof form.data.account_id).toBe('number');
  });

  it('still renders a plain select when searchable is not set', async () => {
    const { screen } = renderField(
      { key: 'account_id', type: 'select', label: 'Payee', options: accounts },
      { account_id: 37 },
    );
    await flush();

    expect(screen.container.querySelector('select')).not.toBeNull();
    expect(screen.container.querySelector('.d-autocomplete')).toBeNull();
  });

  it('works with async options (optionsLoader)', async () => {
    const { screen } = renderField(
      {
        key: 'account_id',
        type: 'select',
        label: 'Payee',
        searchable: true,
        optionsLoader: async () => accounts,
      },
      { account_id: 51 },
    );
    await new Promise((resolve) => setTimeout(resolve, 400));

    expect((screen.container.querySelector('input') as HTMLInputElement).value).toBe('Waitrose');
  });
});
