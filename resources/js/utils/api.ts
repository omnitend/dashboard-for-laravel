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
        const qs = search.toString();
        return qs ? `?${qs}` : "";
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

        const headers: Record<string, string> = {
            ...this.defaultHeaders,
            ...(isFormData
                ? {}
                : { "Content-Type": this.defaultHeaders["Content-Type"] }),
            "X-CSRF-TOKEN": this.getCsrfToken(),
            ...options.headers,
        };

        // Let fetch set the multipart boundary if FormData
        if (isFormData) delete headers["Content-Type"];

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
        const full = `${url}${this.toQuery(params)}`;
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
        options: Omit<RequestOptions, "method"> = {},
    ) {
        return this.request<T>(url, { ...options, method: "DELETE" });
    }
}

export const api = new ApiClient();
