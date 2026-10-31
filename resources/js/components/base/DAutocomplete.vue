/**
 * @component
 * Type-safe wrapper around Bootstrap Vue Next BAutocomplete component.
 * Text input with a filtered dropdown of suggestions (typeahead/combobox).
 * Pass `options` and bind `v-model`; supports `multiple` and a custom
 * `filterFunction`.
 *
 * `null-option` adds an opt-in, pinned "no selection" row (see below) so a
 * searchable single-select can always reach "none" in-list (#138).
 *
 * `provider` asks a server for the options matching the typed text instead
 * of filtering a preloaded list (0.48.0), for lists too big to download.
 */
<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useAttrs, watch } from "vue";
import { BAutocomplete } from "bootstrap-vue-next";
import type { SelectOption } from "bootstrap-vue-next";

// bvn's own `options` prop type — kept identical so this stays a pass-through.
type AutocompleteOptions = readonly (object | string | number | boolean)[];
type FilterFunction = (options: SelectOption[], search: string) => SelectOption[];
/**
 * Resolves with the options matching `term`. The signal is aborted when a
 * newer term supersedes this call, so a fetch can be cancelled.
 */
export type AutocompleteProvider = (
  term: string,
  signal: AbortSignal,
) => Promise<AutocompleteOptions>;

/** What the list shows when a `provider` has nothing to list. */
type ProviderState = "idle" | "searching" | "done" | "failed";

interface Props {
  /**
   * Options passed straight through to BAutocomplete (see its `options` prop).
   * With a `provider`, these are a seed: they stay in the list alongside the
   * provider's results, so a value bound before any search has run can be
   * labelled by passing its option here.
   */
  options?: AutocompleteOptions;
  /**
   * Ask a server for the options as the user types (0.48.0), for a list too
   * big to download and filter in the browser. Called with the trimmed text
   * once typing has paused for `provider-debounce` ms; its result replaces
   * the list. Only the latest call's result is applied: an earlier call that
   * resolves late is dropped, and its signal was aborted when the newer term
   * was typed. bvn's own substring filter is bypassed, since the server has
   * already filtered. An empty term makes no call and clears the results.
   * A rejected promise reads as "Search failed" in the list (an abort does
   * not) and is logged; it never throws out of the component.
   *
   * Named for DXTable's `provider`, a function that supplies rows; `search`
   * is bvn's name for the input's text and stays as it was.
   */
  provider?: AutocompleteProvider;
  /** Milliseconds of quiet typing before `provider` is called. */
  providerDebounce?: number;
  /**
   * A custom filter. Composed with `null-option` rather than replaced: when a
   * null option is present it stays pinned and this runs on the rest.
   */
  filterFunction?: FilterFunction;
  /**
   * Prepend a pinned, never-filtered, selectable "no selection" row whose value
   * is `null` (#138). `true` → default label "None"; a string → that label.
   * Selecting it sets the model to `null` (bvn reads that as no selection, so
   * the ✕ hides and the placeholder shows). Off by default — unchanged
   * behaviour. DXTable does NOT use this; it builds its own "All" option.
   */
  nullOption?: boolean | string;
}

const props = withDefaults(defineProps<Props>(), {
  options: undefined,
  filterFunction: undefined,
  nullOption: undefined,
  provider: undefined,
  providerDebounce: 250,
});

defineOptions({
  inheritAttrs: false,
});

const attrs = useAttrs();

const attr = (name: string, hyphenated: string) =>
  (attrs as Record<string, unknown>)[name] ?? (attrs as Record<string, unknown>)[hyphenated];

const DEFAULT_NULL_OPTION_LABEL = "None";

const optionValueAndText = (option: unknown): { value: unknown; text: unknown } => {
  if (option === null || typeof option !== "object") return { value: option, text: option };
  const valueField = (attr("valueField", "value-field") as string | undefined) ?? "value";
  const textField = (attr("textField", "text-field") as string | undefined) ?? "text";
  const record = option as Record<string, unknown>;
  return { value: record[valueField], text: record[textField] };
};

/*
 * The null option is a raw option that bvn will normalise through the SAME
 * `value-field`/`text-field` the consumer configured (default `value`/`text`).
 * Build it with those effective field names so it normalises to
 * `{ value: null, text: label }` — otherwise a consumer using e.g.
 * `value-field="id" text-field="label"` would normalise our `{ value, text }`
 * to `{ value: undefined, text: undefined }`, and the row would be filtered out
 * and select as `undefined` instead of `null` (#138 review).
 */
const nullOption = computed<Record<string, unknown> | null>(() => {
  const raw = props.nullOption;
  if (raw === false || raw === undefined) return null;
  const text = typeof raw === "string" ? raw : DEFAULT_NULL_OPTION_LABEL;
  const valueField = (attr("valueField", "value-field") as string | undefined) ?? "value";
  const textField = (attr("textField", "text-field") as string | undefined) ?? "text";
  return { [valueField]: null, [textField]: text };
});

