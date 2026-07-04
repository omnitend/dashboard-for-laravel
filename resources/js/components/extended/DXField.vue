<template>
    <!-- Full-width span field: delegate entirely to the #span slot -->
    <div v-if="field.span" :class="field.class || 'mb-3'">
        <slot
            name="span"
            :field="field"
            :model="model"
            :value="fieldValue"
            :update="setValue"
        />
    </div>

    <!-- Checkbox: no label wrapper, label sits beside the control -->
    <div v-else-if="field.type === 'checkbox'" :class="field.class || 'mb-3'">
        <slot
            v-if="$slots.value"
            name="value"
            :field="field"
            :model="model"
            :value="fieldValue"
            :update="setValue"
        />
        <DFormCheckbox
            v-else
            v-model="fieldValue"
            :disabled="isDisabled || isReadonly"
            v-bind="field.inputProps"
        >
            {{ resolvedLabel }}
        </DFormCheckbox>

        <DFormInvalidFeedback v-if="form.hasError(errorKey)" force-show>
            {{ form.getError(errorKey) }}
        </DFormInvalidFeedback>
        <slot name="info" :field="field" :model="model" />
        <DFormText v-if="resolvedHint" class="text-muted">
            <slot name="hint" :field="field" :model="model">{{ resolvedHint }}</slot>
        </DFormText>
        <DFormText v-if="field.help">{{ field.help }}</DFormText>
    </div>

    <!-- Repeater: nested, repeatable sub-form -->
    <div v-else-if="field.type === 'repeater'" :class="field.class || 'mb-3'">
        <DFormGroup :label="resolvedLabel">
            <DXRepeater
                :form="form"
                :field="field"
                :key-path="keyPath"
                :model="model"
            >
                <!-- Forward repeater row slot for custom row layouts -->
                <template v-if="$slots['repeater-row']" #row="rowProps">
                    <slot name="repeater-row" v-bind="rowProps" />
                </template>
            </DXRepeater>
        </DFormGroup>
        <slot name="info" :field="field" :model="model" />
        <DFormText v-if="resolvedHint" class="text-muted">
            <slot name="hint" :field="field" :model="model">{{ resolvedHint }}</slot>
        </DFormText>
        <DFormText v-if="field.help">{{ field.help }}</DFormText>
    </div>

    <!-- Standard labelled field -->
    <DFormGroup v-else :label="resolvedLabel" :class="field.class || 'mb-3'">
        <!-- Custom value slot overrides the built-in control -->
        <slot
            v-if="$slots.value"
            name="value"
            :field="field"
            :model="model"
            :value="fieldValue"
            :update="setValue"
        />

        <!-- Component escape hatch -->
        <component
            :is="field.component"
            v-else-if="field.type === 'component' && field.component"
            v-model="fieldValue"
            :field="field"
            :model="model"
            :disabled="isDisabled || isReadonly"
            v-bind="field.inputProps"
        />

        <!-- Textarea. Error clearing happens in the v-model setter. -->
        <DFormTextarea
            v-else-if="field.type === 'textarea'"
            v-model="fieldValue"
            :required="field.required"
            :placeholder="field.placeholder"
            :rows="field.rows || 3"
            :state="fieldState"
            :disabled="isDisabled"
            :readonly="isReadonly"
            v-bind="field.inputProps"
        />

        <!-- Select (sync or async options) -->
        <DFormSelect
            v-else-if="field.type === 'select'"
            v-model="fieldValue"
            :required="field.required"
            :options="resolvedOptions"
            :state="fieldState"
            :disabled="isDisabled || isReadonly"
            v-bind="field.inputProps"
        />

        <!-- Radio group -->
        <DFormRadioGroup
            v-else-if="field.type === 'radio'"
            v-model="fieldValue"
            :options="resolvedOptions"
            :required="field.required"
            :state="fieldState"
            :disabled="isDisabled || isReadonly"
            v-bind="field.inputProps"
        />

        <!-- File / image upload -->
        <div v-else-if="field.type === 'image' || field.type === 'file'">
            <DFormInput
                type="file"
                :accept="field.accept || (field.type === 'image' ? 'image/*' : undefined)"
                :required="field.required"
                :state="fieldState"
                :disabled="isDisabled || isReadonly"
                v-bind="field.inputProps"
                @change="handleFileChange"
            />
            <img
                v-if="field.type === 'image' && imagePreview"
                :src="imagePreview"
                alt="Preview"
                class="dx-field-image-preview mt-2"
            />
        </div>

        <!-- Currency / percentage: numeric input with an affix -->
        <DInputGroup v-else-if="field.type === 'currency' || field.type === 'percentage'">
            <template v-if="field.type === 'currency'" #prepend>
                <span class="input-group-text">{{ field.currencySymbol || "£" }}</span>
            </template>
            <DFormInput
                v-model="numericInputValue"
                type="number"
                :required="field.required"
                :placeholder="field.placeholder"
                :step="field.step ?? (field.type === 'currency' ? '0.01' : undefined)"
                :min="field.min"
                :max="field.max"
                :state="fieldState"
                :disabled="isDisabled"
                :readonly="isReadonly"
                v-bind="field.inputProps"
            />
            <template v-if="field.type === 'percentage'" #append>
                <span class="input-group-text">%</span>
            </template>
        </DInputGroup>

        <!-- Text-based inputs (text/email/password/number/url/tel/date/time/datetime) -->
        <DFormInput
            v-else
            v-model="fieldValue"
            :type="inputType"
            :required="field.required"
            :placeholder="field.placeholder"
            :step="field.step"
            :min="field.min"
            :max="field.max"
            :state="fieldState"
            :disabled="isDisabled"
            :readonly="isReadonly"
            v-bind="field.inputProps"
        />

        <!-- Validation error -->
        <DFormInvalidFeedback v-if="form.hasError(errorKey)" force-show>
            {{ form.getError(errorKey) }}
        </DFormInvalidFeedback>

        <!-- Optional rich info block -->
        <slot name="info" :field="field" :model="model" />

        <!-- Hint (dynamic, slot-overridable) -->
        <DFormText v-if="resolvedHint || $slots.hint" class="text-muted">
            <slot name="hint" :field="field" :model="model">{{ resolvedHint }}</slot>
        </DFormText>

        <!-- Static help text -->
        <DFormText v-if="field.help">{{ field.help }}</DFormText>
    </DFormGroup>
