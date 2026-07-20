<!--
  @component
  Renders a single `FieldDefinition` of any type (text, select, autocomplete, checkbox, switch, repeater, currency, percentage, file/image, component, etc.) with its label, validation error, hint and help. Used by `DXForm` and `DXTable`'s edit modal; exposes `value`, `span`, `info`, `info-popover`, `hint` and `repeater-row` slots for per-field customisation.

  Structure (#135): a thin DISPATCHER. The shared chrome (label + validation
  feedback + hint + help + info) lives in `DXFieldShell`; the numeric controls
  (currency/percentage/number) in `DXNumericField`; the choice controls
  (select/searchable/radio/checkbox-group) in `DXChoiceField`; and the async
  option loading in the `useAsyncOptions` composable. This file decides which
  control to render inside the shell by `field.type`. None of those pieces are
  exported — they exist only to keep this component factored.
-->
<template>
    <!-- Full-width span field: delegate entirely to the #span slot, bypassing
         the label and built-in control (and the shell). -->
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

    <!-- Every other field type shares the same chrome via DXFieldShell; the
         control that goes inside is chosen by field.type in the default slot. -->
    <DXFieldShell
        v-else
        :field="field"
        :form="form"
        :error-key="errorKey"
        :model="model"
        :mode="shellMode"
        :wrapper-class="field.class || 'mb-3'"
        :group-attrs="horizontalAttrs"
        :label="resolvedLabel"
        :info="resolvedInfo"
        :hide-label="hideLabel"
        :hint-in-label="hintInLabel"
        :resolved-hint="resolvedHint"
    >
        <!-- Forward the field's hint slot (content + props) only when present,
             so the shell's `$slots.hint` reflects reality (it gates the hint
             rendering); the info slot is a pure pass-through. -->
        <template v-if="$slots.hint" #hint="hintProps">
            <!--
              @slot Overrides the field's hint text shown below the control (or, in horizontal layout, in the label column).
              @binding {FieldDefinition} field The field definition being rendered.
              @binding {any} model The model passed to field predicates (defaults to the live form data).
            -->
            <slot name="hint" v-bind="hintProps" />
        </template>
        <template #info="infoProps">
            <!--
              @slot Rich info block rendered below the control.
              @binding {FieldDefinition} field The field definition being rendered.
              @binding {any} model The model passed to field predicates (defaults to the live form data).
            -->
            <slot name="info" v-bind="infoProps" />
        </template>

        <!-- Custom value slot overrides the built-in control (checkbox / switch
             / standard types; not switch-list or repeater). -->
        <!--
          @slot Replaces the built-in control with a custom value editor.
          @binding {FieldDefinition} field The field definition being rendered.
          @binding {any} model The model passed to field predicates (defaults to the live form data).
          @binding {any} value The current field value.
          @binding {(value: any) => void} update Setter that writes the value back and clears the field's validation error.
        -->
        <slot
            v-if="showValueSlot && $slots.value"
            name="value"
            :field="field"
            :model="model"
            :value="fieldValue"
            :update="setValue"
        />
        <template v-else>
            <!-- Checkbox (horizontal): the row label (shell #label) names the
                 control; the checkbox's own label is kept for screen readers
                 but hidden visually so it doesn't duplicate the row label. -->
            <DFormCheckbox
                v-if="field.type === 'checkbox' && isHorizontal"
                v-model="fieldValue"
                :disabled="isDisabled || isReadonly || isPlaintext"
                v-bind="controlPropsWithGuards"
            >
                <DXFieldLabel :label="resolvedLabel" class="visually-hidden" />
            </DFormCheckbox>

            <!-- Checkbox (vertical): label sits beside the control -->
            <DFormCheckbox
                v-else-if="field.type === 'checkbox'"
                v-model="fieldValue"
                :disabled="isDisabled || isReadonly || isPlaintext"
                v-bind="controlPropsWithGuards"
            >
                <DXFieldLabel :label="resolvedLabel" :info="resolvedInfo" />
            </DFormCheckbox>

            <!-- Switch (horizontal): the switch's inner text shows only when the
                 field opts into contextual on/off text; otherwise it falls back
                 to the row label and is hidden visually (kept for a11y). -->
            <DXSwitch
                v-else-if="field.type === 'switch' && isHorizontal"
                v-model="switchModel"
                :on-variant="field.switchVariant"
                :disabled="isDisabled || isReadonly || isPlaintext"
                v-bind="controlPropsWithGuards"
            >
                <DXFieldLabel
                    :label="switchText"
                    :class="switchHasContextualText ? undefined : 'visually-hidden'"
                />
            </DXSwitch>

            <!-- Switch (vertical): toggle with contextual on/off text -->
            <DXSwitch
                v-else-if="field.type === 'switch'"
                v-model="switchModel"
                :on-variant="field.switchVariant"
                :disabled="isDisabled || isReadonly || isPlaintext"
                v-bind="controlPropsWithGuards"
            >
                <DXFieldLabel :label="switchText" :info="resolvedInfo" />
            </DXSwitch>

            <!-- Switch-list (#160): a list of labelled boolean toggles as config,
                 not markup. One real DFormGroup per option row (the ONLY correct
                 source of the label/content grid) with the option text in the
                 label column and a compact track switch in the content column.
                 The model is an array of selected option values, like
                 checkbox-group. -->
            <template v-else-if="field.type === 'switch-list'">
                <div
                    v-if="!hideLabel && field.label"
                    class="dx-switch-list-heading text-muted fw-semibold"
                >
                    <DXFieldLabel :label="resolvedLabel" :info="resolvedInfo" />
                </div>
                <div
                    v-for="option in resolvedOptions ?? []"
                    :key="String(option.value)"
                    class="dx-switch-list-row"
                >
                    <DFormGroup
                        v-bind="switchListRowAttrs"
                        class="mb-0 align-items-center"
                    >
                        <template #label>
                            <DXFieldLabel
                                :label="option.text"
                                :title="option.description"
                            />
                        </template>
                        <div class="dx-switch-list-control">
                            <DFormCheckbox
                                switch
                                :class="field.switchVariant === 'neutral' ? 'switch-neutral' : undefined"
                                :model-value="switchListIsOn(option)"
                                :disabled="isDisabled || isReadonly || isPlaintext || option.disabled === true"
                                :aria-label="option.text"
                                @update:model-value="setSwitchListOn(option, $event === true)"
                            />
                            <!--
                              @slot Extra per-row content beside a switch-list row's toggle (e.g. a notes input the consumer binds to their own model).
                              @binding {FieldOption} option The option this row renders.
                              @binding {boolean} on Whether the row's switch is currently on.
                            -->
                            <slot
                                name="switch-list-item"
                                :option="option"
                                :on="switchListIsOn(option)"
                            />
                        </div>
                    </DFormGroup>
                </div>
            </template>

            <!-- Repeater: nested, repeatable sub-form. Renders its own label
                 group (a table-layout repeater keeps its label above, so it uses
                 repeaterHorizontalAttrs rather than the field's horizontal
                 layout). The shell contributes only the trailing block here. -->
            <DFormGroup
                v-else-if="field.type === 'repeater'"
                v-bind="repeaterHorizontalAttrs"
            >
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

            <!-- Standard labelled field: the control goes inside the shell's
                 group (label column + trailing block). -->
            <template v-else>
                <!-- Component escape hatch -->
                <component
                    :is="field.component"
                    v-if="field.type === 'component' && field.component"
                    v-model="fieldValue"
                    :field="field"
                    :model="model"
                    :disabled="isDisabled || isReadonly || isPlaintext"
                    v-bind="controlPropsWithGuards"
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
                    :readonly="isReadonly || isPlaintext"
                    :plaintext="isPlaintext"
                    v-bind="inputPropsWithGuards"
                />

                <!-- Choice controls: select (plain or searchable), radio,
                     checkbox-group. -->
                <DXChoiceField
                    v-else-if="isChoiceType"
                    :field="field"
                    :model-value="fieldValue"
                    :options="resolvedOptions"
                    :state="fieldState"
                    :disabled="isDisabled || isReadonly || isPlaintext"
                    :control-props="controlPropsWithGuards"
                    :options-ready="searchableOptionsReady"
                    @update:model-value="setValue"
                />

                <!-- File / image upload -->
                <div v-else-if="field.type === 'image' || field.type === 'file'">
                    <DFormInput
                        type="file"
                        :accept="field.accept || (field.type === 'image' ? 'image/*' : undefined)"
                        :required="field.required"
                        :state="fieldState"
                        :disabled="isDisabled || isReadonly || isPlaintext"
                        v-bind="controlPropsWithGuards"
                        @change="handleFileChange"
                    />
                    <img
                        v-if="field.type === 'image' && imagePreview"
                        :src="imagePreview"
                        alt="Preview"
                        class="dx-field-image-preview mt-2"
                    />
                </div>

                <!-- Numeric controls: currency, percentage, number. -->
                <DXNumericField
                    v-else-if="isNumericType"
                    :field="field"
                    :model-value="fieldValue"
                    :state="fieldState"
                    :is-disabled="isDisabled"
                    :is-readonly="isReadonly"
                    :is-plaintext="isPlaintext"
                    :input-props="inputPropsWithGuards"
                    @update:model-value="setValue"
                />

                <!-- Autocomplete: a free-text input with a datalist of
                     suggestions (sync or async options). Unlike select, a value
                     not in the list can still be typed and submitted; the
                     consumer validates. -->
                <template v-else-if="field.type === 'autocomplete'">
                    <DFormInput
                        v-model="fieldValue"
                        type="text"
                        :list="datalistId"
                        :required="field.required"
                        :placeholder="field.placeholder"
                        :state="fieldState"
                        :disabled="isDisabled"
                        :readonly="isReadonly || isPlaintext"
                        :plaintext="isPlaintext"
                        autocomplete="off"
                        v-bind="inputPropsWithGuards"
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

                <!-- Password with a reveal toggle (the default for
                     `type: "password"`). Typing a long password blind is the one
                     place the eye really earns its keep, so it's opt-out
                     (`revealable: false`) rather than opt-in. -->
                <DInputGroup v-else-if="isRevealablePassword">
                    <DFormInput
                        v-model="textFieldModel"
                        :required="field.required"
                        :placeholder="field.placeholder"
                        :state="fieldState"
                        :disabled="isDisabled"
                        :readonly="isReadonly"
                        v-bind="passwordInputProps"
                    />
                    <template #append>
                        <DButton
                            variant="outline-secondary"
                            :icon="passwordRevealed ? 'eye-slash' : 'eye'"
                            :aria-label="passwordRevealed ? 'Hide password' : 'Show password'"
                            :aria-pressed="passwordRevealed"
                            :disabled="isDisabled"
                            @click="passwordRevealed = !passwordRevealed"
                        />
                    </template>
                </DInputGroup>

                <!-- Text-based inputs (text/email/password/url/tel/date/time/datetime) -->
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
                    :readonly="isReadonly || isPlaintext"
                    :plaintext="isPlaintext"
                    v-bind="inputPropsWithGuards"
                />
            </template>
        </template>
    </DXFieldShell>
</template>

<script setup lang="ts">
import {
    computed,
    defineAsyncComponent,
    onBeforeUnmount,
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
import DFormCheckbox from "../base/DFormCheckbox.vue";
import DXSwitch from "./DXSwitch.vue";
import DInputGroup from "../base/DInputGroup.vue";
import DButton from "../base/DButton.vue";
import DXFieldLabel from "./DXFieldLabel.vue";
import DXFieldShell from "./DXFieldShell.vue";
import DXNumericField from "./DXNumericField.vue";
import DXChoiceField from "./DXChoiceField.vue";
import { useAsyncOptions } from "../../composables/useAsyncOptions";
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

// Which shape DXFieldShell should render: `group` (a DFormGroup with a label
// column, holding the control + trailing) for the standard field and the
// horizontal checkbox/switch; `plain` (a div, the control owning its own label
// or heading) for the vertical checkbox/switch, switch-list and repeater.
const shellMode = computed<"group" | "plain">(() => {
    const type = props.field.type;
    if (type === "checkbox" || type === "switch") {
        return isHorizontal.value ? "group" : "plain";
    }
    if (type === "switch-list" || type === "repeater") return "plain";
    return "group";
});

// The custom value slot applies to the checkbox/switch/standard branches, but
// not switch-list or repeater (which never honoured it).
const showValueSlot = computed(
    () => props.field.type !== "switch-list" && props.field.type !== "repeater",
);

const isChoiceType = computed(() =>
    ["select", "radio", "checkbox-group"].includes(props.field.type),
);

const isNumericType = computed(() =>
    ["currency", "percentage", "number"].includes(props.field.type),
);

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

const fieldState = computed(() => props.form.getState(errorKey.value));

const resolvedLabel = computed(
    () => resolveMaybe(props.field.label) ?? props.field.key,
);

const resolvedHint = computed(() => resolveMaybe(props.field.hint));

const resolvedInfo = computed(() => resolveMaybe(props.field.info));

// ————————————————— switch-list (#160)

// Row grid for switch-list option rows. Deliberately NOT `horizontalAttrs`:
// that computed empties itself under `hideLabel`, which is right for the
// FIELD label but would collapse every option row's label column too —
// `hideLabel` on a switch-list should drop only the section heading.
const switchListRowAttrs = computed<Record<string, any>>(() =>
    isHorizontal.value
        ? {
              ...labelColsAttrs(props.labelCols ?? 3),
              labelClass: "text-sm-end dx-field-label-col",
          }
        : {},
);

// The model is an array of selected option values, exactly like
// checkbox-group, so seeding/validation/diffing need nothing new. Toggling a
// row adds/removes its option's value; `setValue` also clears the field error.
const switchListValues = computed<any[]>(() =>
    Array.isArray(fieldValue.value) ? fieldValue.value : [],
);

function switchListIsOn(option: FieldOption): boolean {
    return switchListValues.value.includes(option.value);
}

function setSwitchListOn(option: FieldOption, on: boolean): void {
    const current = switchListValues.value;
    if (on === current.includes(option.value)) return;
    setValue(
        on
            ? [...current, option.value]
            : current.filter((value) => value !== option.value),
    );
}

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

// Display-only: the value as static text rather than a control. bvn's
// `plaintext` only swaps the class, so pair it with `readonly` at every call
// site — otherwise the "static text" is still editable.
const isPlaintext = computed(() => resolveMaybe(props.field.plaintext) ?? false);

const passwordRevealed = ref(false);

// See the template: the searchable select can't render before its options
// resolve, or it shows the raw id instead of the option's label.
const searchableOptionsReady = computed(
    () => !props.field.optionsLoader || loadedOptions.value !== null,
);

const isRevealablePassword = computed(
    () =>
        props.field.type === "password" &&
        (props.field.revealable ?? true) &&
        !isPlaintext.value,
);

// DXTable reuses ONE DXField instance per field key across modal opens (the
// v-for is keyed on `field.key`, which is stable across rows) and swaps in a
// fresh form per record. Without this, revealing row A's password leaves row
// B's — and the create form's — showing in clear text.
watch(
    () => [props.form, props.field.key],
    () => {
        passwordRevealed.value = false;
    },
);

/*
 * `inputProps` is an escape hatch that deliberately wins over the field's own
 * bindings — it is spread last. But it must not win over the guarantees the
 * field makes, or those guarantees are only documentation: a `plaintext` field
 * that `inputProps: { readonly: false }` re-opens for editing isn't read-only,
 * and a password whose `type` `inputProps` sets to "text" is unmasked under a
 * toggle still reading "Show password". So the guards are re-applied ON TOP of
 * inputProps. Everything else in inputProps still passes through, and a field
 * that isn't plaintext/readonly is untouched — `inputProps: { readonly: true }`
 * still works as before.
 */

// For controls with a native readonly state (the text family + textarea).
const inputPropsWithGuards = computed(() => {
    const merged: Record<string, any> = { ...props.field.inputProps };
    if (isPlaintext.value) {
        merged.plaintext = true;
        merged.readonly = true;
    } else if (isReadonly.value) {
        merged.readonly = true;
    }
    return merged;
});

// For controls with NO native readonly state (select/radio/checkbox/switch/
// file/component), where read-only is expressed as `disabled`.
const controlPropsWithGuards = computed(() => {
    const merged: Record<string, any> = { ...props.field.inputProps };
    if (isDisabled.value || isReadonly.value || isPlaintext.value) {
        merged.disabled = true;
    }
    return merged;
});

// The reveal toggle owns the password input's `type`.
const passwordInputProps = computed(() => ({
    ...inputPropsWithGuards.value,
    type: passwordRevealed.value ? "text" : "password",
}));

const inputType = computed<string>(() => {
    const type: FieldType = props.field.type;
    if (type === "datetime") return "datetime-local";
    return type;
});

// Unique, SSR-safe id linking an `autocomplete` field's input to its
// `<datalist>` of suggestions (via the input's `list` attribute).
const datalistId = useId();

// ————————————————— async options

const { loadedOptions } = useAsyncOptions(() => props.field, effectiveModel);

const resolvedOptions = computed<FieldOption[] | undefined>(
    () => loadedOptions.value ?? props.field.options,
);

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
/* Switch-list rows (#160): compact rhythm with a divider between rows. The
   vertical centring of label vs switch is the `align-items-center` utility on
   each row's DFormGroup (its horizontal root IS the .row element), so no
   deep selector into bvn internals is needed here. */
.dx-switch-list-row {
    padding: 0.25rem 0;
    border-bottom: 1px solid var(--bs-border-color);
}

.dx-switch-list-row:last-of-type {
    border-bottom: 0;
}

.dx-switch-list-heading {
    margin-bottom: 0.25rem;
}

.dx-switch-list-control {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

.dx-field-image-preview {
    max-width: 160px;
    max-height: 160px;
    object-fit: cover;
    border: 1px solid var(--bs-border-color);
    border-radius: var(--bs-border-radius);
}
</style>
