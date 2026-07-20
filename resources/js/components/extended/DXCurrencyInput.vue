<!--
  DXCurrencyInput — the money input leaf (#152).

  A currency-symbol-prefixed numeric input with the display/model split from
  #69: the MODEL is always a plain number (or null), while the displayed text
  is padded to the minor-unit precision on blur/seed (`3.8` -> `3.80`) and
  never reformatted mid-edit. Clearing the input emits `null` — never `NaN`,
  never `""` — so "no value" is one predictable shape (#152).

  `minorUnits` (#116) edits an integer-minor-unit model (pence) as major units
  (pounds): display = model / 10^decimals, emit = round(input * 10^decimals).
  `min`/`max`/`step` and the displayed text are always in MAJOR units — only
  the model is scaled.

  DXField's `currency` field type renders this leaf; it exists standalone so a
  money input outside a form (an inline table correction, a quick filter)
  doesn't re-inline the `£`-prefix + toFixed + parse foot-guns.
-->
<template>
    <DInputGroup>
        <template #prepend>
            <span class="input-group-text">{{ currencySymbol }}</span>
        </template>
        <DFormInput
            :model-value="displayValue"
            type="number"
            :step="step ?? defaultStep"
            v-bind="$attrs"
            @input="handleInput"
            @focus="handleFocus"
            @blur="handleBlur"
        />
    </DInputGroup>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import DInputGroup from "../base/DInputGroup.vue";
import DFormInput from "../base/DFormInput.vue";

defineOptions({ inheritAttrs: false });

interface Props {
    /** The numeric model. In `minorUnits` mode this is the integer minor-unit
     *  amount (e.g. pence); otherwise the major-unit amount. `null` = empty. */
    modelValue?: number | null;
    /** Symbol shown in the prepend (default "£"). */
    currencySymbol?: string;
    /** Minor-unit decimal places the display pads to (default 2; 0 for a
     *  currency with no minor unit, e.g. JPY). */
    decimals?: number;
    /** Model is stored in integer minor units (pence) but edited in major
     *  units (pounds). Scale is 10^decimals. */
    minorUnits?: boolean;
    /** Input step in MAJOR units (default: one minor unit, e.g. 0.01). */
    step?: string | number;
}

const props = withDefaults(defineProps<Props>(), {
    modelValue: null,
    currencySymbol: "£",
    decimals: 2,
    minorUnits: false,
    step: undefined,
});

const emit = defineEmits<{
    "update:modelValue": [value: number | null];
}>();

// `decimals` is public input — clamp it to a supported non-negative integer
// so a hostile value can't throw (`10 ** -1` scaling vs `toFixed(101)`
// RangeError) or make display precision and scale disagree.
const safeDecimals = computed(() => {
    const truncated = Math.trunc(props.decimals);
    return Number.isFinite(truncated) ? Math.min(8, Math.max(0, truncated)) : 2;
});
const scale = computed(() => Math.pow(10, safeDecimals.value));
const defaultStep = computed(() => (1 / scale.value).toString());

// Model (possibly minor units) -> the major-unit display string.
function format(value: number | null | undefined): string {
    if (value === null || value === undefined || (value as any) === "") return "";
    const num = Number(value);
    if (!Number.isFinite(num)) return "";
    const major = props.minorUnits ? num / scale.value : num;
    return major.toFixed(safeDecimals.value);
}

// The shown text tracks a local ref so typing is never reformatted mid-edit
// (reactive reformatting would round "3." to "3.00" under the user's cursor);
// it only resyncs from the model while the input isn't focused. See #69.
const isFocused = ref(false);
const displayValue = ref("");

watch(
    () => [props.modelValue, props.decimals, props.minorUnits] as const,
    () => {
        if (isFocused.value) return;
        displayValue.value = format(props.modelValue);
    },
    { immediate: true },
);

function handleFocus(): void {
    isFocused.value = true;
}

function handleInput(event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    displayValue.value = raw;
    if (raw.trim() === "") {
        emit("update:modelValue", null);
        return;
    }
    const num = Number(raw);
    if (!Number.isFinite(num)) {
        emit("update:modelValue", null);
        return;
    }
    emit("update:modelValue", props.minorUnits ? toMinorUnits(num) : num);
}

// Major units -> integer minor units, decimal-safely. A bare
// `Math.round(num * scale)` is wrong at half-unit boundaries: 19.99 * 100 is
// 1998.9999… (fine, rounds up) but 1.005 * 100 is 100.4999… and silently
// drops to 100, and negative halves round toward +∞ (-0.005 → -0). So the
// float product is first snapped back to its decimal value (toPrecision), and
// halves round AWAY FROM ZERO — the accounting convention, symmetric in sign.
function toMinorUnits(major: number): number {
    const scaled = Number((major * scale.value).toPrecision(12));
    const rounded = Math.sign(scaled) * Math.round(Math.abs(scaled));
    return rounded === 0 ? 0 : rounded; // normalise -0
}

// Consumer listeners (@blur, @focus, @input) arrive through `$attrs` and are
// merged onto the inner input by Vue alongside these internal handlers, so no
// re-emit is needed (re-emitting would double-fire them).
function handleBlur(): void {
    isFocused.value = false;
    displayValue.value = format(props.modelValue);
}
</script>
