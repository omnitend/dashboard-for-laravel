import { describe, it, expect, vi, afterEach } from 'vitest';
import { render } from 'vitest-browser-vue';
import { userEvent } from 'vitest/browser';
import { nextTick } from 'vue';
import DXFormErrorSummary from '../../resources/js/components/extended/DXFormErrorSummary.vue';
import { useForm } from '../../resources/js/composables/useForm';
import { defineForm } from '../../resources/js/composables/defineForm';
import { resolveErrorTargets } from '../../resources/js/utils/formErrorTargets';
import type { FieldDefinition, FormTab } from '../../resources/js/types';

/*
 * #194: the summary lists what the last failed submit returned, from a real
 * 422 through `form.post()` (fetch stubbed with a real Response), and keeps
 * listing it while the user edits.
 */

function stubResponses(...responses: Array<() => Response | Promise<Response>>) {
  const queue = [...responses];
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
    const next = queue.shift();
    if (!next) throw new Error('unexpected fetch');
    return next();
  });
}

const invalid = (errors: Record<string, string[]>, message = 'The given data was invalid.') =>
  () =>
    new Response(JSON.stringify({ message, errors }), {
      status: 422,
      headers: { 'Content-Type': 'application/json' },
    });

const fields: FieldDefinition[] = [
  { key: 'name', type: 'text', label: 'Name' },
  { key: 'email', type: 'email', label: 'Email address' },
  {
    key: 'lines',
    type: 'repeater',
    label: 'Lines',
    fields: [{ key: 'price', type: 'currency', label: 'Price' }],
  },
];

const makeForm = () => useForm({ name: '', email: '', lines: [{ price: 0 }] });

const threeErrors = {
  'lines.0.price': ['Must be positive.'],
  delivery_date: ['The delivery date must be a weekday.'],
  name: ['The name field is required.'],
};

const summaryOf = (root: Element) => root.querySelector<HTMLElement>('.dx-form-error-summary');
const rowTexts = (root: Element) =>
  Array.from(root.querySelectorAll('.dx-form-error-summary__item')).map((item) =>
    item.textContent?.trim(),
  );

