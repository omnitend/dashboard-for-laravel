<!--
  @component
  Renders a single `FieldDefinition` of any type (text, select, autocomplete, checkbox, switch, repeater, currency, percentage, file/image, component, etc.) with its label, validation error, hint and help. Used by `DXForm` and `DXTable`'s edit modal; exposes `value`, `span`, `info`, `info-popover`, `hint` and `repeater-row` slots for per-field customisation.
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

    <!-- Checkbox (horizontal layout): wrapped in DFormGroup for the same
         label/content column split as other field types, instead of the
         label-beside-control layout below. The inline label beside the
         checkbox itself is kept (not deduplicated against the outer label)
         so the control's accessible name doesn't depend on aria-labelledby
         association through the fieldset alone — but its `info` popover is
         omitted here, since rendering the same popover trigger twice (once
         per label) would be a duplicated interactive element, not just
         duplicated text. -->
    <DFormGroup
        v-else-if="field.type === 'checkbox' && isHorizontal"
        :class="field.class || 'mb-3'"
        v-bind="horizontalAttrs"
    >
        <!-- The row label (left column) names the control; the checkbox's own
             label is kept for screen readers but hidden visually so it doesn't
             duplicate the row label. In horizontal layout the hint sits beneath
             the label here rather than below the control. -->
        <template v-if="!hideLabel" #label>
            <DXFieldLabel :label="resolvedLabel" :info="resolvedInfo" />
            <small
                v-if="isHorizontal && (resolvedHint || $slots.hint)"
                class="form-text text-muted d-block dx-field-hint"
            >
                <slot name="hint" :field="field" :model="model">{{
                    resolvedHint
                }}</slot>
            </small>
        </template>
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
            <DXFieldLabel :label="resolvedLabel" class="visually-hidden" />
        </DFormCheckbox>

        <DFormInvalidFeedback v-if="form.hasError(errorKey)" force-show>
            {{ form.getError(errorKey) }}
        </DFormInvalidFeedback>
        <slot name="info" :field="field" :model="model" />
        <DFormText v-if="!hintInLabel && (resolvedHint || $slots.hint)" class="text-muted">
            <slot name="hint" :field="field" :model="model">{{ resolvedHint }}</slot>
        </DFormText>
        <DFormText v-if="field.help">{{ field.help }}</DFormText>
    </DFormGroup>

    <!-- Checkbox (vertical, default): no label wrapper, label sits beside the control -->
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

    <!-- Switch (horizontal layout): same column-split treatment as checkbox
         above, including omitting `info` from the inner label to avoid a
         duplicated popover trigger. -->
    <DFormGroup
        v-else-if="field.type === 'switch' && isHorizontal"
        :class="field.class || 'mb-3'"
        v-bind="horizontalAttrs"
    >
        <!-- The row label (left column) names the control. The switch's own
             inner text is shown only when the field opts into contextual on/off
             text (e.g. "Product is current"); otherwise it falls back to the row
             label and is hidden visually (kept for screen readers). In horizontal
             layout the hint sits beneath the label here rather than below the
             control. -->
        <template v-if="!hideLabel" #label>
            <DXFieldLabel :label="resolvedLabel" :info="resolvedInfo" />
            <small
                v-if="isHorizontal && (resolvedHint || $slots.hint)"
                class="form-text text-muted d-block dx-field-hint"
            >
                <slot name="hint" :field="field" :model="model">{{
                    resolvedHint
                }}</slot>
            </small>
        </template>
        <slot
            v-if="$slots.value"
            name="value"
            :field="field"
            :model="model"
            :value="fieldValue"
            :update="setValue"
        />
        <DXSwitch
            v-else
            v-model="switchModel"
            :disabled="isDisabled || isReadonly"
            v-bind="field.inputProps"
        >
            <DXFieldLabel
                :label="switchText"
                :class="switchHasContextualText ? undefined : 'visually-hidden'"
            />
        </DXSwitch>

        <DFormInvalidFeedback v-if="form.hasError(errorKey)" force-show>
            {{ form.getError(errorKey) }}
        </DFormInvalidFeedback>
        <slot name="info" :field="field" :model="model" />
        <DFormText v-if="!hintInLabel && (resolvedHint || $slots.hint)" class="text-muted">
            <slot name="hint" :field="field" :model="model">{{ resolvedHint }}</slot>
        </DFormText>
        <DFormText v-if="field.help">{{ field.help }}</DFormText>
    </DFormGroup>

    <!-- Switch (vertical, default): toggle with contextual on/off text (DXSwitch owns the filled-box on-state style) -->
    <div
        v-else-if="field.type === 'switch'"
        :class="field.class || 'mb-3'"
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
        <DXSwitch
            v-else
            v-model="switchModel"
            :disabled="isDisabled || isReadonly"
            v-bind="field.inputProps"
        >
            <DXFieldLabel :label="switchText" :info="resolvedInfo" />
        </DXSwitch>

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
        <DFormGroup v-bind="repeaterHorizontalAttrs">
            <template v-if="!hideLabel" #label>
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
    <DFormGroup v-else :class="field.class || 'mb-3'" v-bind="horizontalAttrs">
        <!-- Label with optional info popover. Omitted entirely (not just
             emptied) when hideLabel is set, so BFormGroup doesn't reserve a
             label column/row for it (see DXRepeater's table layout). In
             horizontal layout the hint sits beneath the label here rather than
             below the control. -->
        <template v-if="!hideLabel" #label>
            <DXFieldLabel :label="resolvedLabel" :info="resolvedInfo" />
            <small
                v-if="isHorizontal && (resolvedHint || $slots.hint)"
                class="form-text text-muted d-block dx-field-hint"
            >
                <slot name="hint" :field="field" :model="model">{{
                    resolvedHint
                }}</slot>
            </small>
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
            v-model="textFieldModel"
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

        <!-- Hint (dynamic, slot-overridable). In horizontal layout it renders in
             the label column instead (see the #label slot above). -->
        <DFormText v-if="!hintInLabel && (resolvedHint || $slots.hint)" class="text-muted">
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
    provide,
    ref,
    useId,
    useSlots,
    watch,
} from "vue";
import { dxFieldInfoPopoverKey } from "./dxFieldContext";
import DFormGroup from "../base/DFormGroup.vue";
import DFormInput from "../base/DFormInput.vue";
import DFormTextarea from "../base/DFormTextarea.vue";
import DFormSelect from "../base/DFormSelect.vue";
import DFormRadioGroup from "../base/DFormRadioGroup.vue";
import DFormCheckbox from "../base/DFormCheckbox.vue";
import DXSwitch from "./DXSwitch.vue";
import DFormInvalidFeedback from "../base/DFormInvalidFeedback.vue";
import DFormText from "../base/DFormText.vue";
import DInputGroup from "../base/DInputGroup.vue";
import DXFieldLabel from "./DXFieldLabel.vue";
import type { UseFormReturn } from "../../composables/useForm";
import type { FieldDefinition, FieldOption, FieldType, LabelCols } from "../../types";
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

    /**
     * Field layout: "vertical" (default, label above input) or "horizontal"
     * (label left, input right). Normally set by DXForm (form-level, with
     * `field.layout` taking precedence); pass directly when using DXField
     * standalone.
     */
    layout?: "vertical" | "horizontal";

    /** Label column width for horizontal layout (mirrors BFormGroup). */
    labelCols?: LabelCols;

    /**
     * Skip rendering the field's own (outer) label. Applies to the standard
     * labelled-field branch and to the checkbox/switch/repeater branches. In
     * horizontal layout no label column is reserved either, so the control
     * spans the full width (a switch/checkbox self-label then lines up with
     * sibling row labels). Used by DXRepeater's `table` layout (a column
     * header already names the field) and by consumers hiding the redundant
     * row label on a switch/checkbox, which render their own label inside the
     * control (#78).
     */
    hideLabel?: boolean;
}

