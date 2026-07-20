<!--
  @component
  DXRepeaterCards — the cards layout for DXRepeater: each row is its own
  bordered card with sub-fields stacked vertically, plus the add-row button.

  Internal to DXRepeater (not exported). It exists because DXRepeater rendered
  this exact markup TWICE — as the default `repeaterLayout: "cards"` branch and
  as the responsive fallback when the `"table"` layout lacks room — and the two
  copies would drift (#135). DXRepeater owns all the row state and passes it in;
  this component is presentational. The `.dx-repeater-row*` scoped styles live
  here (a scoped rule can't reach markup in another component), so the cards
  chrome moves as one unit with the markup it styles.
-->
<template>
    <div class="dx-repeater">
        <div
            v-for="(entry, position) in visibleRows"
            :key="rowKey(entry.row, position)"
            class="dx-repeater-row"
        >
            <!--
              @slot Custom layout for a single repeater row, replacing the default sub-field stack (including the built-in Remove control — call `remove()` yourself).
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
                    <span v-if="field.showRowIndex" class="dx-repeater-row-index">{{ position + 1 }}</span>
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
import DButton from "../base/DButton.vue";
import DXField from "./DXField.vue";
import type { UseFormReturn } from "../../composables/useForm";
import type { FieldDefinition } from "../../types";

interface Props {
    /** Rows shown in the UI, each paired with its real (unfiltered) array index. */
    visibleRows: Array<{ row: any; index: number }>;
    /** Sub-field definitions for a row. */
    subFields: FieldDefinition[];
    /** Form instance owning the repeater array. */
    form: UseFormReturn<any>;
    /** The repeater field definition (for `showRowIndex` and `addLabel`). */
    field: FieldDefinition;
    /** Minimum rows — the Remove button disables at this count. */
    minItems: number;
    /** Maximum rows — the Add button disables at this count. */
    maxItems: number | undefined;
    /** Stable v-for key for a row (owned by DXRepeater — row identity, not index). */
    rowKey: (row: any, fallbackPosition: number) => string | number;
    /** Dot path into form.data for a row at the given true index. */
    rowPath: (index: number) => string;
    /** Remove the row at the given true index (respects minItems / soft-delete). */
    removeRow: (index: number) => void;
    /** Append a fresh row (respects maxItems). */
    addRow: () => void;
}

defineProps<Props>();
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
    margin-bottom: 0.75rem;
}

/* The Remove control is always this header's last child, whether or not the
   (opt-in) row-index span is also present — push it to the end explicitly
   rather than relying on `justify-content: space-between`, which centres a
   single remaining child at the *start* once the index is off (the default). */
.dx-repeater-row-header > :last-child {
    margin-inline-start: auto;
}

.dx-repeater-row-index {
    font-weight: 600;
    color: var(--bs-secondary-color);
}
</style>
