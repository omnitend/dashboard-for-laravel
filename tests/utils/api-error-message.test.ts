import { describe, it, expect, vi, afterEach } from 'vitest';
import { api, type ApiError } from '../../resources/js/utils/api';
import { useForm } from '../../resources/js/composables/useForm';

/*
 * The message a rejected request carries. A 403 is how a Laravel app says
 * WHY an action is refused (`abort(403, 'reason')`, a policy's
 * `Response::deny('reason')`), so the client keeps the server's message and
 * falls back to its own sentence only when the server sent none.
 *
 * `fetch` is stubbed with real `Response`s, so these go through the client's
 * body parsing and error handling exactly as a consumer's request does.
 */

const FORBIDDEN_FALLBACK = 'Forbidden. You do not have permission.';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function stubFetchOnce(response: Response) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(response);
}

async function rejectionOf(request: Promise<unknown>): Promise<ApiError> {
  try {
    await request;
  } catch (error) {
    return error as ApiError;
  }
  throw new Error('the request was expected to reject');
}

describe('api: the message of a rejected request', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('403', () => {
    it("keeps the server's message", async () => {
      stubFetchOnce(jsonResponse(403, { message: 'Only a manager can refund a paid order.' }));

      const error = await rejectionOf(api.post('/api/orders/5/refund', {}));

      expect(error.status).toBe(403);
      expect(error.message).toBe('Only a manager can refund a paid order.');
    });

    it("keeps Laravel's default deny message (it is the server's message)", async () => {
      stubFetchOnce(jsonResponse(403, { message: 'This action is unauthorized.' }));

      const error = await rejectionOf(api.delete('/api/orders/5'));

      expect(error.message).toBe('This action is unauthorized.');
    });

    it.each([
      ['no message key', {}],
      ['a null message', { message: null }],
      ['an empty message', { message: '' }],
      ['a whitespace-only message', { message: '  \n\t ' }],
      ['a non-string message', { message: 42 }],
    ])('falls back to the fixed sentence for %s', async (_label, body) => {
      stubFetchOnce(jsonResponse(403, body));

      const error = await rejectionOf(api.put('/api/orders/5', {}));

      expect(error.status).toBe(403);
      expect(error.message).toBe(FORBIDDEN_FALLBACK);
    });

    it('falls back to the fixed sentence for a non-JSON body', async () => {
      stubFetchOnce(
        new Response('<html>Forbidden</html>', {
          status: 403,
          headers: { 'Content-Type': 'text/html' },
        }),
      );

      const error = await rejectionOf(api.get('/api/orders/5'));

      expect(error.message).toBe(FORBIDDEN_FALLBACK);
    });
  });

  describe('422 (unchanged)', () => {
    it("keeps the server's message and errors", async () => {
      stubFetchOnce(
        jsonResponse(422, {
          message: 'The name field is required.',
          errors: { name: ['The name field is required.'] },
        }),
      );

      const error = await rejectionOf(api.post('/api/orders', {}));

      expect(error.status).toBe(422);
      expect(error.message).toBe('The name field is required.');
      expect(error.errors).toEqual({ name: ['The name field is required.'] });
    });

    it('falls back to "Validation failed" with no message', async () => {
      stubFetchOnce(jsonResponse(422, { errors: {} }));

      const error = await rejectionOf(api.post('/api/orders', {}));

      expect(error.message).toBe('Validation failed');
    });
  });

  describe('the other fixed sentences (unchanged)', () => {
    it.each([
      [401, 'Unauthenticated.', 'Unauthenticated. Please log in.'],
      [404, 'No query results for model [App\\Models\\Order] 5', 'Resource not found.'],
      [419, 'CSRF token mismatch.', 'Page expired. Please refresh and try again.'],
      [500, 'SQLSTATE[42S22]: Column not found', 'Server error. Please try again later.'],
    ])('%i replaces the server message', async (status, serverMessage, expected) => {
      stubFetchOnce(jsonResponse(status, { message: serverMessage }));

      const error = await rejectionOf(api.get('/api/orders/5'));

      expect(error.message).toBe(expected);
    });
  });
});

describe("useForm: a 403's message reaches the submit failure", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows the server's reason", async () => {
    stubFetchOnce(jsonResponse(403, { message: 'This order has been sent to the kitchen.' }));
    const form = useForm({ note: 'extra chilli' });

    await form.put('/api/orders/5').catch(() => {});

    expect(form.submitFailure?.message).toBe('This order has been sent to the kitchen.');
    expect(form.submitFailure?.errors).toEqual({});
  });

  it('shows the fixed sentence when the 403 has no message', async () => {
    stubFetchOnce(jsonResponse(403, {}));
    const form = useForm({ note: 'extra chilli' });

    await form.put('/api/orders/5').catch(() => {});

    expect(form.submitFailure?.message).toBe(FORBIDDEN_FALLBACK);
  });
});