const props = defineProps<Props>();

const effectiveModel = computed(() => props.model ?? props.form.data);

// Forward the `info-popover` slot to whichever DXFieldLabel this field renders,
// once — so the label sites stay plain `<DXFieldLabel :label :info />` and can't
// drift out of sync (each rendering its own copy of the forward). DXFieldLabel
// injects this; standalone use ignores it.
const slots = useSlots();
provide(
    dxFieldInfoPopoverKey,
    computed(() =>
        slots["info-popover"]
            ? () =>
                  slots["info-popover"]!({
                      field: props.field,
                      model: props.model,
                  })
            : null,
    ),
);

// ————————————————— horizontal layout (#66)

// A `span` field always bypasses the label/content column split — it's
// rendered as fully custom full-width content via the very first template
// branch, before layout is ever considered.
const isHorizontal = computed(
    () => props.layout === "horizontal" && !props.field.span,
);

/** Translate a `LabelCols` value into the BFormGroup attrs it expects. */
function labelColsAttrs(cols: LabelCols | undefined): Record<string, any> {
    if (cols === undefined) return {};
    // BFormGroup's own `labelCols` prop accepts a number OR a numeric string
    // (BVN's `Numberish` type) — pass anything that isn't the breakpoint
    // object straight through, rather than gatekeeping on `typeof === "number"`,
    // so a numeric string (e.g. from an unbound template attribute or a
    // JSON-driven field config) still activates horizontal layout instead of
    // silently falling through to an empty breakpoint-object read.
    if (typeof cols !== "object" || cols === null) {
        return { labelCols: cols };
    }
    const attrs: Record<string, any> = {};
    if (cols.sm !== undefined) attrs.labelColsSm = cols.sm;
    if (cols.md !== undefined) attrs.labelColsMd = cols.md;
    if (cols.lg !== undefined) attrs.labelColsLg = cols.lg;
    if (cols.xl !== undefined) attrs.labelColsXl = cols.xl;
    return attrs;
}

