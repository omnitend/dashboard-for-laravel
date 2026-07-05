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
  <BAutocomplete v-bind="$attrs">
    <!-- Dynamically pass through all named slots with their props -->
    <template v-for="(_, name) in $slots" :key="name" #[name]="slotProps">
      <slot :name="name" v-bind="slotProps" />
    </template>
  </BAutocomplete>
</template>

<style scoped>
/*
  BAutocomplete renders `.input-group > .b-autocomplete-input-wrapper +
  .b-autocomplete-trigger`. The input wrapper takes the full width, so under
  Bootstrap's default `flex-wrap: wrap` the trigger chevron wraps onto its own
  line below the input. Keep the group on a single row and let the input wrapper
  flex, so the trigger sits inline as an append. (#53)
*/
:deep(.input-group) {
  flex-wrap: nowrap;
}

:deep(.b-autocomplete-input-wrapper) {
  flex: 1 1 auto;
  min-width: 0;
}

/*
  The trigger renders as a heavy `btn btn-secondary` (dark), which reads as a
  detached dark block. Soften it to a subtle bordered chevron that matches the
  input and reads as a combobox affordance. Uses theme variables (no hardcoded
  colours) and a more specific selector than `.btn-secondary` (no `!important`).
*/
:deep(.b-autocomplete-trigger) {
  background-color: var(--bs-body-bg);
  border-color: var(--bs-border-color);
  color: var(--bs-secondary-color);
}

:deep(.b-autocomplete-trigger:hover) {
  background-color: var(--bs-tertiary-bg);
  color: var(--bs-body-color);
}
</style>
