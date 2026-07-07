<!--
  @component
  DXRepeater renders a nested, repeatable sub-form for a repeater field: a list
  of rows (each a group of sub-fields) with add/remove controls, honouring the
  field's `minItems`/`maxItems` limits.
-->
<template>
    <!-- `repeaterLayout: "table"` is a PREFERENCE, not a guarantee: the table
         needs real horizontal room for its columns, and the same viewport
         width can put this repeater in a wide standalone form or a narrow
         sidebar column — a viewport breakpoint can't tell those apart. A
         ResizeObserver on THIS OUTER wrapper measures the space actually
         available and falls back to the cards layout when it's not enough,
         scaling to this repeater's own column count (see
         `neededTableWidth`/`showTable` below). This outer wrapper is never
         hidden (an element measures 0×0 once `display:none`, which would
         leave a hidden table with no way to detect regained space and
         un-hide itself) — but its two children below ARE mutually exclusive
         via `v-if`/`v-else`, not `v-show`: only ever ONE of table/cards is
         actually mounted, so a field with side effects (e.g. an async
         `optionsLoader`) doesn't run twice forever just because table mode
         is configured. -->
    <div v-if="wantsTableLayout" ref="containerRef" class="dx-repeater-container">
        <div v-if="showTable" class="dx-repeater-table-wrapper">
            <table class="dx-repeater-table table">
                <thead>
                    <tr>
                        <th v-for="subField in subFields" :key="subField.key">
                            {{ headerLabel(subField) }}
                        </th>
                        <th class="dx-repeater-table-remove-col"></th>
                    </tr>
                </thead>
                <tbody>
                    <tr
                        v-for="(entry, position) in visibleRows"
                        :key="rowKey(entry.row, position)"
                    >
                        <!--
                          @slot Custom layout for a single repeater row, replacing the default sub-field stack (including the built-in Remove control — call `remove()` yourself). In table layout, rendered as the `<tr>`'s children: supply one `<td>` per sub-field plus a trailing `<td>` to match the header's column count (the header always includes an empty column for the built-in remove button).
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

                        <template v-else>
                            <td v-for="subField in subFields" :key="subField.key">
                                <DXField
                                    :field="subField"
                                    :form="form"
                                    :model="entry.row"
                                    :key-path="`${rowPath(entry.index)}.${subField.key}`"
                                    :error-key="`${rowPath(entry.index)}.${subField.key}`"
                                    hide-label
                                />
                            </td>
                            <td class="dx-repeater-table-remove-col">
                                <DButton
                                    variant="outline-danger"
                                    class="dx-repeater-table-remove-btn"
                                    :disabled="visibleRows.length <= minItems"
                                    :aria-label="`Remove row ${position + 1}`"
                                    @click="removeRow(entry.index)"
                                >
                                    <i-lucide-trash-2 aria-hidden="true" />
                                </DButton>
                            </td>
                        </template>
                    </tr>
                </tbody>
            </table>

            <DButton
                variant="outline-primary"
                size="sm"
                :disabled="maxItems !== undefined && visibleRows.length >= maxItems"
                @click="addRow"
            >
                {{ field.addLabel || "Add" }}
            </DButton>
        </div>

        <!-- Cards fallback: identical to the default cards markup below,
             shown instead of the table when there isn't enough room for it.
             `v-else` (not `v-show`) — only the OUTER wrapper above needs to
             stay mounted for measurement; unmounting whichever of these two
             isn't current avoids permanently double-running every DXField
             in both layouts at once (double async optionsLoader fetches,
             double watchers, double everything else a field might do). -->
        <div v-else class="dx-repeater">
            <div
                v-for="(entry, position) in visibleRows"
                :key="rowKey(entry.row, position)"
                class="dx-repeater-row"
            >
                <slot
                    v-if="$slots.row"
                    name="row"
                    :row="entry.row"
                    :index="position"
                    :fields="subFields"
                    :remove="() => removeRow(entry.index)"
                    :path="rowPath(entry.index)"
                />

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
    </div>

    <!-- Cards layout (default, `repeaterLayout: "cards"` or unset): each row
         is its own bordered card with sub-fields stacked vertically. Kept as
         a separate, unconditional branch (rather than reusing the fallback
         above) so this — the overwhelmingly common case — never pays for a
         ResizeObserver or the extra wrapper div; its markup is byte-for-byte
         what cards mode has always rendered. -->
    <div v-else class="dx-repeater">
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
import { computed, onBeforeUnmount, ref, watch } from "vue";
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

