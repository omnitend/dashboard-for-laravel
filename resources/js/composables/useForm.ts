import {
    reactive,
    computed,
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

const deepClone = <T>(v: T): T =>
    typeof structuredClone === "function"
        ? structuredClone(v)
        : JSON.parse(JSON.stringify(v));

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
                ? options.transform(state.data as TData)
                : (state.data as TData)
        ) as any;

        options.onBefore?.(state.data as TData);

        try {
            const { data } =
                method === "get"
                    ? await api.get<TResponse>(
                        url,
                        payloadRaw as Record<string, unknown>,
                        { signal: options?.signal },
                    )
                    : await api[method]<TResponse>(url, payloadRaw, {
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