</template>

<script setup lang="ts">
import {
    computed,
    defineAsyncComponent,
    onBeforeUnmount,
    onMounted,
    ref,
    watch,
} from "vue";
import DFormGroup from "../base/DFormGroup.vue";
import DFormInput from "../base/DFormInput.vue";
import DFormTextarea from "../base/DFormTextarea.vue";
import DFormSelect from "../base/DFormSelect.vue";
import DFormRadioGroup from "../base/DFormRadioGroup.vue";
import DFormCheckbox from "../base/DFormCheckbox.vue";
import DFormInvalidFeedback from "../base/DFormInvalidFeedback.vue";
import DFormText from "../base/DFormText.vue";
import DInputGroup from "../base/DInputGroup.vue";
import type { UseFormReturn } from "../../composables/useForm";
import type { FieldDefinition, FieldOption, FieldType } from "../../types";
import { getByPath, setByPath } from "../../utils/objectPath";

// Async to break the DXField <-> DXRepeater circular import.
const DXRepeater = defineAsyncComponent(() => import("./DXRepeater.vue"));

interface Props {
    /** Field definition to render */
    field: FieldDefinition;

    /** Form instance owning the field's data and errors */
    form: UseFormReturn<any>;

    /**
     * Model passed to predicates (label/hint/when/disabled/readonly).
     * Defaults to the live form data; a parent may widen it (e.g. a table
     * merging the original row).
     */
    model?: any;

    /** Dot path into form.data for the value (defaults to field.key). */
    keyPath?: string;

    /** Error key for validation lookups (defaults to keyPath/field.key). */
    errorKey?: string;
}

const props = defineProps<Props>();

const effectiveModel = computed(() => props.model ?? props.form.data);

// Path semantics (getByPath/setByPath) are only used when a parent passes an
// explicit keyPath (e.g. a repeater binding `lines.0.price`). For top-level
// fields the key is used literally, so a field whose key legitimately contains
// a dot (e.g. "user.email") still maps to form.data["user.email"].
const usePathSemantics = computed(() => props.keyPath !== undefined);
const valuePath = computed(() => props.keyPath ?? props.field.key);
const errorKey = computed(
    () => props.errorKey ?? props.keyPath ?? props.field.key,
);

/** Resolve a value-or-function against the current model. */
function resolveMaybe<TValue>(
    value: TValue | ((model: any) => TValue) | undefined,
): TValue | undefined {
    if (typeof value === "function") {
        return (value as (model: any) => TValue)(effectiveModel.value);
    }
    return value;
}

const fieldValue = computed({
    get: () =>
        usePathSemantics.value
            ? getByPath(props.form.data, valuePath.value)
            : (props.form.data as Record<string, any>)[props.field.key],
    set: (value: any) => setValue(value),
});

