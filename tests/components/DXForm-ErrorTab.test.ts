import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render } from 'vitest-browser-vue';
import { userEvent } from 'vitest/browser';
import { defineComponent, h, ref } from 'vue';
import DXForm from '../../resources/js/components/extended/DXForm.vue';
import { useForm } from '../../resources/js/composables/useForm';
import type { FieldDefinition, FormTab } from '../../resources/js/types';

/*
 * #194 (items 4 and 5): which tab DXForm selects after validation errors.
 *
 * Errors arrive the way they do in an app: a 422 from `form.post()` through the
 * real API client, with `fetch` stubbed to return a Laravel `{message, errors}`
 * body. Field edits go through `userEvent`, so DXField's own `clearError` path
 * runs. Assertions read the SHOWN pane (the active `.tab-pane`, and that the
 * field's input in it is laid out), never an internal tab index.
 */

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
const settle = async () => {
  for (let i = 0; i < 4; i += 1) await flush();
};

/** Queue 422 responses for successive `fetch` calls. */
function stubValidationFailures(...errorSets: Array<Record<string, string[]>>) {
  const queue = [...errorSets];
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
    const errors = queue.shift() ?? {};
    return new Response(
      JSON.stringify({ message: 'The given data was invalid.', errors }),
      { status: 422, headers: { 'Content-Type': 'application/json' } },
    );
  });
}

/** The pane the user is looking at: active, and actually laid out. */
function shownPane(root: Element): HTMLElement {
  const panes = Array.from(root.querySelectorAll<HTMLElement>('.tab-pane')).filter(
    (pane) => pane.classList.contains('active') && pane.offsetParent !== null,
  );
  expect(panes.length).toBe(1);
  return panes[0];
}

const fields: FieldDefinition[] = [
  { key: 'name', type: 'text', label: 'Name' },
  { key: 'sku', type: 'text', label: 'SKU' },
  { key: 'description', type: 'text', label: 'Description' },
];

const threeTabs: FormTab[] = [
  { key: 'general', label: 'General', fieldKeys: ['name'] },
  { key: 'details', label: 'Details', fieldKeys: ['sku'] },
  { key: 'extra', label: 'Extra', fieldKeys: ['description'] },
];

const makeForm = () => useForm({ name: 'Widget', sku: '', description: '' });

/** Labels in the shown pane — enough to tell the tabs apart. */
const shownLabels = (root: Element): string[] =>
  Array.from(shownPane(root).querySelectorAll('label')).map(
    (label) => label.textContent?.trim() ?? '',
  );

async function submitExpectingFailure(form: ReturnType<typeof makeForm>, options = {}) {
  await expect(form.post('/api/products', options)).rejects.toBeTruthy();
  await settle();
}

