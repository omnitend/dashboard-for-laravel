import { describe, it, expect, vi, afterEach } from 'vitest';
import { render } from 'vitest-browser-vue';
import { userEvent } from 'vitest/browser';
import DXForm from '../../resources/js/components/extended/DXForm.vue';
import { useForm } from '../../resources/js/composables/useForm';
import { api } from '../../resources/js/utils/api';
import type { FieldDefinition, FormTab } from '../../resources/js/types';

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
// Two macrotasks: DXForm marks the form saved one macrotask after `processing`
// clears, so code that runs after `await form.post()` counts as the save.
const settle = async () => { await flush(); await flush(); };

const fields: FieldDefinition[] = [
  { key: 'name', type: 'text', label: 'Name' },
  { key: 'sku', type: 'text', label: 'SKU' },
];
const tabs: FormTab[] = [{ key: 'general', label: 'General', fieldKeys: ['name', 'sku'] }];

const makeForm = () => useForm({ name: 'Widget', sku: 'W-1' });

const submitButton = (root: Element): HTMLButtonElement => {
  const button = root.querySelector<HTMLButtonElement>('button[type="submit"]');
  if (button === null) throw new Error('DXForm rendered no submit button');
  return button;
};

const mockPostOk = () =>
  vi.spyOn(api, 'post').mockResolvedValue({ data: {}, response: {} as Response });

