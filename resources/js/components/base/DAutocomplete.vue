/**
 * @component
 * Type-safe wrapper around Bootstrap Vue Next BAutocomplete component.
 * Text input with a filtered dropdown of suggestions (typeahead/combobox).
 * Pass `options` and bind `v-model`; supports `multiple` and a custom
 * `filterFunction`.
 */
<script setup lang="ts">
import { BAutocomplete } from "bootstrap-vue-next";

defineOptions({
  inheritAttrs: false,
});
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
    <BAutocomplete v-bind="$attrs">
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
</style>
