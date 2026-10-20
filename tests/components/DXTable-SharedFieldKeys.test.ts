import { describe, it, expect, vi, afterEach } from 'vitest';
import { render } from 'vitest-browser-vue';
import { h, ref } from 'vue';
import { BApp } from 'bootstrap-vue-next';
import DXTable from '../../resources/js/components/extended/DXTable.vue';

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * #228. The save stripped a payload KEY whenever ANY edit field with that key
 * was `submit: false` (#110) or hidden by `when` (#117). Two fields sharing a
 * key is the usual "editable unless system-created" pattern: an editable
 * select, plus a read-only display twin that shows instead for one kind of
 * row. The twin's `submit: false` stripped the key from EVERY save, including
 * while the select was the visible one, so every create and edit posted no
 * `discount_type` and the server refused it (422).
 *
 * Every assertion here reads the request body DXTable actually sent.
 */
describe('DXTable edit fields that share a key (#228)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const discountTypeSelect = {
    key: 'discount_type',
    type: 'select',
    label: 'Discount type',
    default: 'percentage',
    options: [
      { value: 'percentage', text: 'Percentage' },
      { value: 'amount', text: 'Amount' },
    ],
    when: (model: any) => model.source !== 'price_override',
  };

  // The display-only twin, shown instead of the select for system-created rows.
  const discountTypeDisplay = {
    key: 'discount_type',
    type: 'text',
    label: 'Discount type',
    plaintext: true,
    submit: false,
    when: (model: any) => model.source === 'price_override',
  };

  const sourceField = { key: 'source', type: 'text', label: 'Source', default: 'manual' };
  const nameField = { key: 'name', type: 'text', label: 'Name' };

  const twinFields = [nameField, sourceField, discountTypeSelect, discountTypeDisplay];

  const stubFetch = () =>
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      () =>
        Promise.resolve({
          ok: true,
          status: 200,
          headers: { get: () => 'application/json' },
          json: () => Promise.resolve({ data: {} }),
        }) as any,
    );

  const renderTable = (editFields: any[], row: Record<string, any>) => {
    const tableRef = ref<any>(null);
    const screen = render({
      render: () =>
        h(BApp, {}, () =>
          h(DXTable, {
            ref: tableRef,
            items: [row],
            fields: [{ key: 'name', label: 'Name' }],
            editFields,
            editUrl: '/api/discounts/:id',
            createUrl: '/api/discounts',
          }),
        ),
    });
    return { screen, tableRef };
  };

  const clickButton = (pattern: RegExp) => {
    const button = [...document.querySelectorAll('button')].find((candidate) =>
      candidate.textContent?.trim().match(pattern),
    ) as HTMLElement;
    expect(button).toBeTruthy();
    button.click();
  };

  const editAndSave = async (editFields: any[], row: Record<string, any>) => {
    const fetchSpy = stubFetch();
    const { screen } = renderTable(editFields, row);
    await flush();
    (screen.container.querySelector('tbody tr') as HTMLElement).click();
    await wait(150);
    clickButton(/save/i);
    await wait(150);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, request] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(String(url)).toContain('/api/discounts/1');
    expect(request.method).toBe('PUT');
    return JSON.parse(request.body as string);
  };

  const createAndSave = async (editFields: any[]) => {
    const fetchSpy = stubFetch();
    const { tableRef } = renderTable(editFields, { id: 1, name: 'Existing' });
    await flush();
    tableRef.value.openCreate();
    await wait(150);
    clickButton(/^create\b/i);
    await wait(150);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, request] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(String(url)).toContain('/api/discounts');
    expect(request.method).toBe('POST');
    return JSON.parse(request.body as string);
  };

  it('posts the key on EDIT while the submitting select is the visible field', async () => {
    const payload = await editAndSave(twinFields, {
      id: 1,
      name: 'Ten pounds off',
      source: 'manual',
      discount_type: 'amount',
    });

    // The whole bug: the twin's submit:false removed this from every save.
    expect(payload.discount_type).toBe('amount');
    expect(payload.name).toBe('Ten pounds off');
  });

  it('posts the select default on CREATE, with the twin declared alongside it', async () => {
    const payload = await createAndSave(twinFields);

    expect(payload.source).toBe('manual');
    expect(payload.discount_type).toBe('percentage');
  });

  it('does not post the key when only the display twin is visible', async () => {
    const payload = await editAndSave(twinFields, {
      id: 1,
      name: 'Price override',
      source: 'price_override',
      discount_type: 'amount',
    });

    // Positive control: the save happened and carried the other fields.
    expect(payload.name).toBe('Price override');
    expect(payload).not.toHaveProperty('discount_type');
  });

  it('declaration order does not matter: twin declared before the select', async () => {
    const payload = await editAndSave([nameField, sourceField, discountTypeDisplay, discountTypeSelect], {
      id: 1,
      name: 'Ten pounds off',
      source: 'manual',
      discount_type: 'amount',
    });

    expect(payload.discount_type).toBe('amount');
  });

  it('still strips a key whose fields are ALL presentational (#110)', async () => {
    const payload = await editAndSave(
      [
        nameField,
        { key: 'notice', type: 'text', span: true, submit: false },
        { key: 'notice', type: 'text', span: true, submit: false, when: false },
      ],
      { id: 1, name: 'A', notice: 'leftover' },
    );

    expect(payload.name).toBe('A');
    expect(payload).not.toHaveProperty('notice');
  });

  it('still strips a key whose fields are ALL hidden (#117)', async () => {
    const payload = await editAndSave(
      [
        nameField,
        sourceField,
        { key: 'percentage', type: 'number', default: 10, when: (model: any) => model.source === 'a' },
        { key: 'percentage', type: 'number', default: 20, when: (model: any) => model.source === 'b' },
      ],
      { id: 1, name: 'A', source: 'manual', percentage: null },
    );

    expect(payload.name).toBe('A');
    expect(payload).not.toHaveProperty('percentage');
  });

  /*
   * Seeding. A presentational twin is never seeded (it holds no data). Two
   * SUBMITTING fields sharing a key used to seed last-declared-wins, so a
   * hidden alternative declared after the visible one replaced its default.
   * Now the key takes the default of the first field with that key that is
   * visible against the seeded model (falling back to the first declared).
   */
  it('a hidden SUBMITTING duplicate does not clobber the visible field\'s create default', async () => {
    const payload = await createAndSave([
      nameField,
      sourceField,
      discountTypeSelect,
      // A free-text alternative for imported rows, declared after the select.
      {
        key: 'discount_type',
        type: 'text',
        label: 'Discount type (imported)',
        default: 'imported',
        when: (model: any) => model.source === 'import',
      },
    ]);

    expect(payload.discount_type).toBe('percentage');
  });

  it('seeds from the visible duplicate even when the hidden one is declared first', async () => {
    const payload = await createAndSave([
      nameField,
      sourceField,
      {
        key: 'discount_type',
        type: 'text',
        label: 'Discount type (imported)',
        default: 'imported',
        when: (model: any) => model.source === 'import',
      },
      discountTypeSelect,
    ]);

    expect(payload.discount_type).toBe('percentage');
  });

  it('warns once when two submitting fields with one key are visible together', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const payload = await createAndSave([
      nameField,
      { key: 'code', type: 'text', label: 'Code', default: 'first' },
      { key: 'code', type: 'text', label: 'Code again', default: 'second' },
    ]);

    // First declared wins when both are visible.
    expect(payload.code).toBe('first');
    const duplicateWarnings = warnSpy.mock.calls.filter((call) =>
      String(call[0]).includes('"code"'),
    );
    expect(duplicateWarnings).toHaveLength(1);
    expect(String(duplicateWarnings[0][0])).toContain('[DXTable]');
  });

  it('does not warn for the select + display twin pattern', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const payload = await createAndSave(twinFields);

    // The previous test is the positive control: the same spy, on the same
    // path, catches the duplicate warning when there is one. Here the twin
    // is presentational and the two are never visible together.
    expect(payload.discount_type).toBe('percentage');
    expect(
      warnSpy.mock.calls.filter((call) => String(call[0]).includes('discount_type')),
    ).toHaveLength(0);
  });
});
