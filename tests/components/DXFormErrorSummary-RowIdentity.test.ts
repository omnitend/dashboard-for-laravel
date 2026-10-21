import { describe, it, expect, vi, afterEach } from 'vitest';
import { render } from 'vitest-browser-vue';
import { userEvent } from 'vitest/browser';
import { h } from 'vue';
import DXForm from '../../resources/js/components/extended/DXForm.vue';
import { useForm } from '../../resources/js/composables/useForm';
import type { FieldDefinition } from '../../resources/js/types';

/*
 * 0.47.0 review: the error summary keeps listing the last failure until the
 * next submit (deliberately), but it resolved a row error's `rowLabel` and its
 * focus target against the rows as they are NOW. Remove row 0 after a failure
 * on row 2 ("Charlie") and the summary named the new row 2 ("Delta") and a
 * click focused Delta's input. (Row names are words the message does not
 * contain: a label the message already holds is left off the line.) The failure now remembers which row object failed: the
 * summary names that row, and a click follows it to its current index, or to
 * the list itself when it is gone (or the rows were replaced wholesale).
 */

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const settle = async () => {
  for (let i = 0; i < 6; i += 1) await flush();
};

const MESSAGE = 'Enter a valid price.';
const invalid = () =>
  new Response(
    JSON.stringify({ message: 'The given data was invalid.', errors: { 'lines.2.price': [MESSAGE] } }),
    { status: 422, headers: { 'Content-Type': 'application/json' } },
  );

const makeForm = () =>
  useForm({
    lines: [
      { name: 'Alpha', price: 'a' },
      { name: 'Bravo', price: 'b' },
      { name: 'Charlie', price: 'c' },
      { name: 'Delta', price: 'd' },
    ],
  });

type Kind = 'repeater' | 'span';

const linesField = (kind: Kind, withRowLabel = true): FieldDefinition => {
  const rowLabel = withRowLabel ? (row: any) => row?.name : undefined;
  return kind === 'repeater'
    ? {
        key: 'lines',
        type: 'repeater',
        label: 'Lines',
        fields: [
          { key: 'name', type: 'text', label: 'Name' },
          { key: 'price', type: 'text', label: 'Price' },
        ],
        rowLabel,
      }
    : ({ key: 'lines', label: 'Lines', span: true, rowLabel } as FieldDefinition);
};

/** A span slot drawing its own rows, each price marked with its data path. */
const spanRows = (slotProps: any) =>
  h(
    'div',
    { class: 'dx-test-rows' },
    (slotProps.value as any[]).map((row, index) =>
      h('div', { key: row.name, 'data-dx-field-key': `lines.${index}.price` }, [
        h('input', {
          'aria-label': `${row.name} price`,
          value: row.price,
          onInput: (event: Event) => {
            row.price = (event.target as HTMLInputElement).value;
          },
        }),
      ]),
    ),
  );

async function renderFailed(kind: Kind, withRowLabel = true) {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async () => invalid());
  const form = makeForm();
  const screen = render(DXForm, {
    props: { form, fields: [linesField(kind, withRowLabel)] },
    slots: kind === 'span' ? { 'span(lines)': spanRows } : {},
  });
  await settle();
  await expect(form.post('/api/orders')).rejects.toBeTruthy();
  await settle();
  await wait(100);
  const summaryText = () =>
    screen.container.querySelector('.dx-form-error-summary')?.textContent ?? '';
  const clickRow = async () => {
    const row = Array.from(
      screen.container.querySelectorAll<HTMLButtonElement>('.dx-form-error-summary__target'),
    ).find((button) => button.textContent?.includes(MESSAGE));
    expect(row, 'the summary row').toBeTruthy();
    (document.activeElement as HTMLElement | null)?.blur();
    await userEvent.click(row!);
    await wait(300);
  };
  const priceInput = (index: number) =>
    screen.container.querySelector(
      `[data-dx-field-key="lines.${index}.price"] input`,
    ) as HTMLInputElement | null;
  return { form, screen, summaryText, clickRow, priceInput };
}

describe.each(['repeater', 'span'] as const)('summary rows follow the failed row (%s)', (kind) => {
  afterEach(() => vi.restoreAllMocks());

  it('control: rows unchanged, it names Charlie and focuses Charlie at index 2', async () => {
    const { summaryText, clickRow, priceInput } = await renderFailed(kind);
    expect(summaryText()).toContain(`Charlie: ${MESSAGE}`);
    await clickRow();
    expect(priceInput(2)?.value).toBe('c');
    expect(document.activeElement).toBe(priceInput(2));
  });

  it('row 0 removed: still names Charlie (not Delta), and focuses Charlie at its new index 1', async () => {
    const { form, summaryText, clickRow, priceInput } = await renderFailed(kind);
    form.data.lines.splice(0, 1);
    await settle();
    // Positive control: index 2 now holds D.
    expect(priceInput(2)?.value).toBe('d');

    expect(summaryText()).toContain(`Charlie: ${MESSAGE}`);
    expect(summaryText()).not.toContain(`Delta: ${MESSAGE}`);
    await clickRow();
    expect(priceInput(1)?.value).toBe('c');
    expect(document.activeElement).toBe(priceInput(1));
  });

  it('Charlie removed: names Charlie, and focuses the list, not the row now at index 2', async () => {
    const { form, screen, summaryText, clickRow, priceInput } = await renderFailed(kind);
    form.data.lines.splice(2, 1);
    await settle();
    expect(priceInput(2)?.value).toBe('d');

    expect(summaryText()).toContain(`Charlie: ${MESSAGE}`);
    await clickRow();
    expect(document.activeElement).not.toBe(priceInput(2));
    const list = screen.container.querySelector('[data-dx-field-key="lines"]');
    expect(list?.contains(document.activeElement)).toBe(true);
  });

  it('rows replaced wholesale (a reload): names Charlie, and focuses the list', async () => {
    const { form, screen, summaryText, clickRow, priceInput } = await renderFailed(kind);
    form.data.lines = form.data.lines.map((row: any) => ({ ...row }));
    await settle();
    expect(priceInput(2)?.value).toBe('c');

    expect(summaryText()).toContain(`Charlie: ${MESSAGE}`);
    await clickRow();
    expect(document.activeElement).not.toBe(priceInput(2));
    const list = screen.container.querySelector('[data-dx-field-key="lines"]');
    expect(list?.contains(document.activeElement)).toBe(true);
  });
});

describe('without rowLabel: "(line N)" is the row\'s CURRENT line while it exists', () => {
  afterEach(() => vi.restoreAllMocks());

  it('control: unchanged rows read "Price (line 3)"', async () => {
    const { summaryText } = await renderFailed('repeater', false);
    expect(summaryText()).toContain(`Price (line 3): ${MESSAGE}`);
  });

  it('row 0 removed: "Price (line 2)", and the click focuses that row', async () => {
    const { form, summaryText, clickRow, priceInput } = await renderFailed('repeater', false);
    form.data.lines.splice(0, 1);
    await settle();
    expect(summaryText()).toContain(`Price (line 2): ${MESSAGE}`);
    await clickRow();
    expect(document.activeElement).toBe(priceInput(1));
    expect(priceInput(1)?.value).toBe('c');
  });

  it('the failed row removed: keeps the line it failed on, "Price (line 3)"', async () => {
    const { form, summaryText } = await renderFailed('repeater', false);
    form.data.lines.splice(2, 1);
    await settle();
    expect(summaryText()).toContain(`Price (line 3): ${MESSAGE}`);
  });
});
