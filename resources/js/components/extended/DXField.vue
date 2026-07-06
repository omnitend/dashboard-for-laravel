<!--
  @component
  Renders a single `FieldDefinition` of any type (text, select, autocomplete, checkbox, switch, repeater, currency, percentage, file/image, component, etc.) with its label, validation error, hint and help. Used by `DXForm` and `DXTable`'s edit modal; exposes `value`, `span`, `info`, `hint` and `repeater-row` slots for per-field customisation.
-->
<template>
    <!-- Full-width span field: delegate entirely to the #span slot -->
    <div v-if="field.span" :class="field.class || 'mb-3'">
        <!--
          @slot Replaces the entire field with custom full-width content when `field.span` is set, bypassing the label and built-in control.
          @binding {FieldDefinition} field The field definition being rendered.
          @binding {any} model The model passed to field predicates (defaults to the live form data).
          @binding {any} value The current field value.
          @binding {(value: any) => void} update Setter that writes the value back and clears the field's validation error.
        -->
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
        <!--
          @slot Replaces the built-in control with a custom value editor.
          @binding {FieldDefinition} field The field definition being rendered.
          @binding {any} model The model passed to field predicates (defaults to the live form data).
          @binding {any} value The current field value.
          @binding {(value: any) => void} update Setter that writes the value back and clears the field's validation error.
        -->
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
            <DXFieldLabel :label="resolvedLabel" :info="resolvedInfo" />
        </DFormCheckbox>

        <DFormInvalidFeedback v-if="form.hasError(errorKey)" force-show>
            {{ form.getError(errorKey) }}
        </DFormInvalidFeedback>
        <!--
          @slot Rich info block rendered below the control.
          @binding {FieldDefinition} field The field definition being rendered.
          @binding {any} model The model passed to field predicates (defaults to the live form data).
        -->
        <slot name="info" :field="field" :model="model" />
        <DFormText v-if="resolvedHint || $slots.hint" class="text-muted">
            <!--
              @slot Overrides the field's hint text shown below the control.
              @binding {FieldDefinition} field The field definition being rendered.
              @binding {any} model The model passed to field predicates (defaults to the live form data).
            -->
            <slot name="hint" :field="field" :model="model">{{ resolvedHint }}</slot>
        </DFormText>
        <DFormText v-if="field.help">{{ field.help }}</DFormText>
    </div>

    <!-- Switch: toggle with contextual on/off text and an on-state style -->
    <div
        v-else-if="field.type === 'switch'"
        :class="[field.class || 'mb-3', 'dx-switch', { 'dx-switch--on': switchIsOn }]"
    >
        <!--
          @slot Replaces the built-in control with a custom value editor.
          @binding {FieldDefinition} field The field definition being rendered.
          @binding {any} model The model passed to field predicates (defaults to the live form data).
          @binding {any} value The current field value.
          @binding {(value: any) => void} update Setter that writes the value back and clears the field's validation error.
        -->
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
            v-model="switchModel"
            switch
            :disabled="isDisabled || isReadonly"
            v-bind="field.inputProps"
        >
            <DXFieldLabel :label="switchText" :info="resolvedInfo" />
        </DFormCheckbox>

        <DFormInvalidFeedback v-if="form.hasError(errorKey)" force-show>
            {{ form.getError(errorKey) }}
        </DFormInvalidFeedback>
        <!--
          @slot Rich info block rendered below the control.
          @binding {FieldDefinition} field The field definition being rendered.
          @binding {any} model The model passed to field predicates (defaults to the live form data).
        -->
        <slot name="info" :field="field" :model="model" />
        <DFormText v-if="resolvedHint || $slots.hint" class="text-muted">
            <!--
              @slot Overrides the field's hint text shown below the control.
              @binding {FieldDefinition} field The field definition being rendered.
              @binding {any} model The model passed to field predicates (defaults to the live form data).
            -->
            <slot name="hint" :field="field" :model="model">{{ resolvedHint }}</slot>
        </DFormText>
        <DFormText v-if="field.help">{{ field.help }}</DFormText>
    </div>

    <!-- Repeater: nested, repeatable sub-form -->
    <div v-else-if="field.type === 'repeater'" :class="field.class || 'mb-3'">
        <DFormGroup>
            <template #label>
                <DXFieldLabel :label="resolvedLabel" :info="resolvedInfo" />
            </template>
            <DXRepeater
                :form="form"
                :field="field"
                :key-path="keyPath"
                :model="model"
            >
                <!-- Forward repeater row slot for custom row layouts -->
                <template v-if="$slots['repeater-row']" #row="rowProps">
                    <!-- @slot Custom layout for a single repeater row, forwarded to `DXRepeater`'s `row` slot with its row props (row index, item, remove handler, etc.). -->
                    <slot name="repeater-row" v-bind="rowProps" />
                </template>
            </DXRepeater>
        </DFormGroup>
        <!--
          @slot Rich info block rendered below the control.
          @binding {FieldDefinition} field The field definition being rendered.
          @binding {any} model The model passed to field predicates (defaults to the live form data).
        -->
        <slot name="info" :field="field" :model="model" />
        <DFormText v-if="resolvedHint || $slots.hint" class="text-muted">
            <!--
              @slot Overrides the field's hint text shown below the control.
              @binding {FieldDefinition} field The field definition being rendered.
              @binding {any} model The model passed to field predicates (defaults to the live form data).
            -->
            <slot name="hint" :field="field" :model="model">{{ resolvedHint }}</slot>
        </DFormText>
        <DFormText v-if="field.help">{{ field.help }}</DFormText>
    </div>

    <!-- Standard labelled field -->
    <DFormGroup v-else :class="field.class || 'mb-3'">
        <!-- Label with optional info popover -->
        <template #label>
            <DXFieldLabel :label="resolvedLabel" :info="resolvedInfo" />
        </template>

        <!-- Custom value slot overrides the built-in control -->
        <!--
          @slot Replaces the built-in control with a custom value editor.
          @binding {FieldDefinition} field The field definition being rendered.
          @binding {any} model The model passed to field predicates (defaults to the live form data).
          @binding {any} value The current field value.
          @binding {(value: any) => void} update Setter that writes the value back and clears the field's validation error.
        -->
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

            <!-- Currency: the displayed text is padded to the minor-unit
                 precision on blur/seed (e.g. `3.8` -> `3.80`); the model stays
                 a plain number and typing is never reformatted mid-edit. -->
            <DFormInput
                v-if="field.type === 'currency'"
                :model-value="currencyDisplayValue"
                type="number"
                :required="field.required"
                :placeholder="field.placeholder"
                :step="field.step ?? '0.01'"
                :min="field.min"
                :max="field.max"
                :state="fieldState"
                :disabled="isDisabled"
                :readonly="isReadonly"
                v-bind="field.inputProps"
                @input="handleCurrencyInput"
                @focus="handleCurrencyFocus"
                @blur="handleCurrencyBlur"
            />
            <DFormInput
                v-else
                v-model="numericInputValue"
                type="number"
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

            <template v-if="field.type === 'percentage'" #append>
                <span class="input-group-text">%</span>
            </template>
        </DInputGroup>

        <!-- Autocomplete: a free-text input with a datalist of suggestions
             (sync or async options). Unlike select, a value not in the list can
             still be typed and submitted; the consumer validates. -->
        <template v-else-if="field.type === 'autocomplete'">
            <DFormInput
                v-model="fieldValue"
                type="text"
                :list="datalistId"
                :required="field.required"
                :placeholder="field.placeholder"
                :state="fieldState"
                :disabled="isDisabled"
                :readonly="isReadonly"
                autocomplete="off"
                v-bind="field.inputProps"
            />
            <datalist :id="datalistId">
                <option
                    v-for="opt in resolvedOptions"
                    :key="String(opt.value)"
                    :value="String(opt.value)"
                >
                    {{ opt.text }}
                </option>
            </datalist>
        </template>

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
        <!--
          @slot Rich info block rendered below the control.
          @binding {FieldDefinition} field The field definition being rendered.
          @binding {any} model The model passed to field predicates (defaults to the live form data).
        -->
        <slot name="info" :field="field" :model="model" />

        <!-- Hint (dynamic, slot-overridable) -->
        <DFormText v-if="resolvedHint || $slots.hint" class="text-muted">
            <!--
              @slot Overrides the field's hint text shown below the control.
              @binding {FieldDefinition} field The field definition being rendered.
              @binding {any} model The model passed to field predicates (defaults to the live form data).
            -->
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
    useId,
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
import DXFieldLabel from "./DXFieldLabel.vue";
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
    props.form.touched[errorKey.value] = true;
    props.form.clearError(errorKey.value);
}

