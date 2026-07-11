/**
 * @component
 * Type-safe wrapper around Bootstrap Vue Next BAutocomplete component.
 * Text input with a filtered dropdown of suggestions (typeahead/combobox).
 * Pass `options` and bind `v-model`; supports `multiple` and a custom
 * `filterFunction`.
 */
<script setup lang="ts">
import { computed, useAttrs } from "vue";
import { BAutocomplete } from "bootstrap-vue-next";

defineOptions({
  inheritAttrs: false,
});

const attrs = useAttrs();

/*
 * Diverges from bvn: the clear (✕) is hidden when there is nothing to clear.
 *
 * BAutocomplete's own `hasSelection` excludes only `null` and `undefined`, so an
 * EMPTY STRING counts as a selection and the ✕ renders on an empty field. That's
 * very visible through DXTable, which uses this control for every `select`
 * column filter: a freshly loaded table with four filters showed four ✕ buttons
 * before the user had done anything, reading as "these have a value to clear"
 * when they don't (#108). An inert button also shouldn't sit in the tab order.
 *
 * A consumer's explicit `no-clear-button` still wins; this only ever hides the
 * button, never forces it on.
 */
const attr = (name: string, hyphenated: string) =>
  (attrs as Record<string, unknown>)[name] ?? (attrs as Record<string, unknown>)[hyphenated];

const hasValue = computed(() => {
  const value = attr("modelValue", "model-value");
  if (Array.isArray(value)) return value.length > 0;
  return value !== null && value !== undefined && value !== "";
});

const noClearButton = computed(
  () => attr("noClearButton", "no-clear-button") === true || !hasValue.value,
);
</script>

<template>
  <!--
    Wrap BAutocomplete in a real element so our scoped styles have a concrete
    host to attach the scope-id to. Styling BAutocomplete's internal DOM via
    `:deep()` on a wrapper whose ONLY root is the `<BAutocomplete>` *component*
    doesn't work: the scope-id isn't reliably forwarded onto BVN's rendered
    root, so `[data-v-x] .input-group` matches nothing in a consumer build
    (#53). A plain element root makes it deterministic.
  -->
  <div class="d-autocomplete">
    <BAutocomplete v-bind="$attrs" :no-clear-button="noClearButton">
      <!-- Dynamically pass through all named slots with their props -->
      <template v-for="(_, name) in $slots" :key="name" #[name]="slotProps">
        <slot :name="name" v-bind="slotProps" />
      </template>
    </BAutocomplete>
  </div>
</template>

<style scoped>
/*
  BAutocomplete renders `.input-group > .b-autocomplete-input-wrapper +
  .b-autocomplete-trigger`. The input wrapper takes the full width, so under
  Bootstrap's default `flex-wrap: wrap` the trigger chevron wraps onto its own
  line below the input. Keep the group on a single row and let the input wrapper
  flex, so the trigger sits inline as an append. (#53)
*/
.d-autocomplete :deep(.input-group) {
  flex-wrap: nowrap;
}

.d-autocomplete :deep(.b-autocomplete-input-wrapper) {
  flex: 1 1 auto;
  min-width: 0;
}

/*
  The control is an `.input-group` whose input and trigger chevron are SIBLINGS,
  so Bootstrap's `.form-control:focus` ring wraps the input only and stops dead
  where the chevron begins — the outline reads as clipped rather than framing the
  control. Move the ring to the group on `:focus-within` so the whole thing is
  outlined as one object, which is the standard input-group + button pattern
  (#108).
*/
.d-autocomplete :deep(.input-group:focus-within) {
  border-radius: var(--bs-border-radius);
  box-shadow: 0 0 0 0.25rem rgba(var(--bs-primary-rgb), 0.25);
}

.d-autocomplete :deep(.input-group:focus-within .form-control:focus),
.d-autocomplete :deep(.input-group:focus-within .btn:focus) {
  box-shadow: none;
}

/* Keep the seam between input and chevron coloured like the focused control. */
.d-autocomplete :deep(.input-group:focus-within .form-control),
.d-autocomplete :deep(.input-group:focus-within .b-autocomplete-trigger) {
  border-color: var(--bs-primary);
}

/*
  The trigger renders as a heavy `btn btn-secondary` (dark), which reads as a
  detached dark block. Soften it to a subtle bordered chevron that matches the
  input and reads as a combobox affordance. Driving Bootstrap's own `--bs-btn-*`
  variables (rather than raw properties) keeps hover/active/focus states
  coherent and avoids fighting the `.btn-secondary` state selectors.
*/
.d-autocomplete :deep(.b-autocomplete-trigger) {
  --bs-btn-bg: var(--bs-body-bg);
  --bs-btn-border-color: var(--bs-border-color);
  --bs-btn-color: var(--bs-secondary-color);
  --bs-btn-hover-bg: var(--bs-tertiary-bg);
  --bs-btn-hover-border-color: var(--bs-border-color);
  --bs-btn-hover-color: var(--bs-body-color);
  --bs-btn-active-bg: var(--bs-secondary-bg);
  --bs-btn-active-border-color: var(--bs-border-color);
  --bs-btn-active-color: var(--bs-body-color);
  flex: 0 0 auto;
}

/*
  The clear affordance renders as Bootstrap's `.btn-close` — a bold, filled ✕
  that reads as a heavy black mark against a light field (and is noisy when
  several autocompletes sit in a row, e.g. a table's column filters). Scale it
  down via `font-size` (btn-close sizes both its box and its background SVG in
  `em`, so this shrinks it proportionally without clipping) and rest it at a
  lower opacity so it's a quiet clear affordance that only asserts on
  hover/focus. Matches the softened trigger above.
*/
.d-autocomplete :deep(.b-autocomplete-clear.btn-close) {
  font-size: 0.8em;
  opacity: 0.4;
}

.d-autocomplete :deep(.b-autocomplete-clear.btn-close:hover) {
  opacity: 0.7;
}

.d-autocomplete :deep(.b-autocomplete-clear.btn-close:focus) {
  opacity: 0.9;
}
</style>