describe('DXFormErrorSummary', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders nothing before a submit fails, nor while one is in flight', async () => {
    let respond: (response: Response) => void = () => {};
    stubResponses(() => new Promise<Response>((resolve) => { respond = resolve; }));
    const form = makeForm();
    const { container } = render(DXFormErrorSummary, { props: { form, fields } });
    expect(summaryOf(container)).toBeNull();

    const pending = form.post('/api/orders').catch(() => {});
    await nextTick();
    expect(summaryOf(container)).toBeNull();

    respond(invalid({ name: ['Required.'] })());
    await pending;
    await nextTick();
    expect(summaryOf(container)).not.toBeNull();
  });

  it('lists every message with a readable label, in field order, unowned last', async () => {
    stubResponses(invalid(threeErrors));
    const form = makeForm();
    const { container } = render(DXFormErrorSummary, { props: { form, fields } });

    await form.post('/api/orders').catch(() => {});
    await nextTick();

    const summary = summaryOf(container)!;
    const alert = summary.querySelector<HTMLElement>('.alert')!;
    expect(alert.classList.contains('alert-danger')).toBe(true);
    expect(alert.getAttribute('role')).toBe('alert');
    expect(summary.querySelectorAll('.alert')).toHaveLength(1);
    expect(summary.querySelector('.dx-form-error-summary__message')?.textContent?.trim()).toBe(
      'The given data was invalid.',
    );
    expect(rowTexts(container)).toEqual([
      'The name field is required.',
      'Price (line 1): Must be positive.',
      'The delivery date must be a weekday.',
    ]);
    // The summary is laid out, not just present.
    const box = summary.getBoundingClientRect();
    expect(box.height).toBeGreaterThan(0);
    expect(summary.offsetParent).not.toBeNull();
  });

  it('makes owned rows buttons and leaves unowned rows as text', async () => {
    stubResponses(invalid(threeErrors));
    const form = makeForm();
    const { container } = render(DXFormErrorSummary, { props: { form, fields } });
    await form.post('/api/orders').catch(() => {});
    await nextTick();

    const buttons = Array.from(
      container.querySelectorAll<HTMLButtonElement>('button.dx-form-error-summary__target'),
    ).map((button) => [button.dataset.dxErrorKey, button.type]);
    expect(buttons).toEqual([
      ['name', 'button'],
      ['lines.0.price', 'button'],
    ]);
    const unowned = container.querySelector('[data-dx-error-key="delivery_date"]');
    expect(unowned?.tagName).toBe('SPAN');
  });

  it('emits select-target with the field, tab and error key when a row is clicked', async () => {
    stubResponses(invalid({ 'lines.0.price': ['Must be positive.'], name: ['Required.'] }));
    const tabs: FormTab[] = [
      { key: 'main', label: 'Main', fieldKeys: ['name', 'email'] },
      { key: 'lines', label: 'Lines', fieldKeys: ['lines'] },
    ];
    const form = makeForm();
    const { container, emitted } = render(DXFormErrorSummary, { props: { form, fields, tabs } });
    await form.post('/api/orders').catch(() => {});
    await nextTick();

    const row = container.querySelector<HTMLButtonElement>('[data-dx-error-key="lines.0.price"]')!;
    await userEvent.click(row);

    expect(emitted()['select-target']).toEqual([
      [{ fieldKey: 'lines', tabKey: 'lines', errorKey: 'lines.0.price' }],
    ]);
  });

  it('shows just the message for a message-only failure', async () => {
    stubResponses(invalid({}, 'This order is already closed.'));
    const form = makeForm();
    const { container } = render(DXFormErrorSummary, { props: { form, fields } });
    await form.post('/api/orders').catch(() => {});
    await nextTick();

    const summary = summaryOf(container)!;
    expect(summary.textContent?.trim()).toBe('This order is already closed.');
    expect(summary.querySelector('ul')).toBeNull();
  });

  it('keeps every row while each field is edited and its error cleared', async () => {
    stubResponses(invalid(threeErrors));
    const form = makeForm();
    const { container } = render(DXFormErrorSummary, { props: { form, fields } });
    await form.post('/api/orders').catch(() => {});
    await nextTick();
    const before = rowTexts(container);
    expect(before).toHaveLength(3);

    form.field('name').value = 'Ada'; // the v-model path clears `name`
    form.clearError('lines.0.price');
    form.clearError('delivery_date');
    await nextTick();

    expect(form.hasErrors).toBe(false);
    expect(rowTexts(container)).toEqual(before);
    expect(summaryOf(container)?.querySelector('.dx-form-error-summary__message')?.textContent?.trim()).toBe(
      'The given data was invalid.',
    );
  });

  it('goes away when the next submit starts and stays away on success', async () => {
    let respond: (response: Response) => void = () => {};
    stubResponses(invalid(threeErrors), () => new Promise<Response>((resolve) => { respond = resolve; }));
    const form = makeForm();
    const { container } = render(DXFormErrorSummary, { props: { form, fields } });
    await form.post('/api/orders').catch(() => {});
    await nextTick();
    expect(summaryOf(container)).not.toBeNull();

    const retry = form.post('/api/orders');
    await nextTick();
    expect(summaryOf(container)).toBeNull();

    respond(new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } }));
    await retry;
    await nextTick();
    expect(summaryOf(container)).toBeNull();
  });

  it('honours an injected visibility predicate', async () => {
    stubResponses(invalid({ name: ['Required.'] }));
    const form = makeForm();
    const { container } = render(DXFormErrorSummary, {
      props: { form, fields, isFieldVisible: (field: FieldDefinition) => field.key !== 'name' },
    });
    await form.post('/api/orders').catch(() => {});
    await nextTick();
    // `name` is hidden, so the key is unowned: listed, but not a button.
    expect(container.querySelector('[data-dx-error-key="name"]')?.tagName).toBe('SPAN');
  });

  it('evaluates `when` against form data merged with context', async () => {
    stubResponses(invalid({ email: ['Bad.'] }));
    const form = makeForm();
    const gated: FieldDefinition[] = [
      { key: 'email', type: 'email', label: 'Email', when: (model) => model.canEmail === true },
    ];
    const { container } = render(DXFormErrorSummary, {
      props: { form, fields: gated, context: { canEmail: true } },
    });
    await form.post('/api/orders').catch(() => {});
    await nextTick();
    expect(container.querySelector('[data-dx-error-key="email"]')?.tagName).toBe('BUTTON');
  });

  it('lists precomputed targets as given', async () => {
    stubResponses(invalid({ name: ['Required.'] }));
    const form = makeForm();
    const targets = resolveErrorTargets({ sku: ['Taken.'] }, { fields: [{ key: 'sku', type: 'text', label: 'SKU' }] });
    const { container } = render(DXFormErrorSummary, { props: { form, fields, targets } });
    await nextTick();
    expect(summaryOf(container)).toBeNull(); // no failure yet: targets alone show nothing

    await form.post('/api/orders').catch(() => {});
    await nextTick();
    expect(rowTexts(container)).toEqual(['SKU: Taken.']);
  });

  it('accepts a defineForm return without separate fields', async () => {
    stubResponses(invalid({ name: ['Required.'] }));
    const defined = defineForm([{ key: 'name', type: 'text', label: 'Full name', default: '' }] as const);
    const { container } = render(DXFormErrorSummary, { props: { form: defined } });
    await defined.form.post('/api/orders').catch(() => {});
    await nextTick();
    expect(rowTexts(container)).toEqual(['Full name: Required.']);
  });

  it('draws rows as underlined text in the alert colour (built theme)', async () => {
    stubResponses(invalid(threeErrors));
    const form = makeForm();
    const { container } = render(DXFormErrorSummary, { props: { form, fields } });
    await form.post('/api/orders').catch(() => {});
    await nextTick();

    const summary = summaryOf(container)!;
    const button = summary.querySelector<HTMLButtonElement>('button.dx-form-error-summary__target')!;
    const buttonStyle = getComputedStyle(button);
    const alertStyle = getComputedStyle(summary.querySelector('.alert')!);
    expect(buttonStyle.color).toBe(alertStyle.color);
    // The alert keeps the danger alert's own (subtle) tint and ink.
    expect(alertStyle.color).not.toBe(getComputedStyle(document.body).color);
    expect(buttonStyle.textDecorationLine).toBe('underline');
    expect(buttonStyle.backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect(buttonStyle.borderTopWidth).toBe('0px');
    const list = summary.querySelector('ul')!;
    expect(getComputedStyle(list).marginBottom).toBe('0px');
  });
});
