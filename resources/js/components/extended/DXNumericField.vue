<!--
  @component (internal — not exported)
  The numeric control family for DXField: `currency`, `percentage`, `number`.
  Extracted from DXField (#135) unchanged. The parent DXField still owns the
  value/guards/`setValue` coercion — this component only renders the control and
  emits the raw edited value back up. The `percentage` `asFraction` display
  scaling (model holds a 0–1 fraction, input shows 0–100) lives here because it
  is purely presentational to this control. A field's `prepend`/`append`
  (resolved by DXField) go to the currency's `append`, or wrap a number or
  percentage in DXFieldAffixGroup; without them each control renders as it
  did before they existed.
-->
<template>
    <!-- Currency: the DXCurrencyInput leaf (#152) owns the symbol prepend, the
         blur-padded display (#69), empty -> null, and the minor-units model
         scaling (#116). -->
    <DXCurrencyInput
        v-if="field.type === 'currency'"
        :model-value="modelValue"
        :currency-symbol="field.currencySymbol || '£'"
        :decimals="field.decimals ?? 2"
        :minor-units="field.minorUnits ?? false"
        :step="field.step"
        :required="field.required"
        :placeholder="field.placeholder"
        :min="field.min"
        :max="field.max"
        :state="state"
        :disabled="isDisabled"
        :readonly="isReadonly || isPlaintext"
        :plaintext="isPlaintext"
        :append="append"
        v-bind="inputProps"
        @update:model-value="emit('update:modelValue', $event)"
    />

    <!-- Number or percentage with the field's own `prepend`/`append`: the
         input inside a DXFieldAffixGroup. A percentage's trailing cell is
         its `append`, "%" by default. Only a field WITH an affix takes this
         branch, so the two below keep their markup. -->
    <DXFieldAffixGroup
        v-else-if="hasAffixes"
        v-slot="{ describedBy }"
        :prepend="prepend"
        :append="trailingAffix"
        :plaintext="isPlaintext"
        :value="numericInputValue"
        :consumer-described-by="inputProps?.['aria-describedby']"
    >
        <DFormInput
            v-model="numericInputValue"
            type="number"
            :required="field.required"
            :placeholder="field.placeholder"
            :step="field.step"
            :min="field.min"
            :max="field.max"
            :state="state"
            :disabled="isDisabled"
            :readonly="isReadonly || isPlaintext"
            :plaintext="isPlaintext"
            v-bind="inputProps"
            :aria-describedby="describedBy"
        />
    </DXFieldAffixGroup>

    <!-- Percentage: numeric input with an affix -->
    <DInputGroup v-else-if="field.type === 'percentage'">
        <DFormInput
            v-model="numericInputValue"
            type="number"
            :required="field.required"
            :placeholder="field.placeholder"
            :step="field.step"
            :min="field.min"
            :max="field.max"
            :state="state"
            :disabled="isDisabled"
            :readonly="isReadonly || isPlaintext"
            :plaintext="isPlaintext"
            v-bind="inputProps"
        />

        <template #append>
            <span class="input-group-text">%</span>
        </template>
    </DInputGroup>

    <!-- Number -->
    <DFormInput
        v-else
        :model-value="modelValue"
        type="number"
        :required="field.required"
        :placeholder="field.placeholder"
        :step="field.step"
        :min="field.min"
        :max="field.max"
        :state="state"
        :disabled="isDisabled"
        :readonly="isReadonly || isPlaintext"
        :plaintext="isPlaintext"
        v-bind="inputProps"
        @update:model-value="emit('update:modelValue', $event)"
    />
</template>

<script setup lang="ts">
import { computed } from "vue";
import DFormInput from "../base/DFormInput.vue";
import DInputGroup from "../base/DInputGroup.vue";
import DXCurrencyInput from "./DXCurrencyInput.vue";
import DXFieldAffixGroup from "./DXFieldAffixGroup.vue";
import type { FieldDefinition } from "../../types";

interface Props {
    /** Field definition (type currency/percentage/number + numeric options). */
    field: FieldDefinition;

    /** Current model value. */
    modelValue: any;

    /** Validation state passed to the control. */
    state?: boolean | null;

    /** Disabled state (`isDisabled`). */
    isDisabled?: boolean;

    /** Readonly state (`isReadonly`). */
    isReadonly?: boolean;

    /** Plaintext (display-only) state (`isPlaintext`). */
    isPlaintext?: boolean;

    /** Escape-hatch input props, already guard-merged by DXField. */
    inputProps?: Record<string, any>;

    /** The field's resolved `prepend` (number and percentage only). */
    prepend?: string;

    /** The field's resolved `append`: the currency's trailing unit, the
     *  percentage's trailing cell in place of "%", or the number's unit. */
    append?: string;
}

const props = defineProps<Props>();

// Currency renders its own affixes (DXCurrencyInput: the symbol, `append`).
const hasAffixes = computed(
    () =>
        props.field.type !== "currency" &&
        (Boolean(props.prepend) || Boolean(props.append)),
);

const trailingAffix = computed(() =>
    props.field.type === "percentage" ? props.append || "%" : props.append,
);

const emit = defineEmits<{
    (event: "update:modelValue", value: any): void;
}>();

// For `percentage` fields with `asFraction`, the model holds a 0–1 fraction but
// the input shows/edits a 0–100 percentage. Scale on read/write, rounding away
// binary-float artefacts (0.2 * 100 = 20.000000000000004). Currency and plain
// percentage fields pass straight through.
const isFractionPercentage = computed(
    () => props.field.type === "percentage" && props.field.asFraction === true,
);

const numericInputValue = computed({
    get: () => {
        const value = props.modelValue;
        if (!isFractionPercentage.value) return value;
        if (value === null || value === undefined || value === "") return value;
        const num = Number(value);
        if (!Number.isFinite(num)) return value;
        return Math.round(num * 100 * 1e6) / 1e6;
    },
    set: (value: any) => {
        if (!isFractionPercentage.value) {
            emit("update:modelValue", value);
            return;
        }
        if (value === null || value === undefined || value === "") {
            emit("update:modelValue", value);
            return;
        }
        const num = Number(value);
        if (!Number.isFinite(num)) {
            emit("update:modelValue", value);
            return;
        }
        emit("update:modelValue", Math.round((num / 100) * 1e9) / 1e9);
    },
});
</script>
