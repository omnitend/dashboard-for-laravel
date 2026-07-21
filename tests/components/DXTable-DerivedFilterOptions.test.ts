import { describe, it, expect, beforeEach } from 'vitest';
import { render } from 'vitest-browser-vue';
import { userEvent } from 'vitest/browser';
import { h } from 'vue';
import { BApp } from 'bootstrap-vue-next';
import DXTable from '../../resources/js/components/extended/DXTable.vue';

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/*
 * Every status shares the letter "a" on purpose: bvn's option list only mounts
 * once the user TYPES (see CLAUDE.md), and what is typed also NARROWS the list —
 * so a probe character common to every value is the only way to see the whole
 * derived set at once.
 */
const ITEMS = [
  { id: 1, name: 'Alpha', status: 'paid' },
  { id: 2, name: 'Beta', status: 'draft' },
  { id: 3, name: 'Gamma', status: 'cancelled' },
  { id: 4, name: 'Delta', status: 'paid' },
  { id: 5, name: 'Epsilon', status: 'draft' },
];

const FIELDS = [
  { key: 'name', label: 'Name' },
  { key: 'status', label: 'Status', filter: 'select' as const },
];

const rowNames = (container: Element) =>
  Array.from(container.querySelectorAll('tbody tr td:first-child')).map((td) =>
    td.textContent?.trim(),
  );

/** The filter input belonging to a column, by its zero-based column index. */
const filterInputFor = (container: Element, columnIndex: number) =>
  container.querySelectorAll('.filter-row th')[columnIndex].querySelector(
    'input',
  ) as HTMLInputElement;

/**
 * Open a select filter's list the way a user does and read back the rendered
 * options. Asserting on the real `[role="option"]` nodes (not on some computed)
 * is the point: an empty dropdown is precisely the bug being fixed, and the
 * options are teleported out of the component so they must be read from
 * `document`.
 */
const openOptionTexts = async (
  container: Element,
  columnIndex: number,
  probe: string,
): Promise<string[]> => {
  const input = filterInputFor(container, columnIndex);
  expect(input).not.toBeNull();
  await userEvent.click(input);
  await userEvent.fill(input, probe);
  await wait(150);
  return Array.from(document.querySelectorAll('[role="option"]')).map((el) =>
    (el.textContent ?? '').trim(),
  );
};

/** Option texts with the "All …" reset row and the "no value" row removed. */
const valueOptionTexts = (texts: string[], omit: string[] = []) =>
  texts.filter((text) => !text.startsWith('All ') && !omit.includes(text));

