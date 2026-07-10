/**
 * @component
 * Type-safe wrapper around Bootstrap Vue Next BFormSelect.
 *
 * Adds one behaviour BVN lacks: a `select` option whose value is `null`
 * round-trips correctly. BVN renders each option's value as a plain HTML
 * `value` attribute, so when that value is `null` Vue omits the attribute and
 * the browser falls back to using the option's *text* as its DOM value — a
 * model bound to `null` then matches no option and the select renders blank.
 *
 * We map a `null` option value (and a `null` model) to a private string
 * sentinel so BVN renders a real value attribute, while keeping the consumer's
 * model and emitted value as `null`. Legacy Bootstrap-Vue (BS4) handled this;
 * BVN does not. (Radios likely need the same treatment — see #81.)
 */
<script setup lang="ts" generic="T = unknown">
import { BFormSelect } from "bootstrap-vue-next";
import { computed, useSlots } from "vue";

// Mirrors the shapes BVN's BFormSelect accepts per option (primitive, object, or
// group). Only object options can carry a `null` value.
export type OptionItem = string | number | boolean | Record<string, unknown>;

export interface Props<TValue = unknown> {
  modelValue?: TValue | TValue[] | null;
  options?: readonly OptionItem[];
  /** Key on object options that holds the value (BVN default: "value"). */
  valueField?: string;
  /** Key on object options that holds nested options / groups (BVN default: "options"). */
  optionsField?: string;
}

// A stable private value that stands in for a `null` option/model. Chosen to be
// vanishingly unlikely to collide with a real option value.
const NULL_SENTINEL = "__dfl_null_option_sentinel__";

const props = withDefaults(defineProps<Props<T>>(), {
  valueField: "value",
  optionsField: "options",
});

const emit = defineEmits<{
  "update:modelValue": [value: T | T[] | null];
}>();

const slots = useSlots();

const encodeValue = (value: unknown): unknown =>
  value === null ? NULL_SENTINEL : value;

const decodeValue = (value: unknown): unknown =>
  value === NULL_SENTINEL ? null : value;

const isPlainOptionObject = (option: unknown): option is Record<string, unknown> =>
  typeof option === "object" && option !== null && !Array.isArray(option);

// Replace any option whose resolved value is `null` with the sentinel. Recurses
// into option groups. Primitive options (string/number/boolean) can't be null.
const encodeOptions = (options: readonly OptionItem[]): OptionItem[] =>
  options.map((option) => {
    if (!isPlainOptionObject(option)) {
      return option;
    }

    const nested = option[props.optionsField];
    if (Array.isArray(nested)) {
      return { ...option, [props.optionsField]: encodeOptions(nested) };
    }

    if (option[props.valueField] === null) {
      return { ...option, [props.valueField]: NULL_SENTINEL };
    }

    return option;
  });

const encodedOptions = computed<OptionItem[] | undefined>(() =>
  props.options === undefined ? undefined : encodeOptions(props.options),
);

const encodedModel = computed<unknown>(() => {
  const model = props.modelValue;
  if (Array.isArray(model)) {
    return model.map(encodeValue);
  }
  return encodeValue(model);
});

const onUpdateModelValue = (value: unknown): void => {
  const decoded = Array.isArray(value) ? value.map(decodeValue) : decodeValue(value);
  emit("update:modelValue", decoded as T | T[] | null);
};

defineOptions({
  inheritAttrs: false,
});
</script>

<template>
  <BFormSelect
    v-bind="$attrs"
    :model-value="encodedModel"
    :options="encodedOptions"
    :value-field="valueField"
    :options-field="optionsField"
    @update:model-value="onUpdateModelValue"
  >
    <template v-for="(_, name) in slots" :key="name" #[name]="slotProps">
      <slot :name="name" v-bind="slotProps" />
    </template>
  </BFormSelect>
</template>
