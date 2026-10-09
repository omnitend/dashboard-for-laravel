import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render } from 'vitest-browser-vue';
import { userEvent, page } from 'vitest/browser';
import { defineAsyncComponent, defineComponent, h, ref } from 'vue';
import DXForm from '../../resources/js/components/extended/DXForm.vue';
import DXField from '../../resources/js/components/extended/DXField.vue';
import { useForm } from '../../resources/js/composables/useForm';
import type { FieldDefinition, FormTab } from '../../resources/js/types';

/*
 * #194 review round: every way a failed submit could fail to take the user to
 * the field it names. Each test reads what the user would meet: the selected
 * tab, `document.activeElement`, rects against the viewport.
 */

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const settle = async () => {
  for (let i = 0; i < 6; i += 1) await flush();
};

function stubResponses(...responses: Array<() => Response>) {
  const queue = [...responses];
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
    const next = queue.shift();
    if (!next) throw new Error('unexpected fetch');
    return next();
  });
}

const GENERIC = 'The given data was invalid.';
const invalid = (errors: Record<string, string[]>, message = GENERIC) => () =>
  new Response(JSON.stringify({ message, errors }), {
    status: 422,
    headers: { 'Content-Type': 'application/json' },
  });

async function failSubmit(form: ReturnType<typeof useForm<any>>, options = {}) {
  await expect(form.post('/api/orders', options)).rejects.toBeTruthy();
  await settle();
}

const activeTabText = (root: Element) =>
  root.querySelector('.nav-link.active')?.textContent?.trim();

const visibleAlerts = (root: Element): HTMLElement[] =>
  Array.from(root.querySelectorAll<HTMLElement>('.alert')).filter(
    (alert) => alert.offsetParent !== null && alert.getBoundingClientRect().height > 0,
  );

function summaryRow(root: Element, text: string): HTMLButtonElement {
  const row = Array.from(
    root.querySelectorAll<HTMLButtonElement>('.dx-form-error-summary__target'),
  ).find((button) => button.textContent?.includes(text));
  expect(row, `summary row containing "${text}"`).toBeTruthy();
  return row!;
}

const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });

async function scrollSettled(): Promise<void> {
  let previous = -1;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    await wait(50);
    if (window.scrollY === previous) return;
    previous = window.scrollY;
  }
  throw new Error('the page never stopped scrolling');
}

