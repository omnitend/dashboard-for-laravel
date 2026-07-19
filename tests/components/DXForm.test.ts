import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-vue';
import { h } from 'vue';
import DXForm from '../../resources/js/components/extended/DXForm.vue';
import { useForm } from '../../resources/js/composables/useForm';
import { defineForm } from '../../resources/js/composables/defineForm';
import type { FieldDefinition, FormTab } from '../../resources/js/types';

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

// Helpers using plain DOM queries. The vitest-browser locator API
// (expect.element / getByText) leaves async polling state that can
// pollute later tests in browser mode's shared page, so we avoid it.
const labelTexts = (root: Element): string[] =>
  Array.from(root.querySelectorAll('.form-label, label')).map(
    (el) => el.textContent?.trim() ?? '',
  );
const navLabels = (root: Element): string[] =>
  Array.from(root.querySelectorAll('.nav-link')).map(
    (el) => el.textContent?.trim() ?? '',
  );

const productFields: FieldDefinition[] = [
  { key: 'name', type: 'text', label: 'Name', required: true },
  { key: 'price', type: 'currency', label: 'Price', currencySymbol: '$' },
  { key: 'discount', type: 'percentage', label: 'Discount' },
  { key: 'sku', type: 'text', label: 'SKU' },
  { key: 'description', type: 'text', label: 'Description' },
  { key: 'active', type: 'checkbox', label: 'Active' },
];

const productTabs: FormTab[] = [
  { key: 'general', label: 'General', fieldKeys: ['name', 'price', 'discount'] },
  { key: 'details', label: 'Details', fieldKeys: ['sku', 'description', 'active'] },
];

const makeForm = () =>
  useForm({
    name: '',
    price: 0,
    discount: 0,
    sku: '',
    description: '',
    active: false,
  });

