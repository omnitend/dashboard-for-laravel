import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render } from 'vitest-browser-vue';
import { userEvent, page } from 'vitest/browser';
import { defineComponent, h, nextTick, ref } from 'vue';
import DXForm from '../../resources/js/components/extended/DXForm.vue';
import { useForm } from '../../resources/js/composables/useForm';
import type { FieldDefinition, FormTab } from '../../resources/js/types';

/*
 * #194, integration: DXForm shows what the last failed submit returned in ONE
 * visible alert next to its submit button, takes the user to the first
 * problem, and lets a summary row take them to any other.
 *
 * Every failure is a real 422 (or 500) through `form.post()` with `fetch`
 * stubbed to return a real `Response`. Assertions read what is on screen:
 * visible alerts, their position against the submit button, the shown pane,
 * `document.activeElement`, and rects against the viewport.
 */

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
const settle = async () => {
  for (let i = 0; i < 6; i += 1) await flush();
};

function stubResponses(...responses: Array<() => Response | Promise<Response>>) {
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

const ok = () => () =>
  new Response(JSON.stringify({ data: { id: 1 } }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

/** Alerts a user can see: rendered and laid out. */
const visibleAlerts = (root: Element): HTMLElement[] =>
  Array.from(root.querySelectorAll<HTMLElement>('.alert')).filter(
    (alert) => alert.offsetParent !== null && alert.getBoundingClientRect().height > 0,
  );

const submitButton = (root: Element) =>
  root.querySelector<HTMLButtonElement>('button[type="submit"]')!;

/**
 * Exactly one visible alert, and it sits directly above the submit button:
 * after every input of the form in document order, before the button, and
 * within a small gap of it on screen.
 */
function expectOneAlertBesideSubmit(root: Element): HTMLElement {
  const alerts = visibleAlerts(root);
  expect(alerts.length).toBe(1);
  const [alert] = alerts;
  const button = submitButton(root);
  expect(button).not.toBeNull();
  expect(alert.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  for (const input of Array.from(root.querySelectorAll('input, select, textarea'))) {
    expect(input.compareDocumentPosition(alert) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  }
  const gap = button.getBoundingClientRect().top - alert.getBoundingClientRect().bottom;
  expect(gap).toBeGreaterThanOrEqual(0);
  expect(gap).toBeLessThan(48);
  return alert;
}

/** Bootstrap sets `scroll-behavior: smooth` on :root, so jump explicitly. */
const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });

/** Wait until the page has stopped scrolling (two equal reads), up to 3 s. */
async function scrollSettled(): Promise<void> {
  let previous = -1;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 50));
    if (window.scrollY === previous) return;
    previous = window.scrollY;
  }
  throw new Error('the page never stopped scrolling');
}

async function failSubmit(form: ReturnType<typeof useForm<any>>, options = {}) {
  await expect(form.post('/api/orders', options)).rejects.toBeTruthy();
  await settle();
}

const flatFields: FieldDefinition[] = [
  { key: 'name', type: 'text', label: 'Name' },
  { key: 'sku', type: 'text', label: 'SKU' },
  { key: 'discount', type: 'text', label: 'Discount', when: () => false },
];

const makeFlatForm = () => useForm({ name: '', sku: '', discount: '' });

