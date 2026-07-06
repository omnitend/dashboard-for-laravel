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
const THEMED_TOAST_VARIANTS = new Set(["success", "danger", "warning", "info"]);

function themeToastParam(param: Record<string, unknown>): Record<string, unknown> {
    const variant = param.variant as string | null | undefined;
    if (!variant || !THEMED_TOAST_VARIANTS.has(variant)) return param;

    const { variant: _variant, toastClass, ...rest } = param;
    return {
        ...rest,
        toastClass: [toastClass, `toast-${variant}`],
    };
}

/**
 * Thin wrapper around Bootstrap Vue Next's `useToast()`. Public API is
 * identical (`create({ title, body, variant })`, `show(...)`) — a themed
 * `variant` is translated internally into a `toast-{variant}` class instead
 * of being passed through to BVN, so it's styled via `--bs-toast-*` variables
 * (see theme.scss) rather than an `!important`-overridden utility class.
 */
// A ref-wrapped param (rare — most callers pass a plain object) is forwarded
// untouched: reading through it once here would snapshot every field, losing
// reactivity for the rest of the toast, not just its variant.
function maybeThemeParam(obj?: ToastOrchestratorCreateParam): ToastOrchestratorCreateParam | undefined {
    if (!obj || isRef(obj)) return obj;
    return themeToastParam(obj as Record<string, unknown>) as unknown as ToastOrchestratorCreateParam;
}

export function useToast(): ReturnType<typeof useBvnToast> {
    const toast = useBvnToast();

    return {
        ...toast,
        create: (obj?: ToastOrchestratorCreateParam, options?: OrchestratorCreateOptions) =>
            toast.create(maybeThemeParam(obj), options),
        show: (obj?: ToastOrchestratorCreateParam) => toast.show(maybeThemeParam(obj)),
    };
}
