import type { ComputedRef, InjectionKey } from "vue";

/**
 * Lets `DXField` forward its `info-popover` slot to the `DXFieldLabel` it
 * renders — at any of its several label sites — without repeating the forward
 * at each one. The provided value is a render function for the popover body, or
 * `null` when the field has no `info-popover` slot.
 *
 * Optional: a `DXFieldLabel` used standalone (no `DXField` ancestor) injects the
 * default `null` and falls back to its own `popover` slot / `info` text.
 */
export const dxFieldInfoPopoverKey: InjectionKey<
    ComputedRef<(() => unknown) | null>
> = Symbol("dxFieldInfoPopover");