// ————————————————— currency display formatting (#69)

// The model stays a plain number throughout; only the input's *displayed*
// text is padded to the minor-unit precision (`3.8` -> `3.80`), on blur and on
// initial seed. Reformatting reactively on every keystroke (rather than on
// blur) would fight the user mid-edit — e.g. rounding "3." to "3.00" before
// they've typed the fractional digits — so a local ref tracks the shown text
// independently of the numeric model, and is only resynced from the model
// while the input isn't focused.
const currencyDecimals = computed(() => props.field.decimals ?? 2);
const isCurrencyFocused = ref(false);
const currencyDisplayValue = ref("");

function formatCurrency(value: any): string {
    if (value === null || value === undefined || value === "") return "";
    const num = Number(value);
    if (!Number.isFinite(num)) return String(value);
    return num.toFixed(currencyDecimals.value);
}

watch(
    () => fieldValue.value,
    (value) => {
        if (isCurrencyFocused.value) return;
        currencyDisplayValue.value = formatCurrency(value);
    },
    { immediate: true },
);

function handleCurrencyFocus(): void {
    isCurrencyFocused.value = true;
}

function handleCurrencyInput(event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    currencyDisplayValue.value = raw;
    setValue(raw);
}

function handleCurrencyBlur(): void {
    isCurrencyFocused.value = false;
    currencyDisplayValue.value = formatCurrency(fieldValue.value);
}