// Default to a 3-column label when horizontal but no width was configured,
// so `layout: "horizontal"` alone is enough to see the effect. When the
// field's label is hidden, reserve no label column at all — BFormGroup would
// otherwise still emit an empty label column (it goes horizontal whenever any
// labelCols are set, regardless of whether a label exists), leaving the
// control indented in the input column beside dead space. Dropping the column
// lets the control span full width, so a switch/checkbox self-label lines up
// with sibling row labels (#78).
const horizontalAttrs = computed<Record<string, any>>(() =>
    isHorizontal.value && !props.hideLabel
        ? {
              ...labelColsAttrs(props.labelCols ?? 3),
              // Right-align the label column so the label (and the hint that
              // sits beneath it in horizontal layout) line up against the
              // control column, like a classic label-left settings form.
              labelClass: "text-sm-end dx-field-label-col",
          }
        : {},
);

// In horizontal layout the hint moves up into the label column (beneath the
// label), rather than below the control — so a row reads "label + hint | control".
// Vertical layout (and a hidden label, which reserves no label column) keeps the
// hint below the control.
const hintInLabel = computed(() => isHorizontal.value && !props.hideLabel);

// A `switch` renders visible text inside the control only when the field opts
// into contextual on/off text (textWhenTrue/textWhenFalse) — e.g. "Product is
// current". Without it, `switchText` falls back to the row label, which would
// duplicate the outer label, so the inner label is kept for screen readers but
// hidden visually (the row label names the control). A plain `checkbox` never
// shows visible inner text for the same reason.
const switchHasContextualText = computed(
    () =>
        props.field.textWhenTrue !== undefined ||
        props.field.textWhenFalse !== undefined,
);

// A table-layout repeater is inherently wide — squeezing its own label into a
// narrow left column (as if it were a single-line input) reads badly, unlike
// a normal horizontal field. Its label always renders above, regardless of
// the form/field's horizontal layout setting (#68 follow-up).
const repeaterHorizontalAttrs = computed<Record<string, any>>(() =>
    props.field.repeaterLayout === "table" ? {} : horizontalAttrs.value,
);

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

// Native <input type=date/datetime-local/time> only accept a strict format
// (YYYY-MM-DD, YYYY-MM-DDTHH:MM, HH:MM) and render EMPTY for anything else —
// including Laravel's ISO-8601 (`…Z`) and `Y-m-d H:i:s` serialisations, so a
// field seeded with `created_at` shows a blank placeholder. Reshape the
// *displayed* value to the input's format for those types; the setter writes
// the input's native value straight back. This is a pure string reshape, not a
// timezone conversion — the stored wall-clock is shown as-is, so a UTC `…Z`
// value displays its UTC time (convert before seeding if you need local).
const DATE_FAMILY_TYPES = new Set<FieldType>(["date", "datetime", "time"]);

function normaliseDateForInput(value: unknown, type: FieldType): string {
    if (value === null || value === undefined || value === "") return "";
    const iso = String(value).replace(" ", "T"); // `Y-m-d H:i:s` → ISO-ish
    if (type === "date") {
        return iso.match(/^(\d{4}-\d{2}-\d{2})/)?.[1] ?? "";
    }
    if (type === "time") {
        // Anchor to the start or the time part of an ISO value, so a malformed
        // string can't yield a stray HH:MM from the middle.
        return iso.match(/(?:^|T)(\d{2}:\d{2})/)?.[1] ?? "";
    }
    // datetime → datetime-local
    return iso.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})/)?.[1] ?? "";
}

// Model for the text-based input branch. Reshapes date-family values for the
// native picker; every other type passes straight through.
const textFieldModel = computed({
    get: () =>
        DATE_FAMILY_TYPES.has(props.field.type)
            ? normaliseDateForInput(fieldValue.value, props.field.type)
            : fieldValue.value,
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

</style>
