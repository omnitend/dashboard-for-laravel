import {
    reactive,
    computed,
    toRaw,
    type ComputedRef,
    type WritableComputedRef,
} from "vue";
import { api, type ApiError } from "../utils/api";

export interface ValidationErrors {
    [key: string]: string[];
}

export type FormError = ApiError;

export interface FormSubmitOptions<TPayload = unknown, TResponse = unknown> {
    onSuccess?: (data: TResponse) => void;
    onError?: (error: FormError) => void;
    onBefore?: (payload: TPayload) => void;
    onFinish?: () => void;
    transform?: (payload: TPayload) => unknown;
    preserveErrors?: boolean;
    resetOnSuccess?: boolean;
    signal?: AbortSignal;
}

export interface FormState<TData extends Record<string, any>> {
    data: TData; // viewed as TData at the API boundary
    errors: ValidationErrors;
    processing: boolean;
    message: string;
    touched: Record<string, boolean>;
    recentlySuccessful: boolean;
    shouldShowMessage: boolean;
}

export interface UseFormReturn<TData extends Record<string, any>>
    extends FormState<TData> {
    hasErrors: ComputedRef<boolean>;
    hasError: (field: keyof TData | string) => boolean;
    getError: (field: keyof TData | string) => string;
    getState: (field: keyof TData | string) => true | false | null;
    setErrors: (errors?: ValidationErrors) => void;
    setMessage: (message: string) => void;
    clearErrors: () => void;
    clearError: (field: keyof TData | string) => void;
    reset: (only?: Array<keyof TData>) => void;
    field: <K extends keyof TData>(key: K) => WritableComputedRef<TData[K]>;
    fields: { [K in keyof TData]: WritableComputedRef<TData[K]> };
    submit: <TResponse = unknown>(
        method: "get" | "post" | "put" | "patch" | "delete",
        url: string,
        options?: FormSubmitOptions<TData, TResponse>,
    ) => Promise<TResponse>;
    post: <TResponse = unknown>(
        url: string,
        options?: FormSubmitOptions<TData, TResponse>,
    ) => Promise<TResponse>;
    put: <TResponse = unknown>(
        url: string,
        options?: FormSubmitOptions<TData, TResponse>,
    ) => Promise<TResponse>;
    patch: <TResponse = unknown>(
        url: string,
        options?: FormSubmitOptions<TData, TResponse>,
    ) => Promise<TResponse>;
    delete: <TResponse = unknown>(
        url: string,
        options?: FormSubmitOptions<TData, TResponse>,
    ) => Promise<TResponse>;
}

// ————————————————— helpers

// Deep-clone the seed data for the form's working copy. `structuredClone`
// refuses to clone a Vue reactive Proxy (a `default: []` / `default: {}` inside
// a reactive `editFields` ref is a Proxy) and throws DataCloneError. `toRaw`
// unwraps the top-level proxy; a try/catch falls back to a JSON clone for any
// residual proxy (nested reactive values) or otherwise-uncloneable input. Form
// data is JSON-bound at the API boundary, so the JSON fallback is lossless here.
const deepClone = <T>(value: T): T => {
    const raw = toRaw(value);
    if (typeof structuredClone === "function") {
        try {
            return structuredClone(raw);
        } catch {
            // Fall through to the JSON clone below.
        }
    }
    return JSON.parse(JSON.stringify(raw));
};

const isFileLike = (value: unknown): boolean =>
    (typeof File !== "undefined" && value instanceof File) ||
    (typeof Blob !== "undefined" && value instanceof Blob);

/** Whether a payload contains a File/Blob anywhere (→ needs multipart). */
function containsFile(value: unknown): boolean {
    if (isFileLike(value)) return true;
    if (Array.isArray(value)) return value.some(containsFile);
    if (value !== null && typeof value === "object") {
        return Object.values(value as Record<string, unknown>).some(containsFile);
    }
    return false;
}

