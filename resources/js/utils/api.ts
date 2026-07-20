export interface ApiError {
    message: string;
    errors: Record<string, string[]>;
    status: number;
}

export interface ApiResponse<T = unknown> {
    data: T;
    response: Response;
}

interface RequestOptions extends Omit<RequestInit, "body"> {
    headers?: Record<string, string>;
    body?: BodyInit | null; // allow FormData/Blob/etc.
}

class ApiClient {
    private baseURL = "";
    private defaultHeaders: Record<string, string> = {
        Accept: "application/json",
        "Content-Type": "application/json", // removed automatically for FormData
        "X-Requested-With": "XMLHttpRequest",
    };

    setBaseURL(url: string) {
        this.baseURL = url.replace(/\/+$/, "");
    }
    setDefaultHeader(key: string, value: string) {
        this.defaultHeaders[key] = value;
    }

    private getCsrfToken(): string {
        if (typeof document === 'undefined') {
            return "";
        }
        const el = document.querySelector('meta[name="csrf-token"]');
        return el?.getAttribute("content") ?? "";
    }

    private toQuery(params: Record<string, unknown> = {}): string {
        const search = new URLSearchParams();
        const append = (k: string, v: unknown) => {
            if (v === undefined || v === null) return;
            if (Array.isArray(v)) v.forEach((x) => append(`${k}[]`, x));
            else if (typeof v === "object") {
                for (const [ck, cv] of Object.entries(
                    v as Record<string, unknown>,
                )) {
                    append(`${k}[${ck}]`, cv);
                }
            } else {
                search.append(k, String(v));
            }
        };
        for (const [k, v] of Object.entries(params)) append(k, v);
        return search.toString();
    }

    private handleError(response: Response, data: any): never {
        const error: ApiError = {
            message: data?.message ?? "An error occurred",
            errors: (data?.errors as Record<string, string[]>) ?? {},
            status: response.status,
        };
        switch (response.status) {
            case 422:
                error.message = data?.message ?? "Validation failed";
                break;
            case 401:
                error.message = "Unauthenticated. Please log in.";
                break;
            case 403:
                error.message = "Forbidden. You do not have permission.";
                break;
            case 404:
                error.message = "Resource not found.";
                break;
            case 419:
                error.message = "Page expired. Please refresh and try again.";
                break;
            case 500:
                error.message = "Server error. Please try again later.";
                break;
        }
        throw error;
    }

    async request<T = unknown>(
        url: string,
        options: RequestOptions = {},
    ): Promise<ApiResponse<T>> {
        const isFormData =
            typeof FormData !== "undefined" && options.body instanceof FormData;
        // GET/HEAD carry no body (nothing for Content-Type to describe) and
        // change no state (no CSRF exposure). Both headers are also non-simple
        // for CORS, so sending them would force a preflight on cross-origin
        // apiUrl/showUrl endpoints that axios's plain GETs never needed (#132).
        const method = (options.method ?? "GET").toUpperCase();
        const isBodyless = method === "GET" || method === "HEAD";

        const headers: Record<string, string> = {
            ...this.defaultHeaders,
            ...(isFormData
                ? {}
                : { "Content-Type": this.defaultHeaders["Content-Type"] }),
            ...(isBodyless ? {} : { "X-CSRF-TOKEN": this.getCsrfToken() }),
            ...options.headers,
        };

        // Let fetch set the multipart boundary if FormData
        if (isFormData || isBodyless) delete headers["Content-Type"];

        const config: RequestOptions = {
            credentials: "same-origin",
            ...options,
            headers,
        };

        const resp = await fetch(this.baseURL + url, config);

        // Fast-path for 204/205
        if (resp.status === 204 || resp.status === 205) {
            if (!resp.ok) {
                this.handleError(resp, null);
            }

            return { data: undefined as unknown as T, response: resp };
        }

        const ctype = resp.headers.get("Content-Type") || "";
        const isJson = /\bjson\b/i.test(ctype);
        const parsed = isJson
            ? await resp.json().catch(() => ({}))
            : await resp.text();

        if (!resp.ok) {
            this.handleError(resp, parsed);
        }

        return { data: parsed as T, response: resp };
    }

    async get<T = unknown>(
        url: string,
        params: Record<string, unknown> = {},
        options: Omit<RequestOptions, "method"> = {},
    ) {
        // Merge into an existing query string (`/things?scope=x` + params) with
        // `&` — a blind `?` append corrupts the URL and silently drops params.
        const qs = this.toQuery(params);
        const full = qs ? `${url}${url.includes("?") ? "&" : "?"}${qs}` : url;
        return this.request<T>(full, { ...options, method: "GET" });
    }

    async post<T = unknown>(
        url: string,
        data: any = {},
        options: Omit<RequestOptions, "method" | "body"> = {},
    ) {
        const body = data instanceof FormData ? data : JSON.stringify(data);
        return this.request<T>(url, { ...options, method: "POST", body });
    }

    async put<T = unknown>(
        url: string,
        data: any = {},
        options: Omit<RequestOptions, "method" | "body"> = {},
    ) {
        const body = data instanceof FormData ? data : JSON.stringify(data);
        return this.request<T>(url, { ...options, method: "PUT", body });
    }

    async patch<T = unknown>(
        url: string,
        data: any = {},
        options: Omit<RequestOptions, "method" | "body"> = {},
    ) {
        const body = data instanceof FormData ? data : JSON.stringify(data);
        return this.request<T>(url, { ...options, method: "PATCH", body });
    }

    async delete<T = unknown>(
        url: string,
        data: any = undefined,
        options: Omit<RequestOptions, "method" | "body"> = {},
    ) {
        // Consistent (url, data, options) signature with post/put/patch so the
        // third argument is always the request options (e.g. `{ signal }`) — it
        // used to be the second, so `useForm.submit`'s uniform call spread the
        // form payload into the fetch config and dropped the abort signal.
        // DELETE bodies are legal but unusual: only send one when data is given
        // (a record is deleted by its URL — `useForm.delete()` sends none).
        const body =
            data === undefined || data === null
                ? undefined
                : data instanceof FormData
                  ? data
                  : JSON.stringify(data);
        return this.request<T>(url, {
            ...options,
            method: "DELETE",
            ...(body !== undefined ? { body } : {}),
        });
    }
}

export const api = new ApiClient();
