<!--
  @component
  DXSwitch — a "filled box" toggle switch.

  An opinionated switch built on `DFormCheckbox` (`switch`): a bordered box sized
  like a `.form-control` with the label on the left and the toggle on the right,
  colour-coding its state. By default (`onVariant="success"`) it reads the house
  green-on / red-off style — a neutral box + red toggle when off, a soft-green
  box + green toggle when on. `onVariant="neutral"` (brand primary on / grey off)
  is for semantically-mixed switches that shouldn't imply good/bad (#158). Used
  standalone or, internally, by `DXField`'s `switch` field type so a form switch
  and a lone switch share one look.

  Usage:
  ```vue
  <DXSwitch v-model="isCurrent" label="Product is current" />
  ```

  For a form field, prefer a `DXField`/`DXForm` `type: 'switch'`; reach for
  `DXSwitch` directly when you want the styled toggle outside a form. Pass a
  `label` prop for simple text, or the default slot for richer label content.
-->
<template>
  <div class="dx-switch" :class="[`dx-switch--${onVariant}`, { 'dx-switch--on': isOn }]">
    <!-- For the neutral variant, tag the inner `.form-switch` with
         `switch-neutral` so the global theme restores grey-off / primary-on for
         the toggle itself (the box styling below handles the wrapper). -->
    <DFormCheckbox
      v-model="model"
      switch
      :class="onVariant === 'neutral' ? 'switch-neutral' : undefined"
      v-bind="$attrs"
    >
      <!--
        @slot Label content shown beside the toggle. Falls back to the contextual
        text / `label` prop. Scoped with the current on-state so a caller can vary
        rich content by state; DXField passes a richer label element here.
        @binding {boolean} on Whether the switch is currently on.
      -->
      <slot :on="isOn"><span>{{ displayText }}</span></slot>
    </DFormCheckbox>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import DFormCheckbox from "../base/DFormCheckbox.vue";

interface Props {
  /** Whether the switch is on. */
  modelValue?: boolean;
  /** Static text beside the toggle; the fallback when no contextual text applies. */
  label?: string;
  /** Text shown when on — overrides `label` in the on state (e.g. "Product is current"). */
  textWhenTrue?: string;
  /** Text shown when off — overrides `label` in the off state (e.g. "Product is not current"). */
  textWhenFalse?: string;
  /**
   * On-state colour. `"success"` (default) reads the house green-on / red-off
   * style — an active/enabled/good switch ("Product is current", "Stock is
   * tracked", "Visible"). `"neutral"` is for semantically-mixed switches
   * ("contains alcohol", an allergen toggle, "hidden on web shop") that
   * shouldn't imply good/bad — it uses the brand primary on / grey off (#158).
   */
  onVariant?: "success" | "neutral";
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  onVariant: "success",
});

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
}>();

const isOn = computed(() => props.modelValue);

// A switch (unlike a checkbox) can say what each state *means*: prefer the
// state-specific text, falling back to the static `label`. Ignored when the
// default slot supplies its own content.
const displayText = computed(() => {
  const contextual = isOn.value ? props.textWhenTrue : props.textWhenFalse;
  return contextual ?? props.label ?? "";
});

// Proxy the v-model so the underlying bvn checkbox's update re-emits as this
// component's `update:modelValue`. Expects a real boolean — callers that hold a
// truthy non-boolean (e.g. a Laravel-serialised `1`) should normalise first;
// DXField does this before binding.
const model = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit("update:modelValue", value),
});

defineOptions({
  inheritAttrs: false,
});
</script>

<style scoped>
/* A compact "filled box" toggle, sized to its content — it doesn't stretch to
   fill the form row — but matching standard input height so it lines up with
   sibling text/select fields. Colour-codes its state: a neutral box when off, a
   filled primary box when on. The label sits on the left and the toggle on the
   right. Renders the underlying `.form-check` (from the switch checkbox) as the
   box. `justify-content: space-between` on a full-width box used to leave a wide
   unclickable gap between the label and the toggle (only the tiny toggle itself
   was a real click target); shrinking the box to fit its content removes that
   dead zone entirely. Uses block-level `flex` (not `inline-flex`) so the box
   stays shrink-to-fit yet still takes its own line: an inline-level box let a
   following `<small class="form-text">` hint flow inline beside it instead of
   dropping below the control like every other field type (#79).

   Scoped `:deep()` anchored on the plain `.dx-switch` root, so the scope-id
   reliably reaches the bvn-rendered `.form-check` (see the scoped-deep-styles
   guard test and CLAUDE.md). */
.dx-switch :deep(.form-check) {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: fit-content;
  max-width: 100%; /* wrap/ellipsize rather than overflow a narrow field */
  min-height: var(--dx-input-height, calc(1.5em + 0.75rem + 2px)); /* match .form-control height */
  margin: 0;
  /* Override Bootstrap `.form-switch`'s 2.5em left padding for the floated input. */
  padding: 0.375rem 0.75rem;
  border: 1px solid var(--bs-border-color);
  border-radius: var(--bs-border-radius);
  background-color: var(--bs-body-bg);
  transition: background-color 0.15s ease-in-out, border-color 0.15s ease-in-out;
}

/* Label on the left, toggle on the right (DOM order is input then label). */
.dx-switch :deep(.form-check-label) {
  order: 1;
  margin: 0;
  color: var(--bs-secondary-color);
  cursor: pointer;
  transition: color 0.15s ease-in-out;
}

.dx-switch :deep(.form-check-input) {
  order: 2;
  flex-shrink: 0;
  /* Override `.form-switch`'s negative left margin now that we're flex-laid-out. */
  margin: 0;
  cursor: pointer;
}

/* On-state box: emphasise the active state as a coloured panel. `success` (the
   default, #158) is a soft-green panel — an active/enabled/good switch reads
   green; `neutral` is the brand primary panel for mixed-semantics switches. The
   TOGGLE itself is coloured by the global theme (green-on / red-off for the
   default, grey-off / primary-on for `.switch-neutral`), so here we only style
   the wrapper box + label. The off-state box stays neutral grey. */
.dx-switch--success.dx-switch--on :deep(.form-check) {
  background-color: var(--dx-success-soft-bg);
  border-color: var(--dx-success-emphasis);
}

.dx-switch--success.dx-switch--on :deep(.form-check-label) {
  color: var(--dx-success-soft-text);
  font-weight: 500;
}

.dx-switch--neutral.dx-switch--on :deep(.form-check) {
  background-color: var(--bs-primary-bg-subtle);
  border-color: var(--bs-primary);
}

.dx-switch--neutral.dx-switch--on :deep(.form-check-label) {
  color: var(--bs-primary-text-emphasis);
  font-weight: 500;
}
</style>
