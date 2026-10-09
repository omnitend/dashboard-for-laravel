/**
 * The docs site is static: there is no Laravel app behind it. `answerWith`
 * makes one endpoint answer the way a Laravel controller would (a 422 with
 * `{ message, errors }`, say), so a live example can show what really
 * happens after `form.post()` fails.
 *
 * It intercepts `fetch` for that method and path ONLY; every other request
 * goes to the real `fetch`. Call the returned `stop()` when the example
 * unmounts. Docs-only plumbing, not part of the library: in an app the
 * request reaches your server and nothing like this is needed.
 */
export function answerWith(
    method: string,
    path: string | RegExp,
    respond: () => { status: number; body: unknown },
    delayMs = 400,
): () => void {
    const realFetch = globalThis.fetch;
    let active = true;

    const matches = (input: RequestInfo | URL, init?: RequestInit): boolean => {
        const requestUrl =
            typeof input === "string" || input instanceof URL ? String(input) : input.url;
        const requestMethod = (
            init?.method ?? (input instanceof Request ? input.method : "GET")
        ).toUpperCase();
        const pathname = new URL(requestUrl, window.location.href).pathname;
        const pathMatches =
            typeof path === "string" ? pathname === path : path.test(pathname);
        return requestMethod === method.toUpperCase() && pathMatches;
    };

    const demoFetch: typeof fetch = async (input, init) => {
        if (!active || !matches(input, init)) return realFetch(input, init);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        const { status, body } = respond();
        return new Response(JSON.stringify(body), {
            status,
            headers: { "Content-Type": "application/json" },
        });
    };

    globalThis.fetch = demoFetch;

    return () => {
        active = false;
        // Only unwind if nothing has wrapped fetch since; otherwise the
        // inactive wrapper simply passes every request through.
        if (globalThis.fetch === demoFetch) globalThis.fetch = realFetch;
    };
}
