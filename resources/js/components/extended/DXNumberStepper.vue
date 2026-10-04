<!--
  DXNumberStepper — a number input between a decrease and an increase button.

  `[ − ][ 12 ][ + ]` as one input group, for quantities that are usually
  nudged rather than typed (cases on an order line, covers on a booking).

  - The model is a number, or `null` when the input is empty (never `NaN`,
    never `""`). Every step and every valid keystroke emits `update:modelValue`;
    debounce on the consumer's side if each change saves.
  - A step adds or subtracts `step` from the current value and clamps to
    `min`/`max`. It does not snap to a grid, so 1.05 + 0.1 is 1.15. The sum is
    rounded to the decimal places of the value and step, so 0.1 three times is
    0.3, not 0.30000000000000004. From empty, a step goes to the in-range value
    nearest zero.
  - The button at a bound is disabled (decrease at `min`, increase at `max`).
  - Typing is free: the value is emitted as typed, even out of range, and is
    CLAMPED ON BLUR to `min`/`max` (emitting the clamped value). Half-typed
    input the browser cannot parse ("-", "1e") emits nothing until it parses.
  - ArrowUp/ArrowDown on the input go through the same step as the buttons
    (the browser's own spin-button stepping snaps to a grid; this does not).
    The native spin arrows are hidden. The buttons are `tabindex="-1"`, so a
    list of steppers is one Tab stop each; keyboard users step with the arrows.
  - The buttons are square icon buttons at the input's height (never narrower
    than tall), soft `secondary` like other in-row actions, labelled
    "Decrease"/"Increase" plus the input's `aria-label` when it has one.

  `class` and `style` go on the group; every other attribute (`aria-label`,
  `name`, `id`, `placeholder`, `required`, `state`, listeners…) goes on the
  input. Styles live in theme.scss under `.dx-number-stepper`.
-->
<template>
    <DInputGroup
        :size="groupSize"
        :class="['dx-number-stepper', attrs.class]"
        :style="attrs.style as StyleValue"
    >
        <template #prepend>
            <DButton
                class="dx-number-stepper__decrease"
                variant="secondary"
                icon="dash-lg"
                icon-only
                :size="groupSize"
                :disabled="disabled || isAtMin"
                :aria-label="decreaseAriaLabel"
                tabindex="-1"
                @click="stepBy(-1)"
            />
        </template>
        <DFormInput
            v-bind="inputAttrs"
            :model-value="displayValue"
            type="number"
            inputmode="decimal"
            :min="min"
            :max="max"
            :step="step"
            :disabled="disabled"
            class="dx-number-stepper__input"
            @input="handleInput"
            @focus="isFocused = true"
            @blur="handleBlur"
            @keydown="handleKeydown"
        />
        <template #append>
            <DButton
                class="dx-number-stepper__increase"
                variant="secondary"
                icon="plus-lg"
                icon-only
                :size="groupSize"
                :disabled="disabled || isAtMax"
                :aria-label="increaseAriaLabel"
                tabindex="-1"
                @click="stepBy(1)"
            />
        </template>
    </DInputGroup>
</template>

<script setup lang="ts">
import { computed, ref, useAttrs, watch } from "vue";
import type { StyleValue } from "vue";
import DInputGroup from "../base/DInputGroup.vue";
import DFormInput from "../base/DFormInput.vue";
import DButton from "../base/DButton.vue";

defineOptions({ inheritAttrs: false });

interface Props {
    /** The value (v-model). `null` when the input is empty. */
    modelValue?: number | null;
    /** Lowest value; the decrease button disables here and blur clamps to it. */
    min?: number;
    /** Highest value; the increase button disables here and blur clamps to it. */
    max?: number;
    /** How much one press (or ArrowUp/ArrowDown) changes the value. @default 1 */
    step?: number;
    /** Control size, matching the other inputs. @default 'md' */
    size?: "sm" | "md" | "lg";
    /** Disable the input and both buttons. */
    disabled?: boolean;
    /** Override the decrease button's accessible label. Default: "Decrease", plus the input's aria-label. */
    decreaseLabel?: string;
    /** Override the increase button's accessible label. Default: "Increase", plus the input's aria-label. */
    increaseLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
    modelValue: null,
    min: undefined,
    max: undefined,
    step: 1,
    size: "md",
    disabled: false,
    decreaseLabel: undefined,
    increaseLabel: undefined,
});

