import { describe, it, expect, vi, afterEach } from 'vitest';
import { render } from 'vitest-browser-vue';
import DXForm from '../../resources/js/components/extended/DXForm.vue';
import { useForm } from '../../resources/js/composables/useForm';
import type { FieldDefinition } from '../../resources/js/types';

/*
 * #194 review: overlapping submits. The outcome of the NEWEST submit that has
 * not been aborted is what the form records; an older submit settling later
 * (either way round) must not clear or overwrite it. Callbacks and the
 * returned promise of every submit still behave as before; only the form's
 * recorded outcome is gated. Real responses through the real API client.
 */

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
const settle = async () => {
  for (let i = 0; i < 6; i += 1) await flush();
};

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const GENERIC = 'The given data was invalid.';
const invalid = (errors: Record<string, string[]>, message = GENERIC) =>
  jsonResponse(422, { message, errors });

/** Every fetch waits until the test resolves it; returns the resolvers in call order. */
function deferredFetches() {
  const resolvers: Array<(response: Response) => void> = [];
  const rejecters: Array<(error: unknown) => void> = [];
  vi.spyOn(globalThis, 'fetch').mockImplementation(
    (_input, init) =>
      new Promise<Response>((resolve, reject) => {
        resolvers.push(resolve);
        rejecters.push(reject);
        init?.signal?.addEventListener('abort', () =>
          reject(new DOMException('The user aborted a request.', 'AbortError')),
        );
      }),
  );
  return { resolvers, rejecters };
}

const B_ERRORS = { delivery_date: ['The delivery date must be a weekday.'] };

const fields: FieldDefinition[] = [{ key: 'name', type: 'text', label: 'Name' }];

const visibleAlerts = (root: Element): HTMLElement[] =>
  Array.from(root.querySelectorAll<HTMLElement>('.alert')).filter(
    (alert) => alert.offsetParent !== null && alert.getBoundingClientRect().height > 0,
  );

