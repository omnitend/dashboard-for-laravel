/**
 * useContainerWidth — container-query-style responsiveness for Vue components.
 *
 * Bootstrap's breakpoints are **media** queries: they only ever see the WINDOW.
 * A dashboard page is narrowed by the persistent sidebar (and a form inside a
 * modal is narrower still), so a component can have very little room while the
 * viewport is wide — and no media query ever fires. This composable closes that
 * gap by observing an element's **own rendered width** with a `ResizeObserver`
 * and exposing it reactively, so the template can pick a layout from the space
 * it actually has.
 *
 * ```ts
 * const { containerRef, width, isBelow, isNarrowerThan } = useContainerWidth({
 *   threshold: 640,
 * });
 * // <div ref="containerRef"> … </div>
 * ```
 *
 * One observer can drive several independent decisions — `isBelow` uses the
 * configured `threshold`, and `isNarrowerThan(n)` answers for any other width:
 *
 * ```ts
 * const stacked = computed(() => isNarrowerThan(576));
 * const hideDetailColumn = computed(() => isNarrowerThan(900));
 * ```
 */
import {
    getCurrentScope,
    onScopeDispose,
    ref,
    watch,
    type Ref,
} from "vue";

/**
 * What to observe: a template ref, or a getter (so the element can be resolved
 * lazily / conditionally — e.g. `() => enabled ? el.value : null` to observe
 * nothing at all).
 */
export type ContainerWidthTarget =
    | Ref<HTMLElement | null | undefined>
    | (() => HTMLElement | null | undefined);

export interface UseContainerWidthOptions {
    /**
     * Width (px) that `isBelow` compares against. Omit if you only need
     * `width` / `isNarrowerThan`. Pass a getter (`() => props.threshold`) when
     * it can change at runtime — `isBelow` re-evaluates when it does.
     */
    threshold?: number | (() => number | undefined);

    /**
     * Hysteresis band (px) applied to `isBelow` only, to stop a layout flipping
     * back and forth at the boundary. Once `isBelow` is true it stays true
     * until the width reaches `threshold + hysteresis`.
     *
     * Defaults to `0` so `isBelow` means exactly `width < threshold` unless you
     * ask for otherwise. Opt in whenever the layout you drive from it can
     * change the observed width — the classic loop is: narrow layout is taller
     * → an ancestor with `overflow:auto` gains a vertical scrollbar → the
     * container loses ~15-17px → it crosses back over the threshold → repeat.
     * A band wider than a scrollbar (24px is comfortable) breaks that cycle.
     * (`isNarrowerThan` is deliberately raw — it holds no per-width state.)
     */
    hysteresis?: number;

    /**
     * Width assumed before the first measurement, and permanently where there
     * is no `ResizeObserver` (SSR, or a very old browser).
     *
     * Defaults to `0` — i.e. "assume the narrowest until proven otherwise", so
     * an unmeasured render picks the STACKED layout. That is the mobile-first
     * choice and the safe one: a stacked layout is legible at every width,
     * whereas a wide layout guessed wrongly truncates content. It also means
     * the server-rendered markup matches the first client render.
     */
    initialWidth?: number;

    /**
     * Which box to report. `content-box` (default) is the space actually
     * available to children — what a layout decision usually wants.
     * `border-box` matches `getBoundingClientRect().width`.
     */
    box?: "content-box" | "border-box";

    /**
     * Extra debounce (ms) before publishing a new width. Defaults to `0`:
     * `ResizeObserver` already batches to one delivery per frame, and the
     * callback reads the size the observer *hands* it (no forced layout), so
     * there is nothing to thrash. Set it only for genuinely expensive
     * downstream work — a timer adds a frame of visible lag.
     */
    debounce?: number;
}

export interface UseContainerWidthReturn {
    /** Bind to the element you want measured (`<div ref="containerRef">`). */
    containerRef: Ref<HTMLElement | null>;
    /** The observed width in px. `initialWidth` until first measured. */
    width: Readonly<Ref<number>>;
    /** False until a real measurement has landed (always false without a `ResizeObserver`). */
    hasMeasured: Readonly<Ref<boolean>>;
    /** `width < threshold`, with `hysteresis` applied. False when no `threshold` was given. */
    isBelow: Readonly<Ref<boolean>>;
    /** Raw `width < px`, for driving other decisions off the same observer. */
    isNarrowerThan: (px: number) => boolean;
    /** Disconnect early. Called automatically when the owning scope is disposed. */
    stop: () => void;
}

