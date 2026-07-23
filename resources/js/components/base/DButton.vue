<script setup lang="ts">
/**
 * DButton - A type-safe wrapper around Bootstrap Vue Next's BButton component
 *
 * Adds three base-level button behaviours on top of `variant`/`size`:
 * - `loading` — disables the button and shows a trailing spinner while an async
 *   action is in flight, with anti-flash timing (no spinner for sub-`spinnerDelay`
 *   actions; a `minSpinnerTime` floor once shown so it never strobes).
 * - `icon` — a leading Bootstrap Icons glyph (e.g. `icon="save"` → `bi bi-save`).
 * - `block` — full-width button (the BS5 replacement for the dropped `.btn-block`).
 *
 * @component
 * @example
 * ```vue
 * <DButton variant="primary" size="lg">Click Me</DButton>
 * <DButton icon="save" variant="primary">Save</DButton>
 * <DButton :loading="isSaving" loading-text="Saving…">Save</DButton>
 * <DButton block>Continue</DButton>
 * ```
 */
import { BButton } from "bootstrap-vue-next";
import type { ButtonVariant, Size } from "bootstrap-vue-next";
import { computed, onBeforeUnmount, ref, useSlots, watch } from "vue";
import DSpinner from "./DSpinner.vue";

const slots = useSlots();

type LinkVariant =
  | "link-primary"
  | "link-secondary"
  | "link-success"
  | "link-danger"
  | "link-warning"
  | "link-info"
  | "link-light"
  | "link-dark";

interface Props {
  /**
   * The visual style variant of the button.
   *
   * Defaults to `'secondary'` (soft, non-emphatic). Under the soft-first
   * house rule, `primary` is THE single emphatic action per page/modal, so a
   * variant-less button must NOT be emphatic by default — declare
   * `variant="primary"` explicitly where you mean the one loud action.
   * @default 'secondary'
   */
  variant?: ButtonVariant | LinkVariant | null;

  /**
   * The size of the button. Omit for the default (medium) size —
   * bootstrap-vue-next 0.45 removed the no-op `'md'` value from `Size`.
   */
  size?: Size;

  /**
   * Disable the button. Combined with `loading` — either one disables it.
   */
  disabled?: boolean;

  /**
   * Show an in-flight state: the button is disabled immediately and, after
   * `spinnerDelay`, a trailing spinner appears (and the label swaps to
   * `loadingText` if given).
   *
   * Diverges from bvn: `BButton` has a native `loading`/`loadingText` that
   * shows its spinner immediately. We intercept both and render our own
   * anti-flash spinner instead, so bvn's native loading never fires. See
   * DIVERGENCES.md.
   * @default false
   */
  loading?: boolean;

  /**
   * Label shown in place of the default slot while the spinner is visible.
   * Omit to keep the original label alongside the spinner. (See `loading` re:
   * the bvn divergence.)
   */
  loadingText?: string;

  /**
   * Leading Bootstrap Icons glyph name, rendered as `<i class="bi bi-{icon}">`.
   * e.g. `icon="save"`. Hidden while the loading spinner is visible.
   *
   * Diverges from bvn: `BButton`'s native `icon` is a `boolean` (icon-button
   * styling mode). We redefine it as a glyph-name `string`, so bvn's boolean
   * icon mode is unreachable through `DButton`. See DIVERGENCES.md.
   */
  icon?: string;

  /**
   * Full-width button (BS5 `w-100` idiom, replacing the dropped `.btn-block`).
   * @default false
   */
  block?: boolean;

  /**
   * Anti-flash: how long (ms) `loading` must stay true before the spinner is
   * shown, so fast actions never flicker one in.
   * @default 500
   */
  spinnerDelay?: number;

  /**
   * Anti-flash: minimum time (ms) the spinner stays visible once shown, so a
   * loading state that clears quickly doesn't strobe it away.
   * @default 100
   */
  minSpinnerTime?: number;
}

const props = withDefaults(defineProps<Props>(), {
  variant: "secondary",
  disabled: false,
  loading: false,
  block: false,
  spinnerDelay: 500,
  minSpinnerTime: 100,
});

// --- Spinner anti-flash state machine -------------------------------------
// `loading` disables the button instantly (prevents double-submit), but the
// *spinner visual* is gated: it only appears once `loading` has held for
// `spinnerDelay`, and once shown it stays for at least `minSpinnerTime`.
const showSpinner = ref(false);
let delayTimer: ReturnType<typeof setTimeout> | null = null;
let minTimer: ReturnType<typeof setTimeout> | null = null;
let shownAt = 0;

function clearTimer(timer: ReturnType<typeof setTimeout> | null) {
  if (timer !== null) clearTimeout(timer);
}

watch(
  () => props.loading,
  (isLoading) => {
    // The spinner is a client-only concern. On the server there's no unmount
    // hook to clear a scheduled timer, and the spinner never paints before
    // hydration anyway (it's gated behind `spinnerDelay`), so skip the timers
    // entirely during SSR — `showSpinner` stays false, matching the initial
    // client render and avoiding a dangling server-side timeout.
    if (typeof window === "undefined") return;
    if (isLoading) {
      // Cancel any pending hide — we're loading again, keep the spinner up.
      clearTimer(minTimer);
      minTimer = null;
      // Already showing, or already counting down to show: nothing to do.
      if (showSpinner.value || delayTimer !== null) return;
      delayTimer = setTimeout(() => {
        delayTimer = null;
        showSpinner.value = true;
        shownAt = Date.now();
      }, props.spinnerDelay);
    } else {
      // Stopped before the spinner ever appeared → cancel, no flash at all.
      if (delayTimer !== null) {
        clearTimeout(delayTimer);
        delayTimer = null;
        return;
      }
      if (!showSpinner.value) return;
      const remaining = props.minSpinnerTime - (Date.now() - shownAt);
      if (remaining <= 0) {
        showSpinner.value = false;
      } else if (minTimer === null) {
        minTimer = setTimeout(() => {
          minTimer = null;
          showSpinner.value = false;
        }, remaining);
      }
    }
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  clearTimer(delayTimer);
  clearTimer(minTimer);
});

// BButton owns the default slot (we compose icon/spinner/label into it); any
// other named slots are forwarded through untouched.
const passthroughSlotNames = computed(() =>
  Object.keys(slots).filter((name) => name !== "default"),
);

// Bootstrap utility classes are global, so they apply regardless of whether the
// wrapper's scope-id reaches BButton's rendered <button> — avoiding the scoped
// `:deep()`-on-a-B-root trap. Only add the flex row when there's an adornment
// to space out.
const hasAdornment = computed(
  () => Boolean(props.icon) || showSpinner.value,
);
</script>

<template>
  <BButton
    :variant="variant"
    :size="size"
    :disabled="disabled || loading || showSpinner"
    :aria-busy="loading || showSpinner || undefined"
    :class="[
      { 'd-inline-flex align-items-center justify-content-center gap-2': hasAdornment },
      { 'w-100': block },
    ]"
    v-bind="$attrs"
  >
    <i
      v-if="icon && !showSpinner"
      :class="['bi', `bi-${icon}`]"
      aria-hidden="true"
    ></i>
    <template v-if="showSpinner && loadingText">{{ loadingText }}</template>
    <slot v-else />
    <DSpinner v-if="showSpinner" small />

    <!-- Forward any other named slots untouched, with their slot props. -->
    <template
      v-for="name in passthroughSlotNames"
      :key="name"
      #[name]="slotProps"
    >
      <slot :name="name" v-bind="slotProps" />
    </template>
  </BButton>
</template>