// For `percentage` fields with `asFraction`, the model holds a 0–1 fraction but
// the input shows/edits a 0–100 percentage. Scale on read/write, rounding away
// binary-float artefacts (0.2 * 100 = 20.000000000000004). Currency and plain
// percentage fields pass straight through.
const isFractionPercentage = computed(
    () => props.field.type === "percentage" && props.field.asFraction === true,
);

const numericInputValue = computed({
    get: () => {
        const value = fieldValue.value;
        if (!isFractionPercentage.value) return value;
        if (value === null || value === undefined || value === "") return value;
        const num = Number(value);
        if (!Number.isFinite(num)) return value;
        return Math.round(num * 100 * 1e6) / 1e6;
    },
    set: (value: any) => {
        if (!isFractionPercentage.value) {
            setValue(value);
            return;
        }
        if (value === null || value === undefined || value === "") {
            setValue(value);
            return;
        }
        const num = Number(value);
        if (!Number.isFinite(num)) {
            setValue(value);
            return;
        }
        setValue(Math.round((num / 100) * 1e9) / 1e9);
    },
});

const NUMERIC_TYPES: ReadonlySet<FieldType> = new Set([
    "number",
    "currency",
    "percentage",
]);

function setValue(value: any): void {
    let next = value;
    // Native number inputs emit strings; keep numeric field types numeric so
    // the API and any client-side maths see numbers, not "12.50".
    if (
        NUMERIC_TYPES.has(props.field.type) &&
        typeof value === "string" &&
        value.trim() !== ""
    ) {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) next = parsed;
    }
    if (usePathSemantics.value) {
        setByPath(props.form.data, valuePath.value, next);
    } else {
        (props.form.data as Record<string, any>)[props.field.key] = next;
    }
    props.form.clearError(errorKey.value);
}

const fieldState = computed(() => props.form.getState(errorKey.value));

const resolvedLabel = computed(
    () => resolveMaybe(props.field.label) ?? props.field.key,
);

const resolvedHint = computed(() => resolveMaybe(props.field.hint));

const isDisabled = computed(() => {
    if (props.field.disabledWhen) {
        return props.field.disabledWhen(effectiveModel.value);
    }
    return resolveMaybe(props.field.disabled) ?? false;
});

const isReadonly = computed(() => resolveMaybe(props.field.readonly) ?? false);

const inputType = computed<string>(() => {
    const type: FieldType = props.field.type;
    if (type === "datetime") return "datetime-local";
    return type;
});

// ————————————————— async options

const loadedOptions = ref<FieldOption[] | null>(null);

const resolvedOptions = computed<FieldOption[] | undefined>(
    () => loadedOptions.value ?? props.field.options,
);

// Monotonic token so out-of-order async responses can't clobber newer ones.
let optionsRequestToken = 0;

async function loadOptions(): Promise<void> {
    if (!props.field.optionsLoader) return;
    const token = ++optionsRequestToken;
    try {
        const options = await props.field.optionsLoader(effectiveModel.value);
        // Ignore a stale response superseded by a newer load.
        if (token === optionsRequestToken) loadedOptions.value = options;
    } catch (error) {
        // Swallow loader failures: keep the last successfully loaded options
        // (or the static `field.options` fallback when none have loaded yet).
        if (token === optionsRequestToken) {
            // eslint-disable-next-line no-console
            console.error(
                `optionsLoader failed for field "${props.field.key}"`,
                error,
            );
        }
    }
}

onMounted(() => {
    void loadOptions();
});

if (props.field.reloadOptionsOnChange) {
    watch(effectiveModel, () => void loadOptions(), { deep: true });
}

// ————————————————— image preview

const objectUrl = ref<string | null>(null);

const imagePreview = computed<string | null>(() => {
    if (objectUrl.value) return objectUrl.value;
    const value = fieldValue.value;
    // Existing value may be a URL string from the server.
    return typeof value === "string" && value.length > 0 ? value : null;
});

function handleFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;

    if (objectUrl.value) {
        URL.revokeObjectURL(objectUrl.value);
        objectUrl.value = null;
    }
    if (file && props.field.type === "image" && typeof URL !== "undefined") {
        objectUrl.value = URL.createObjectURL(file);
    }
    setValue(file);
}

onBeforeUnmount(() => {
    if (objectUrl.value) URL.revokeObjectURL(objectUrl.value);
});
</script>

<style scoped>
.dx-field-image-preview {
    max-width: 160px;
    max-height: 160px;
    object-fit: cover;
    border: 1px solid var(--bs-border-color);
    border-radius: var(--bs-border-radius);
}
</style>