/** Column header text for a sub-field. No specific row context exists for a
 *  header, so a function-valued label resolves against the outer model. */
function headerLabel(subField: FieldDefinition): string {
    const label = subField.label;
    if (typeof label === "function") return label(props.model ?? {});
    return label || subField.key;
}

// ————————————————— table/cards responsive fallback (#68 follow-up)

const wantsTableLayout = computed(() => props.field.repeaterLayout === "table");

const containerRef = ref<HTMLElement | null>(null);
const containerWidth = ref<number | null>(null);

// Heuristic minimum width for the table to stay legible: per-sub-field
// column widths (not a pixel-measured fit, just a reasonable estimate —
// `currency`/`percentage` get extra room for their `£`/`%` affix, which
// otherwise crowds out the number itself) plus the trailing icon-only
// remove column. Scales with this repeater's own column count/types,
// unlike a single fixed viewport breakpoint.
const DEFAULT_COLUMN_WIDTH = 130;
const AFFIX_COLUMN_WIDTH = 160;
const REMOVE_COLUMN_WIDTH = 70;

function columnWidthFor(subField: FieldDefinition): number {
    if (subField.type === "currency" || subField.type === "percentage") {
        return AFFIX_COLUMN_WIDTH;
    }
    return DEFAULT_COLUMN_WIDTH;
}

const neededTableWidth = computed(
    () =>
        subFields.value.reduce((total, subField) => total + columnWidthFor(subField), 0) +
        REMOVE_COLUMN_WIDTH,
);

// `null` (not yet measured) defaults to showing the table — the configured
// preference — rather than flashing cards first. Resolves as soon as the
// watcher below fires (see its comment for why that isn't simply onMounted).
const showTable = computed(
    () => containerWidth.value === null || containerWidth.value >= neededTableWidth.value,
);

let resizeObserver: ResizeObserver | null = null;

// A `watch` on the ref itself, not `onMounted`: DXRepeater is loaded via
// `defineAsyncComponent` (DXField imports it lazily to break a circular
// import), and for an async-resolved component whose root element also
// carries `v-if`, the template ref is not always populated yet by the time
// `onMounted` fires — observed live as `containerRef.value === null` inside
// `onMounted` despite the element existing in the DOM at that point. `watch`
// instead reacts whenever the ref actually receives (or loses, e.g. if
// `wantsTableLayout` ever toggles false) its element, regardless of when
// that happens relative to lifecycle hooks.
watch(containerRef, (el) => {
    resizeObserver?.disconnect();
    resizeObserver = null;
    if (!el || typeof ResizeObserver === "undefined") return;
    containerWidth.value = el.getBoundingClientRect().width;
    resizeObserver = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (entry) containerWidth.value = entry.contentRect.width;
    });
    resizeObserver.observe(el);
});

onBeforeUnmount(() => {
    resizeObserver?.disconnect();
    resizeObserver = null;
});

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

.dx-repeater-table td {
    vertical-align: middle;
}

/* Sub-fields render with their default mb-3 (matching the standalone-field
   default), which is unwanted spacing inside an already-compact table cell —
   and leaves the field vertically off-centre against the trailing remove
   button, since that residual margin-bottom is inside the td's own
   vertical-align:middle box. Bootstrap's spacing utilities are `!important`
   by design (same as the toast-variant override elsewhere in this project),
   so overriding one requires `!important` too — a plain declaration silently
   loses and the margin survives. */
.dx-repeater-table td :deep(.mb-3) {
    margin-bottom: 0 !important;
}

.dx-repeater-table-remove-col {
    width: 1%;
    white-space: nowrap;
    text-align: center;
}

/* Match the row's text-input height (same var the switch field uses).
   `--dx-input-height`'s `em` term resolves against the CONSUMING element's
   own font-size, not the input's — so this only lines up if the button's
   font-size equals .form-control's (both derive from Bootstrap's base
   font-size var, but a `size="sm"` DButton sets a smaller one). The button
   is deliberately NOT `size="sm"` here for that reason; min-height still
   keeps it visually compact regardless. */
.dx-repeater-table-remove-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: var(--dx-input-height, calc(1.5em + 0.75rem + 2px));
}
</style>