describe('DXForm error tab (#194)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('keeps the current tab when a field edit clears one of several errors', async () => {
    // Would this pass with the bug present? No: the old watcher re-ran on the
    // cleared key and moved the form to the next tab that still had an error.
    stubValidationFailures({
      sku: ['The SKU is required.'],
      description: ['The description is required.'],
    });
    const form = makeForm();
    const screen = render(DXForm, {
      props: { form, fields, tabs: threeTabs, showSubmit: false },
    });
    await settle();

    await submitExpectingFailure(form);
    expect(shownLabels(screen.container)).toEqual(['SKU']);

    const skuInput = shownPane(screen.container).querySelector('input')!;
    await userEvent.fill(skuInput, 'W-1');
    await settle();

    // The edit really went through the clearError path…
    expect(form.errors.sku).toBeUndefined();
    expect(form.errors.description).toEqual(['The description is required.']);
    // …and the user is still on the tab they are fixing.
    expect(shownLabels(screen.container)).toEqual(['SKU']);
  });

  it('selects the first error tab again when a later submit adds errors', async () => {
    stubValidationFailures(
      { sku: ['The SKU is required.'], description: ['The description is required.'] },
      { name: ['The name has already been taken.'] },
    );
    const form = makeForm();
    const screen = render(DXForm, {
      props: { form, fields, tabs: threeTabs, showSubmit: false },
    });
    await settle();

    await submitExpectingFailure(form);
    expect(shownLabels(screen.container)).toEqual(['SKU']);

    await userEvent.fill(shownPane(screen.container).querySelector('input')!, 'W-1');
    await settle();
    expect(shownLabels(screen.container)).toEqual(['SKU']);

    await submitExpectingFailure(form);
    expect(Object.keys(form.errors)).toEqual(['name']);
    expect(shownLabels(screen.container)).toEqual(['Name']);
  });

  it('selects the error tab when a resubmit returns the same errors', async () => {
    // A normal resubmit clears the errors before sending, so the same set
    // coming back counts as added, and the user is brought back to it.
    stubValidationFailures(
      { sku: ['The SKU is required.'] },
      { sku: ['The SKU is required.'] },
    );
    const form = makeForm();
    const screen = render(DXForm, {
      props: { form, fields, tabs: threeTabs, showSubmit: false },
    });
    await settle();

    await submitExpectingFailure(form);
    expect(shownLabels(screen.container)).toEqual(['SKU']);

    await userEvent.click(screen.container.querySelectorAll<HTMLElement>('.nav-link')[0]);
    await settle();
    expect(shownLabels(screen.container)).toEqual(['Name']);

    await submitExpectingFailure(form);
    expect(shownLabels(screen.container)).toEqual(['SKU']);
  });

  it('leaves the tab alone on a preserveErrors resubmit that returns the same set', async () => {
    // Documented trade-off: with `preserveErrors` the keys never leave the
    // form, so an identical set adds nothing and the watcher cannot tell the
    // response from no change at all.
    stubValidationFailures(
      { sku: ['The SKU is required.'] },
      { sku: ['The SKU is required.'] },
    );
    const form = makeForm();
    const screen = render(DXForm, {
      props: { form, fields, tabs: threeTabs, showSubmit: false },
    });
    await settle();

    await submitExpectingFailure(form);
    // Positive control: the first failure did select the error tab, so the
    // final assertion below cannot pass just because errors never registered.
    expect(form.errors.sku).toEqual(['The SKU is required.']);
    expect(shownLabels(screen.container)).toEqual(['SKU']);

    await userEvent.click(screen.container.querySelectorAll<HTMLElement>('.nav-link')[0]);
    await settle();
    expect(shownLabels(screen.container)).toEqual(['Name']);

    await submitExpectingFailure(form, { preserveErrors: true });
    expect(form.errors.sku).toEqual(['The SKU is required.']);
    expect(shownLabels(screen.container)).toEqual(['Name']);
  });

  it('ignores an error on a hidden field when picking the tab', async () => {
    // Would this pass with the bug present? No: the old match ran over every
    // `tab.fieldKeys` entry, so the hidden `secret` field pulled the form onto
    // General even though nothing there shows an error.
    stubValidationFailures({
      secret: ['The secret is required.'],
      sku: ['The SKU is required.'],
    });
    const form = useForm({ name: 'Widget', secret: '', sku: '', description: '' });
    const tabbedFields: FieldDefinition[] = [
      { key: 'name', type: 'text', label: 'Name' },
      { key: 'secret', type: 'text', label: 'Secret', when: () => false },
      { key: 'sku', type: 'text', label: 'SKU' },
      { key: 'description', type: 'text', label: 'Description' },
    ];
    const tabs: FormTab[] = [
      { key: 'general', label: 'General', fieldKeys: ['name', 'secret'] },
      { key: 'details', label: 'Details', fieldKeys: ['sku'] },
      { key: 'extra', label: 'Extra', fieldKeys: ['description'] },
    ];
    const screen = render(DXForm, {
      props: { form, fields: tabbedFields, tabs, showSubmit: false },
    });
    await settle();
    await userEvent.click(screen.container.querySelectorAll<HTMLElement>('.nav-link')[2]);
    await settle();
    expect(shownLabels(screen.container)).toEqual(['Description']);

    await expect(form.post('/api/products')).rejects.toBeTruthy();
    await settle();

    expect(shownLabels(screen.container)).toEqual(['SKU']);
  });

  it('selects the rendered tab when a hidden tab comes before it', async () => {
    // Guard rather than a regression test: the old code already indexed into
    // the visible tabs, so this passed before the #194 fix too.
    stubValidationFailures({ description: ['The description is required.'] });
    const form = makeForm();
    const tabs: FormTab[] = [
      { key: 'general', label: 'General', fieldKeys: ['name'], when: () => false },
      { key: 'details', label: 'Details', fieldKeys: ['sku'] },
      { key: 'extra', label: 'Extra', fieldKeys: ['description'] },
    ];
    const screen = render(DXForm, {
      props: { form, fields, tabs, showSubmit: false },
    });
    await settle();
    expect(shownLabels(screen.container)).toEqual(['SKU']);

    await expect(form.post('/api/products')).rejects.toBeTruthy();
    await settle();

    expect(shownLabels(screen.container)).toEqual(['Description']);
  });

  it('selects the error tab for errors already on the form at mount', async () => {
    const form = makeForm();
    form.setErrors({ description: ['The description is required.'] });
    const screen = render(DXForm, {
      props: { form, fields, tabs: threeTabs, showSubmit: false },
    });
    await settle();

    expect(shownLabels(screen.container)).toEqual(['Description']);
  });

  it('shows the tab named by an initial activeTab', async () => {
    // Would this pass with the bug present? No: every DTab carried
    // `active` for index 0, which reset the selection to the first tab.
    const screen = render(DXForm, {
      props: { form: makeForm(), fields, tabs: threeTabs, showSubmit: false, activeTab: 1 },
    });
    await settle();

    expect(shownLabels(screen.container)).toEqual(['SKU']);
  });

  it('falls back to the first tab when the initial activeTab is out of range', async () => {
    const screen = render(DXForm, {
      props: { form: makeForm(), fields, tabs: threeTabs, showSubmit: false, activeTab: 7 },
    });
    await settle();

    expect(shownLabels(screen.container)).toEqual(['Name']);
  });

  it('shows a tab again when every tab is hidden and then returns', async () => {
    const form = useForm({ name: 'Widget', sku: '', description: '', showTabs: true });
    const tabs: FormTab[] = threeTabs.map((tab) => ({
      ...tab,
      when: (model: Record<string, unknown>) => model.showTabs === true,
    }));
    const screen = render(DXForm, {
      props: { form, fields, tabs, showSubmit: false },
    });
    await settle();
    expect(shownLabels(screen.container)).toEqual(['Name']);

    form.data.showTabs = false;
    await settle();
    expect(screen.container.querySelectorAll('.nav-link').length).toBe(0);

    form.data.showTabs = true;
    await settle();
    expect(shownLabels(screen.container)).toEqual(['Name']);
  });

  it('selects the error tab over an out-of-range v-model bound by a parent', async () => {
    // Would this pass with the bug present? No: the parent's prop lags the
    // emit, so the range check still saw 7 after the error tab chose 2 and
    // reset the selection to the first tab, hiding the error.
    const form = makeForm();
    form.setErrors({ description: ['The description is required.'] });
    const boundIndex = ref(7);
    const Parent = defineComponent({
      setup: () => () =>
        h(DXForm, {
          form,
          fields,
          tabs: threeTabs,
          showSubmit: false,
          activeTab: boundIndex.value,
          'onUpdate:activeTab': (index: number) => {
            boundIndex.value = index;
          },
        }),
    });
    const screen = render(Parent);
    await settle();

    expect(shownLabels(screen.container)).toEqual(['Description']);
    expect(boundIndex.value).toBe(2);
  });
});