const consumerOptions = computed<AutocompleteOptions>(() =>
  Array.isArray(props.options) ? props.options : [],
);

const hasProvider = computed(() => typeof props.provider === "function");

/*
 * In provider mode the list is the latest results, then any seed option the
 * results do not already hold (by value), so a seed never duplicates a result
 * and never pushes the results down.
 */
const providerOptions = ref<AutocompleteOptions>([]);
const providerState = ref<ProviderState>("idle");

const listedOptions = computed<AutocompleteOptions>(() => {
  if (!hasProvider.value) return props.options ?? [];
  const resultValues = providerOptions.value.map((option) => optionValueAndText(option).value);
  const unlistedSeeds = consumerOptions.value.filter((seed) => {
    const seedValue = optionValueAndText(seed).value;
    return !resultValues.some((resultValue) => sameValue(resultValue, seedValue));
  });
  return [...providerOptions.value, ...unlistedSeeds];
});

const computedOptions = computed<AutocompleteOptions>(() => {
  const pinned = nullOption.value;
  if (!pinned) return listedOptions.value;
  return [pinned, ...listedOptions.value];
});

const isNullOption = (option: SelectOption) => option?.value === null;

/*
 * When a null option is present it must stay pinned (top of the list, immune to
 * the search term); the consumer's `filterFunction` — or bvn's default
 * substring-on-text match — applies only to the rest, so the two compose rather
 * than clobber. With no null option we forward the consumer's filter unchanged
 * (possibly undefined, letting bvn use its own default).
 */
const effectiveFilterFunction = computed<FilterFunction | undefined>(() => {
  const pinned = nullOption.value;
  // The provider's results are already the matches for the typed text, so
  // nothing is filtered again here; a seed option is listed whether or not
  // its text contains the term.
  const consumerFilter = hasProvider.value ? (options: SelectOption[]) => options : props.filterFunction;
  if (!pinned) return consumerFilter;

  return (options, search) => {
    const rest = options.filter((option) => !isNullOption(option));
    const filteredRest = consumerFilter
      ? consumerFilter(rest, search)
      : search
        ? rest.filter((option) =>
            String(option.text ?? "")
              .toLowerCase()
              .includes(search.toLowerCase()),
          )
        : rest;
    return [...options.filter(isNullOption), ...filteredRest];
  };
});

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
const hasValue = computed(() => {
  const value = attr("modelValue", "model-value");
  if (Array.isArray(value)) return value.length > 0;
  return value !== null && value !== undefined && value !== "";
});

const noClearButton = computed(
  () => attr("noClearButton", "no-clear-button") === true || !hasValue.value,
);

/*
 * Late options (0.42.1). bvn's BAutocomplete writes the input's text from the
 * model value through reka-ui's ComboboxInput, which does so on mount and
 * again only when the MODEL changes. A value set before its options load (a
 * DXTable select filter seeded from the URL while the option list is still
 * being fetched) therefore kept showing the raw value ("78") after its label
 * ("Alcopop") arrived. bvn exposes no "resync" method, but the input's text
 * is its `search` v-model, so this wrapper owns that model and, whenever the
 * options change, puts the matching option's label in it.
 *
 * It never overwrites a search the user is typing: while the input has
 * focus, it relabels only text that is still exactly the raw value. Multiple
 * mode needs nothing (bvn derives the chips from the options on every
 * render). A consumer that binds its own `search` owns the text, so it is
 * left alone. A `:key` remount would also work but drops focus and the open
 * menu, so the `search` model is the cleaner hook.
 */
const rootElement = ref<HTMLElement | null>(null);
const searchText = ref("");
const consumerOwnsSearch = computed(() => attr("search", "search") !== undefined);
const boundSearch = computed<string>(() =>
  consumerOwnsSearch.value ? String(attr("search", "search")) : searchText.value,
);

// The same equality bvn uses to find the selected option (strict, or by key).
const sameValue = (optionValue: unknown, modelValue: unknown) => {
  const by = attr("by", "by");
  if (typeof by === "string") {
    return (
      (optionValue as Record<string, unknown> | null)?.[by] ===
      (modelValue as Record<string, unknown> | null)?.[by]
    );
  }
  return optionValue === modelValue;
};

// A bare `multiple` in a template arrives as "" (it is not a declared prop).
const isMultiple = computed(() => {
  const multiple = attr("multiple", "multiple");
  return multiple !== undefined && multiple !== null && multiple !== false;
});

const relabelFromOptions = () => {
  if (isMultiple.value || consumerOwnsSearch.value) return;
  const modelValue = attr("modelValue", "model-value");
  if (modelValue === null || modelValue === undefined || modelValue === "") return;
  const match = computedOptions.value
    .map(optionValueAndText)
    .find((option) => sameValue(option.value, modelValue));
  if (!match) return;
  const label = String(match.text ?? "");
  if (searchText.value === label) return;
  const input = rootElement.value?.querySelector("input");
  const userIsTyping =
    input !== null && input !== undefined && document.activeElement === input;
  if (userIsTyping && searchText.value !== String(modelValue)) return;
  searchText.value = label;
};

