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

/**
 * What the most recent failed submit returned (#194): the server's message and
 * a COPY of its validation errors, frozen at the moment the submit failed.
 * The live `form.errors` empties as the user fixes fields; this does not, so a
 * summary built from it keeps listing every message until the next submit.
 */
export interface SubmitFailure {
    /** A message fit to show a user (never empty, never a raw exception). */
    message: string;
    /** The validation errors the submit returned (`{}` when none). */
    errors: ValidationErrors;
}

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
    /**
     * Whether the most recent submission succeeded. Unlike
     * `recentlySuccessful` (which clears itself after 1.5s) this stays true
     * until the next submission starts, and is false after a failure — the
     * Inertia `wasSuccessful` semantics. DXForm's saved state reads it.
     */
    wasSuccessful: boolean;
    shouldShowMessage: boolean;
    /**
     * What the most recent submit failed with, or `null`. Set when a submit
     * fails (validation or otherwise; an aborted submit does not count),
     * cleared when a submit starts and when one succeeds. Untouched by
     * `clearError`, `clearErrors`, `setErrors` and field edits.
     */
    submitFailure: SubmitFailure | null;
    /**
     * How many submits have failed, counting every failure (including a
     * `preserveErrors` resubmit that returned the same errors), so a watcher
     * can react to "a submit just failed" even when nothing else changed.
     */
    failedSubmitCount: number;
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

const GENERIC_FAILURE_MESSAGE = "An error occurred";

/** Copy an errors map, keeping only non-empty string messages. */
function copyValidationErrors(errors: unknown): ValidationErrors {
    const copy: ValidationErrors = {};
    if (errors === null || typeof errors !== "object") return copy;
    for (const [key, value] of Object.entries(errors as Record<string, unknown>)) {
        const messages = (Array.isArray(value) ? value : [value]).filter(
            (message): message is string =>
                typeof message === "string" && message !== "",
        );
        if (messages.length > 0) copy[key] = messages;
    }
    return copy;
}

function isAbortError(error: unknown): boolean {
    return (
        error !== null &&
        typeof error === "object" &&
        (error as { name?: unknown }).name === "AbortError"
    );
}

/**
 * The `submitFailure` for a rejected submit, or `null` for an abort (the
 * caller cancelled it; nothing failed). Only an `ApiError` from the client
 * (an HTTP failure: it carries a numeric `status`, and the client has already
 * replaced 401/403/404/419/500 bodies with user-facing text) supplies the
 * message. Anything else (a network `TypeError`, an exception thrown from
 * `onSuccess`) gets the generic message, so a summary never shows
 * "Failed to fetch" or a stack-trace line.
 */
