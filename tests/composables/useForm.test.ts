import { describe, it, expect, vi, afterEach } from 'vitest';
import { reactive } from 'vue';
import { useForm } from '../../resources/js/composables/useForm';
import { api } from '../../resources/js/utils/api';

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

describe('useForm multipart submission', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sends FormData when a field holds a File', async () => {
    const postSpy = vi
      .spyOn(api, 'post')
      .mockResolvedValue({ data: {}, response: {} as Response });
    const file = new File(['x'], 'avatar.png', { type: 'image/png' });

    const form = useForm({ name: 'Ada', avatar: file, active: true });
    await form.post('/api/users');

    const body = postSpy.mock.calls[0][1];
    expect(body instanceof FormData).toBe(true);
    expect((body as FormData).get('name')).toBe('Ada');
    expect((body as FormData).get('avatar')).toBeInstanceOf(File);
    // Booleans serialise as Laravel-friendly "1"/"0".
    expect((body as FormData).get('active')).toBe('1');
  });

  it('spoofs _method=PUT for a multipart update (PHP only parses multipart on POST)', async () => {
    const postSpy = vi
      .spyOn(api, 'post')
      .mockResolvedValue({ data: {}, response: {} as Response });
    const form = useForm({ avatar: new File(['x'], 'a.png') });

    await form.put('/api/users/1');

    // put → POST + _method=PUT
    expect(postSpy).toHaveBeenCalled();
    const body = postSpy.mock.calls[0][1] as FormData;
    expect(body.get('_method')).toBe('PUT');
  });

  it('sends plain JSON (not FormData) when there are no files', async () => {
    const postSpy = vi
      .spyOn(api, 'post')
      .mockResolvedValue({ data: {}, response: {} as Response });

    const form = useForm({ name: 'Ada' });
    await form.post('/api/users');

    expect(postSpy.mock.calls[0][1] instanceof FormData).toBe(false);
  });

  it('spoofs _method for a transform that returns FormData directly (PUT)', async () => {
    const postSpy = vi
      .spyOn(api, 'post')
      .mockResolvedValue({ data: {}, response: {} as Response });

    const form = useForm({ name: 'Ada' });
    const fd = new FormData();
    fd.append('name', 'Ada');
    await form.put('/api/users/1', { transform: () => fd });

    // A raw multipart PUT wouldn't be parsed by PHP; must become POST + _method.
    expect(postSpy).toHaveBeenCalled();
    const body = postSpy.mock.calls[0][1] as FormData;
    expect(body.get('_method')).toBe('PUT');
  });
});
