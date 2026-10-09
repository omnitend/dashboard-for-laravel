import { describe, it, expect } from 'vitest';
import {
  resolveErrorTargets,
  humaniseErrorKey,
} from '../../resources/js/utils/formErrorTargets';
import type { FieldDefinition, FormTab } from '../../resources/js/types';

/* #194: the one rule for which field an error key belongs to. */

const pick = (targets: ReturnType<typeof resolveErrorTargets>) =>
  targets.map(({ errorKey, fieldKey, tabKey, label }) => ({ errorKey, fieldKey, tabKey, label }));

describe('resolveErrorTargets ownership', () => {
  const fields: FieldDefinition[] = [
    { key: 'name', type: 'text', label: 'Name' },
    {
      key: 'lines',
      type: 'repeater',
      label: 'Order lines',
      fields: [
        { key: 'price', type: 'currency', label: 'Price' },
        { key: 'qty', type: 'number', label: 'Quantity' },
      ],
    },
    { key: 'image_media', type: 'component', label: 'Photos' },
  ];

  it('owns an exact key', () => {
    const [target] = resolveErrorTargets({ name: ['Required.'] }, { fields });
    expect(target).toMatchObject({ fieldKey: 'name', label: 'Name', tabKey: null });
  });

  it('owns a repeater row key by dot prefix, labelled with the sub-field and line', () => {
    const targets = resolveErrorTargets(
      { 'lines.0.price': ['Must be positive.'], 'lines.2.qty': ['Too many.'], 'lines.1': ['Row invalid.'], lines: ['Need one.'] },
      { fields },
    );
    expect(pick(targets)).toEqual([
      { errorKey: 'lines.0.price', fieldKey: 'lines', tabKey: null, label: 'Price (line 1)' },
      { errorKey: 'lines.2.qty', fieldKey: 'lines', tabKey: null, label: 'Quantity (line 3)' },
      { errorKey: 'lines.1', fieldKey: 'lines', tabKey: null, label: 'Order lines (line 2)' },
      { errorKey: 'lines', fieldKey: 'lines', tabKey: null, label: 'Order lines' },
    ]);
  });

  it('labels an unknown sub-field with the repeater label and line', () => {
    const [target] = resolveErrorTargets({ 'lines.4.colour': ['Bad.'] }, { fields });
    expect(target.label).toBe('Order lines (line 5)');
  });

  it('owns a media-map key by prefix, labelled with the field', () => {
    const [target] = resolveErrorTargets(
      { 'image_media.9b1f0c2e-1d2a-4c55-8f00-2b3c4d5e6f70': ['Too large.'] },
      { fields },
    );
    expect(target).toMatchObject({ fieldKey: 'image_media', label: 'Photos' });
  });

  it('prefers an errorKeys pattern over an exact and a prefix match', () => {
    const withClaim: FieldDefinition[] = [
      { key: 'summary', type: 'text', label: 'Summary', errorKeys: ['lines.*', 'name'] },
      ...fields,
    ];
    const targets = resolveErrorTargets(
      { name: ['Required.'], 'lines.0': ['Bad row.'], 'lines.0.price': ['Bad price.'] },
      { fields: withClaim },
    );
    const owners = Object.fromEntries(targets.map((t) => [t.errorKey, t.fieldKey]));
    expect(owners).toEqual({
      name: 'summary',
      'lines.0': 'summary',
      // `*` is one segment: lines.*.* is not claimed, so the repeater owns it.
      'lines.0.price': 'lines',
    });
  });

  it('matches * against exactly one segment', () => {
    const claim: FieldDefinition[] = [
      { key: 'editor', type: 'component', label: 'Editor', errorKeys: ['blocks.*.body'] },
    ];
    const targets = resolveErrorTargets(
      { 'blocks.3.body': ['a'], 'blocks.body': ['b'], 'blocks.3.4.body': ['c'], blocks: ['d'] },
      { fields: claim },
    );
    const owners = Object.fromEntries(targets.map((t) => [t.errorKey, t.fieldKey]));
    expect(owners).toEqual({
      'blocks.3.body': 'editor',
      'blocks.body': null,
      'blocks.3.4.body': null,
      blocks: null,
    });
  });

  it('picks the longest owning prefix', () => {
    const nested: FieldDefinition[] = [
      { key: 'address', type: 'component', label: 'Address' },
      { key: 'address.postcode', type: 'text', label: 'Postcode' },
    ];
    const [target] = resolveErrorTargets({ 'address.postcode.format': ['Bad.'] }, { fields: nested });
    expect(target.fieldKey).toBe('address.postcode');
  });

  it('does not treat a shared stem as a prefix (name vs name_extra)', () => {
    const [target] = resolveErrorTargets({ name_extra: ['Bad.'] }, { fields });
    expect(target.fieldKey).toBeNull();
  });

  it('lets a hidden field fall through: hidden claim → exact owner; hidden owner → unowned', () => {
    const fieldsWithHiddenClaim: FieldDefinition[] = [
      { key: 'summary', type: 'text', label: 'Summary', errorKeys: ['name'], when: false },
      { key: 'name', type: 'text', label: 'Name' },
      { key: 'secret', type: 'text', label: 'Secret', when: (model) => model.showSecret === true },
    ];
    const targets = resolveErrorTargets(
      { name: ['Required.'], secret: ['Required.'] },
      { fields: fieldsWithHiddenClaim, model: { showSecret: false } },
    );
    expect(pick(targets)).toEqual([
      { errorKey: 'name', fieldKey: 'name', tabKey: null, label: 'Name' },
      { errorKey: 'secret', fieldKey: null, tabKey: null, label: 'Secret' },
    ]);
  });

  it('uses injected visibility and labels instead of the defaults', () => {
    const targets = resolveErrorTargets(
      { name: ['Required.'], 'lines.0.price': ['Bad.'] },
      {
        fields,
        isFieldVisible: (field) => field.key !== 'lines',
        resolveLabel: (field) => `<${field.key}>`,
      },
    );
    expect(pick(targets)).toEqual([
      { errorKey: 'name', fieldKey: 'name', tabKey: null, label: '<name>' },
      { errorKey: 'lines.0.price', fieldKey: null, tabKey: null, label: 'Lines price (line 1)' },
    ]);
  });

  it('resolves a function label against the model', () => {
    const [target] = resolveErrorTargets(
      { total: ['Bad.'] },
      {
        fields: [{ key: 'total', type: 'currency', label: (model) => `Total (${model.currency})` }],
        model: { currency: 'GBP' },
      },
    );
    expect(target.label).toBe('Total (GBP)');
  });
});

