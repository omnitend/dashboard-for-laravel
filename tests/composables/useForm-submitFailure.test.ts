import { describe, it, expect, vi, afterEach } from 'vitest';
import { useForm } from '../../resources/js/composables/useForm';

/*
 * #194: `form.submitFailure` is what the LAST submit failed with, kept apart
 * from the live `errors` object (which field edits and `clearError` empty), and
 * `form.failedSubmitCount` ticks on every failed submit. Responses go through
 * the real API client with `fetch` stubbed to return a real `Response`.
 */

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Queue responses for successive `fetch` calls. */
function stubResponses(...responses: Array<() => Response | Promise<Response>>) {
  const queue = [...responses];
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
    const next = queue.shift();
    if (!next) throw new Error('unexpected fetch');
    return next();
  });
}

const invalid = (errors: Record<string, string[]>, message = 'The given data was invalid.') =>
  () => jsonResponse(422, { message, errors });

describe('useForm submitFailure', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('is null before any submit', () => {
    const form = useForm({ name: '' });
    expect(form.submitFailure).toBeNull();
    expect(form.failedSubmitCount).toBe(0);
  });

  it('holds a copy of the message and errors a 422 returned', async () => {
    stubResponses(invalid({ name: ['The name field is required.'], 'lines.0.price': ['Bad price.'] }));
    const form = useForm({ name: '' });

    await form.post('/api/things').catch(() => {});

    expect(form.submitFailure).toEqual({
      message: 'The given data was invalid.',
      errors: {
        name: ['The name field is required.'],
        'lines.0.price': ['Bad price.'],
      },
    });
    expect(form.failedSubmitCount).toBe(1);
  });

  it('survives clearError, clearErrors, setErrors and field edits', async () => {
    stubResponses(invalid({ name: ['Required.'], email: ['Bad email.'] }));
    const form = useForm({ name: '', email: '' });
    await form.post('/api/things').catch(() => {});

    form.clearError('name');
    form.field('email').value = 'a@b.c'; // the v-model path clears the error
    expect(form.hasErrors).toBe(false);
    form.clearErrors();
    form.setErrors({ other: ['x'] });

    expect(form.submitFailure?.errors).toEqual({
      name: ['Required.'],
      email: ['Bad email.'],
    });
    expect(form.submitFailure?.message).toBe('The given data was invalid.');
  });

  it('is cleared when the next submit STARTS, before the response', async () => {
    let respond: (response: Response) => void = () => {};
    stubResponses(
      invalid({ name: ['Required.'] }),
      () => new Promise<Response>((resolve) => { respond = resolve; }),
    );
    const form = useForm({ name: '' });
    await form.post('/api/things').catch(() => {});
    expect(form.submitFailure).not.toBeNull();

    const second = form.post('/api/things', { preserveErrors: true }).catch(() => {});
    // In flight: the previous failure is gone even though the errors are kept.
    expect(form.processing).toBe(true);
    expect(form.submitFailure).toBeNull();
    expect(form.hasErrors).toBe(true);

    respond(jsonResponse(200, { ok: true }));
    await second;
    expect(form.submitFailure).toBeNull();
    expect(form.failedSubmitCount).toBe(1);
  });

  it('is cleared by a successful submit', async () => {
    stubResponses(invalid({ name: ['Required.'] }), () => jsonResponse(200, {}));
    const form = useForm({ name: '' });
    await form.post('/api/things').catch(() => {});
    await form.post('/api/things');
    expect(form.submitFailure).toBeNull();
  });

  it('is cleared by a success that lands after an overlapping failure', async () => {
    let respondFirst: (response: Response) => void = () => {};
    let respondSecond: (response: Response) => void = () => {};
    stubResponses(
      () => new Promise<Response>((resolve) => { respondFirst = resolve; }),
      () => new Promise<Response>((resolve) => { respondSecond = resolve; }),
    );
    const form = useForm({ name: '' });
    const first = form.post('/api/things').catch(() => {});
    const second = form.post('/api/things');

    respondFirst(invalid({ name: ['Required.'] })());
    await first;
    // The older failure is not recorded while the newer submit is pending
    // (the newest submit's outcome wins; see useForm-overlap.test.ts).
    expect(form.submitFailure).toBeNull();

    respondSecond(jsonResponse(200, {}));
    await second;
    expect(form.submitFailure).toBeNull();
  });

  it('counts a preserveErrors resubmit that returns the same set', async () => {
    stubResponses(invalid({ name: ['Required.'] }), invalid({ name: ['Required.'] }));
    const form = useForm({ name: '' });
    await form.post('/api/things').catch(() => {});
    const errorsBefore = JSON.stringify(form.errors);

    await form.post('/api/things', { preserveErrors: true }).catch(() => {});

    expect(JSON.stringify(form.errors)).toBe(errorsBefore);
    expect(form.failedSubmitCount).toBe(2);
    expect(form.submitFailure?.errors).toEqual({ name: ['Required.'] });
  });

  it('records a message-only 422 (errors: {})', async () => {
    stubResponses(invalid({}, 'This order is already closed.'));
    const form = useForm({ name: '' });
    await form.post('/api/things').catch(() => {});
    expect(form.submitFailure).toEqual({ message: 'This order is already closed.', errors: {} });
  });

  it('is a copy: mutating the live errors object does not reach it', async () => {
    stubResponses(invalid({ name: ['Required.'] }));
    const form = useForm({ name: '' });
    await form.post('/api/things').catch(() => {});
    form.errors.name.push('Extra.');
    expect(form.submitFailure?.errors.name).toEqual(['Required.']);
  });

  it('records a non-validation failure with the client message', async () => {
    stubResponses(() => jsonResponse(500, { message: 'SQLSTATE[42S02] stack trace…' }));
    const form = useForm({ name: '' });
    await form.post('/api/things').catch(() => {});
    expect(form.submitFailure).toEqual({
      message: 'Server error. Please try again later.',
      errors: {},
    });
  });

  it('never carries a raw exception message (network failure)', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));
    const form = useForm({ name: '' });
    await form.post('/api/things').catch(() => {});
    expect(form.submitFailure).toEqual({ message: 'An error occurred', errors: {} });
    expect(form.failedSubmitCount).toBe(1);
  });

  it('is not set by an aborted submit', async () => {
    const controller = new AbortController();
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      (_input, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new DOMException('The user aborted a request.', 'AbortError')),
          );
        }),
    );
    const form = useForm({ name: '' });
    const pending = form.post('/api/things', { signal: controller.signal }).catch(() => {});
    controller.abort();
    await pending;
    expect(form.submitFailure).toBeNull();
    expect(form.failedSubmitCount).toBe(0);
  });

  it('keeps shouldShowMessage meaning what it did', async () => {
    stubResponses(invalid({ name: ['Required.'] }));
    const form = useForm({ name: '' });
    await form.post('/api/things').catch(() => {});
    expect(form.shouldShowMessage).toBe(false);
    form.clearError('name');
    expect(form.shouldShowMessage).toBe(true);
  });
});