/** Append a value to FormData using Laravel-style bracket keys. */
function appendToFormData(fd: FormData, key: string, value: unknown): void {
    if (value === null || value === undefined) {
        fd.append(key, "");
    } else if (isFileLike(value)) {
        fd.append(key, value as Blob);
    } else if (Array.isArray(value)) {
        value.forEach((entry, index) =>
            appendToFormData(fd, `${key}[${index}]`, entry),
        );
    } else if (value instanceof Date) {
        fd.append(key, value.toISOString());
    } else if (typeof value === "object") {
        for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
            appendToFormData(fd, `${key}[${k}]`, v);
        }
    } else if (typeof value === "boolean") {
        // Laravel's boolean validation accepts "1"/"0".
        fd.append(key, value ? "1" : "0");
    } else {
        fd.append(key, String(value));
    }
}

function objectToFormData(payload: Record<string, unknown>): FormData {
    const fd = new FormData();
    for (const [key, value] of Object.entries(payload)) {
        appendToFormData(fd, key, value);
    }
    return fd;
}

function errorsFromLaravel(error: any): {
    errors: ValidationErrors;
    message: string;
} {
    const data = error?.response?.data ?? error?.data ?? error;
    return {
        errors: (data?.errors as ValidationErrors) ?? {},
        message: (data?.message as string) ?? "An error occurred",
    };
}

// ————————————————— composable

