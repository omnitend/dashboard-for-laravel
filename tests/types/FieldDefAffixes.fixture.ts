/*
 * Type-level test, compiled by `npm run typecheck` (tests/types/tsconfig.json).
 * `append`/`prepend` (unit text beside the input) are offered on the field
 * types DXField renders them for: number, the text family and percentage
 * both ways, currency `append` only (its leading cell is `currencySymbol`).
 * The strict `FieldDef` union must accept those and refuse the rest. Each
 * `@ts-expect-error` is a misuse that must stay an error; an unused directive
 * fails the check.
 */
import type { FieldDef, FieldDefinition } from '../../resources/js/types';

export const numberWithUnit: FieldDef = {
    key: 'online_notice_minutes',
    type: 'number',
    label: 'Online notice',
    append: 'minutes',
};

export const textWithBothAffixes: FieldDef = {
    key: 'handle',
    type: 'text',
    prepend: '@',
    append: (model) => (model.verified ? 'verified' : 'unverified'),
};

export const percentageWithCustomAppend: FieldDef = {
    key: 'share',
    type: 'percentage',
    append: '% of takings',
};

export const currencyPerUnit: FieldDef = {
    key: 'cost',
    type: 'currency',
    append: 'per case',
};

export const permissiveNumberWithUnit: FieldDefinition = {
    key: 'online_notice_minutes',
    type: 'number',
    append: (model) => (model.online_notice_minutes === 1 ? 'minute' : 'minutes'),
};

export const currencyHasNoPrepend: FieldDef = {
    key: 'cost',
    type: 'currency',
    // @ts-expect-error a currency's leading cell is `currencySymbol`
    prepend: 'from',
};

export const selectHasNoAppend: FieldDef = {
    key: 'size',
    type: 'select',
    options: [],
    // @ts-expect-error a select renders no input group
    append: 'litres',
};

export const appendIsText: FieldDef = {
    key: 'online_notice_minutes',
    type: 'number',
    // @ts-expect-error the unit is text, not a number
    append: 60,
};