const emit = defineEmits<{
    "update:modelValue": [value: number | null];
}>();

const attrs = useAttrs();

// `class`/`style` belong to the group; everything else is for the input.
const inputAttrs = computed(() => {
    const { class: _class, style: _style, ...rest } = attrs;
    return rest;
});

// bvn's Size has no 'md' (it is the default), so md means "no size".
const groupSize = computed(() => (props.size === "md" ? undefined : props.size));

const fieldLabel = computed(() => {
    const label = attrs["aria-label"];
    return typeof label === "string" && label.trim() !== "" ? label.trim() : "";
});
const decreaseAriaLabel = computed(
    () => props.decreaseLabel ?? (fieldLabel.value === "" ? "Decrease" : `Decrease ${fieldLabel.value}`),
);
const increaseAriaLabel = computed(
    () => props.increaseLabel ?? (fieldLabel.value === "" ? "Increase" : `Increase ${fieldLabel.value}`),
);

// The value the buttons step from: the last value emitted or received.
const currentValue = ref<number | null>(props.modelValue);
// The shown text tracks a local ref so typing is never rewritten mid-edit
// ("0." must not become "0"); it resyncs from the model while not focused.
const displayValue = ref(format(props.modelValue));
const isFocused = ref(false);

watch(
    () => props.modelValue,
    (value) => {
        currentValue.value = value;
        if (!isFocused.value) displayValue.value = format(value);
    },
);

const isAtMin = computed(
    () => props.min !== undefined && currentValue.value !== null && currentValue.value <= props.min,
);
const isAtMax = computed(
    () => props.max !== undefined && currentValue.value !== null && currentValue.value >= props.max,
);

function format(value: number | null | undefined): string {
    if (value === null || value === undefined || !Number.isFinite(value)) return "";
    return String(value);
}

/** Decimal places in a number's shortest representation (handles 1e-7). */
function decimalPlaces(value: number): number {
    if (!Number.isFinite(value)) return 0;
    const [mantissa, exponent] = String(value).split("e");
    const fraction = mantissa.split(".")[1] ?? "";
    const places = fraction.length - (exponent === undefined ? 0 : Number(exponent));
    return Math.min(20, Math.max(0, places));
}

function clamp(value: number): number {
    let clamped = value;
    if (props.min !== undefined && clamped < props.min) clamped = props.min;
    if (props.max !== undefined && clamped > props.max) clamped = props.max;
    return clamped;
}

function commit(value: number | null): void {
    currentValue.value = value;
    displayValue.value = format(value);
    emit("update:modelValue", value);
}

function stepBy(direction: 1 | -1): void {
    if (props.disabled) return;
    const stepSize = Number.isFinite(props.step) && props.step > 0 ? props.step : 1;
    const from = currentValue.value;
    if (from === null) {
        commit(clamp(0));
        return;
    }
    const places = Math.max(decimalPlaces(from), decimalPlaces(stepSize));
    const next = clamp(Number((from + direction * stepSize).toFixed(places)));
    if (next !== from) commit(next);
}

function handleInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    const raw = target.value;
    displayValue.value = raw;
    if (raw.trim() === "") {
        // A number input reports "" for unparseable text too ("-", "1e");
        // wait for it to parse rather than emitting null mid-typing.
        if (target.validity?.badInput) return;
        currentValue.value = null;
        emit("update:modelValue", null);
        return;
    }
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return;
    currentValue.value = parsed;
    emit("update:modelValue", parsed);
}

// Consumer @blur/@focus/@keydown listeners arrive through `inputAttrs` and are
// merged with these by Vue, so they are not re-emitted.
function handleBlur(): void {
    isFocused.value = false;
    const value = currentValue.value;
    if (value !== null && clamp(value) !== value) {
        commit(clamp(value));
        return;
    }
    displayValue.value = format(value);
}

function handleKeydown(event: KeyboardEvent): void {
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
    event.preventDefault();
    stepBy(event.key === "ArrowUp" ? 1 : -1);
}
</script>