describe('DXForm saved state', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows the normal enabled submit button before any save', async () => {
    const screen = render(DXForm, { props: { form: makeForm(), fields, submitText: 'Save' } });
    await settle();
    const button = submitButton(screen.container);
    expect(button.textContent?.trim()).toBe('Save');
    expect(button.disabled).toBe(false);
  });

  it('turns the submit button into a disabled "Saved" after a successful save', async () => {
    mockPostOk();
    const form = makeForm();
    const screen = render(DXForm, {
      props: { form, fields, submitText: 'Save', onSubmit: () => form.post('/api/things') },
    });
    await settle();
    submitButton(screen.container).click();
    await settle();
    const button = submitButton(screen.container);
    expect(button.textContent?.trim()).toBe('Saved');
    expect(button.querySelector('.bi-check-lg')).not.toBeNull();
    expect(button.classList.contains('btn-success')).toBe(true);
    expect(button.disabled).toBe(true);
  });

  it('editing any field after a save turns it back into the enabled Save button', async () => {
    mockPostOk();
    const form = makeForm();
    const screen = render(DXForm, {
      props: { form, fields, submitText: 'Save', onSubmit: () => form.post('/api/things') },
    });
    await settle();
    submitButton(screen.container).click();
    await settle();
    expect(submitButton(screen.container).textContent?.trim()).toBe('Saved');

    const skuInput = screen.container.querySelectorAll('input')[1] as HTMLInputElement;
    await userEvent.type(skuInput, 'x');
    await settle();
    const button = submitButton(screen.container);
    expect(button.textContent?.trim()).toBe('Save');
    expect(button.disabled).toBe(false);
    expect(button.classList.contains('btn-success')).toBe(false);
  });

  it('a programmatic data change (not via an input) also clears saved', async () => {
    mockPostOk();
    const form = makeForm();
    const screen = render(DXForm, { props: { form, fields, submitText: 'Save' } });
    await settle();
    await form.post('/api/things');
    await settle();
    expect(submitButton(screen.container).textContent?.trim()).toBe('Saved');
    form.data.name = 'Gadget';
    await settle();
    expect(submitButton(screen.container).textContent?.trim()).toBe('Save');
  });

  it('data written by the save itself (onSuccess / after await) does not clear saved', async () => {
    vi.spyOn(api, 'post').mockResolvedValue({ data: { sku: 'W-2' }, response: {} as Response });
    const form = makeForm();
    const screen = render(DXForm, { props: { form, fields, submitText: 'Save' } });
    await settle();
    const response = await form.post<{ sku: string }>('/api/things', {
      onSuccess: (data) => { form.data.sku = data.sku; },
    });
    form.data.name = `${form.data.name} (saved)`; // consumer code after await
    void response;
    await settle();
    expect(submitButton(screen.container).textContent?.trim()).toBe('Saved');
  });

  it('an edit made while the save is in flight is not reported as saved', async () => {
    let resolvePost: (value: { data: unknown; response: Response }) => void = () => {};
    vi.spyOn(api, 'post').mockImplementation(
      () => new Promise((resolve) => { resolvePost = resolve; }),
    );
    const form = makeForm();
    const screen = render(DXForm, { props: { form, fields, submitText: 'Save' } });
    await settle();
    const saving = form.post('/api/things');
    await settle();
    // The user keeps typing while the request is out: this edit is NOT in
    // the payload, so the button must not claim it was saved.
    form.data.name = 'Widget, edited mid-save';
    await settle();
    resolvePost({ data: {}, response: {} as Response });
    await saving;
    await settle();
    const button = submitButton(screen.container);
    expect(button.textContent?.trim()).toBe('Save');
    expect(button.disabled).toBe(false);
  });

  it('edits before a submit do not stop that submit showing Saved (edit, save, edit, save)', async () => {
    mockPostOk();
    const form = makeForm();
    const screen = render(DXForm, { props: { form, fields, submitText: 'Save' } });
    await settle();
    form.data.name = 'First edit';
    await form.post('/api/things');
    await settle();
    expect(submitButton(screen.container).textContent?.trim()).toBe('Saved');
    form.data.name = 'Second edit';
    await settle();
    expect(submitButton(screen.container).textContent?.trim()).toBe('Save');
    await form.post('/api/things');
    await settle();
    expect(submitButton(screen.container).textContent?.trim()).toBe('Saved');
  });

  it('turning savedState off while saved restores the plain submit button', async () => {
    mockPostOk();
    const form = makeForm();
    const screen = render(DXForm, { props: { form, fields, submitText: 'Save' } });
    await settle();
    await form.post('/api/things');
    await settle();
    expect(submitButton(screen.container).textContent?.trim()).toBe('Saved');
    await screen.rerender({ savedState: false });
    await settle();
    expect(submitButton(screen.container).textContent?.trim()).toBe('Save');
  });

  it('a failed save leaves the normal enabled Save button', async () => {
    vi.spyOn(api, 'post').mockRejectedValue({ message: 'Nope', errors: {}, status: 500 });
    const form = makeForm();
    const screen = render(DXForm, { props: { form, fields, submitText: 'Save' } });
    await settle();
    await form.post('/api/things').catch(() => {});
    await settle();
    const button = submitButton(screen.container);
    expect(button.textContent?.trim()).toBe('Save');
    expect(button.disabled).toBe(false);
  });

  it('a failed re-save after a successful save drops the Saved state', async () => {
    vi.spyOn(api, 'post')
      .mockResolvedValueOnce({ data: {}, response: {} as Response })
      .mockRejectedValueOnce({ message: 'Nope', errors: {}, status: 500 });
    const form = makeForm();
    const screen = render(DXForm, { props: { form, fields, submitText: 'Save' } });
    await settle();
    await form.post('/api/things');
    await settle();
    expect(submitButton(screen.container).textContent?.trim()).toBe('Saved');
    await form.post('/api/things').catch(() => {});
    await settle();
    expect(submitButton(screen.container).textContent?.trim()).toBe('Save');
  });

  it('uses submitSavedText for the saved label', async () => {
    mockPostOk();
    const form = makeForm();
    const screen = render(DXForm, {
      props: { form, fields, submitText: 'Save', submitSavedText: 'Changes saved' },
    });
    await settle();
    await form.post('/api/things');
    await settle();
    expect(submitButton(screen.container).textContent?.trim()).toBe('Changes saved');
  });

  it('savedState: false keeps the plain submit button after a save', async () => {
    mockPostOk();
    const form = makeForm();
    const screen = render(DXForm, {
      props: { form, fields, submitText: 'Search', savedState: false },
    });
    await settle();
    await form.post('/api/things');
    await settle();
    const button = submitButton(screen.container);
    expect(button.textContent?.trim()).toBe('Search');
    expect(button.disabled).toBe(false);
  });

  it('applies to the tabbed layout too', async () => {
    mockPostOk();
    const form = makeForm();
    const screen = render(DXForm, { props: { form, fields, tabs, submitText: 'Save' } });
    await settle();
    await form.post('/api/things');
    await settle();
    const button = submitButton(screen.container);
    expect(button.textContent?.trim()).toBe('Saved');
    expect(button.disabled).toBe(true);
  });

  it('swapping in a different form instance clears saved', async () => {
    mockPostOk();
    const form = makeForm();
    const screen = render(DXForm, { props: { form, fields, submitText: 'Save' } });
    await settle();
    await form.post('/api/things');
    await settle();
    expect(submitButton(screen.container).textContent?.trim()).toBe('Saved');
    await screen.rerender({ form: makeForm() });
    await settle();
    expect(submitButton(screen.container).textContent?.trim()).toBe('Save');
  });
});
