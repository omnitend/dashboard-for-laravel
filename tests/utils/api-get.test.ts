import { describe, it, expect, vi, afterEach } from 'vitest';
import { api } from '../../resources/js/utils/api';

// A minimal fetch stub that records the URL + config it was called with.
function stubFetch() {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify({ data: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
}

/*
 * #132 follow-ups (Codex review). These assert at the fetch level because the
 * DXTable suite mocks `api.get`, which masks URL construction entirely — the
 * suite itself passes `apiUrl: '/api/things?filter[archived]=1'` and would
 * never notice a corrupted query string.
 */
describe('api.get URL construction (#132)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('merges params into a URL that already has a query string with &, not a second ?', async () => {
    // Would this pass if the bug were present? No — the old code appended
    // `?page=2...`, so the URL contained two `?` and the server lost `page`.
    const fetchSpy = stubFetch();

    await api.get('/api/things?filter[archived]=1', { page: 2, perPage: 10 });

    const url = fetchSpy.mock.calls[0][0] as string;
    expect(url).toBe('/api/things?filter[archived]=1&page=2&perPage=10');
  });

  it('appends with ? when the URL has no query string', async () => {
    const fetchSpy = stubFetch();

    await api.get('/api/things', { page: 2 });

    expect(fetchSpy.mock.calls[0][0]).toBe('/api/things?page=2');
  });

  it('leaves the URL untouched when there are no params', async () => {
    const fetchSpy = stubFetch();

    await api.get('/api/things?scope=live');

    expect(fetchSpy.mock.calls[0][0]).toBe('/api/things?scope=live');
  });

  it('serialises nested objects and arrays in Laravel bracket notation', async () => {
    const fetchSpy = stubFetch();

    await api.get('/api/things', {
      filters: { status: 'active' },
      filterValues: ['status', 'kind'],
    });

    const url = decodeURIComponent(fetchSpy.mock.calls[0][0] as string);
    expect(url).toBe(
      '/api/things?filters[status]=active&filterValues[]=status&filterValues[]=kind',
    );
  });
});

describe('api GET headers (#132)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sends neither Content-Type nor X-CSRF-TOKEN on a bodyless GET', async () => {
    // A GET has no body (no Content-Type to declare) and changes no state (no
    // CSRF exposure) — and both are non-simple CORS headers, so sending them
    // forces a preflight on cross-origin api-url/show-url endpoints that
    // axios's plain GETs never needed.
    const fetchSpy = stubFetch();

    await api.get('/api/things');

    const headers = (fetchSpy.mock.calls[0][1] as RequestInit)
      .headers as Record<string, string>;
    expect('Content-Type' in headers).toBe(false);
    expect('X-CSRF-TOKEN' in headers).toBe(false);
    // The Laravel-convention headers stay.
    expect(headers['Accept']).toBe('application/json');
    expect(headers['X-Requested-With']).toBe('XMLHttpRequest');
  });

  it('still sends Content-Type and X-CSRF-TOKEN on POST', async () => {
    const fetchSpy = stubFetch();

    await api.post('/api/things', { name: 'x' });

    const headers = (fetchSpy.mock.calls[0][1] as RequestInit)
      .headers as Record<string, string>;
    expect(headers['Content-Type']).toBe('application/json');
    expect('X-CSRF-TOKEN' in headers).toBe(true);
  });
});