describe('resolveErrorTargets tabs and ordering', () => {
  const fields: FieldDefinition[] = [
    { key: 'name', type: 'text', label: 'Name' },
    { key: 'sku', type: 'text', label: 'SKU' },
    { key: 'price', type: 'currency', label: 'Price' },
    { key: 'notes', type: 'textarea', label: 'Notes' },
    { key: 'orphan', type: 'text', label: 'Orphan' },
  ];
  const tabs: FormTab[] = [
    { key: 'general', label: 'General', fieldKeys: ['sku', 'name'] },
    { key: 'pricing', label: 'Pricing', fieldKeys: ['price'], when: (model) => model.priced !== false },
    { key: 'extra', label: 'Extra', fieldKeys: ['notes', 'custom_block'] },
  ];

  it('orders by tab, then position in the tab, unowned last', () => {
    const errors = {
      zzz_unknown: ['Bad.'],
      notes: ['Too long.'],
      price: ['Required.'],
      name: ['Required.'],
      sku: ['Taken.'],
    };
    expect(resolveErrorTargets(errors, { fields, tabs }).map((t) => [t.errorKey, t.tabKey])).toEqual([
      ['sku', 'general'],
      ['name', 'general'],
      ['price', 'pricing'],
      ['notes', 'extra'],
      ['zzz_unknown', null],
    ]);
  });

  it('orders a flat form by field order, then server order within a field', () => {
    const errors = { notes: ['a'], 'name.first': ['b'], name: ['c'], sku: ['d'] };
    expect(resolveErrorTargets(errors, { fields }).map((t) => t.errorKey)).toEqual([
      'name.first',
      'name',
      'sku',
      'notes',
    ]);
  });

  it('never assigns a field on a hidden tab', () => {
    const [target] = resolveErrorTargets({ price: ['Required.'] }, { fields, tabs, model: { priced: false } });
    expect(target).toMatchObject({ fieldKey: null, tabKey: null });
  });

  it('never assigns a field on no tab of a tabbed form', () => {
    const [target] = resolveErrorTargets({ orphan: ['Bad.'] }, { fields, tabs });
    expect(target.fieldKey).toBeNull();
  });

  it('lets a tab key with no field definition own its key', () => {
    const [target] = resolveErrorTargets({ 'custom_block.0': ['Bad.'] }, { fields, tabs });
    expect(target).toMatchObject({ fieldKey: 'custom_block', tabKey: 'extra', label: 'Custom block (line 1)' });
  });

  it('never assigns a hidden field on a visible tab', () => {
    const hiddenSku = fields.map((field) => (field.key === 'sku' ? { ...field, when: false } : field));
    const [target] = resolveErrorTargets({ sku: ['Taken.'] }, { fields: hiddenSku, tabs });
    expect(target).toMatchObject({ fieldKey: null, tabKey: null });
  });

  it('uses an injected tab predicate', () => {
    const [target] = resolveErrorTargets(
      { name: ['Required.'] },
      { fields, tabs, isTabVisible: (tab) => tab.key !== 'general' },
    );
    expect(target.fieldKey).toBeNull();
  });
});

