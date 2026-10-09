<!--
  @component DXFormErrorSummary
  Lists everything the last failed submit of a `useForm` returned: the
  server's message, then one row per validation message with a readable
  label ("Price (line 1): Must be positive."). Built from `form.submitFailure`,
  so it survives field edits and `clearError`, and disappears when the next
  submit starts or one succeeds. Renders nothing before a failure. A row whose
  key belongs to a visible field is a button that emits `select-target`, for
  the host to select the field's tab and focus it; a key no visible field owns
  is listed as plain text. Place it next to the submit control.
-->
<template>
    <!-- A real element owns the class: DAlert's root is a transition, so a
         class on it is not a reliable host for the theme rules. BAlert
         supplies role="alert" + aria-live="assertive"; keying it by the
         failure count remounts it, so every new failure is announced once. -->
    <div v-if="failure" class="dx-form-error-summary">
        <DAlert :key="resolvedForm.failedSubmitCount" variant="danger">
            <p class="dx-form-error-summary__message">{{ failure.message }}</p>
            <ul v-if="rows.length > 0" class="dx-form-error-summary__list">
                <li
                    v-for="row in rows"
                    :key="row.id"
                    class="dx-form-error-summary__item"
                >
                    <button
                        v-if="row.fieldKey !== null"
                        type="button"
                        class="dx-form-error-summary__target"
                        :data-dx-error-key="row.errorKey"
                        @click="selectRow(row)"
                    >
                        {{ row.text }}
                    </button>
                    <span v-else :data-dx-error-key="row.errorKey">{{ row.text }}</span>
                </li>
            </ul>
        </DAlert>
    </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import DAlert from "../base/DAlert.vue";
import type { UseFormReturn } from "../../composables/useForm";
import type { DefineFormReturn } from "../../composables/defineForm";
import type { FieldDefinition, FormTab } from "../../types";
import {
    resolveErrorTargets,
    type ErrorTarget,
} from "../../utils/formErrorTargets";

/** What a summary row points at (emitted by `select-target`). */
export interface ErrorSummarySelection {
    /** The owning field's key. */
    fieldKey: string;
    /** The tab holding that field, or `null` in a flat form. */
    tabKey: string | null;
    /** The error key as the server sent it. */
    errorKey: string;
}

interface Props {
    /** The form: a `useForm` return or a `defineForm` return. */
    form: UseFormReturn<any> | DefineFormReturn<any>;
    /** Field definitions (optional when `form` is a defineForm return). */
    fields?: FieldDefinition[];
    /** The form's tabs, so rows follow tab order and know their tab. */
    tabs?: FormTab[];
    /**
     * Extra context merged under the form data when evaluating `when` and
     * function labels, as on DXForm.
     */
    context?: Record<string, any>;
    /**
     * Field visibility, replacing the default (`when`/`show` against form
     * data + `context`). A host form passes its own predicate so the summary
     * agrees with what it renders.
     */
    isFieldVisible?: (field: FieldDefinition) => boolean;
    /** Tab visibility, replacing the default (the tab's `when`). */
    isTabVisible?: (tab: FormTab) => boolean;
    /** A field's label, replacing the default (its `label`, resolved). */
    resolveLabel?: (field: FieldDefinition) => string | null | undefined;
    /**
     * Rows already resolved by the host (from `resolveErrorTargets` over
     * `form.submitFailure.errors`). When given, the summary lists these and
     * resolves nothing itself; the message still comes from
     * `form.submitFailure`, and nothing renders while that is null.
     */
    targets?: ErrorTarget[] | null;
}

const props = defineProps<Props>();

const emit = defineEmits<{
    /** A row was clicked: select `tabKey` (if any) and focus `fieldKey`. */
    "select-target": [selection: ErrorSummarySelection];
}>();

function isDefineForm(value: Props["form"]): value is DefineFormReturn<any> {
    return (
        !!value &&
        typeof value === "object" &&
        "form" in value &&
        "fields" in value &&
        !("data" in value)
    );
}

const resolvedForm = computed<UseFormReturn<any>>(() =>
    isDefineForm(props.form) ? props.form.form : props.form,
);

const resolvedFields = computed<FieldDefinition[]>(() => {
    if (props.fields) return props.fields;
    if (isDefineForm(props.form)) return props.form.fields;
    return [];
});

const failure = computed(() => resolvedForm.value.submitFailure ?? null);

const targets = computed<ErrorTarget[]>(() => {
    if (!failure.value) return [];
    if (props.targets) return props.targets;
    return resolveErrorTargets(failure.value.errors, {
        fields: resolvedFields.value,
        tabs: props.tabs,
        model: { ...(props.context ?? {}), ...resolvedForm.value.data },
        isFieldVisible: props.isFieldVisible,
        isTabVisible: props.isTabVisible,
        resolveLabel: props.resolveLabel,
    });
});

interface Row {
    id: string;
    text: string;
    errorKey: string;
    fieldKey: string | null;
    tabKey: string | null;
}

const rows = computed<Row[]>(() =>
    targets.value.flatMap((target) =>
        target.lines.map((text, index) => ({
            id: `${target.errorKey}#${index}`,
            text,
            errorKey: target.errorKey,
            fieldKey: target.fieldKey,
            tabKey: target.tabKey,
        })),
    ),
);

function selectRow(row: Row): void {
    if (row.fieldKey === null) return;
    emit("select-target", {
        fieldKey: row.fieldKey,
        tabKey: row.tabKey,
        errorKey: row.errorKey,
    });
}
</script>
