import { describe, it, expect, beforeEach } from 'vitest';
import { render } from 'vitest-browser-vue';
import { userEvent } from 'vitest/browser';
import { h } from 'vue';
import { BApp } from 'bootstrap-vue-next';
import DXTable from '../../resources/js/components/extended/DXTable.vue';

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const ITEMS = [
  { id: 1, name: 'Alpha', status: 'paid' },
  { id: 2, name: 'Beta', status: 'draft' },
  { id: 3, name: 'Gamma', status: 'cancelled' },
  { id: 4, name: 'Delta', status: 'paid' },
  { id: 5, name: 'Epsilon', status: 'draft' },
];

const rowNames = (container: Element) =>
  Array.from(container.querySelectorAll('tbody tr td:first-child')).map((td) =>
    td.textContent?.trim(),
  );

/** The filter control's <select> for a column, by zero-based column index. */
const nativeSelectFor = (container: Element, columnIndex: number) =>
  container
    .querySelectorAll('.filter-row th')
    [columnIndex].querySelector('select') as HTMLSelectElement | null;

/** The text input for a DAutocomplete select filter, by column index. */
const autocompleteInputFor = (container: Element, columnIndex: number) =>
  container
    .querySelectorAll('.filter-row th')
    [columnIndex].querySelector('input') as HTMLInputElement | null;

const renderClientSide = (fields: any[], props: Record<string, any> = {}) =>
  render({
    render: () =>
      h(BApp, {}, () =>
        h(DXTable, { items: ITEMS, clientSide: true, fields, ...props }),
      ),
  });

describe('DXTable select-native filter (S3b)', () => {
  beforeEach(() => {
    Object.keys(localStorage)
      .filter((key) => key.startsWith('dxtable-perpage-'))
      .forEach((key) => localStorage.removeItem(key));
  });

  it('renders a native <select> (not the DAutocomplete input)', async () => {
    const screen = renderClientSide([
      { key: 'name', label: 'Name' },
      { key: 'status', label: 'Status', filter: 'select-native' as const },
    ]);
    await flush();

    // The whole point of the mode: a real OS-native <select>, not a typeahead.
    const select = nativeSelectFor(screen.container, 1);
    expect(select).not.toBeNull();
    // And NOT the DAutocomplete text input a `filter: "select"` column renders.
    expect(autocompleteInputFor(screen.container, 1)).toBeNull();
  });

  it('offers the same option set a filter: "select" column would', async () => {
    // A native <select> exposes its whole option list synchronously (no
    // type-to-open), so we read its <option>s directly.
    const nativeScreen = renderClientSide([
      { key: 'name', label: 'Name' },
      { key: 'status', label: 'Status', filter: 'select-native' as const },
    ]);
    await flush();

    const select = nativeSelectFor(nativeScreen.container, 1)!;
    const nativeTexts = Array.from(select.options).map((opt) =>
      opt.textContent?.trim(),
    );

    // "All Status" reset row first (its VALUE is the sentinel, not ''), then the
    // derived distinct values, stably sorted — identical to filter:"select".
    expect(nativeTexts).toEqual(['All Status', 'cancelled', 'draft', 'paid']);

    // Contrast: the SAME field as a DAutocomplete select filter yields the same
    // VALUE options, proving both controls share the option/derivation plumbing.
    // (Rendered as a separate table because two columns can't share one key; the
    // data + field are otherwise identical.)
    const autoScreen = renderClientSide([
      { key: 'name', label: 'Name' },
      { key: 'status', label: 'Status', filter: 'select' as const },
    ]);
    await flush();
    const autoInput = autocompleteInputFor(autoScreen.container, 1)!;
    await userEvent.click(autoInput);
    await userEvent.fill(autoInput, 'a'); // every value contains "a"
    await wait(150);
    const autoValueTexts = Array.from(
      document.querySelectorAll('[role="option"]'),
    )
      .map((el) => (el.textContent ?? '').trim())
      .filter((text) => !text.startsWith('All '));

    expect(autoValueTexts).toEqual(
      nativeTexts.filter((text) => !text!.startsWith('All ')),
    );
  });

  it('filters the rows when an option is chosen, and clears via "All"', async () => {
    const screen = renderClientSide([
      { key: 'name', label: 'Name' },
      { key: 'status', label: 'Status', filter: 'select-native' as const },
    ]);
    await flush();

    const select = nativeSelectFor(screen.container, 1)!;

    // Choose "paid" — only the two paid rows remain.
    await userEvent.selectOptions(select, 'paid');
    await flush();
    expect(rowNames(screen.container)).toEqual(['Alpha', 'Delta']);

    // Choosing the "All …" reset row (its value is the FILTER_ALL_VALUE sentinel,
    // translated back to "no filter") restores every row.
    const allValue = select.options[0].value;
    await userEvent.selectOptions(select, allValue);
    await flush();
    expect(rowNames(screen.container)).toEqual([
      'Alpha',
      'Beta',
      'Gamma',
      'Delta',
      'Epsilon',
    ]);
  });

  it('shows the "All …" reset option selected while unfiltered', async () => {
    // The native control desyncs from the model if the bound value matches no
    // option, so "no filter" must map to the sentinel the "All" option carries.
    const screen = renderClientSide([
      { key: 'name', label: 'Name' },
      { key: 'status', label: 'Status', filter: 'select-native' as const },
    ]);
    await flush();

    const select = nativeSelectFor(screen.container, 1)!;
    // The selected option is the first one ("All Status"), not a blank/mismatched
    // value, and every row is still shown.
    expect(select.value).toBe(select.options[0].value);
    expect(select.selectedOptions[0].textContent?.trim()).toBe('All Status');
  });

  it('offers a filterNullText "no value" option like the typeahead does', async () => {
    const screen = renderClientSide([
      { key: 'name', label: 'Name' },
      {
        key: 'status',
        label: 'Status',
        filter: 'select-native' as const,
        filterNullText: 'Unassigned',
      },
    ]);
    await flush();

    const select = nativeSelectFor(screen.container, 1)!;
    const texts = Array.from(select.options).map((opt) =>
      opt.textContent?.trim(),
    );
    expect(texts).toContain('Unassigned');
  });

  it('stays single-select even when filterMultiple is set (keeps the All reset)', async () => {
    // filterMultiple is out of scope for select-native: it renders a single
    // <select> and must still carry the "All" reset (a multi DAutocomplete drops
    // it, but a native single-select needs it to clear).
    const screen = renderClientSide([
      { key: 'name', label: 'Name' },
      {
        key: 'status',
        label: 'Status',
        filter: 'select-native' as const,
        filterMultiple: true,
      },
    ]);
    await flush();

    const select = nativeSelectFor(screen.container, 1)!;
    expect(select.multiple).toBe(false);
    expect(select.options[0].textContent?.trim()).toBe('All Status');
  });
});
