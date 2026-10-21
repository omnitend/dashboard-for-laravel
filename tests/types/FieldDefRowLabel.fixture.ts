/*
 * Type-level test, compiled by `npm run typecheck` (tests/types/tsconfig.json).
 * `rowLabel` is offered for a repeater AND for a span field that renders its
 * own rows (see `FieldDefinition.rowLabel`), so the strict `FieldDef` union
 * must accept it on both. It lived only on `RepeaterFieldDef` until 0.47.1, so
 * the span case below was an excess-property error. Each `@ts-expect-error`
 * is a misuse that must stay an error; an unused directive fails the check.
 */
import type { FieldDef, FieldDefinition } from '../../resources/js/types';

export const spanFieldWithRowLabel: FieldDef = {
    key: 'product_lines',
    type: 'text',
    span: true,
    rowLabel: (row, index) => (row.name ? String(row.name) : `Line ${index + 1}`),
};

export const repeaterWithRowLabel: FieldDef = {
    key: 'lines',
    type: 'repeater',
    fields: [{ key: 'price', type: 'currency' }],
    rowLabel: (row) => row.name,
};

export const permissiveSpanWithRowLabel: FieldDefinition = {
    key: 'product_lines',
    type: 'text',
    span: true,
    rowLabel: (row) => row.name,
};

export const rowLabelMustReturnText: FieldDef = {
    key: 'product_lines',
    type: 'text',
    span: true,
    // @ts-expect-error rowLabel returns a string (or nothing), not a number
    rowLabel: () => 42,
};