export function useContainerWidth(
    options?: UseContainerWidthOptions,
): UseContainerWidthReturn;
export function useContainerWidth(
    target: ContainerWidthTarget,
    options?: UseContainerWidthOptions,
): UseContainerWidthReturn;
export function useContainerWidth(
    targetOrOptions?: ContainerWidthTarget | UseContainerWidthOptions,
    maybeOptions?: UseContainerWidthOptions,
): UseContainerWidthReturn {
    // Disambiguate the two overloads: a ref (has `.value`) or a function is a
    // target; anything else is the options object.
    const targetGiven =
        typeof targetOrOptions === "function" ||
        (targetOrOptions !== null &&
            targetOrOptions !== undefined &&
            typeof targetOrOptions === "object" &&
            "value" in targetOrOptions);

    const target = targetGiven
        ? (targetOrOptions as ContainerWidthTarget)
        : undefined;
    const options =
        (targetGiven
            ? maybeOptions
            : (targetOrOptions as UseContainerWidthOptions | undefined)) ?? {};

    const {
        threshold,
        hysteresis = 0,
        initialWidth = 0,
        box = "content-box",
        debounce = 0,
    } = options;

    /** Returned for the common `<div ref="containerRef">` case. */
    const containerRef = ref<HTMLElement | null>(null);

    const resolveTarget = (): HTMLElement | null => {
        if (target === undefined) return containerRef.value;
        if (typeof target === "function") return target() ?? null;
        return target.value ?? null;
    };

    const startWidth = Math.round(initialWidth);
    const width = ref<number>(startWidth);
    const hasMeasured = ref<boolean>(false);

    let observer: ResizeObserver | null = null;
    let observedElement: HTMLElement | null = null;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    function publish(nextWidth: number): void {
        // Sub-pixel churn (a 0.3px reflow) must not wake every dependent
        // computed, so publish at whole-pixel resolution and skip no-ops.
        const rounded = Math.round(nextWidth);
        if (!hasMeasured.value) hasMeasured.value = true;
        if (rounded !== width.value) width.value = rounded;
    }

    function schedule(nextWidth: number): void {
        if (debounce <= 0) {
            publish(nextWidth);
            return;
        }
        if (debounceTimer !== null) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            debounceTimer = null;
            publish(nextWidth);
        }, debounce);
    }

    function measure(entry: ResizeObserverEntry): number {
        if (box === "border-box") {
            // borderBoxSize is an array in the spec (fragmented inline boxes);
            // some engines shipped a bare object first, hence the shape check.
            const sizes = entry.borderBoxSize as unknown;
            if (Array.isArray(sizes) && sizes.length > 0) {
                return sizes[0].inlineSize;
            }
            if (
                sizes !== null &&
                sizes !== undefined &&
                typeof sizes === "object" &&
                "inlineSize" in (sizes as ResizeObserverSize)
            ) {
                return (sizes as ResizeObserverSize).inlineSize;
            }
            // No borderBoxSize: fall back to the element's own box.
            return (entry.target as HTMLElement).getBoundingClientRect().width;
        }
        return entry.contentRect.width;
    }

    // `stop()` is final: it also tears down the watcher that re-observes when
    // the target changes, so a later ref change cannot silently restart a
    // stopped observer.
    let stopTargetWatch: (() => void) | null = null;
    let stopped = false;

    function stop(): void {
        stopped = true;
        if (stopTargetWatch !== null) {
            stopTargetWatch();
            stopTargetWatch = null;
        }
        if (debounceTimer !== null) {
            clearTimeout(debounceTimer);
            debounceTimer = null;
        }
        if (observer !== null) {
            observer.disconnect();
            observer = null;
        }
        observedElement = null;
    }

    /**
     * SSR guard: `ResizeObserver` (and `window`) do not exist while the docs
     * site server-renders these components. We stay at `initialWidth`, so the
     * markup is the stacked/narrow one — see `initialWidth` above.
     */
    const canObserve =
        typeof window !== "undefined" && typeof ResizeObserver !== "undefined";

    function observe(element: HTMLElement | null): void {
        if (stopped) return;
        if (element === observedElement) return;
        if (!canObserve) return;

        if (observer === null) {
            observer = new ResizeObserver((entries) => {
                // Only the last entry matters — a single element is observed and
                // the observer coalesces to one delivery per frame.
                const entry = entries[entries.length - 1];
                if (entry === undefined) return;
                schedule(measure(entry));
            });
        }

        if (observedElement !== null) observer.unobserve(observedElement);
        observedElement = element;
        if (element !== null) observer.observe(element, { box });
    }

    // `post` flush so the element exists when a v-if/v-for swaps the target.
    stopTargetWatch = watch(resolveTarget, observe, {
        immediate: true,
        flush: "post",
    });

    if (getCurrentScope() !== undefined) onScopeDispose(stop);

    const resolveThreshold = (): number | undefined =>
        typeof threshold === "function" ? threshold() : threshold;

    // `isBelow` is a latched ref rather than a computed BECAUSE of hysteresis:
    // the next answer depends on the current one, which a pure getter cannot
    // express without mutating during evaluation. With `hysteresis: 0` it is
    // exactly `width < threshold`. The watcher is `sync` so `isBelow` is never
    // observed one tick behind `width`.
    const initialThreshold = resolveThreshold();
    const isBelow = ref<boolean>(
        initialThreshold === undefined ? false : startWidth < initialThreshold,
    );
    watch(
        [width, () => resolveThreshold()],
        ([currentWidth, currentThreshold]) => {
            if (currentThreshold === undefined) {
                isBelow.value = false;
                return;
            }
            isBelow.value = isBelow.value
                ? currentWidth < currentThreshold + hysteresis
                : currentWidth < currentThreshold;
        },
        { flush: "sync" },
    );

    function isNarrowerThan(px: number): boolean {
        return width.value < px;
    }

    return {
        containerRef,
        width,
        hasMeasured,
        isBelow,
        isNarrowerThan,
        stop,
    };
}