describe('DXForm error summary (#194)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('every 422 shape shows exactly one alert beside the submit button', () => {
    it('only keys with no rendered field', async () => {
      stubResponses(
        invalid({
          delivery_date: ['The delivery date must be a weekday.'],
          customer_ref: ['The customer ref has already been taken.'],
        }),
      );
      const form = makeFlatForm();
      const screen = render(DXForm, { props: { form, fields: flatFields } });
      await settle();
      await failSubmit(form);

      const alert = expectOneAlertBesideSubmit(screen.container);
      expect(alert.textContent).toContain(GENERIC);
      expect(alert.textContent).toContain('The delivery date must be a weekday.');
      expect(alert.textContent).toContain('The customer ref has already been taken.');
    });

    it('mixed rendered and unrendered keys', async () => {
      stubResponses(
        invalid({
          sku: ['The SKU is required.'],
          delivery_date: ['The delivery date must be a weekday.'],
        }),
      );
      const form = makeFlatForm();
      const screen = render(DXForm, { props: { form, fields: flatFields } });
      await settle();
      await failSubmit(form);

      const alert = expectOneAlertBesideSubmit(screen.container);
      expect(alert.textContent).toContain('The SKU is required.');
      expect(alert.textContent).toContain('The delivery date must be a weekday.');
    });

    it('only nested keys under a span field claimed with errorKeys (and its tab is selected)', async () => {
      stubResponses(
        invalid({
          'lines.0.price': ['Must be positive.'],
          'lines.1.quantity': ['Must be a whole number.'],
        }),
      );
      const fields: FieldDefinition[] = [
        { key: 'name', type: 'text', label: 'Name' },
        { key: 'order_lines', type: 'text', label: 'Order lines', span: true, errorKeys: ['lines.*.*'] },
      ];
      const tabs: FormTab[] = [
        { key: 'general', label: 'General', fieldKeys: ['name'] },
        { key: 'lines', label: 'Lines', fieldKeys: ['order_lines'] },
      ];
      const form = useForm({ name: 'Order', order_lines: [] as any[] });
      const screen = render(DXForm, {
        props: { form, fields, tabs },
        slots: { 'span(order_lines)': '<div class="lines-editor">Lines editor</div>' },
      });
      await settle();
      await failSubmit(form);

      const alert = expectOneAlertBesideSubmit(screen.container);
      expect(alert.textContent).toContain('Must be positive.');
      expect(alert.textContent).toContain('Must be a whole number.');
      // The tab holding the span field is the one shown.
      const activeLink = screen.container.querySelector('.nav-link.active');
      expect(activeLink?.textContent?.trim()).toBe('Lines');
    });

    it('message only (errors: {})', async () => {
      stubResponses(invalid({}, 'This order is locked.'));
      const form = makeFlatForm();
      const screen = render(DXForm, { props: { form, fields: flatFields } });
      await settle();
      await failSubmit(form);

      const alert = expectOneAlertBesideSubmit(screen.container);
      expect(alert.textContent).toContain('This order is locked.');
    });

    it('a key on a hidden field', async () => {
      stubResponses(invalid({ discount: ['The discount may not exceed 50%.'] }));
      const form = makeFlatForm();
      const screen = render(DXForm, { props: { form, fields: flatFields } });
      await settle();
      await failSubmit(form);

      const alert = expectOneAlertBesideSubmit(screen.container);
      expect(alert.textContent).toContain('The discount may not exceed 50%.');
    });

    it('in a tabbed form the alert sits below the tabs, never inside a pane', async () => {
      stubResponses(invalid({ delivery_date: ['The delivery date must be a weekday.'] }));
      const tabs: FormTab[] = [
        { key: 'general', label: 'General', fieldKeys: ['name'] },
        { key: 'details', label: 'Details', fieldKeys: ['sku'] },
      ];
      const form = makeFlatForm();
      const screen = render(DXForm, { props: { form, fields: flatFields, tabs } });
      await settle();
      await failSubmit(form);

      const alert = expectOneAlertBesideSubmit(screen.container);
      expect(alert.closest('.tab-pane')).toBeNull();
    });

    it('errorSummary "top" puts the one alert above the fields', async () => {
      stubResponses(invalid({ delivery_date: ['The delivery date must be a weekday.'] }));
      const form = makeFlatForm();
      const screen = render(DXForm, {
        props: { form, fields: flatFields, errorSummary: 'top' },
      });
      await settle();
      await failSubmit(form);

      const alerts = visibleAlerts(screen.container);
      expect(alerts.length).toBe(1);
      const firstInput = screen.container.querySelector('input')!;
      expect(alerts[0].compareDocumentPosition(firstInput) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(alerts[0].textContent).toContain('The delivery date must be a weekday.');
    });

    it('errorSummary false keeps the old top alert exactly (message-only failure)', async () => {
      stubResponses(invalid({}, 'This order is locked.'));
      const form = makeFlatForm();
      const screen = render(DXForm, {
        props: { form, fields: flatFields, errorSummary: false },
      });
      await settle();
      await failSubmit(form);

      expect(screen.container.querySelector('.dx-form-error-summary')).toBeNull();
      const alerts = visibleAlerts(screen.container);
      expect(alerts.length).toBe(1);
      expect(alerts[0].textContent?.trim()).toBe('This order is locked.');
    });
  });

  describe('editing and resubmitting', () => {
    it('keeps the alert through edits, and the generic message never returns on its own', async () => {
      stubResponses(
        invalid({
          name: ['The name field is required.'],
          sku: ['The SKU is required.'],
        }),
      );
      const form = makeFlatForm();
      const screen = render(DXForm, { props: { form, fields: flatFields } });
      await settle();
      await failSubmit(form);
      expectOneAlertBesideSubmit(screen.container);

      const inputs = screen.container.querySelectorAll<HTMLInputElement>('input');
      await userEvent.fill(inputs[0], 'Widget');
      await userEvent.fill(inputs[1], 'W-1');
      await settle();

      // Positive control: the edits really cleared the field errors (which is
      // what used to bring `shouldShowMessage`'s generic alert back).
      expect(form.hasErrors).toBe(false);
      expect(form.shouldShowMessage).toBe(true);

      const alert = expectOneAlertBesideSubmit(screen.container);
      expect(alert.textContent).toContain('The name field is required.');
      expect(alert.textContent).toContain('The SKU is required.');
    });

    it('a successful retry clears it', async () => {
      stubResponses(invalid({ name: ['The name field is required.'] }), ok());
      const form = makeFlatForm();
      const screen = render(DXForm, { props: { form, fields: flatFields } });
      await settle();
      await failSubmit(form);
      expect(visibleAlerts(screen.container).length).toBe(1);

      await form.post('/api/orders');
      await settle();
      expect(visibleAlerts(screen.container).length).toBe(0);
    });

    it('a new submit clears it before the response arrives', async () => {
      let respond: (response: Response) => void = () => {};
      stubResponses(
        invalid({ name: ['The name field is required.'] }),
        () => new Promise<Response>((resolve) => { respond = resolve; }),
      );
      const form = makeFlatForm();
      const screen = render(DXForm, { props: { form, fields: flatFields } });
      await settle();
      await failSubmit(form);
      expect(visibleAlerts(screen.container).length).toBe(1);

      const pending = form.post('/api/orders').catch(() => {});
      await settle();
      expect(visibleAlerts(screen.container).length).toBe(0);

      respond(invalid({ sku: ['The SKU is required.'] })());
      await pending;
      await settle();
      const alert = expectOneAlertBesideSubmit(screen.container);
      expect(alert.textContent).toContain('The SKU is required.');
      expect(alert.textContent).not.toContain('The name field is required.');
    });
  });

  describe('taking the user to the problem', () => {
    const tabbedFields: FieldDefinition[] = [
      { key: 'name', type: 'text', label: 'Name' },
      { key: 'sku', type: 'text', label: 'SKU' },
      { key: 'description', type: 'text', label: 'Description' },
    ];
    const tabs: FormTab[] = [
      { key: 'general', label: 'General', fieldKeys: ['name'] },
      { key: 'details', label: 'Details', fieldKeys: ['sku'] },
      { key: 'extra', label: 'Extra', fieldKeys: ['description'], lazy: true },
    ];

    it('a summary row selects its tab and focuses its field', async () => {
      stubResponses(
        invalid({
          sku: ['The SKU is required.'],
          description: ['The description is required.'],
        }),
      );
      const form = useForm({ name: 'Widget', sku: '', description: '' });
      const screen = render(DXForm, { props: { form, fields: tabbedFields, tabs } });
      await settle();
      await failSubmit(form);

      // Positive control: the failure took the form to the FIRST error tab,
      // so landing on "Extra" below can only come from the row click.
      expect(screen.container.querySelector('.nav-link.active')?.textContent?.trim()).toBe('Details');

      const row = Array.from(
        screen.container.querySelectorAll<HTMLButtonElement>('.dx-form-error-summary__target'),
      ).find((button) => button.textContent?.includes('description'))!;
      expect(row).toBeTruthy();
      await userEvent.click(row);
      await settle();

      expect(screen.container.querySelector('.nav-link.active')?.textContent?.trim()).toBe('Extra');
      const field = screen.container.querySelector('[data-dx-field-key="description"]');
      expect(field).not.toBeNull();
      expect(field!.contains(document.activeElement)).toBe(true);
      expect(document.activeElement?.tagName).toBe('INPUT');
    });

    it('scrolls the first errored field into view on a lazy tab of a tall form', async () => {
      await page.viewport(900, 600);
      const manyFields: FieldDefinition[] = Array.from({ length: 30 }, (_, index) => ({
        key: `field_${index}`,
        type: 'text',
        label: `Field ${index}`,
      }));
      const fields: FieldDefinition[] = [{ key: 'name', type: 'text', label: 'Name' }, ...manyFields];
      const tallTabs: FormTab[] = [
        { key: 'general', label: 'General', fieldKeys: ['name'] },
        { key: 'more', label: 'More', fieldKeys: manyFields.map((field) => field.key), lazy: true },
      ];
      const data: Record<string, string> = { name: 'Widget' };
      for (const field of manyFields) data[field.key] = '';
      stubResponses(invalid({ field_29: ['Field 29 is required.'] }));
      const form = useForm(data);
      const screen = render(DXForm, { props: { form, fields, tabs: tallTabs } });
      await settle();
      scrollToTop();

      // Positive control: with the tab shown and the page at the top, the
      // field is below the fold, so an in-view reading later means a scroll.
      await userEvent.click(screen.container.querySelectorAll<HTMLElement>('.nav-link')[1]);
      await settle();
      scrollToTop();
      await settle();
      const controlField = screen.container.querySelector('[data-dx-field-key="field_29"]')!;
      expect(controlField).not.toBeNull();
      expect(controlField.getBoundingClientRect().top).toBeGreaterThan(window.innerHeight);

      await userEvent.click(screen.container.querySelectorAll<HTMLElement>('.nav-link')[0]);
      await settle();
      scrollToTop();
      await settle();

      await failSubmit(form);
      await scrollSettled();
      const field = screen.container.querySelector('[data-dx-field-key="field_29"]')!;
      const rect = field.getBoundingClientRect();
      expect(rect.top).toBeGreaterThanOrEqual(0);
      expect(rect.bottom).toBeLessThanOrEqual(window.innerHeight);
      // Auto-scroll never focuses (no phone keyboard popping up).
      expect(field.contains(document.activeElement)).toBe(false);
      scrollToTop();
    });

    it('scrollToError false leaves the page where it is', async () => {
      await page.viewport(900, 600);
      const manyFields: FieldDefinition[] = Array.from({ length: 30 }, (_, index) => ({
        key: `field_${index}`,
        type: 'text',
        label: `Field ${index}`,
      }));
      const data: Record<string, string> = {};
      for (const field of manyFields) data[field.key] = '';
      stubResponses(invalid({ field_29: ['Field 29 is required.'] }));
      const form = useForm(data);
      const screen = render(DXForm, {
        props: { form, fields: manyFields, scrollToError: false, errorSummary: 'top' },
      });
      await settle();
      scrollToTop();
      await failSubmit(form);
      await scrollSettled();
      const field = screen.container.querySelector('[data-dx-field-key="field_29"]')!;
      expect(field).not.toBeNull();
      expect(field.getBoundingClientRect().top).toBeGreaterThan(window.innerHeight);
    });
  });

  it('focusErrorTarget() is exposed for a summary rendered outside the form', async () => {
    stubResponses(invalid({ description: ['The description is required.'] }));
    const fields: FieldDefinition[] = [
      { key: 'name', type: 'text', label: 'Name' },
      { key: 'description', type: 'text', label: 'Description' },
    ];
    const tabs: FormTab[] = [
      { key: 'general', label: 'General', fieldKeys: ['name'] },
      { key: 'extra', label: 'Extra', fieldKeys: ['description'] },
    ];
    const form = useForm({ name: '', description: '' });
    const formRef = ref<any>(null);
    const Host = defineComponent({
      setup: () => () =>
        h(DXForm, { ref: formRef, form, fields, tabs, errorSummary: false, autoErrorTab: false }),
    });
    const screen = render(Host);
    await settle();
    await failSubmit(form);
    expect(screen.container.querySelector('.nav-link.active')?.textContent?.trim()).toBe('General');
    const exposed = formRef.value;
    expect(typeof exposed?.focusErrorTarget).toBe('function');

    await exposed.focusErrorTarget({ fieldKey: 'description', tabKey: 'extra', errorKey: 'description' });
    await settle();
    await nextTick();
    expect(screen.container.querySelector('.nav-link.active')?.textContent?.trim()).toBe('Extra');
    const field = screen.container.querySelector('[data-dx-field-key="description"]')!;
    expect(field.contains(document.activeElement)).toBe(true);
  });
});