describe('DXTable client-side derived select-filter options (B2)', () => {
  beforeEach(() => {
    // DXTable persists a per-page preference in localStorage, which makes these
    // tests order-dependent (see CLAUDE.md). Clear every table's key.
    Object.keys(localStorage)
      .filter((key) => key.startsWith('dxtable-perpage-'))
      .forEach((key) => localStorage.removeItem(key));
  });

  it('derives the options from the distinct values in the loaded rows', async () => {
    const screen = render({
      render: () =>
        h(BApp, {}, () =>
          h(DXTable, { items: ITEMS, clientSide: true, fields: FIELDS }),
        ),
    });
    await flush();

    const texts = await openOptionTexts(screen.container, 1, 'a');

    expect(valueOptionTexts(texts)).toEqual(['cancelled', 'draft', 'paid']);

    // The "All …" reset row is still prepended exactly as before — derived
    // values compose with it rather than replacing the list. (Its absence when
    // a column has NOTHING to offer is guarded in DXTable.test.ts.)
    expect(texts).toContain('All Status');
  });

  it('offers each distinct value exactly once, stably sorted', async () => {
    const screen = render({
      render: () =>
        h(BApp, {}, () =>
          h(DXTable, {
            // "paid" and "draft" repeat; "Lane 10" vs "Lane 2" checks the
            // natural (numeric-aware) ordering rather than a raw code-point sort.
            items: [
              ...ITEMS,
              { id: 6, name: 'Zeta', status: 'Lane 10' },
              { id: 7, name: 'Eta', status: 'Lane 2' },
            ],
            clientSide: true,
            fields: FIELDS,
          }),
        ),
    });
    await flush();

    const texts = await openOptionTexts(screen.container, 1, 'a');

    expect(valueOptionTexts(texts)).toEqual([
      'cancelled',
      'draft',
      'Lane 2',
      'Lane 10',
      'paid',
    ]);
  });

  it('keeps every value in the list after a filter is applied', async () => {
    // The regression this guards: deriving from the FILTERED rows collapses the
    // dropdown to the single value just picked, so the user can never get back
    // to any other one.
    const screen = render({
      render: () =>
        h(BApp, {}, () =>
          h(DXTable, {
            items: ITEMS,
            clientSide: true,
            fields: FIELDS,
            filters: { status: 'paid' },
          }),
        ),
    });
    await flush();

    // The filter really is applied — otherwise the assertion below is vacuous.
    expect(rowNames(screen.container)).toEqual(['Alpha', 'Delta']);

    const texts = await openOptionTexts(screen.container, 1, 'a');

    expect(valueOptionTexts(texts)).toEqual(['cancelled', 'draft', 'paid']);
  });

  it('skips null/undefined/empty values, leaving filterNullText to label them', async () => {
    const screen = render({
      render: () =>
        h(BApp, {}, () =>
          h(DXTable, {
            items: [
              { id: 1, name: 'Alpha', status: 'paid' },
              { id: 2, name: 'Beta', status: null },
              { id: 3, name: 'Gamma', status: '' },
              { id: 4, name: 'Delta' },
            ],
            clientSide: true,
            fields: [
              { key: 'name', label: 'Name' },
              {
                key: 'status',
                label: 'Status',
                filter: 'select' as const,
                filterNullText: 'Unassigned',
              },
            ],
          }),
        ),
    });
    await flush();

    const texts = await openOptionTexts(screen.container, 1, 'a');

    // "Unassigned" is offered (it is the labelled way to express "no value"),
    // and no blank/whitespace-only option was derived from the three empty rows.
    expect(texts).toContain('Unassigned');
    expect(valueOptionTexts(texts, ['Unassigned'])).toEqual(['paid']);
  });

  it('labels a derived option with the column formatter, keeping the value raw', async () => {
    const screen = render({
      render: () =>
        h(BApp, {}, () =>
          h(DXTable, {
            items: ITEMS,
            clientSide: true,
            fields: [
              { key: 'name', label: 'Name' },
              {
                key: 'status',
                label: 'Status',
                filter: 'select' as const,
                formatter: (value: string) =>
                  `${value.charAt(0).toUpperCase()}${value.slice(1)}`,
              },
            ],
          }),
        ),
    });
    await flush();

    const texts = await openOptionTexts(screen.container, 1, 'a');
    expect(valueOptionTexts(texts)).toEqual(['Cancelled', 'Draft', 'Paid']);

    // The option's VALUE must still be the raw row value, or selecting it
    // filters nothing: the client-side select filter matches on `String(value)`.
    const paidOption = Array.from(document.querySelectorAll('[role="option"]')).find(
      (el) => (el.textContent ?? '').trim() === 'Paid',
    ) as HTMLElement;
    expect(paidOption).toBeTruthy();
    await userEvent.click(paidOption);
    await wait(150);

    expect(rowNames(screen.container)).toEqual(['Alpha', 'Delta']);
  });

  it('resolves a dotted field key when deriving', async () => {
    const screen = render({
      render: () =>
        h(BApp, {}, () =>
          h(DXTable, {
            items: [
              { id: 1, name: 'Alpha', paid_by: { card: 'visa' } },
              { id: 2, name: 'Beta', paid_by: { card: 'amex' } },
              { id: 3, name: 'Gamma', paid_by: { card: 'visa' } },
            ],
            clientSide: true,
            fields: [
              { key: 'name', label: 'Name' },
              { key: 'paid_by.card', label: 'Card', filter: 'select' as const },
            ],
          }),
        ),
    });
    await flush();

    const texts = await openOptionTexts(screen.container, 1, 'a');

    expect(valueOptionTexts(texts)).toEqual(['amex', 'visa']);
  });

  it('lets explicit filterOptions win over the derived values', async () => {
    const screen = render({
      render: () =>
        h(BApp, {}, () =>
          h(DXTable, {
            items: ITEMS,
            clientSide: true,
            fields: [
              { key: 'name', label: 'Name' },
              {
                key: 'status',
                label: 'Status',
                filter: 'select' as const,
                // Deliberately narrower than the data: if derivation ever ran
                // first, "cancelled" and "draft" would appear here too.
                filterOptions: [{ value: 'paid', text: 'Paid only' }],
              },
            ],
          }),
        ),
    });
    await flush();

    const texts = await openOptionTexts(screen.container, 1, 'a');

    expect(valueOptionTexts(texts)).toEqual(['Paid only']);
  });

  it('does not derive when the column opts out with deriveFilterOptions: false', async () => {
    const screen = render({
      render: () =>
        h(BApp, {}, () =>
          h(DXTable, {
            items: ITEMS,
            clientSide: true,
            fields: [
              { key: 'name', label: 'Name' },
              {
                key: 'status',
                label: 'Status',
                filter: 'select' as const,
                deriveFilterOptions: false,
              },
            ],
          }),
        ),
    });
    await flush();

    const texts = await openOptionTexts(screen.container, 1, 'a');

    // Nothing at all — not even the lone "All …" reset row, which is the
    // pre-existing behaviour for a select column with no options to offer.
    expect(texts).toEqual([]);
  });

  it('does not derive in Inertia mode, which only holds one page of rows', async () => {
    const screen = render({
      render: () =>
        h(BApp, {}, () =>
          // No `clientSide`, so this is Inertia mode: `items` is one server page,
          // and deriving from it would offer a list that changes as you page.
          h(DXTable, { items: ITEMS, fields: FIELDS }),
        ),
    });
    await flush();

    const texts = await openOptionTexts(screen.container, 1, 'a');

    expect(texts).toEqual([]);
  });

  /*
   * Both cases below were found by an independent review pass, not by the
   * feature work — each is a derived option that LOOKS right in the dropdown
   * but cannot do what the user expects when clicked.
   */

  it('omits a row value that collides with the "no value" sentinel', async () => {
    // `filterNullValue` defaults to the string "null". A row whose real value is
    // also "null" used to be derived as an ordinary option — but the row filter
    // intercepts that candidate ABOVE the select's exact-match arm and reads it
    // as "has no value", so selecting it returns only value-less rows. Here
    // every row HAS a value, so the offered option would match nothing at all.
    const items = [
      { id: 1, name: 'Alpha', access: 'null' },
      { id: 2, name: 'Beta', access: 'nas' },
    ];
    const fields = [
      { key: 'name', label: 'Name' },
      {
        key: 'access',
        label: 'Access',
        filter: 'select' as const,
        filterNullText: 'Unassigned',
      },
    ];

    const screen = render({
      render: () =>
        h(BApp, {}, () => h(DXTable, { items, clientSide: true, fields })),
    });
    await flush();

    const texts = await openOptionTexts(screen.container, 1, 'n');

    // "nas" is a real, selectable value and must still be offered.
    expect(valueOptionTexts(texts, ['Unassigned'])).toEqual(['nas']);

    // Exactly ONE entry may carry the sentinel's meaning: the labelled
    // "Unassigned" row. A second, raw "null" entry would be a duplicate value
    // in the same dropdown as well as a dead option.
    expect(texts.filter((text) => text === 'null')).toEqual([]);
  });

  it('formats a derived label from the DISPLAY value when filterKey differs', async () => {
    // The formatter contract's first argument is the value of `field.key`. When
    // `filterKey` names a different property, the option's VALUE must stay the
    // filter value (that is what the row filter compares) while the formatter
    // still receives the display value it was written against. Feeding it the
    // filter value mislabels the option, and throws for any formatter that
    // reaches into the display value's shape.
    const items = [
      { id: 1, name: 'Alpha', customer_id: 42, customer: { label: 'Acme' } },
      { id: 2, name: 'Beta', customer_id: 7, customer: { label: 'Aperture' } },
    ];
    const fields = [
      { key: 'name', label: 'Name' },
      {
        key: 'customer',
        label: 'Customer',
        filter: 'select' as const,
        filterKey: 'customer_id',
        // Reaches into the display value's shape: handed a bare numeric id this
        // throws rather than mislabelling, which is how the bug surfaced.
        formatter: (value: any) => value.label,
      },
    ];

    const screen = render({
      render: () =>
        h(BApp, {}, () => h(DXTable, { items, clientSide: true, fields })),
    });
    await flush();

    const texts = await openOptionTexts(screen.container, 1, 'a');

    // Labels come from the display value. Order follows the FILTER values,
    // which are numbers here, so the numeric sort puts 7 (Aperture) before
    // 42 (Acme) — not the lexicographic order of their string forms.
    expect(valueOptionTexts(texts)).toEqual(['Aperture', 'Acme']);
  });
});
