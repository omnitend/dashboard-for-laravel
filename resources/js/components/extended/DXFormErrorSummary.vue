<!--
  @component DXFormErrorSummary
  Lists everything the last failed submit of a `useForm` returned: a heading,
  then one row per validation message with a readable label ("Price (line 1):
  Must be positive."). The heading is `title` ("Couldn't save. Please
  check:") when the failure has field errors, and the server's message when
  it has none (a message-only 422, a 500, a network failure), since then the
  message is all there is. Built from `form.submitFailure`, so it survives
  field edits and `clearError`, and disappears when the next submit starts or
  one succeeds. Renders nothing before a failure. A row whose key belongs to a
  visible field is a button that emits `select-target`, for the host to select
  the field's tab and focus it; a key no visible field owns is listed as plain
  text, after the owned rows, under `otherTitle` ("Other problems") when both
  kinds are present. Place it next to the submit control.
-->
<template>
    <!-- A real element owns the class: DAlert's root is a transition, so a
         class on it is not a reliable host for the theme rules. BAlert
         supplies role="alert" + aria-live="assertive"; keying it by the
         failure count remounts it, so every new failure is announced once. -->
    <div v-if="failure" class="dx-form-error-summary">
        <DAlert :key="resolvedForm.failedSubmitCount" variant="danger">
            <p class="dx-form-error-summary__message">{{ heading }}</p>
            <!-- Rows a field owns (buttons that go to it), then rows no field
                 owns (text). The sub-heading only says "these are the rest"
                 when there is a first list for them to be the rest of. A
                 <p>, not a heading element: it must not enter the page
                 outline. -->
            <template v-for="group in groups" :key="group.key">
                <p
                    v-if="group.title !== null"
                    class="dx-form-error-summary__other-title"
                >
                    {{ group.title }}
                </p>
                <ul class="dx-form-error-summary__list">
                    <li
                        v-for="row in group.rows"
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
            </template>
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
    /**
     * A field's label, replacing the default (its `label`, resolved against
     * `labelModel`: the form model, or the row for a repeater sub-field).
     */
    resolveLabel?: (
        field: FieldDefinition,
        labelModel: Record<string, any>,
    ) => string | null | undefined;
    /**
     * Rows already resolved by the host (from `resolveErrorTargets` over
     * `form.submitFailure.errors`). When given, the summary lists these and
     * resolves nothing itself; the message still comes from
     * `form.submitFailure`, and nothing renders while that is null.
     */
    targets?: ErrorTarget[] | null;
    /**
     * The heading when the failure has at least one field error. The
     * server's own message is not used then: Laravel's default 422 message
     * is the first error plus "(and N more errors)", which repeats the first
     * row. A failure with no field errors (a message-only 422, a 500, a
     * network failure) keeps the server's message as the heading, as it is
     * the only information.
     */
    title?: string;
    /**
     * The sub-heading over the rows no visible field owns, listed after the
     * owned rows. Shown only when there are both kinds; when no row is owned
     * they are listed under the heading alone.
     */
    otherTitle?: string;
}

const props = withDefaults(defineProps<Props>(), {
    title: "Couldn't save. Please check:",
    otherTitle: "Other problems",
});

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

const heading = computed(() =>
    rows.value.length > 0 ? props.title : (failure.value?.message ?? ""),
);

interface RowGroup {
    key: "owned" | "other";
    /** The sub-heading above the list, or `null` for none. */
    title: string | null;
    rows: Row[];
}

/** Owned rows, then unowned ones (labelled only when both are present). */
const groups = computed<RowGroup[]>(() => {
    const owned = rows.value.filter((row) => row.fieldKey !== null);
    const other = rows.value.filter((row) => row.fieldKey === null);
    const result: RowGroup[] = [];
    if (owned.length > 0) result.push({ key: "owned", title: null, rows: owned });
    if (other.length > 0) {
        result.push({
            key: "other",
            title: owned.length > 0 ? props.otherTitle : null,
            rows: other,
        });
    }
    return result;
});

function selectRow(row: Row): void {
    if (row.fieldKey === null) return;
    emit("select-target", {
        fieldKey: row.fieldKey,
        tabKey: row.tabKey,
        errorKey: row.errorKey,
    });
}
</script>
