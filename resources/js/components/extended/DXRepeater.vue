<!--
  @component
  DXRepeater renders a nested, repeatable sub-form for a repeater field: a list
  of rows (each a group of sub-fields) with add/remove controls, honouring the
  field's `minItems`/`maxItems` limits.
-->
<template>
    <div class="dx-repeater">
        <div
            v-for="(entry, position) in visibleRows"
            :key="rowKey(entry.row, position)"
            class="dx-repeater-row"
        >
            <!--
              @slot Custom layout for a single repeater row, replacing the default sub-field stack.
              @binding {object} row The current row's data object.
              @binding {number} index The row's zero-based position among visible rows.
              @binding {FieldDefinition[]} fields The sub-field definitions for the row.
              @binding {function} remove Removes this row (respects `minItems`; soft-deletes instead of splicing when `field.softDeleteKey` is set and the row has an `id`).
              @binding {string} path The dot path into `form.data` for this row (e.g. `lines.0`).
            -->
            <slot
                v-if="$slots.row"
                name="row"
                :row="entry.row"
                :index="position"
                :fields="subFields"
                :remove="() => removeRow(entry.index)"
                :path="rowPath(entry.index)"
            />

            <!-- Default row: stack each sub-field -->
            <template v-else>
                <div class="dx-repeater-row-header">
                    <span class="dx-repeater-row-index">{{ position + 1 }}</span>
                    <DButton
                        variant="outline-danger"
                        size="sm"
                        :disabled="visibleRows.length <= minItems"
                        @click="removeRow(entry.index)"
                    >
                        Remove
                    </DButton>
                </div>
                <DXField
                    v-for="subField in subFields"
                    :key="subField.key"
                    :field="subField"
                    :form="form"
                    :model="entry.row"
                    :key-path="`${rowPath(entry.index)}.${subField.key}`"
                    :error-key="`${rowPath(entry.index)}.${subField.key}`"
                />
            </template>
        </div>

        <DButton
            variant="outline-primary"
            size="sm"
            :disabled="maxItems !== undefined && visibleRows.length >= maxItems"
            @click="addRow"
        >
            {{ field.addLabel || "Add" }}
        </DButton>
    </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import DButton from "../base/DButton.vue";
import DXField from "./DXField.vue";
import type { UseFormReturn } from "../../composables/useForm";
import type { FieldDefinition, FieldType } from "../../types";
import { getByPath, setByPath } from "../../utils/objectPath";

interface Props {
    /** Form instance owning the repeater array */
    form: UseFormReturn<any>;

    /** The repeater field definition (provides sub-fields, limits, labels) */
    field: FieldDefinition;

    /** Dot path into form.data for the array (defaults to field.key) */
    keyPath?: string;

    /** Model passed to predicates from the parent context */
    model?: any;
}

const props = defineProps<Props>();

// The array key is a dot PATH: rows nest into it (`lines.0.price`), and that
// path is also the validation-error key Laravel returns. So a repeater (or
// nested sub-field) key is a path segment, not a literal — avoid literal dots
// in repeater/sub-field keys. (Leaf DXField keys, by contrast, are literal.)
const arrayPath = computed(() => props.keyPath ?? props.field.key);
const subFields = computed<FieldDefinition[]>(() => props.field.fields ?? []);
const minItems = computed(() => props.field.minItems ?? 0);
const maxItems = computed(() => props.field.maxItems);
const softDeleteKey = computed(() => props.field.softDeleteKey);

function isSoftDeleted(row: any): boolean {
    return Boolean(
        softDeleteKey.value &&
            row &&
            typeof row === "object" &&
            row[softDeleteKey.value],
    );
}

/**
 * The full rows array, including any row flagged via `softDeleteKey`. Ensures
 * form.data holds an array at the path so push/splice are reactive even when
 * the form was seeded without one.
 */
const rows = computed<any[]>(() => {
    const existing = getByPath(props.form.data, arrayPath.value);
    if (Array.isArray(existing)) return existing;
    return [];
});

/**
 * Rows shown in the UI, paired with their real (unfiltered) array index —
 * a soft-deleted row stays in `form.data` (so it's submitted) but is hidden
 * here, and every path/splice operation must still target its true index,
 * not its position among visible rows.
 */
