import { isRef } from "vue";
import { useToast as useBvnToast } from "bootstrap-vue-next";
import type {
    OrchestratorCreateOptions,
    ToastOrchestratorCreateParam,
} from "bootstrap-vue-next";

// Bootstrap Vue Next maps a toast's `variant` prop straight to Bootstrap's
// `.text-bg-{variant}` utility class, which sets background/text colour
// `!important` (all Bootstrap utilities are `!important` by design) — so
// restyling it can only ever fight that with `!important` too. The variants
// this theme restyles (see theme.scss) are instead applied as a `toast-{variant}`
// class, driving Bootstrap's own `--bs-toast-*` variables cleanly. An
// unrecognised variant (e.g. "primary", "dark", or none) falls through to
// BVN's default `.text-bg-*` styling unchanged.
const THEMED_TOAST_VARIANTS = new Set(["success", "danger", "warning", "info", "pending"]);

/**
 * How long a created toast shows when the caller sets no `modelValue`: bvn
 * 0.45's default. bvn 0.46+ creates the toast hidden until `.show()`, which
 * would make every `create({ body, variant })` silently show nothing
 * (DIVERGENCES.md #10).
 */
const DEFAULT_TOAST_DURATION_MS = 5000;

function themeToastParam(param: Record<string, unknown>): Record<string, unknown> {
    const variant = param.variant as string | null | undefined;
    if (!variant || !THEMED_TOAST_VARIANTS.has(variant)) return param;

    const { variant: _variant, toastClass, ...rest } = param;
    return {
        ...rest,
        toastClass: [toastClass, `toast-${variant}`],
    };
}

// A ref-wrapped param (rare — most callers pass a plain object) is forwarded
// untouched: reading through it once here would snapshot every field, losing
// reactivity for the rest of the toast, not just its variant. It gets no
// default duration or folded options either, so it must set `modelValue`
// itself (or be shown with `.show()`).
function prepareParam(
    obj: ToastOrchestratorCreateParam | undefined,
    options: OrchestratorCreateOptions | undefined,
): ToastOrchestratorCreateParam | undefined {
    if (isRef(obj)) return obj;
    const param: Record<string, unknown> = { ...(obj ?? {}) };
    if (param.modelValue === undefined) param.modelValue = DEFAULT_TOAST_DURATION_MS;
    // bvn 0.45 took options as a second argument; 0.46+ reads `obj.options`.
    if (options !== undefined) {
        param.options = { ...options, ...(param.options as OrchestratorCreateOptions | undefined) };
    }
    return themeToastParam(param) as unknown as ToastOrchestratorCreateParam;
}

type BvnToast = ReturnType<typeof useBvnToast>;
type ToastController = ReturnType<BvnToast["create"]>;

export type UseToastReturn = Omit<BvnToast, "create"> & {
    /**
     * Create a toast and show it. With no `modelValue` it shows for 5 s
     * (bvn 0.45's default; bvn 1.x would create it hidden). Pass
     * `modelValue: false` to create it hidden and call `.show()` later.
     * The optional second argument is bvn 0.45's `options`, folded into
     * `obj.options`.
     */
    create: (obj?: ToastOrchestratorCreateParam, options?: OrchestratorCreateOptions) => ToastController;
    /** @deprecated Alias of `create`, kept from bvn 0.45 (removed upstream in 0.46). */
    show: (obj?: ToastOrchestratorCreateParam) => ToastController;
};

/**
 * Thin wrapper around Bootstrap Vue Next's `useToast()`. Public API is
 * bvn 0.45's (`create({ title, body, variant })` shows the toast, `show(...)`,
 * a second `options` argument) on top of bvn 1.x's controller, `hide` and
 * `hideAll`. A themed `variant` is translated internally into a
 * `toast-{variant}` class instead of being passed through to BVN, so it's
 * styled via `--bs-toast-*` variables (see theme.scss) rather than an
 * `!important`-overridden utility class.
 */
export function useToast(): UseToastReturn {
    const toast = useBvnToast();
    const create = (obj?: ToastOrchestratorCreateParam, options?: OrchestratorCreateOptions) =>
        toast.create(prepareParam(obj, options));

    return {
        ...toast,
        create,
        show: (obj?: ToastOrchestratorCreateParam) => create(obj),
    };
}