watch(computedOptions, relabelFromOptions);

/*
 * Provider mode (0.48.0). Text the USER types schedules one call after the
 * debounce; a newer term aborts the call in flight and retires its result.
 * The sequence number is what retires it: a call that ignores its signal and
 * resolves late still cannot overwrite a newer result.
 *
 * Only typing is a search. bvn also writes the input's text itself: the
 * selected option's label on selection, on blur and on Escape, and on mount
 * or a model change the label or, with no option to match, the raw value.
 * Those reach `update:search` exactly like typing, so a search keyed on that
 * event asked the server for "79" on mount and for the label after every
 * blur (#242 review). A native `input` event is raised only by the user, so
 * the search is scheduled from that; `update:search` only clears the
 * results when the text is emptied (the ✕, or the user deleting it), and a
 * model change cancels a search still waiting on the debounce, since the
 * user has chosen.
 */
let providerDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let providerController: AbortController | null = null;
let providerSequence = 0;

const cancelPendingProviderCall = () => {
  if (providerDebounceTimer !== null) clearTimeout(providerDebounceTimer);
  providerDebounceTimer = null;
};

const retireProviderCall = () => {
  providerSequence += 1;
  providerController?.abort();
  providerController = null;
};

const runProvider = async (term: string) => {
  const provider = props.provider;
  if (!provider) return;
  retireProviderCall();
  const sequence = providerSequence;
  const controller = new AbortController();
  providerController = controller;
  providerState.value = "searching";
  try {
    const result = await provider(term, controller.signal);
    if (sequence !== providerSequence) return;
    providerOptions.value = Array.isArray(result) ? result : [];
    providerState.value = "done";
  } catch (error) {
    if (sequence !== providerSequence || controller.signal.aborted) return;
    providerOptions.value = [];
    providerState.value = "failed";
    console.error("DAutocomplete: the provider rejected", error);
  }
};

const clearProviderResults = () => {
  cancelPendingProviderCall();
  retireProviderCall();
  providerOptions.value = [];
  providerState.value = "idle";
};

const scheduleProvider = (text: string) => {
  cancelPendingProviderCall();
  const term = text.trim();
  if (term === "") {
    clearProviderResults();
    return;
  }
  // Searching from the first keystroke, not from when the debounce lets the
  // call go: a list that still read "Type to search" for a quarter of a
  // second after typing looked unresponsive (0.48.1).
  providerState.value = "searching";
  providerDebounceTimer = setTimeout(() => {
    providerDebounceTimer = null;
    void runProvider(term);
  }, Number(props.providerDebounce));
};

/** The user typed (or cut, pasted, deleted) in the input: a search. */
const onUserInput = (event: Event) => {
  if (!hasProvider.value) return;
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) return;
  scheduleProvider(target.value);
};

/** bvn's `update:search`: the text as bvn now holds it, however it got there. */
const onSearchInput = (text: string) => {
  searchText.value = text;
  if (hasProvider.value && text.trim() === "") clearProviderResults();
};

/** The user chose (or the consumer set) a value: a search still waiting is moot. */
const onModelUpdate = () => {
  if (hasProvider.value) cancelPendingProviderCall();
};

const providerStatusText = computed(() => {
  switch (providerState.value) {
    case "searching":
      return "Searching…";
    case "done":
      return "No matches";
    case "failed":
      return "Search failed";
    default:
      return "Type to search";
  }
});

onBeforeUnmount(() => {
  cancelPendingProviderCall();
  retireProviderCall();
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
  <div
    ref="rootElement"
    class="d-autocomplete"
    :aria-busy="hasProvider && providerState === 'searching' ? 'true' : undefined"
    @input="onUserInput"
  >
    <BAutocomplete
      v-bind="$attrs"
      :search="boundSearch"
      :options="computedOptions"
      :filter-function="effectiveFilterFunction"
      :no-clear-button="noClearButton"
      @update:search="onSearchInput"
      @update:model-value="onModelUpdate"
    >
      <!-- Dynamically pass through all named slots with their props -->
      <template v-for="(_, name) in $slots" :key="name" #[name]="slotProps">
        <slot :name="name" v-bind="slotProps" />
      </template>
      <!-- What an empty provider list means, unless the consumer says. -->
      <template v-if="hasProvider && !$slots.empty" #empty>
        <div class="d-autocomplete__status text-body-secondary small px-3 py-2">
          {{ providerStatusText }}
        </div>
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
  --bs-btn-border-color: var(--d-input-border-color, var(--bs-border-color));
  --bs-btn-color: var(--bs-secondary-color);
  --bs-btn-hover-bg: var(--bs-tertiary-bg);
  --bs-btn-hover-border-color: var(--d-input-border-color, var(--bs-border-color));
  --bs-btn-hover-color: var(--bs-body-color);
  --bs-btn-active-bg: var(--bs-secondary-bg);
  --bs-btn-active-border-color: var(--d-input-border-color, var(--bs-border-color));
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