describe('DXForm', () => {
  describe('Flat rendering (no tabs)', () => {
    it('renders all visible fields without a tab strip', async () => {
      const screen = render(DXForm, {
        props: { form: makeForm(), fields: productFields, showSubmit: false },
      });
      await flush();

      expect(screen.container.querySelectorAll('.nav-link').length).toBe(0);
      const labels = labelTexts(screen.container);
      expect(labels).toContain('Name');
      expect(labels).toContain('SKU');
    });

    it('renders a currency/percentage field with its symbol affix', async () => {
      const screen = render(DXForm, {
        props: { form: makeForm(), fields: productFields, showSubmit: false },
      });
      await flush();

      const affix = Array.from(
        screen.container.querySelectorAll('.input-group-text'),
      ).map((el) => el.textContent?.trim());
      expect(affix).toContain('$');
      expect(affix).toContain('%');
    });
  });

  describe('Tabbed rendering', () => {
    it('renders one tab per tab definition', async () => {
      const screen = render(DXForm, {
        props: { form: makeForm(), fields: productFields, tabs: productTabs, showSubmit: false },
      });
      await flush();

      expect(navLabels(screen.container)).toEqual(['General', 'Details']);
    });

    it('hides a tab whose when() is false', async () => {
      const tabs: FormTab[] = [productTabs[0], { ...productTabs[1], when: () => false }];
      const screen = render(DXForm, {
        props: { form: makeForm(), fields: productFields, tabs, showSubmit: false },
      });
      await flush();

      expect(navLabels(screen.container)).toEqual(['General']);
    });

    it('renders a function-valued tab label from the model', async () => {
      const tabs: FormTab[] = [
        productTabs[0],
        {
          ...productTabs[1],
          label: (model: any) => `Details (${model.sku || 'none'})`,
        },
      ];
      const form = makeForm();
      form.data.sku = 'ABC-1';
      const screen = render(DXForm, {
        props: { form, fields: productFields, tabs, showSubmit: false },
      });
      await flush();

      expect(navLabels(screen.container)).toEqual(['General', 'Details (ABC-1)']);
    });

    it('reacts a dynamic tab label to model changes', async () => {
      const tabs: FormTab[] = [
        productTabs[0],
        {
          ...productTabs[1],
          label: (model: any) => `Details (${model.sku || 'none'})`,
        },
      ];
      const form = makeForm();
      const screen = render(DXForm, {
        props: { form, fields: productFields, tabs, showSubmit: false },
      });
      await flush();
      expect(navLabels(screen.container)).toContain('Details (none)');

      form.data.sku = 'XYZ-9';
      await flush();
      expect(navLabels(screen.container)).toContain('Details (XYZ-9)');
    });

    it('hides a tab that has no visible fields', async () => {
      // Every field in the Details tab is hidden → the tab disappears.
      const fields: FieldDefinition[] = productFields.map((field) =>
        ['sku', 'description', 'active'].includes(field.key)
          ? { ...field, when: () => false }
          : field,
      );
      const screen = render(DXForm, {
        props: { form: makeForm(), fields, tabs: productTabs, showSubmit: false },
      });
      await flush();

      expect(navLabels(screen.container)).toEqual(['General']);
    });
  });

  describe('Literal keys', () => {
    it('treats a field key containing a dot as a literal key (not a nested path)', async () => {
      const form = useForm({ 'user.email': '' });
      const fields: FieldDefinition[] = [
        { key: 'user.email', type: 'email', label: 'Email' },
      ];
      const screen = render(DXForm, {
        props: { form, fields, showSubmit: false },
      });
      await flush();

      const input = screen.container.querySelector('input[type="email"]') as HTMLInputElement;
      input.value = 'a@b.com';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await flush();

      expect(form.data['user.email']).toBe('a@b.com');
      expect((form.data as any).user).toBeUndefined();
    });
  });

  describe('Content-only tabs', () => {
    it('keeps a fieldless tab visible when a tab-content slot is provided', async () => {
      const form = useForm({ name: '' });
      const fields: FieldDefinition[] = [{ key: 'name', type: 'text', label: 'Name' }];
      const tabs: FormTab[] = [
        { key: 'general', label: 'General', fieldKeys: ['name'] },
        { key: 'custom', label: 'Custom', fieldKeys: [] },
      ];
      const screen = render(DXForm, {
        props: { form, fields, tabs, showSubmit: false },
        slots: {
          'tab-content(custom)': () => h('div', { class: 'custom-tab-body' }, 'hello'),
        },
      });
      await flush();

      expect(navLabels(screen.container)).toEqual(['General', 'Custom']);
    });
  });

  describe('Conditional fields (when model predicate)', () => {
    it('reactively shows a field based on live form data', async () => {
      const form = useForm({ kind: 'simple', advanced: '' });
      const fields: FieldDefinition[] = [
        { key: 'kind', type: 'text', label: 'Kind' },
        {
          key: 'advanced',
          type: 'text',
          label: 'Advanced Only',
          when: (model) => model.kind === 'advanced',
        },
      ];
      const screen = render(DXForm, { props: { form, fields, showSubmit: false } });
      await flush();

      expect(labelTexts(screen.container)).not.toContain('Advanced Only');

      form.data.kind = 'advanced';
      await flush();

      expect(labelTexts(screen.container)).toContain('Advanced Only');
    });
  });

  describe('Readonly fields', () => {
    it('renders a readonly input for readonly: true', async () => {
      const fields: FieldDefinition[] = [
        { key: 'name', type: 'text', label: 'Name', readonly: true },
      ];
      const screen = render(DXForm, {
        props: { form: makeForm(), fields, showSubmit: false },
      });
      await flush();

      expect(screen.container.querySelector('input[readonly]')).toBeTruthy();
    });
  });

  describe('Per-field slots', () => {
    it('renders a custom #value(key) slot in place of the input', async () => {
      const screen = render(DXForm, {
        props: { form: makeForm(), fields: productFields, showSubmit: false },
        slots: {
          'value(name)': () => h('div', { class: 'custom-name-control' }, 'custom'),
        },
      });
      await flush();

      expect(screen.container.querySelector('.custom-name-control')).toBeTruthy();
    });

    it('renders a #hint(key) slot below the field', async () => {
      const screen = render(DXForm, {
        props: { form: makeForm(), fields: productFields, showSubmit: false },
        slots: {
          'hint(sku)': () => h('span', { class: 'custom-hint' }, 'Format: ABC-123'),
        },
      });
      await flush();

      const hint = screen.container.querySelector('.custom-hint');
      expect(hint).toBeTruthy();
      expect(hint?.textContent).toContain('ABC-123');
    });

    it('renders a #field-before(key) slot directly above the field', async () => {
      const screen = render(DXForm, {
        props: { form: makeForm(), fields: productFields, showSubmit: false },
        slots: {
          'field-before(sku)': () => h('div', { class: 'sku-before' }, 'before sku'),
        },
      });
      await flush();

      expect(screen.container.querySelector('.sku-before')).toBeTruthy();
      // The field itself still renders alongside the slot.
      expect(labelTexts(screen.container)).toContain('SKU');
    });

    it('renders a #field-after(key) slot directly below the field', async () => {
      const screen = render(DXForm, {
        props: { form: makeForm(), fields: productFields, showSubmit: false },
        slots: {
          'field-after(sku)': () => h('div', { class: 'sku-after' }, 'after sku'),
        },
      });
      await flush();

      expect(screen.container.querySelector('.sku-after')).toBeTruthy();
      expect(labelTexts(screen.container)).toContain('SKU');
    });

    it('fully replaces a field with a #field(key) slot, bypassing DXField', async () => {
      const screen = render(DXForm, {
        props: { form: makeForm(), fields: productFields, showSubmit: false },
        slots: {
          'field(sku)': () => h('div', { class: 'sku-replacement' }, 'replaced'),
        },
      });
      await flush();

      expect(screen.container.querySelector('.sku-replacement')).toBeTruthy();
      // The default label/control for the replaced field must not render.
      expect(labelTexts(screen.container)).not.toContain('SKU');
    });

    it('supersedes field-before/field-after for the same key, like tab-content does for tabs', async () => {
      const screen = render(DXForm, {
        props: { form: makeForm(), fields: productFields, showSubmit: false },
        slots: {
          'field(sku)': () => h('div', { class: 'sku-replacement' }, 'replaced'),
          'field-before(sku)': () => h('div', { class: 'sku-before' }, 'before sku'),
          'field-after(sku)': () => h('div', { class: 'sku-after' }, 'after sku'),
        },
      });
      await flush();

      expect(screen.container.querySelector('.sku-replacement')).toBeTruthy();
      expect(screen.container.querySelector('.sku-before')).toBeFalsy();
      expect(screen.container.querySelector('.sku-after')).toBeFalsy();
    });

    it('renders field-before/field-after and #field(key) slots inside a tabbed form', async () => {
      const screen = render(DXForm, {
        props: {
          form: makeForm(),
          fields: productFields,
          tabs: productTabs,
          showSubmit: false,
        },
        slots: {
          'field-before(sku)': () => h('div', { class: 'sku-before' }, 'before sku'),
          'field(active)': () => h('div', { class: 'active-replacement' }, 'replaced'),
        },
      });
      await flush();

      expect(screen.container.querySelector('.sku-before')).toBeTruthy();
      expect(screen.container.querySelector('.active-replacement')).toBeTruthy();
      expect(labelTexts(screen.container)).not.toContain('Active');
    });
  });

  describe('Auto-switch to error tab', () => {
    it('activates the tab containing the first validation error', async () => {
      const form = makeForm();
      const screen = render(DXForm, {
        props: { form, fields: productFields, tabs: productTabs, showSubmit: false },
      });
      await flush();

      const navBefore = screen.container.querySelectorAll('.nav-link');
      expect(navBefore[0].classList.contains('active')).toBe(true);

      // Error on a field in the second tab (details → sku).
      form.setErrors({ sku: ['SKU is required.'] });
      await flush();
      await flush();

      const navAfter = screen.container.querySelectorAll('.nav-link');
      expect(navAfter[1].classList.contains('active')).toBe(true);
    });
  });

  describe('defineForm acceptance', () => {
    it('accepts a defineForm return without an explicit fields prop', async () => {
      const product = defineForm([
        { key: 'name', type: 'text', label: 'Name', default: '' },
        { key: 'sku', type: 'text', label: 'SKU', default: '' },
      ] as const);

      const screen = render(DXForm, { props: { form: product, showSubmit: false } });
      await flush();

      const labels = labelTexts(screen.container);
      expect(labels).toContain('Name');
      expect(labels).toContain('SKU');
    });
  });

  describe('Numeric coercion', () => {
    it('stores currency/number input as a number, not a string', async () => {
      const form = useForm({ price: 0 });
      const fields: FieldDefinition[] = [
        { key: 'price', type: 'currency', label: 'Price', currencySymbol: '$' },
      ];
      const screen = render(DXForm, {
        props: { form, fields, showSubmit: false },
      });
      await flush();

      const input = screen.container.querySelector('input[type="number"]') as HTMLInputElement;
      input.value = '12.50';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await flush();

      expect(form.data.price).toBe(12.5);
      expect(typeof form.data.price).toBe('number');
    });
  });

  describe('Async options', () => {
    it('populates a select from an optionsLoader', async () => {
      const form = useForm({ country: '' });
      const fields: FieldDefinition[] = [
        {
          key: 'country',
          type: 'select',
          label: 'Country',
          optionsLoader: async () => [
            { value: 'uk', text: 'United Kingdom' },
            { value: 'us', text: 'United States' },
          ],
        },
      ];
      const screen = render(DXForm, {
        props: { form, fields, showSubmit: false },
      });
      // Allow onMounted loader + a microtask to resolve.
      await flush();
      await flush();

      const optionTexts = Array.from(
        screen.container.querySelectorAll('select option'),
      ).map((o) => o.textContent?.trim());
      expect(optionTexts).toContain('United Kingdom');
      expect(optionTexts).toContain('United States');
    });
  });

  describe('Submission', () => {
    it('emits submit when the submit button is clicked', async () => {
      const form = makeForm();
      // Fill required fields so HTML5 validation doesn't block submit.
      form.data.name = 'Widget';

      const screen = render(DXForm, {
        props: { form, fields: productFields, submitText: 'Save' },
      });
      await flush();

      const button = Array.from(
        screen.container.querySelectorAll('button[type="submit"]'),
      ).find((b) => b.textContent?.trim() === 'Save') as HTMLButtonElement;
      button.click();
      await flush();

      expect(screen.emitted().submit).toBeTruthy();
    });
  });

  describe('Horizontal layout (#66)', () => {
    it('renders vertically by default (no row/column classes)', async () => {
      const screen = render(DXForm, {
        props: { form: makeForm(), fields: productFields, showSubmit: false },
      });
      await flush();

      expect(screen.container.querySelector('.row')).toBeFalsy();
    });

    it('renders a label/content column split for every field when layout is horizontal', async () => {
      const screen = render(DXForm, {
        props: {
          form: makeForm(),
          fields: productFields,
          showSubmit: false,
          layout: 'horizontal',
        },
      });
      await flush();

      const labels = screen.container.querySelectorAll('.col-form-label');
      // One per rendered field (name, price, discount, sku, description, active).
      expect(labels.length).toBe(productFields.length);
    });

    it('lets a per-field layout override the form-level default', async () => {
      const fields: FieldDefinition[] = [
        { key: 'name', type: 'text', label: 'Name', layout: 'vertical' },
        { key: 'sku', type: 'text', label: 'SKU' },
      ];
      const screen = render(DXForm, {
        props: {
          form: useForm({ name: '', sku: '' }),
          fields,
          showSubmit: false,
          layout: 'horizontal',
        },
      });
      await flush();

      // Only the SKU field (no override) gets the column split.
      expect(screen.container.querySelectorAll('.col-form-label').length).toBe(1);
    });

    it('honours a form-level labelCols', async () => {
      const screen = render(DXForm, {
        props: {
          form: makeForm(),
          fields: productFields,
          showSubmit: false,
          layout: 'horizontal',
          labelCols: 4,
        },
      });
      await flush();

      expect(screen.container.querySelector('.col-form-label.col-4')).toBeTruthy();
    });

    it('forwards field.hideLabel to DXField, dropping the outer label (#78)', async () => {
      const fields: FieldDefinition[] = [
        { key: 'name', type: 'text', label: 'Name' },
        {
          key: 'collect_allergens',
          type: 'switch',
          label: 'Collect allergen information',
          hideLabel: true,
        },
      ];
      const screen = render(DXForm, {
        props: {
          form: useForm({ name: '', collect_allergens: true }),
          fields,
          showSubmit: false,
          layout: 'horizontal',
        },
      });
      await flush();

      // Only the (non-hidden) text field gets an outer label column; the
      // hideLabel switch does not.
      const labels = screen.container.querySelectorAll('.col-form-label');
      expect(labels.length).toBe(1);
      expect(labels[0].textContent).toContain('Name');
      // The switch itself still renders.
      expect(screen.container.querySelector('.dx-switch')).toBeTruthy();
    });
  });

  // Both the flat and tabbed layouts render every field through the SAME
  // DXFormField, so a per-field prop or slot can't silently apply to only one
  // branch (the drift that bit #78's hideLabel, motivating #83). These run the
  // identical field definition through both modes and assert matching output.
  describe('Flat and tabbed forward per-field props identically (#83 guard)', () => {
    const guardFields: FieldDefinition[] = [
      { key: 'name', type: 'text', label: 'Name' },
      {
        key: 'collect_allergens',
        type: 'switch',
        label: 'Collect allergen information',
        hideLabel: true,
      },
    ];

    const modes: Array<{ mode: string; tabs?: FormTab[] }> = [
      { mode: 'flat' },
      {
        mode: 'tabbed',
        tabs: [{ key: 'main', label: 'Main', fieldKeys: ['name', 'collect_allergens'] }],
      },
    ];

    for (const { mode, tabs } of modes) {
      it(`applies field.hideLabel to the field in ${mode} mode`, async () => {
        const screen = render(DXForm, {
          props: {
            form: useForm({ name: '', collect_allergens: true }),
            fields: guardFields,
            tabs,
            showSubmit: false,
            layout: 'horizontal',
          },
        });
        await flush();

        // Only the non-hidden text field gets an outer label column; the
        // hideLabel switch does not — identical to the flat #78 assertion.
        const labels = screen.container.querySelectorAll('.col-form-label');
        expect(labels.length).toBe(1);
        expect(labels[0].textContent).toContain('Name');
        expect(screen.container.querySelector('.dx-switch')).toBeTruthy();
      });

      it(`forwards #value(key) / field-before / field-after slots in ${mode} mode`, async () => {
        const screen = render(DXForm, {
          props: {
            form: useForm({ name: '', collect_allergens: true }),
            fields: guardFields,
            tabs,
            showSubmit: false,
          },
          slots: {
            'value(name)': () => h('div', { class: 'custom-name-control' }, 'custom'),
            'field-before(collect_allergens)': () =>
              h('div', { class: 'ca-before' }, 'before'),
            'field-after(collect_allergens)': () => h('div', { class: 'ca-after' }, 'after'),
          },
        });
        await flush();

        expect(screen.container.querySelector('.custom-name-control')).toBeTruthy();
        expect(screen.container.querySelector('.ca-before')).toBeTruthy();
        expect(screen.container.querySelector('.ca-after')).toBeTruthy();
      });
    }
  });

  describe('Card prop', () => {
    it('does not render a card by default (flat form)', async () => {
      const screen = render(DXForm, {
        props: { form: makeForm(), fields: productFields, showSubmit: false },
      });
      await flush();

      expect(screen.container.querySelector('.card')).toBeFalsy();
    });

    it('wraps a flat form in a card when card is true', async () => {
      const screen = render(DXForm, {
        props: { form: makeForm(), fields: productFields, showSubmit: true, card: true },
      });
      await flush();

      const card = screen.container.querySelector('.card');
      expect(card).toBeTruthy();
      // Fields and the submit button render inside the card.
      expect(card?.querySelector('input')).toBeTruthy();
      expect(card?.querySelector('button[type="submit"]')).toBeTruthy();
    });

    // #159: a tabbed form's content used to float on the bare page with no
    // panel beneath the tab strip ("tabs look weird without a card body").
    // It now renders inside a card panel by default so the active tab reads
    // as connected to a finished panel.
    it('wraps tabbed content in a card-body panel by default (#159)', async () => {
      const screen = render(DXForm, {
        props: { form: makeForm(), fields: productFields, tabs: productTabs, showSubmit: false },
      });
      await flush();

      const card = screen.container.querySelector('.card');
      expect(card).toBeTruthy();
      // The active tab's first field input sits inside `.card` → … → `.card-body`.
      const input = screen.container.querySelector('input') as HTMLInputElement | null;
      expect(input).toBeTruthy();
      const cardBody = input?.closest('.card-body') ?? null;
      expect(cardBody).toBeTruthy();
      expect(cardBody?.closest('.card')).toBe(card);
    });

    it('renders bare tabs with no card panel when cardTabs is false', async () => {
      const screen = render(DXForm, {
        props: {
          form: makeForm(),
          fields: productFields,
          tabs: productTabs,
          showSubmit: false,
          cardTabs: false,
        },
      });
      await flush();

      expect(screen.container.querySelector('.card')).toBeFalsy();
      // Tabs themselves still render.
      expect(navLabels(screen.container)).toEqual(['General', 'Details']);
    });

    it('renders the tab nav as card-header-tabs when card is true on a tabbed form', async () => {
      const screen = render(DXForm, {
        props: {
          form: makeForm(),
          fields: productFields,
          tabs: productTabs,
          showSubmit: false,
          card: true,
        },
      });
      await flush();

      const card = screen.container.querySelector('.card');
      expect(card).toBeTruthy();
      // BVN puts `card-header` on the nav's wrapper div and `card-header-tabs`
      // on the nested `<ul>` — not both on the same element.
      expect(card?.querySelector('.card-header .nav.card-header-tabs')).toBeTruthy();
      // DTabs' own `.tabs` root must be a direct child of `.card` — not
      // nested inside an extra `.card-body` (DCard's default no-body: false
      // would wrap it one level too deep, since DTabs already provides its
      // own card-header/card-body internally per tab pane).
      expect(card?.querySelector(':scope > .tabs')).toBeTruthy();
      expect(card?.querySelector(':scope > .card-body')).toBeFalsy();
      expect(navLabels(screen.container)).toEqual(['General', 'Details']);
    });
  });
});