const visibleRows = computed<Array<{ row: any; index: number }>>(() =>
    rows.value
        .map((row, index) => ({ row, index }))
        .filter(({ row }) => !isSoftDeleted(row)),
);

const rowPath = (index: number): string => `${arrayPath.value}.${index}`;

// Stable v-for keys tied to row object identity, so removing a middle row
// preserves each surviving row's DOM/component state (focus, file inputs)
// instead of shifting it down with the index. A WeakMap keeps the key off
// form.data, so it never leaks into the submitted payload. A persisted row
// id (when present) is preferred as it survives reloads.
const generatedKeys = new WeakMap<object, number>();
let nextGeneratedKey = 0;

const rowKey = (row: any, fallbackPosition: number): string | number => {
    if (row && typeof row === "object") {
        if (row.id !== undefined && row.id !== null) return row.id;
        let key = generatedKeys.get(row);
        if (key === undefined) {
            key = nextGeneratedKey;
            nextGeneratedKey += 1;
            generatedKeys.set(row, key);
        }
        return `gen-${key}`;
    }
    return fallbackPosition;
};

/** Default value for a freshly added row's sub-field. */
function defaultForType(type: FieldType): any {
    switch (type) {
        case "checkbox":
        case "switch":
            return false;
        case "number":
        case "currency":
        case "percentage":
            return 0;
        case "repeater":
            return [];
        case "image":
        case "file":
            return null;
        default:
            return "";
    }
}

/** Deep-clone a sub-field default so object/array defaults aren't shared
 *  (by reference) across rows. Uses JSON (not structuredClone) because the
 *  default may be a Vue reactive proxy — which structuredClone can't clone —
 *  and form defaults are JSON-serializable by construction. */
function cloneDefault(value: any): any {
    if (value === null || typeof value !== "object") return value;
    return JSON.parse(JSON.stringify(value));
}

function buildRow(): Record<string, any> {
    const row: Record<string, any> = {};
    for (const subField of subFields.value) {
        row[subField.key] =
            subField.default !== undefined
                ? cloneDefault(subField.default)
                : defaultForType(subField.type);
    }
    return row;
}

/**
 * Clear any validation errors keyed under this array (e.g. `lines.1.price`).
 * Row add/remove shifts indices, so stale per-index errors would otherwise
 * attach to the wrong row. They're re-populated on the next submit.
 */
function clearArrayErrors(): void {
    const prefix = `${arrayPath.value}.`;
    for (const key of Object.keys(props.form.errors)) {
        if (key === arrayPath.value || key.startsWith(prefix)) {
            props.form.clearError(key);
        }
    }
}

function addRow(): void {
    if (maxItems.value !== undefined && visibleRows.value.length >= maxItems.value) {
        return;
    }
    // Ensure the array exists on form.data before pushing (path may be
    // nested for repeaters inside repeater rows).
    const existing = getByPath(props.form.data, arrayPath.value);
    if (!Array.isArray(existing)) {
        setByPath(props.form.data, arrayPath.value, []);
    }
    getByPath(props.form.data, arrayPath.value).push(buildRow());
    clearArrayErrors();
}

function removeRow(index: number): void {
    if (visibleRows.value.length <= minItems.value) return;
    const array = getByPath(props.form.data, arrayPath.value);
    const row = array?.[index];

    // A row the server already knows about (carries an `id`) can't just be
    // spliced away under an upsert-children contract — the server never
    // learns it was removed. Flag it instead so it's still submitted, and
    // let it disappear from the UI via `visibleRows`.
    if (softDeleteKey.value && row && typeof row === "object" && row.id !== undefined && row.id !== null) {
        row[softDeleteKey.value] = true;
        clearArrayErrors();
        return;
    }

    array.splice(index, 1);
    clearArrayErrors();
}
</script>

<style scoped>
.dx-repeater-row {
    border: 1px solid var(--bs-border-color);
    border-radius: var(--bs-border-radius);
    padding: 1rem;
    margin-bottom: 0.75rem;
}

.dx-repeater-row-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.75rem;
}

.dx-repeater-row-index {
    font-weight: 600;
    color: var(--bs-secondary-color);
}
</style>
