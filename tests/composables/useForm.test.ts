import { describe, it, expect } from 'vitest';
import { reactive } from 'vue';
import { useForm } from '../../resources/js/composables/useForm';

describe('useForm initial-data cloning', () => {
  it('seeds from a reactive Proxy array/object default without a DataCloneError', () => {
    // Repro of #37: a repeater field's `default: []` inside a reactive
    // `editFields` ref is a Vue Proxy; structuredClone throws on Proxies.
    const initial = reactive({
      name: '',
      lines: [] as Array<{ label: string }>,
      meta: { note: '' },
    });

    // Must not throw (previously: DataCloneError from structuredClone).
    const form = useForm(initial);

    expect(form.data.name).toBe('');
    expect(Array.isArray(form.data.lines)).toBe(true);
  });

  it('produces a mutable working copy detached from the seed', () => {
    const initial = reactive({ lines: [] as Array<{ label: string }> });
    const form = useForm(initial);

    // Add/remove on the form copy must work and not touch the seed.
    form.data.lines.push({ label: 'Row 1' });
    expect(form.data.lines.length).toBe(1);
    expect(initial.lines.length).toBe(0);
  });

  it('reset() restores the cloned initial values', () => {
    const form = useForm(reactive({ lines: [{ label: 'seed' }] }));
    form.data.lines.push({ label: 'added' });
    expect(form.data.lines.length).toBe(2);

    form.reset();
    expect(form.data.lines.length).toBe(1);
    expect(form.data.lines[0].label).toBe('seed');
  });
});
