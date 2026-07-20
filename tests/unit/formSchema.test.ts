import { describe, it, expect } from 'vitest';
import {
  defaultValueForType,
  cloneDefault,
  resolveFieldDefault,
  resolvePredicate,
  isFieldVisible,
  isSubmittableField,
} from '../../resources/js/utils/formSchema';

/*
 * Pure form-schema semantics (#134). These consolidate rules that had drifted
 * across defineForm / useResourceEditor / DXForm / DXRepeater. The cases below
 * pin the CANONICAL rule — including the drift each old copy got wrong:
 * array-valued type defaults (missing from DXRepeater's map) and type-aware
 * defaulting (absent from useResourceEditor).
 */
describe('defaultValueForType', () => {
  it('booleans for toggles', () => {
    expect(defaultValueForType('checkbox')).toBe(false);
    expect(defaultValueForType('switch')).toBe(false);
  });

  it('zero for numerics', () => {
    expect(defaultValueForType('number')).toBe(0);
    expect(defaultValueForType('currency')).toBe(0);
    expect(defaultValueForType('percentage')).toBe(0);
  });

  it('empty ARRAY for array-valued fields (the drift DXRepeater missed)', () => {
    expect(defaultValueForType('repeater')).toEqual([]);
    expect(defaultValueForType('checkbox-group')).toEqual([]);
    expect(defaultValueForType('switch-list')).toEqual([]);
  });

  it('null for file inputs', () => {
    expect(defaultValueForType('image')).toBeNull();
    expect(defaultValueForType('file')).toBeNull();
  });

  it('empty string for text-like / choice fields', () => {
    expect(defaultValueForType('text')).toBe('');
    expect(defaultValueForType('select')).toBe('');
    expect(defaultValueForType('radio')).toBe('');
    expect(defaultValueForType('autocomplete')).toBe('');
  });
});

describe('cloneDefault', () => {
  it('returns primitives (incl. null) unchanged', () => {
    expect(cloneDefault(null)).toBeNull();
    expect(cloneDefault(3)).toBe(3);
    expect(cloneDefault('x')).toBe('x');
  });

  it('deep-clones objects/arrays so callers cannot share a reference', () => {
    const original = { a: [1, 2], b: { c: 3 } };
    const clone = cloneDefault(original);
    expect(clone).toEqual(original);
    expect(clone).not.toBe(original);
    expect(clone.a).not.toBe(original.a);
    clone.a.push(99);
    expect(original.a).toEqual([1, 2]); // original untouched
  });

  it('preserves a Date default (structuredClone, not a lossy JSON round-trip)', () => {
    // Regression guard (#134 review): a raw JSON clone flattens a Date to a
    // string before it reaches useForm's own structuredClone path.
    const when = new Date('2024-03-04T00:00:00.000Z');
    const clone = cloneDefault(when);
    expect(clone).toBeInstanceOf(Date);
    expect((clone as Date).getTime()).toBe(when.getTime());
    expect(clone).not.toBe(when);
  });
});

describe('resolveFieldDefault', () => {
  it('uses the explicit default when defined', () => {
    expect(resolveFieldDefault({ type: 'text', default: 'hi' })).toBe('hi');
  });

  it('preserves a null default (definedness, not nullishness) — #122/#125', () => {
    expect(resolveFieldDefault({ type: 'select', default: null })).toBeNull();
  });

  it('falls back to the TYPE default when default is absent or undefined', () => {
    expect(resolveFieldDefault({ type: 'checkbox-group' })).toEqual([]);
    expect(resolveFieldDefault({ type: 'number', default: undefined })).toBe(0);
    expect(resolveFieldDefault({ type: 'switch' })).toBe(false);
  });

  it('deep-clones an object/array default', () => {
    const def = { rows: [{ x: 1 }] };
    const seeded = resolveFieldDefault({ type: 'component', default: def });
    expect(seeded).toEqual(def);
    expect(seeded).not.toBe(def);
    expect(seeded.rows).not.toBe(def.rows);
  });
});

describe('resolvePredicate', () => {
  it('returns the fallback when when is undefined', () => {
    expect(resolvePredicate(undefined, {}, true)).toBe(true);
    expect(resolvePredicate(undefined, {}, false)).toBe(false);
  });

  it('returns a literal boolean when', () => {
    expect(resolvePredicate(false, {}, true)).toBe(false);
    expect(resolvePredicate(true, {}, false)).toBe(true);
  });

  it('evaluates a function when against the model', () => {
    expect(resolvePredicate((m: any) => m.role === 'admin', { role: 'admin' }, true)).toBe(true);
    expect(resolvePredicate((m: any) => m.role === 'admin', { role: 'user' }, true)).toBe(false);
  });
});

describe('isFieldVisible', () => {
  it('visible by default (no when/show)', () => {
    expect(isFieldVisible({}, {})).toBe(true);
  });

  it('hidden when `when` is false or its function returns false', () => {
    expect(isFieldVisible({ when: false }, {})).toBe(false);
    expect(isFieldVisible({ when: (m: any) => m.show === true }, { show: false })).toBe(false);
  });

  it('requires BOTH when and the legacy show to pass', () => {
    expect(isFieldVisible({ when: true, show: () => false }, {})).toBe(false);
    expect(isFieldVisible({ when: true, show: () => true }, {})).toBe(true);
  });
});

describe('isSubmittableField', () => {
  it('submittable unless submit === false', () => {
    expect(isSubmittableField({})).toBe(true);
    expect(isSubmittableField({ submit: true })).toBe(true);
    expect(isSubmittableField({ submit: false })).toBe(false);
  });
});