describe('resolveErrorTargets display lines', () => {
  const fields: FieldDefinition[] = [
    { key: 'name', type: 'text', label: 'Name' },
    { key: 'email', type: 'email', label: 'Email address' },
    { key: 'lines', type: 'repeater', label: 'Lines', fields: [{ key: 'price', type: 'currency', label: 'Price' }] },
  ];

  it('omits the label when the message already names the field', () => {
    const [target] = resolveErrorTargets({ name: ['The name field is required.'] }, { fields });
    expect(target.lines).toEqual(['The name field is required.']);
  });

  it('adds the label when the message does not name the field', () => {
    const [target] = resolveErrorTargets({ email: ['This is not valid.'] }, { fields });
    expect(target.lines).toEqual(['Email address: This is not valid.']);
  });

  it('keeps the label when the message carries a raw key', () => {
    const targets = resolveErrorTargets(
      { name: ['The name_display field is required.'], 'lines.0.price': ['The lines.0.price must be a number.'] },
      { fields },
    );
    expect(targets.map((t) => t.lines[0])).toEqual([
      'Name: The name_display field is required.',
      'Price (line 1): The lines.0.price must be a number.',
    ]);
  });

  it('keeps the label on every row that shares a message', () => {
    const targets = resolveErrorTargets(
      { 'lines.0.price': ['The price is required.'], 'lines.1.price': ['The price is required.'] },
      { fields },
    );
    expect(targets.map((t) => t.lines[0])).toEqual([
      'Price (line 1): The price is required.',
      'Price (line 2): The price is required.',
    ]);
  });

  it('keeps the label on a shared message even when it names both fields', () => {
    const message = 'The display name must differ from the name.';
    const targets = resolveErrorTargets(
      { name: [message], display_name: [message] },
      { fields: [...fields, { key: 'display_name', type: 'text', label: 'Display name' }] },
    );
    expect(targets.map((t) => t.lines[0])).toEqual([`Name: ${message}`, `Display name: ${message}`]);
  });

  it('humanises an unowned key, and drops it from a message that names it', () => {
    const [target] = resolveErrorTargets(
      { delivery_date: ['The delivery date must be a weekday.'] },
      { fields },
    );
    expect(target).toMatchObject({ fieldKey: null, label: 'Delivery date', lines: ['The delivery date must be a weekday.'] });
  });

  it('keeps one line per message, and skips keys with no messages', () => {
    const targets = resolveErrorTargets({ name: ['Too short.', 'Has digits.'], email: [] }, { fields });
    expect(targets).toHaveLength(1);
    expect(targets[0].lines).toEqual(['Name: Too short.', 'Name: Has digits.']);
  });

  it('returns nothing for no errors', () => {
    expect(resolveErrorTargets({}, { fields })).toEqual([]);
    expect(resolveErrorTargets(null, { fields })).toEqual([]);
  });
});

describe('humaniseErrorKey', () => {
  it.each([
    ['delivery_date', 'Delivery date'],
    ['deliveryDate', 'Delivery date'],
    ['lines.0.unit_price', 'Lines unit price (line 1)'],
    ['name', 'Name'],
  ])('%s → %s', (key, label) => {
    expect(humaniseErrorKey(key)).toBe(label);
  });
});
