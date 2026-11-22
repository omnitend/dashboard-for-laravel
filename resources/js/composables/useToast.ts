import { isRef } from "vue";
import { useToast as useBvnToast } from "bootstrap-vue-next";
import type {
    BvTriggerableEvent,
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

/**
 * Where a toast shows when the caller sets no `position`. bvn's default,
 * `top-end`, sits over the navbar's right-hand controls (user menu, page
 * actions); reaching for them hovered the toast, which pauses its countdown,
 * so it stayed until its × was clicked (DIVERGENCES.md #11).
 */
const DEFAULT_TOAST_POSITION = "bottom-end";

function themeToastParam(param: Record<string, unknown>): Record<string, unknown> {
    const variant = param.variant as string | null | undefined;
    if (!variant || !THEMED_TOAST_VARIANTS.has(variant)) return param;

    const { variant: _variant, toastClass, ...rest } = param;
    return {
        ...rest,
        toastClass: [toastClass, `toast-${variant}`],
    };
}

/** `create`'s second argument: bvn's orchestrator options plus 0.45's `keep`. */
export type ToastCreateOptions = OrchestratorCreateOptions & {
    /**
     * Keep the toast in the orchestrator's store after it hides, so its
     * controller can `.show()` it again. By default a hidden toast is
     * removed, as in bvn 0.45 (bvn 1.x keeps every toast until the calling
     * component unmounts).
     */
    keep?: boolean;
};

// A ref-wrapped param (rare — most callers pass a plain object) is forwarded
// untouched: reading through it once here would snapshot every field, losing
// reactivity for the rest of the toast, not just its variant. It gets none
// of the shields either (no default duration, no folded options, no removal
// once hidden), so it must set `modelValue` itself (or be shown with
// `.show()`) and is removed only when the calling component unmounts.
function prepareParam(
    obj: ToastOrchestratorCreateParam | undefined,
    options: ToastCreateOptions | undefined,
    removeOnceHidden: () => void,
): ToastOrchestratorCreateParam | undefined {
    if (isRef(obj)) return obj;
    const param: Record<string, unknown> = { ...(obj ?? {}) };
    if (param.modelValue === undefined) param.modelValue = DEFAULT_TOAST_DURATION_MS;
    if (param.position === undefined) param.position = DEFAULT_TOAST_POSITION;

    // bvn 0.45 took options as a second argument; 0.46+ reads `obj.options`.
    // `keep` is ours (0.45's), so it never reaches bvn.
    const { keep = false, ...bvnOptions }: ToastCreateOptions = {
        ...options,
        ...(param.options as ToastCreateOptions | undefined),
    };
    if (options !== undefined || param.options !== undefined) param.options = bvnOptions;

    // bvn 0.45's orchestrator destroyed a toast once hidden unless `keep`;
    // 1.x leaves it in the store and the DOM. The caller's own onHidden runs
    // first. `hidden` is not cancelable (in 0.45 either), so `keep` is the
    // only way to opt out. bvn 1.2.4 calls onHidden twice per hide; the
    // second destroy finds nothing to remove.
    if (!keep) {
        const callersOnHidden = param.onHidden as ((event: BvTriggerableEvent) => void) | undefined;
        param.onHidden = (event: BvTriggerableEvent) => {
            callersOnHidden?.(event);
            removeOnceHidden();
        };
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
     * Once hidden it is removed, unless `keep` is set. The optional second
     * argument is bvn 0.45's `options`, folded into `obj.options`.
     */
    create: <ComponentProps extends Record<string, unknown> = Record<string, unknown>>(
        obj?: ToastOrchestratorCreateParam<ComponentProps>,
        options?: ToastCreateOptions,
    ) => ToastController;
    /** @deprecated Alias of `create`, kept from bvn 0.45 (removed upstream in 0.46). */
    show: <ComponentProps extends Record<string, unknown> = Record<string, unknown>>(
        obj?: ToastOrchestratorCreateParam<ComponentProps>,
    ) => ToastController;
};

/**
 * Thin wrapper around Bootstrap Vue Next's `useToast()`. Public API is
 * bvn 0.45's (`create({ title, body, variant })` shows the toast and removes
 * it once hidden, `show(...)`, a second `options` argument with `keep`) on
 * top of bvn 1.x's controller, `hide` and `hideAll`. A themed `variant` is
 * translated internally into a `toast-{variant}` class instead of being
 * passed through to BVN, so it's styled via `--bs-toast-*` variables (see
 * theme.scss) rather than an `!important`-overridden utility class.
 */
export function useToast(): UseToastReturn {
    const toast = useBvnToast();
    const create = (obj?: ToastOrchestratorCreateParam, options?: ToastCreateOptions) => {
        let controller: ToastController | undefined;
        // After the orchestrator has finished its own `hidden` handling.
        const removeOnceHidden = () => {
            void Promise.resolve().then(() => controller?.destroy());
        };
        controller = toast.create(prepareParam(obj, options, removeOnceHidden));
        return controller;
    };

    return {
        ...toast,
        create: create as UseToastReturn["create"],
        show: ((obj?: ToastOrchestratorCreateParam) => create(obj)) as UseToastReturn["show"],
    };
}