describe('useForm overlapping submits', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('an older success landing AFTER a newer 422 does not clear it (one alert with B\'s messages)', async () => {
    const { resolvers } = deferredFetches();
    const form = useForm({ name: '' });
    const screen = render(DXForm, { props: { form, fields } });
    await settle();

    const submitA = form.post('/api/a');
    const submitB = form.post('/api/b').catch(() => {});
    await settle();
    expect(resolvers.length).toBe(2);

    resolvers[1](invalid(B_ERRORS));
    await submitB;
    await settle();
    expect(form.submitFailure?.errors).toEqual(B_ERRORS);

    resolvers[0](jsonResponse(200, { ok: true }));
    await expect(submitA).resolves.toEqual({ ok: true });
    await settle();

    expect(form.submitFailure).toEqual({ message: GENERIC, errors: B_ERRORS });
    expect(form.wasSuccessful).toBe(false);
    expect(form.recentlySuccessful).toBe(false);
    expect(form.processing).toBe(false);
    const alerts = visibleAlerts(screen.container);
    expect(alerts.length).toBe(1);
    expect(alerts[0].textContent).toContain('The delivery date must be a weekday.');
  });

  it('an older success landing BEFORE a newer 422 is not recorded; B\'s failure then shows', async () => {
    const { resolvers } = deferredFetches();
    const form = useForm({ name: '' });
    const screen = render(DXForm, { props: { form, fields } });
    await settle();

    const submitA = form.post('/api/a');
    const submitB = form.post('/api/b').catch(() => {});
    await settle();

    resolvers[0](jsonResponse(200, { ok: true }));
    await submitA;
    await settle();
    // B is still in flight: nothing has a final outcome yet.
    expect(form.wasSuccessful).toBe(false);
    expect(form.recentlySuccessful).toBe(false);
    expect(form.processing).toBe(true);

    resolvers[1](invalid(B_ERRORS));
    await submitB;
    await settle();

    expect(form.submitFailure).toEqual({ message: GENERIC, errors: B_ERRORS });
    expect(form.processing).toBe(false);
    const alerts = visibleAlerts(screen.container);
    expect(alerts.length).toBe(1);
    expect(alerts[0].textContent).toContain('The delivery date must be a weekday.');
  });

  it('an older 422 landing after a newer success records nothing', async () => {
    const { resolvers } = deferredFetches();
    const form = useForm({ name: '' });
    const screen = render(DXForm, { props: { form, fields } });
    await settle();

    const onErrorA = vi.fn();
    const submitA = form.post('/api/a', { onError: onErrorA });
    const submitB = form.post('/api/b');
    await settle();

    resolvers[1](jsonResponse(200, { ok: true }));
    await submitB;
    expect(form.wasSuccessful).toBe(true);

    resolvers[0](invalid({ name: ['Required.'] }));
    await expect(submitA).rejects.toBeTruthy();
    await settle();

    // A's own callback and rejection still happen ...
    expect(onErrorA).toHaveBeenCalledTimes(1);
    // ... but the form keeps the newer outcome.
    expect(form.submitFailure).toBeNull();
    expect(form.failedSubmitCount).toBe(0);
    expect(form.hasErrors).toBe(false);
    expect(form.message).toBe('');
    expect(form.wasSuccessful).toBe(true);
    expect(visibleAlerts(screen.container).length).toBe(0);
  });

  it('an older 422 landing while a newer submit is in flight records nothing; the newer one decides', async () => {
    const { resolvers } = deferredFetches();
    const form = useForm({ name: '' });
    const submitA = form.post('/api/a').catch(() => {});
    const submitB = form.post('/api/b').catch(() => {});
    await settle();

    resolvers[0](invalid({ name: ['Required.'] }));
    await submitA;
    expect(form.submitFailure).toBeNull();
    expect(form.hasErrors).toBe(false);
    expect(form.failedSubmitCount).toBe(0);

    resolvers[1](invalid(B_ERRORS));
    await submitB;
    expect(form.submitFailure?.errors).toEqual(B_ERRORS);
    expect(form.errors).toEqual(B_ERRORS);
    expect(form.failedSubmitCount).toBe(1);
  });

  it('when the newer submit is aborted, the older one\'s outcome is recorded', async () => {
    const { resolvers } = deferredFetches();
    const form = useForm({ name: '' });
    const controller = new AbortController();
    const submitA = form.post('/api/a').catch(() => {});
    const submitB = form.post('/api/b', { signal: controller.signal }).catch(() => {});
    await settle();

    controller.abort();
    await submitB;
    expect(form.processing).toBe(true); // A still in flight

    resolvers[0](invalid(B_ERRORS));
    await submitA;
    expect(form.submitFailure?.errors).toEqual(B_ERRORS);
    expect(form.failedSubmitCount).toBe(1);
    expect(form.processing).toBe(false);
  });

  it('an aborted OLDER submit records nothing over the newer outcome', async () => {
    const { resolvers } = deferredFetches();
    const form = useForm({ name: '' });
    const controller = new AbortController();
    const submitA = form.post('/api/a', { signal: controller.signal }).catch(() => {});
    const submitB = form.post('/api/b').catch(() => {});
    await settle();

    resolvers[1](invalid(B_ERRORS));
    await submitB;
    controller.abort();
    await submitA;

    expect(form.submitFailure?.errors).toEqual(B_ERRORS);
    expect(form.errors).toEqual(B_ERRORS);
    expect(form.message).toBe(GENERIC);
    expect(form.processing).toBe(false);
  });

  it('a throwing onSuccess on the newest submit is recorded as its failure', async () => {
    const { resolvers } = deferredFetches();
    const form = useForm({ name: '' });
    const submit = form.post('/api/a', {
      onSuccess: () => {
        throw new Error('consumer bug');
      },
    });
    await settle();
    resolvers[0](jsonResponse(200, {}));
    await expect(submit).rejects.toThrow('consumer bug');
    expect(form.submitFailure).toEqual({ message: 'An error occurred', errors: {} });
    expect(form.wasSuccessful).toBe(false);
  });

  it('a throwing onSuccess on an OLDER submit does not overwrite the newer failure', async () => {
    const { resolvers } = deferredFetches();
    const form = useForm({ name: '' });
    const submitA = form.post('/api/a', {
      onSuccess: () => {
        throw new Error('consumer bug');
      },
    });
    const submitB = form.post('/api/b').catch(() => {});
    await settle();

    resolvers[1](invalid(B_ERRORS));
    await submitB;
    resolvers[0](jsonResponse(200, {}));
    await expect(submitA).rejects.toThrow('consumer bug');

    expect(form.submitFailure).toEqual({ message: GENERIC, errors: B_ERRORS });
    expect(form.failedSubmitCount).toBe(1);
  });

  it('resetOnSuccess on an older success does not wipe the newer failure or the data', async () => {
    const { resolvers } = deferredFetches();
    const form = useForm({ name: '' });
    form.data.name = 'typed';
    const submitA = form.post('/api/a', { resetOnSuccess: true });
    const submitB = form.post('/api/b').catch(() => {});
    await settle();

    resolvers[1](invalid({ name: ['Required.'] }));
    await submitB;
    resolvers[0](jsonResponse(200, {}));
    await submitA;

    expect(form.data.name).toBe('typed');
    expect(form.errors).toEqual({ name: ['Required.'] });
    expect(form.submitFailure?.errors).toEqual({ name: ['Required.'] });
  });

  it('resetOnSuccess on the newest success still resets (and leaves processing true while an older one runs)', async () => {
    const { resolvers } = deferredFetches();
    const form = useForm({ name: '' });
    form.data.name = 'typed';
    const submitA = form.post('/api/a').catch(() => {});
    const submitB = form.post('/api/b', { resetOnSuccess: true });
    await settle();

    resolvers[1](jsonResponse(200, {}));
    await submitB;
    expect(form.data.name).toBe('');
    expect(form.processing).toBe(true); // A is still in flight

    resolvers[0](jsonResponse(200, {}));
    await submitA;
    expect(form.processing).toBe(false);
  });
});