function submitFailureFrom(error: unknown): SubmitFailure | null {
    if (isAbortError(error)) return null;
    const isApiError =
        error !== null &&
        typeof error === "object" &&
        typeof (error as ApiError).status === "number";
    if (isApiError) {
        const apiError = error as ApiError;
        const message =
            typeof apiError.message === "string" && apiError.message.trim() !== ""
                ? apiError.message
                : GENERIC_FAILURE_MESSAGE;
        return { message, errors: copyValidationErrors(apiError.errors) };
    }
    return {
        message: GENERIC_FAILURE_MESSAGE,
        errors: copyValidationErrors(errorsFromLaravel(error).errors),
    };
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

    // Concurrency guards (#133). `useForm` allows overlapping submissions (a
    // consumer can fire two before the first resolves), so:
    //  - `inFlightCount` tracks how many requests are active; `processing` only
    //    flips false when the LAST one finishes (a per-request `finally` flipping
    //    it unconditionally re-enabled the button while another was still running).
    //  - `successTimer` is a single handle for the `recentlySuccessful` reset; a
    //    new success clears any pending timer before scheduling its own, so an
    //    earlier success's timer can't clear the flag a later success just set.
    let inFlightCount = 0;
    let successTimer: ReturnType<typeof setTimeout> | null = null;

    // Which submit's outcome the form records (#194 review). Each submit takes
    // a generation number when it starts. Its outcome (success, failure,
    // errors, message, `submitFailure`, `resetOnSuccess`) is recorded only if
    // no NEWER submit is still pending or has already recorded: the newest
    // submit's outcome wins, in either completion order. An older success can
    // therefore never clear a newer failure, and an older failure never lands
    // over a newer success. Callbacks and the returned promise are
    // unaffected: every submit still calls its own onSuccess/onError and
    // resolves/rejects.
    //
    // An ABORTED submit is treated as if it had never started: it records
    // nothing (not even the abort's own message), and an older outcome that
    // was held back only because the aborted one was pending is then
    // recorded. Held-back outcomes wait in `heldOutcomes` (newest wins; a
    // newer recorded outcome drops them). A submit whose preparation
    // (`transform`, `onBefore`) throws never takes a generation at all.
    let latestSubmitGeneration = 0;
    let lastRecordedGeneration = 0;
    const pendingGenerations = new Set<number>();
    const heldOutcomes = new Map<number, () => void>();
    const mayRecord = (generation: number): boolean => {
        if (generation < lastRecordedGeneration) return false;
        for (const pending of pendingGenerations) {
            if (pending > generation) return false;
        }
        return true;
    };
    /** Record now if this generation may, else hold it back for later. */
    const recordOrHold = (generation: number, record: () => void): boolean => {
        if (mayRecord(generation)) {
            lastRecordedGeneration = generation;
            heldOutcomes.clear();
            record();
            return true;
        }
        if (generation >= lastRecordedGeneration) heldOutcomes.set(generation, record);
        return false;
    };
    /**
     * After a submit leaves the pending set: record the NEWEST held-back
     * outcome if nothing newer is pending any more (an abort unblocked it),
     * and drop every older one. Older held outcomes never surface over a
     * newer settled one.
     */
    const releaseHeldOutcomes = (): void => {
        if (heldOutcomes.size === 0) return;
        const newest = Math.max(...heldOutcomes.keys());
        if (newest < lastRecordedGeneration) {
            heldOutcomes.clear();
            return;
        }
        if (!mayRecord(newest)) return;
        const record = heldOutcomes.get(newest)!;
        lastRecordedGeneration = newest;
        heldOutcomes.clear();
        record();
    };

    const state = reactive<FormState<TData>>({
        data: deepClone(snapshot) as TData,
        errors: {},
        processing: false,
        message: "",
        touched: {},
        recentlySuccessful: false,
        wasSuccessful: false,
        shouldShowMessage: false,
        submitFailure: null,
        failedSubmitCount: 0,
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
        // Not `false` outright: with another submit still in flight the form
        // is still processing, and the counter will clear it when that ends.
        state.processing = inFlightCount > 0;
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
        // Preparation (`transform`, `onBefore`, building the body) runs BEFORE
        // the submit takes a generation or touches form state. If it throws,
        // the submit rejects with that error and is as if it never started:
        // no request, no callbacks, no recorded failure, and the form keeps
        // its previous outcome. (Before #194's review a throw here also
        // rejected without calling onError/onFinish or recording a failure,
        // but it had already cleared the errors and summary, and it left
        // `processing` stuck at true because the in-flight count was never
        // decremented.)
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

        inFlightCount += 1;
        const generation = ++latestSubmitGeneration;
        pendingGenerations.add(generation);
        state.processing = true;
        state.wasSuccessful = false;
        state.submitFailure = null;
        if (!options.preserveErrors) clearErrors();

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

            const records = recordOrHold(generation, () => {
                state.recentlySuccessful = true;
                state.wasSuccessful = true;
                state.submitFailure = null;
                if (successTimer !== null) clearTimeout(successTimer);
                successTimer = setTimeout(() => {
                    state.recentlySuccessful = false;
                    successTimer = null;
                }, 1500);
            });

            options.onSuccess?.(data);
            // Only a success recorded when it lands resets: an older one would
            // wipe the data and errors the newer submit is answering for, and
            // a held-back success recorded later (after an abort) does not
            // reset either, since the user may have typed since.
            if (options.resetOnSuccess && records) {
                reset();
            }
            return data;
        } catch (err) {
            // Decided again here (not reused from the try) so a throwing
            // onSuccess is recorded, or held, as its failure: a held-back
            // success for this generation is replaced.
            //
            // An abort records nothing: it is a cancellation, not an outcome.
            // It leaves the pending set below, which may release an older
            // held-back outcome.
            if (!isAbortError(err)) {
                const { errors, message } = errorsFromLaravel(err);
                const failure = submitFailureFrom(err);
                recordOrHold(generation, () => {
                    state.wasSuccessful = false;
                    setErrors(errors);
                    setMessage(message);
                    if (failure) {
                        state.submitFailure = failure;
                        state.failedSubmitCount += 1;
                    }
                });
            }
            options.onError?.(err as FormError);
            throw err;
        } finally {
            pendingGenerations.delete(generation);
            releaseHeldOutcomes();
            inFlightCount -= 1;
            // Only clear `processing` once no submission is still in flight.
            if (inFlightCount === 0) state.processing = false;
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
