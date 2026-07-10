import { describe, it, expect, vi, afterEach } from 'vitest';
import { api } from '../../resources/js/utils/api';

// A minimal fetch stub that records the config it was called with.
function stubFetch() {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(null, { status: 204 }),
  );
}

describe('api.delete (#87)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('forwards the abort signal to fetch (deletes are abortable)', async () => {
    const fetchSpy = stubFetch();
    const controller = new AbortController();

    await api.delete('/api/things/5', undefined, { signal: controller.signal });

    const config = fetchSpy.mock.calls[0][1] as RequestInit;
    expect(config.method).toBe('DELETE');
    expect(config.signal).toBe(controller.signal);
  });

  it('sends no request body when no data is given', async () => {
    const fetchSpy = stubFetch();

    await api.delete('/api/things/5');

    const config = fetchSpy.mock.calls[0][1] as RequestInit;
    expect(config.body).toBeUndefined();
  });

  it('encodes data as a JSON body only when explicitly provided', async () => {
    const fetchSpy = stubFetch();

    await api.delete('/api/things/5', { reason: 'cleanup' });

    const config = fetchSpy.mock.calls[0][1] as RequestInit;
    expect(config.body).toBe(JSON.stringify({ reason: 'cleanup' }));
  });

  it('keeps the CSRF header intact (options are not confused with the payload)', async () => {
    const fetchSpy = stubFetch();

    await api.delete('/api/things/5', undefined, { signal: new AbortController().signal });

    const config = fetchSpy.mock.calls[0][1] as RequestInit;
    const headers = config.headers as Record<string, string>;
    expect('X-CSRF-TOKEN' in headers).toBe(true);
  });
});