const fieldState = computed(() => props.form.getState(errorKey.value));

const resolvedLabel = computed(
    () => resolveMaybe(props.field.label) ?? props.field.key,
);

const resolvedHint = computed(() => resolveMaybe(props.field.hint));

const resolvedInfo = computed(() => resolveMaybe(props.field.info));

// ————————————————— switch (toggle) field

// Whether a `switch` field is currently on. Coerces the model value to a
// boolean, but treats the common "falsey" string encodings a backend might send
// for a boolean ("0", "false", "") as off — plain `Boolean("0")` is `true`,
// which would wrongly render such a value on.
const switchIsOn = computed(() => {
    const value = fieldValue.value;
    if (typeof value === "string") {
        const normalised = value.trim().toLowerCase();
        return normalised !== "" && normalised !== "0" && normalised !== "false";
    }
    return Boolean(value);
});

// Bind the toggle to a normalised boolean. The underlying bvn checkbox only
// treats a literal `true` as checked, so a truthy non-boolean model (e.g.
// Laravel serialising a boolean column as `1`, or a `"1"` string) would render
// the toggle in the *off* position while `switchIsOn` styled it *on* — the
// control contradicting itself. Reading a real boolean keeps the checkbox
// position, the on-state style, and the contextual text in agreement; writing
// stores a clean boolean.
const switchModel = computed({
    get: () => switchIsOn.value,
    set: (value: boolean) => setValue(value),
});

/**
 * Contextual label for a `switch` field: `textWhenTrue`/`textWhenFalse`
 * for the current state, falling back to the field's label.
 */
const switchText = computed(() => {
    const contextual = switchIsOn.value
        ? resolveMaybe(props.field.textWhenTrue)
        : resolveMaybe(props.field.textWhenFalse);
    return contextual ?? resolvedLabel.value;
});

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

// Unique, SSR-safe id linking an `autocomplete` field's input to its
// `<datalist>` of suggestions (via the input's `list` attribute).
const datalistId = useId();

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

/* Switch field: a compact "filled box" toggle, sized to its content — like the
   plain `checkbox` field type, it doesn't stretch to fill the form row — but
   matching standard input height so it lines up with sibling text/select
   fields. Colour-codes its state: a neutral box when off, a filled success
   green when on. The label sits on the left and the toggle on the right.
   Renders the underlying `.form-check` (from the switch checkbox) as the box.
   `justify-content: space-between` on a full-width box used to leave a wide
   unclickable gap between the label and the toggle (only the tiny toggle
   itself was a real click target); shrinking the box to fit its content
   removes that dead zone entirely. */
.dx-switch :deep(.form-check) {
    display: inline-flex;
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

/* On-state: filled success green. */
.dx-switch--on :deep(.form-check) {
    background-color: var(--bs-success-bg-subtle);
    border-color: var(--bs-success);
}

.dx-switch--on :deep(.form-check-label) {
    color: var(--bs-success-text-emphasis);
    font-weight: 500;
}

.dx-switch--on :deep(.form-check-input:checked) {
    background-color: var(--bs-success);
    border-color: var(--bs-success);
}

.dx-switch--on :deep(.form-check-input:focus) {
    border-color: var(--bs-success);
    box-shadow: 0 0 0 0.25rem rgba(var(--bs-success-rgb), 0.25);
}
</style>