describe('DXForm: reaching the errored field (#194 review)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    scrollToTop();
  });

  describe('repeater rows', () => {
    const fields: FieldDefinition[] = [
      { key: 'name', type: 'text', label: 'Name' },
      {
        key: 'lines',
        type: 'repeater',
        label: 'Lines',
        fields: [
          {
            key: 'price',
            type: 'text',
            // Valid in DXRepeater, which resolves it against the ROW.
            label: (row: any) => `${row.currency.toUpperCase()} price`,
          },
        ],
      },
    ];
    const tabs: FormTab[] = [
      { key: 'general', label: 'General', fieldKeys: ['name'] },
      { key: 'lines', label: 'Lines', fieldKeys: ['lines'] },
    ];
    const makeForm = () =>
      useForm({
        name: 'Order',
        lines: [
          { currency: 'gbp', price: '1' },
          { currency: 'eur', price: '' },
        ],
      });

    it('a row-resolved sub-field label neither breaks the summary nor the tab choice', async () => {
      stubResponses(invalid({ 'lines.1.price': ['Must be positive.'] }));
      const form = makeForm();
      const screen = render(DXForm, { props: { form, fields, tabs } });
      await settle();
      // Positive control: the repeater rendered the label against the row.
      await userEvent.click(screen.container.querySelectorAll<HTMLElement>('.nav-link')[1]);
      await settle();
      await wait(100);
      expect(screen.container.textContent).toContain('EUR price');
      await userEvent.click(screen.container.querySelectorAll<HTMLElement>('.nav-link')[0]);
      await settle();
      expect(activeTabText(screen.container)).toBe('General');

      await failSubmit(form);
      expect(activeTabText(screen.container)).toBe('Lines');
      expect(screen.container.querySelector('.dx-form-error-summary')?.textContent).toContain(
        'EUR price (line 2)',
      );
    });

    it('a summary row focuses the errored row field, not the repeater', async () => {
      stubResponses(invalid({ 'lines.1.price': ['Must be positive.'] }));
      const form = makeForm();
      const screen = render(DXForm, { props: { form, fields, tabs } });
      await settle();
      await failSubmit(form);
      await wait(100);

      await userEvent.click(summaryRow(screen.container, 'Must be positive.'));
      await wait(300);
      const rowField = screen.container.querySelector('[data-dx-field-key="lines.1.price"]');
      expect(rowField).not.toBeNull();
      const input = rowField!.querySelector('input');
      expect(input).not.toBeNull();
      expect(document.activeElement).toBe(input);
    });
  });

  it('focuses the input of a field with an info button, not "More information"', async () => {
    stubResponses(invalid({ sku: ['The SKU is required.'] }));
    const fields: FieldDefinition[] = [
      { key: 'name', type: 'text', label: 'Name' },
      { key: 'sku', type: 'text', label: 'SKU', info: 'The stock code.' },
    ];
    const form = useForm({ name: '', sku: '' });
    const screen = render(DXForm, { props: { form, fields } });
    await settle();
    // Positive control: the info button exists and comes BEFORE the input.
    const field = screen.container.querySelector('[data-dx-field-key="sku"]')!;
    const infoButton = field.querySelector('button')!;
    const input = field.querySelector('input')!;
    expect(infoButton.getAttribute('aria-label')).toContain('More information');
    expect(infoButton.compareDocumentPosition(input) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    await failSubmit(form);
    await userEvent.click(summaryRow(screen.container, 'SKU'));
    await wait(200);
    expect(document.activeElement).toBe(input);
  });

  it('waits for an async editor to render its control before focusing', async () => {
    stubResponses(invalid({ notes: ['Notes are required.'] }));
    const Editor = defineComponent({
      props: { modelValue: { type: String, default: '' } },
      emits: ['update:modelValue'],
      setup: (props, { emit }) => () =>
        h('textarea', {
          class: 'async-editor',
          value: props.modelValue,
          onInput: (event: Event) =>
            emit('update:modelValue', (event.target as HTMLTextAreaElement).value),
        }),
    });
    const AsyncEditor = defineAsyncComponent(
      () => new Promise<typeof Editor>((resolve) => setTimeout(() => resolve(Editor), 500)),
    );
    const fields: FieldDefinition[] = [
      { key: 'name', type: 'text', label: 'Name' },
      { key: 'notes', type: 'component', label: 'Notes', component: AsyncEditor as any },
    ];
    const tabs: FormTab[] = [
      { key: 'general', label: 'General', fieldKeys: ['name'] },
      { key: 'notes', label: 'Notes', fieldKeys: ['notes'], lazy: true },
    ];
    const form = useForm({ name: 'x', notes: '' });
    const screen = render(DXForm, { props: { form, fields, tabs, autoErrorTab: false } });
    await settle();
    await failSubmit(form);
    // Positive control: the lazy pane (and so the editor) has never rendered.
    expect(screen.container.querySelector('.async-editor')).toBeNull();

    await userEvent.click(summaryRow(screen.container, 'Notes are required.'));
    await wait(1200);
    const editor = screen.container.querySelector('.async-editor');
    expect(editor).not.toBeNull();
    expect(document.activeElement).toBe(editor);
  });

  describe('field(key) replacement slots (round 3: no wrapper, opt-in targetAttrs)', () => {
    const fields: FieldDefinition[] = [
      { key: 'name', type: 'text', label: 'Name' },
      { key: 'code', type: 'text', label: 'Code' },
    ];

    it('renders exactly the slot DOM: no wrapper, the root a direct child of the field list', async () => {
      const form = useForm({ name: '', code: '' });
      const screen = render(DXForm, {
        props: { form, fields, showSubmit: false },
        slots: {
          'field(code)': () => [
            h('div', { class: 'root-a' }, 'A'),
            h('div', { class: 'root-b' }, 'B'),
          ],
        },
      });
      await settle();
      const fieldList = screen.container.querySelector('form > div')!;
      const nameField = screen.container.querySelector('[data-dx-field-key="name"]')!;
      const rootA = screen.container.querySelector('.root-a')!;
      const rootB = screen.container.querySelector('.root-b')!;
      // Positive control: the DXField sibling sits in the same list.
      expect(nameField.parentElement).toBe(fieldList);
      expect(rootA.parentElement).toBe(fieldList);
      expect(rootB.parentElement).toBe(fieldList);
      expect(Array.from(fieldList.children)).toEqual([nameField, rootA, rootB]);
      expect(screen.container.querySelector('.dx-form-field-slot')).toBeNull();
      // An unmarked slot carries no marker.
      expect(screen.container.querySelector('[data-dx-field-key="code"]')).toBeNull();
    });

    it('passes targetAttrs to the slot', async () => {
      const seen: unknown[] = [];
      const form = useForm({ name: '', code: '' });
      render(DXForm, {
        props: { form, fields, showSubmit: false },
        slots: {
          'field(code)': (slotProps: any) => {
            seen.push(slotProps.targetAttrs);
            return h('div', 'Code');
          },
        },
      });
      await settle();
      expect(seen[0]).toEqual({ 'data-dx-field-key': 'code' });
    });

    it('a marked slot: a summary row focuses its input', async () => {
      stubResponses(invalid({ code: ['The code is taken.'] }));
      const form = useForm({ name: '', code: '' });
      const screen = render(DXForm, {
        props: { form, fields },
        slots: {
          'field(code)': ({ targetAttrs }: any) =>
            h('div', { class: 'code-replacement', ...targetAttrs }, [
              h('label', { for: 'code-input' }, 'Code'),
              h('input', { id: 'code-input', class: 'form-control' }),
            ]),
        },
      });
      await settle();
      await failSubmit(form);
      const row = summaryRow(screen.container, 'The code is taken.');
      expect(row.tagName).toBe('BUTTON');
      await userEvent.click(row);
      await wait(200);
      expect(document.activeElement).toBe(screen.container.querySelector('#code-input'));
    });

    it('an unmarked slot: the row is plain text with the field label, not a button', async () => {
      stubResponses(invalid({ code: ['Must be two letters.'], name: ['Required.'] }));
      const form = useForm({ name: '', code: '' });
      const screen = render(DXForm, {
        props: { form, fields },
        slots: {
          'field(code)': () => h('div', { class: 'code-replacement' }, [h('input', { id: 'code-input' })]),
        },
      });
      await settle();
      await failSubmit(form);
      await settle();
      const summary = screen.container.querySelector('.dx-form-error-summary')!;
      const codeRow = Array.from(summary.querySelectorAll('[data-dx-error-key="code"]'));
      expect(codeRow.length).toBe(1);
      expect(codeRow[0].tagName).not.toBe('BUTTON');
      expect(codeRow[0].textContent).toContain('Code');
      expect(codeRow[0].textContent).toContain('Must be two letters.');
      // Positive control: a reachable field's row in the same summary is a button.
      expect(summary.querySelector('[data-dx-error-key="name"]')?.tagName).toBe('BUTTON');
    });

    it('an unmarked slot first: auto-scroll reaches the next target', async () => {
      await page.viewport(900, 600);
      const filler: FieldDefinition[] = Array.from({ length: 30 }, (_, index) => ({
        key: `filler_${index}`,
        type: 'text',
        label: `Filler ${index}`,
      }));
      const tallFields: FieldDefinition[] = [
        { key: 'code', type: 'text', label: 'Code' },
        ...filler,
        { key: 'qty', type: 'text', label: 'Quantity' },
      ];
      const data: Record<string, string> = { code: '', qty: '' };
      for (const field of filler) data[field.key] = '';
      stubResponses(invalid({ code: ['Bad code.'], qty: ['Quantity is required.'] }));
      const form = useForm(data);
      const screen = render(DXForm, {
        props: { form, fields: tallFields, errorSummary: 'top' },
        slots: { 'field(code)': () => h('p', { class: 'code-replacement' }, 'Code editor') },
      });
      await settle();
      scrollToTop();
      await settle();
      const qty = screen.container.querySelector('[data-dx-field-key="qty"]')!;
      expect(qty.getBoundingClientRect().top).toBeGreaterThan(window.innerHeight);
      await failSubmit(form);
      await wait(500);
      await scrollSettled();
      const rect = qty.getBoundingClientRect();
      expect(window.scrollY).toBeGreaterThan(0);
      expect(rect.top).toBeGreaterThanOrEqual(0);
      expect(rect.bottom).toBeLessThanOrEqual(window.innerHeight);
    });

    it('a multi-root marked slot with a tall container: auto-scroll leaves the INPUT in view', async () => {
      await page.viewport(900, 600);
      const filler: FieldDefinition[] = Array.from({ length: 20 }, (_, index) => ({
        key: `filler_${index}`,
        type: 'text',
        label: `Filler ${index}`,
      }));
      const tallFields: FieldDefinition[] = [...filler, { key: 'code', type: 'text', label: 'Code' }];
      const data: Record<string, string> = { code: '' };
      for (const field of filler) data[field.key] = '';
      stubResponses(invalid({ code: ['Bad code.'] }));
      const form = useForm(data);
      const screen = render(DXForm, {
        props: { form, fields: tallFields, errorSummary: 'top' },
        slots: {
          'field(code)': ({ targetAttrs }: any) => [
            h('h5', 'Code'),
            h('div', { class: 'code-container', ...targetAttrs }, [
              h('div', { style: 'height: 900px' }, 'Long explanation of codes'),
              h('input', { id: 'code-input', class: 'form-control' }),
            ]),
          ],
        },
      });
      await settle();
      scrollToTop();
      await settle();
      await failSubmit(form);
      await wait(300);
      await scrollSettled();
      const input = screen.container.querySelector<HTMLElement>('#code-input')!;
      const rect = input.getBoundingClientRect();
      expect(rect.top).toBeGreaterThanOrEqual(0);
      expect(rect.bottom).toBeLessThanOrEqual(window.innerHeight);
      // Auto-scroll never focuses.
      expect(document.activeElement).not.toBe(input);
    });

    it('a marked element replaced, with a gap, during a re-render: re-queried by key', async () => {
      stubResponses(invalid({ code: ['The code is taken.'] }));
      const phase = ref<'loading' | 'gap' | 'ready'>('loading');
      const form = useForm({ name: '', code: '' });
      const screen = render(DXForm, {
        props: { form, fields },
        slots: {
          'field(code)': ({ targetAttrs }: any) => {
            if (phase.value === 'loading') {
              return h('div', { key: 'loading', class: 'code-loading', ...targetAttrs }, 'Loading…');
            }
            if (phase.value === 'gap') return h('span', { key: 'gap' }, '');
            return h('div', { key: 'ready', class: 'code-ready', ...targetAttrs }, [
              h('input', { id: 'code-input', class: 'form-control' }),
            ]);
          },
        },
      });
      await settle();
      await failSubmit(form);
      await userEvent.click(summaryRow(screen.container, 'The code is taken.'));
      await wait(50);
      // Positive control: the first marked element is up, with no control.
      expect(screen.container.querySelector('.code-loading')).not.toBeNull();
      phase.value = 'gap';
      await wait(150);
      expect(screen.container.querySelector('[data-dx-field-key="code"]')).toBeNull();
      phase.value = 'ready';
      await wait(300);
      expect(document.activeElement).toBe(screen.container.querySelector('#code-input'));
    });
  });

  it('focuses a contenteditable editor with tabindex="-1"', async () => {
    stubResponses(invalid({ body: ['Write something.'] }));
    const Editor = defineComponent({
      setup: () => () =>
        h('div', { class: 'rich-editor' }, [
          h('div', { class: 'rich-editor__surface', contenteditable: 'true', tabindex: '-1' }, ''),
        ]),
    });
    const fields: FieldDefinition[] = [
      { key: 'name', type: 'text', label: 'Name' },
      { key: 'body', type: 'component', label: 'Body', component: Editor as any },
    ];
    const form = useForm({ name: '', body: '' });
    const screen = render(DXForm, { props: { form, fields } });
    await settle();
    await failSubmit(form);
    await userEvent.click(summaryRow(screen.container, 'Write something.'));
    await wait(1300);
    expect(document.activeElement).toBe(screen.container.querySelector('.rich-editor__surface'));
  });

  it('waits for a widget that renders its control disabled and enables it later', async () => {
    stubResponses(invalid({ city: ['Pick a city.'] }));
    const Widget = defineComponent({
      // Declared, so DXField's `disabled` (false) does not fall through
      // onto the input over the widget's own loading state.
      props: { disabled: { type: Boolean, default: false } },
      setup: (props) => {
        const ready = ref(false);
        setTimeout(() => {
          ready.value = true;
        }, 300);
        return () =>
          h('input', {
            class: 'city-combobox',
            role: 'combobox',
            disabled: props.disabled || !ready.value,
          });
      },
    });
    const fields: FieldDefinition[] = [
      { key: 'name', type: 'text', label: 'Name' },
      { key: 'city', type: 'component', label: 'City', component: Widget as any },
    ];
    const tabs: FormTab[] = [
      { key: 'general', label: 'General', fieldKeys: ['name'] },
      { key: 'place', label: 'Place', fieldKeys: ['city'], lazy: true },
    ];
    const form = useForm({ name: 'x', city: '' });
    const screen = render(DXForm, { props: { form, fields, tabs, autoErrorTab: false } });
    await settle();
    await failSubmit(form);
    expect(screen.container.querySelector('.city-combobox')).toBeNull();
    await userEvent.click(summaryRow(screen.container, 'Pick a city.'));
    await wait(100);
    // Positive control: the widget is rendered, and still disabled.
    const input = screen.container.querySelector<HTMLInputElement>('.city-combobox')!;
    expect(input).not.toBeNull();
    expect(input.disabled).toBe(true);
    await wait(700);
    expect(input.disabled).toBe(false);
    expect(document.activeElement).toBe(input);
  });

  describe('awkward field keys (round 2)', () => {
    const keys = ['notes "quoted"', 'tags[0]', 'delivery date', "o'clock"];
    const fields: FieldDefinition[] = [
      { key: 'name', type: 'text', label: 'Name' },
      ...keys.map((key, index) => ({ key, type: 'text' as const, label: `Awkward ${index}` })),
      { key: 'image_media', type: 'text', label: 'Photos' },
    ];

    it.each([...keys, 'image_media.6f1c2a9e-3b7d-4c1e-9a2b-0d5e8f7a1c3b'])(
      'a summary row focuses the field for key %s',
      async (errorKey) => {
        stubResponses(invalid({ [errorKey]: ['This one is wrong.'] }));
        const data: Record<string, string> = { name: '', image_media: '' };
        for (const key of keys) data[key] = '';
        const form = useForm(data);
        const screen = render(DXForm, { props: { form, fields } });
        await settle();
        await failSubmit(form);
        await userEvent.click(summaryRow(screen.container, 'This one is wrong.'));
        await wait(400);
        const ownerKey = errorKey.startsWith('image_media.') ? 'image_media' : errorKey;
        const owner = Array.from(
          screen.container.querySelectorAll<HTMLElement>('[data-dx-field-key]'),
        ).find((element) => element.getAttribute('data-dx-field-key') === ownerKey)!;
        expect(owner).toBeTruthy();
        expect(document.activeElement).toBe(owner.querySelector('input'));
      },
    );
  });

  it('nested markers for one key (targetAttrs around a DXField): the control is focused', async () => {
    stubResponses(invalid({ code: ['The code is taken.'] }));
    const fields: FieldDefinition[] = [
      { key: 'name', type: 'text', label: 'Name' },
      { key: 'code', type: 'text', label: 'Code', info: 'Two letters.' },
    ];
    const form = useForm({ name: '', code: '' });
    const screen = render(DXForm, {
      props: { form, fields },
      slots: {
        'field(code)': ({ field, targetAttrs }: any) =>
          h('section', { class: 'code-section', ...targetAttrs }, [h(DXField, { field, form })]),
      },
    });
    await settle();
    const markers = Array.from(
      screen.container.querySelectorAll<HTMLElement>('[data-dx-field-key="code"]'),
    );
    // Positive control: two nested markers for the same key.
    expect(markers.length).toBe(2);
    expect(markers[0].contains(markers[1])).toBe(true);
    await failSubmit(form);
    await userEvent.click(summaryRow(screen.container, 'The code is taken.'));
    await wait(200);
    expect(document.activeElement).toBe(markers[1].querySelector('input'));
  });

  it('auto-scroll falls through an unreachable first target to the next one', async () => {
    await page.viewport(900, 600);
    const filler: FieldDefinition[] = Array.from({ length: 30 }, (_, index) => ({
      key: `filler_${index}`,
      type: 'text',
      label: `Filler ${index}`,
    }));
    const fields: FieldDefinition[] = [
      ...filler,
      { key: 'qty', type: 'text', label: 'Quantity' },
    ];
    // `custom` has no definition: consumer content in tab-before, no marker.
    const tabs: FormTab[] = [
      { key: 'main', label: 'Main', fieldKeys: ['custom', ...filler.map((f) => f.key), 'qty'] },
    ];
    const data: Record<string, string> = { qty: '' };
    for (const field of filler) data[field.key] = '';
    stubResponses(invalid({ custom: ['Custom is wrong.'], qty: ['Quantity is required.'] }));
    const form = useForm(data);
    const screen = render(DXForm, {
      props: { form, fields, tabs },
      slots: { 'tab-before(main)': () => h('p', { class: 'custom-content' }, 'Custom content') },
    });
    await settle();
    scrollToTop();
    await settle();
    const qty = screen.container.querySelector('[data-dx-field-key="qty"]')!;
    // Positive control: at the top of the page, qty is below the fold.
    expect(qty.getBoundingClientRect().top).toBeGreaterThan(window.innerHeight);
    // And the summary lists `custom` first (so it IS the first target).
    await failSubmit(form);
    // The unreachable first target is given its render frames before the
    // fall-through, so the scroll starts late: let it start, then settle.
    await wait(500);
    await scrollSettled();
    const rows = screen.container.querySelectorAll('.dx-form-error-summary__target');
    expect(rows[0]?.textContent).toContain('Custom is wrong.');
    const rect = qty.getBoundingClientRect();
    expect(rect.top).toBeGreaterThanOrEqual(0);
    expect(rect.bottom).toBeLessThanOrEqual(window.innerHeight);
  });

  it('scrolls to an errored field on a FRESH, never-opened lazy tab', async () => {
    await page.viewport(900, 600);
    const many: FieldDefinition[] = Array.from({ length: 30 }, (_, index) => ({
      key: `field_${index}`,
      type: 'text',
      label: `Field ${index}`,
    }));
    const fields: FieldDefinition[] = [{ key: 'name', type: 'text', label: 'Name' }, ...many];
    const tabs: FormTab[] = [
      { key: 'general', label: 'General', fieldKeys: ['name'] },
      { key: 'more', label: 'More', fieldKeys: many.map((f) => f.key), lazy: true },
    ];
    const data: Record<string, string> = { name: 'Widget' };
    for (const field of many) data[field.key] = '';
    stubResponses(invalid({ field_29: ['Field 29 is required.'] }));
    const form = useForm(data);
    const screen = render(DXForm, { props: { form, fields, tabs } });
    await settle();
    scrollToTop();
    await settle();
    // Positive control: the lazy pane has never mounted.
    expect(screen.container.querySelector('[data-dx-field-key="field_29"]')).toBeNull();
    expect(window.scrollY).toBe(0);

    await failSubmit(form);
    await scrollSettled();
    const field = screen.container.querySelector('[data-dx-field-key="field_29"]')!;
    expect(field).not.toBeNull();
    const rect = field.getBoundingClientRect();
    expect(window.scrollY).toBeGreaterThan(0);
    expect(rect.top).toBeGreaterThanOrEqual(0);
    expect(rect.bottom).toBeLessThanOrEqual(window.innerHeight);
  });

  describe('controlled tab requests while every tab is hidden', () => {
    const fields: FieldDefinition[] = [
      { key: 'a', type: 'text', label: 'A' },
      { key: 'b', type: 'text', label: 'B' },
      { key: 'c', type: 'text', label: 'C' },
    ];
    const tabs: FormTab[] = ['a', 'b', 'c'].map((key) => ({
      key,
      label: key.toUpperCase(),
      fieldKeys: [key],
      when: (model: any) => model.show === true,
    }));

    function renderControlled(initialIndex: number, initiallyShown: boolean) {
      const form = useForm({ show: initiallyShown, a: '', b: '', c: '' });
      const activeTab = ref(initialIndex);
      const writes: number[] = [];
      const Host = defineComponent({
        setup: () => () =>
          h(DXForm, {
            form,
            fields,
            tabs,
            showSubmit: false,
            activeTab: activeTab.value,
            'onUpdate:activeTab': (value: number) => {
              writes.push(value);
              activeTab.value = value;
            },
          }),
      });
      const screen = render(Host);
      return { form, activeTab, writes, screen };
    }

    it('mounting hidden with activeTab=2 selects tab 2 when they appear', async () => {
      const { form, activeTab, writes, screen } = renderControlled(2, false);
      await settle();
      // Positive control: nothing renders while hidden.
      expect(screen.container.querySelectorAll('.nav-link').length).toBe(0);
      form.data.show = true;
      await settle();
      await wait(50);
      expect(screen.container.querySelectorAll('.nav-link').length).toBe(3);
      expect(activeTabText(screen.container)).toBe('C');
      expect(activeTab.value).toBe(2);
      expect(writes).not.toContain(0);
    });

    it('a parent index change during the hidden interval is kept', async () => {
      const { form, activeTab, screen } = renderControlled(0, true);
      await settle();
      expect(activeTabText(screen.container)).toBe('A');
      form.data.show = false;
      await settle();
      activeTab.value = 1;
      await settle();
      form.data.show = true;
      await settle();
      await wait(50);
      expect(activeTabText(screen.container)).toBe('B');
      expect(activeTab.value).toBe(1);
    });
  });

  it('a removed tab is forgotten; a tab hidden by `when` keeps its pane id', async () => {
    // The id cache is internal; what it retains shows through id reuse: a
    // retained key gets its old id back, a forgotten one a fresh id.
    const fields: FieldDefinition[] = ['a', 'b', 'c'].map((key) => ({
      key,
      type: 'text',
      label: key.toUpperCase(),
    }));
    const tabFor = (key: string): FormTab => ({
      key,
      label: key.toUpperCase(),
      fieldKeys: [key],
      when: key === 'c' ? (model: any) => model.showC === true : undefined,
    });
    const tabs = ref<FormTab[]>(['a', 'b', 'c'].map(tabFor));
    const form = useForm({ a: '', b: '', c: '', showC: true });
    const Host = defineComponent({
      setup: () => () => h(DXForm, { form, fields, tabs: tabs.value, showSubmit: false }),
    });
    const screen = render(Host);
    await settle();
    const paneIdOf = (label: string) => {
      const link = Array.from(screen.container.querySelectorAll('.nav-link')).find(
        (candidate) => candidate.textContent?.trim() === label,
      );
      return link?.getAttribute('aria-controls') ?? null;
    };
    const firstA = paneIdOf('A');
    const firstC = paneIdOf('C');
    expect(firstA).toBeTruthy();
    expect(firstC).toBeTruthy();

    // Hidden by `when`: still in props.tabs, so it comes back as the same pane.
    form.data.showC = false;
    await settle();
    expect(paneIdOf('C')).toBeNull();
    form.data.showC = true;
    await settle();
    expect(paneIdOf('C')).toBe(firstC);

    // Removed from props.tabs, then reintroduced: forgotten, so a new id.
    tabs.value = ['b', 'c'].map(tabFor);
    await settle();
    tabs.value = ['a', 'b', 'c'].map(tabFor);
    await settle();
    const secondA = paneIdOf('A');
    expect(secondA).toBeTruthy();
    expect(secondA).not.toBe(firstA);
  });

  it('pane ids stay unique as tabs are removed and added', async () => {
    const fields: FieldDefinition[] = ['a', 'b', 'c', 'd'].map((key) => ({
      key,
      type: 'text',
      label: key.toUpperCase(),
    }));
    const tabFor = (key: string): FormTab => ({ key, label: key.toUpperCase(), fieldKeys: [key] });
    const tabs = ref<FormTab[]>(['a', 'b', 'c'].map(tabFor));
    const form = useForm({ a: '', b: '', c: '', d: '' });
    const Host = defineComponent({
      setup: () => () => h(DXForm, { form, fields, tabs: tabs.value, showSubmit: false }),
    });
    const screen = render(Host);
    await settle();
    tabs.value = ['b', 'c'].map(tabFor);
    await settle();
    tabs.value = ['b', 'c', 'd'].map(tabFor);
    await settle();
    const paneIds = Array.from(screen.container.querySelectorAll('.tab-pane')).map((pane) => pane.id);
    expect(paneIds.length).toBe(3);
    expect(new Set(paneIds).size).toBe(3);
    for (const link of Array.from(screen.container.querySelectorAll('.nav-link'))) {
      const controls = link.getAttribute('aria-controls');
      expect(controls && document.getElementById(controls)).toBeTruthy();
    }
  });

  describe('failure signals', () => {
    const fields: FieldDefinition[] = [
      { key: 'name', type: 'text', label: 'Name' },
      { key: 'sku', type: 'text', label: 'SKU' },
    ];
    const tabs: FormTab[] = [
      { key: 'general', label: 'General', fieldKeys: ['name'] },
      { key: 'details', label: 'Details', fieldKeys: ['sku'] },
    ];

    it('setErrors({}) inside onError keeps the summary and leaves the tab alone', async () => {
      stubResponses(invalid({ sku: ['The SKU is required.'] }));
      const form = useForm({ name: '', sku: '' });
      const screen = render(DXForm, { props: { form, fields, tabs } });
      await settle();
      await failSubmit(form, { onError: () => form.setErrors({}) });
      expect(activeTabText(screen.container)).toBe('General');
      const alerts = visibleAlerts(screen.container);
      expect(alerts.length).toBe(1);
      expect(alerts[0].textContent).toContain('The SKU is required.');
    });

    it('setErrors({}) after the flush keeps the summary and the tab', async () => {
      stubResponses(invalid({ sku: ['The SKU is required.'] }));
      const form = useForm({ name: '', sku: '' });
      const screen = render(DXForm, { props: { form, fields, tabs } });
      await settle();
      await failSubmit(form);
      expect(activeTabText(screen.container)).toBe('Details');
      form.setErrors({});
      await settle();
      expect(activeTabText(screen.container)).toBe('Details');
      const alerts = visibleAlerts(screen.container);
      expect(alerts.length).toBe(1);
      expect(alerts[0].textContent).toContain('The SKU is required.');
    });

    it('a later client-side setErrors selects its tab; still one alert', async () => {
      stubResponses(invalid({ sku: ['The SKU is required.'] }));
      const form = useForm({ name: '', sku: '' });
      const screen = render(DXForm, { props: { form, fields, tabs } });
      await settle();
      await failSubmit(form);
      await userEvent.click(screen.container.querySelectorAll<HTMLElement>('.nav-link')[0]);
      await settle();
      expect(activeTabText(screen.container)).toBe('General');
      form.setErrors({ name: ['Pick a name.'] });
      await settle();
      expect(activeTabText(screen.container)).toBe('General');
      form.setErrors({ sku: ['Client says no.'] });
      await settle();
      expect(activeTabText(screen.container)).toBe('Details');
      expect(visibleAlerts(screen.container).length).toBe(1);
    });

    it('a message-only failure while another tab is selected keeps the tab and shows the summary', async () => {
      stubResponses(invalid({}, 'Stock levels changed; reload and try again.'));
      const form = useForm({ name: '', sku: '' });
      const screen = render(DXForm, { props: { form, fields, tabs } });
      await settle();
      await userEvent.click(screen.container.querySelectorAll<HTMLElement>('.nav-link')[1]);
      await settle();
      expect(activeTabText(screen.container)).toBe('Details');
      await failSubmit(form);
      expect(activeTabText(screen.container)).toBe('Details');
      const alerts = visibleAlerts(screen.container);
      expect(alerts.length).toBe(1);
      expect(alerts[0].textContent).toContain('Stock levels changed; reload and try again.');
    });
  });
});
