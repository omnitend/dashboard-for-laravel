import { describe, it, expect } from 'vitest';
import { getByPath, setByPath } from '../../resources/js/utils/objectPath';

describe('objectPath', () => {
  it('reads nested values by dot path', () => {
    const obj = { a: { b: [{ c: 42 }] } };
    expect(getByPath(obj, 'a.b.0.c')).toBe(42);
    expect(getByPath(obj, 'a.b')).toBe(obj.a.b);
  });

  it('returns undefined for missing paths without throwing', () => {
    expect(getByPath({}, 'a.b.c')).toBeUndefined();
    expect(getByPath({ a: null }, 'a.b')).toBeUndefined();
  });

  it('writes nested values, creating intermediate containers', () => {
    const obj: Record<string, any> = {};
    setByPath(obj, 'lines.0.price', 9.99);
    expect(Array.isArray(obj.lines)).toBe(true);
    expect(obj.lines[0].price).toBe(9.99);
  });

  it('overwrites a non-object intermediate with the right container', () => {
    const obj: Record<string, any> = { lines: '' };
    setByPath(obj, 'lines.0.qty', 2);
    expect(obj.lines[0].qty).toBe(2);
  });

  it('blocks prototype-polluting segments', () => {
    const obj: Record<string, any> = {};
    setByPath(obj, '__proto__.polluted', true);
    setByPath(obj, 'a.constructor.polluted', true);
    setByPath(obj, 'prototype.polluted', true);
    // Object.prototype was not touched.
    expect(({} as any).polluted).toBeUndefined();
    expect(Object.prototype.hasOwnProperty('polluted')).toBe(false);
  });

  it('treats an empty path as a no-op', () => {
    const obj = { a: 1 };
    setByPath(obj, '', 2);
    expect(obj).toEqual({ a: 1 });
  });
});