export function useForm<TData extends Record<string, any>>(
    initialData = {} as TData,
): UseFormReturn<TData> {
    const snapshot = deepClone(initialData);

    const state = reactive<FormState<TData>>({
        data: deepClone(snapshot) as TData,
        errors: {},
        processing: false,
        message: "",
        touched: {},
        recentlySuccessful: false,
        shouldShowMessage: false,
    });

    const hasErrors = computed(() =>
        Object.keys(state.errors).some(
            (k) => (state.errors[k]?.length ?? 0) > 0,
        ),
    );

    const hasError = (field: keyof TData | string): boolean => {
        return (state.errors[field as string]?.length ?? 0) > 0;
    };

    const getError = (field: keyof TData | string): string => {
        return state.errors[field as string]?.[0] ?? "";
    };

    const getState = (field: keyof TData | string): false | null =>
        hasError(field) ? false : null;

    const setErrors = (errors: ValidationErrors = {}): void => {
        for (const k of Object.keys(state.errors)) delete state.errors[k];
        Object.assign(state.errors, errors);
    };

    const setMessage = (message: string): void => {
        state.message = message;
    };

    const clearErrors = (): void => {
        for (const key of Object.keys(state.errors)) delete state.errors[key];
        state.message = "";
    };

    const clearError = (field: keyof TData | string): void => {
        const key = field as string;
        if (state.errors[key]) delete state.errors[key];
    };

    const reset = (only?: Array<keyof TData>): void => {
        if (only?.length) {
            for (const k of only) {
                (state.data as any)[k as string] = deepClone(
                    (snapshot as any)[k as string],
                );
            }
        } else {
            // operate on a Record view to satisfy TS
            const dataRecord = state.data as Record<string, unknown>;
            for (const k of Object.keys(dataRecord))
                delete (dataRecord as any)[k];
            Object.assign(
                state.data as Record<string, unknown>,
                deepClone(snapshot),
            );
        }
        clearErrors();
        state.touched = {};
        state.processing = false;
    };

    // v-model for a single field
    const field = <K extends keyof TData>(
        key: K,
    ): WritableComputedRef<TData[K]> =>
        computed<TData[K]>({
            get: () => (state.data as TData)[key],
            set: (value) => {
                (state.data as TData)[key] = value;
                state.touched[key as string] = true;
                if (state.errors[key as string])
                    delete state.errors[key as string];
            },
        });

    // property-style fields map (non-Proxy, uses snapshot keys)
    const fields = {} as UseFormReturn<TData>["fields"];
    (Object.keys(snapshot) as Array<keyof TData>).forEach((k) => {
        Object.defineProperty(fields, k, {
            get: () => field(k),
            enumerable: true,
        });
    });

    const submit = async <TResponse = unknown>(
        method: "get" | "post" | "put" | "patch" | "delete",
        url: string,
        options: FormSubmitOptions<TData, TResponse> = {},
    ): Promise<TResponse> => {
        state.processing = true;
        if (!options.preserveErrors) clearErrors();

        const payloadRaw = (
            options.transform
                ? // Give `transform` a COPY of the form data (#150), so a transform
                  // that MUTATES what it receives — `data.allergens = assemble();
                  // return data` — shapes the outbound payload WITHOUT corrupting
                  // form state. (This is why consumers reach for a transform instead
                  // of mutating `form.data` in a validation guard.) A shallow copy:
                  // returning a new object is still the tidiest style, and a
                  // deeply-nested field should be replaced, not mutated in place.
                  options.transform({
                      ...(toRaw(state.data) as Record<string, any>),
                  } as TData)
                : (state.data as TData)
        ) as any;

        options.onBefore?.(state.data as TData);

        // When the payload carries a File/Blob (an image/file field), send it as
        // multipart/form-data. PHP only parses multipart bodies on POST, so a
        // put/patch is spoofed as POST + `_method` (Laravel reads that). This
        // also covers a `transform` that returns a FormData directly.
        let sendMethod = method;
        let sendPayload: any = payloadRaw;
        if (method !== "get" && payloadRaw !== null && typeof payloadRaw === "object") {
            const alreadyFormData =
                typeof FormData !== "undefined" && payloadRaw instanceof FormData;
            let formData: FormData | null = null;
            if (alreadyFormData) {
                formData = payloadRaw as FormData;
            } else if (containsFile(payloadRaw)) {
                formData = objectToFormData(payloadRaw as Record<string, unknown>);
            }
            if (formData) {
                if (method === "put" || method === "patch") {
                    formData.append("_method", method.toUpperCase());
                    sendMethod = "post";
                }
                sendPayload = formData;
            }
        }

        try {
            const { data } =
                sendMethod === "get"
                    ? await api.get<TResponse>(
                        url,
                        sendPayload as Record<string, unknown>,
                        { signal: options?.signal },
                    )
                    : sendMethod === "delete"
                        // A record is deleted by its URL — don't submit the form
                        // fields as a request body. Passing the payload here would
                        // send the whole model on every delete.
                        ? await api.delete<TResponse>(url, undefined, {
                            signal: options?.signal,
                        })
                        : await api[sendMethod]<TResponse>(url, sendPayload, {
                            signal: options?.signal,
                        });

            state.recentlySuccessful = true;
            setTimeout(() => (state.recentlySuccessful = false), 1500);

            options.onSuccess?.(data);
            if (options.resetOnSuccess) {
                reset();
            }
            return data;
        } catch (err) {
            const { errors, message } = errorsFromLaravel(err);
            setErrors(errors);
            setMessage(message);
            options.onError?.(err as FormError);
            throw err;
        } finally {
            state.processing = false;
            options.onFinish?.();
        }
    };

    const post = <R = unknown>(url: string, o?: FormSubmitOptions<TData, R>) =>
        submit<R>("post", url, o);
    const put = <R = unknown>(url: string, o?: FormSubmitOptions<TData, R>) =>
        submit<R>("put", url, o);
    const patch = <R = unknown>(url: string, o?: FormSubmitOptions<TData, R>) =>
        submit<R>("patch", url, o);
    const del = <R = unknown>(url: string, o?: FormSubmitOptions<TData, R>) =>
        submit<R>("delete", url, o);

    const shouldShowMessage = computed(() => {
        return (
            state.message !== "" &&
            state.processing === false &&
            hasErrors.value === false
        );
    });

    return Object.assign(state, {
        hasErrors,
        hasError,
        getError,
        getState,
        setErrors,
        setMessage,
        clearErrors,
        clearError,
        reset,
        field,
        fields,
        submit,
        post,
        put,
        patch,
        delete: del,
        shouldShowMessage,
    }) as UseFormReturn<TData>;
}
