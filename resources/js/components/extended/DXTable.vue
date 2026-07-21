<!--
  @component
  Full-featured dashboard data table. Wraps `DTable` and adds three data modes
  (Inertia items, client-side, and API/provider), inline per-column filters,
  single-column sorting, pagination with a per-page selector, and an optional
  edit/create/delete modal driven by `DXForm`.
-->
<template>
    <DContainer :fluid="fluid" :class="containerClass">
        <DRow class="justify-content-center">
            <DCol :md="columnSize">
                <DXTableShell :card="card">
                    <template v-if="title || showsCreateButton || $slots.header" #header>
                        <!-- @slot Card header content; overrides the default title heading and the "New {item}" button. -->
                        <slot name="header">
                            <div class="d-flex justify-content-between align-items-center">
                                <h4 class="mb-0">{{ title }}</h4>
                                <DButton
                                    v-if="showsCreateButton"
                                    variant="primary"
                                    size="sm"
                                    @click="handleCreateNew"
                                >
                                    New {{ singularItemName }}
                                </DButton>
                            </div>
                        </slot>
                    </template>

                    <!-- Rendered ABOVE the table, not instead of it: a failed
                         request is usually caused by the sort or a filter, and
                         replacing the table would take away the very controls
                         needed to undo it, leaving a reload as the only way out. -->
                    <div v-if="error || (apiError && isProviderMode)" class="alert alert-danger">
                        {{ error || apiError }}
                    </div>

                    <div v-if="effectiveBusy && !isProviderMode" class="text-center py-5">
                        <DSpinner variant="primary" />
                        <p class="mt-2">{{ loadingText }}</p>
                    </div>

                    <!-- One table for all three data modes. The modes differ only
                         in a few bound props, supplied by `tableModeBindings`, so
                         the filter row, headers, dotted-cell rendering and slot
                         forwarding live ONCE here instead of being copied per mode
                         (#123). The `v-else-if` guard keeps "render nothing when
                         there is no data source" — none of the three modes true. -->
                    <DTable
                        v-else-if="isProviderMode || isClientSideMode || isInertiaMode"
                        ref="tableRef"
                        :key="activeMode + ':' + tableSlotSignature($slots)"
                        :fields="fields"
                        :sort-by="effectiveSortBy"
                        :multisort="false"
                        :no-sortable-icon="true"
                        :striped="striped"
                        :hover="hover"
                        :responsive="responsive"
                        :fixed="fixedLayout"
                        :tbody-tr-class="composeRowClass"
                        v-bind="{ ...tableModeBindings, ...tablePassthroughProps }"
                        @update:sort-by="handleSortChange"
                        @update:expanded-items="emit('update:expandedItems', $event)"
                        @update:current-page="apiCurrentPage = $event"
                        @update:busy="handleBusyChange"
                        @row-clicked="handleRowClick"
                    >
                        <!-- Per-column widths (#156) via a `<colgroup>`. bvn nests this
                             slot's `<col>`s inside a `<colgroup>` it renders. Only
                             emitted when a field declares a width AND the consumer hasn't
                             supplied their own `table-colgroup` (forwarded generically) —
                             so a table with no widths gets no colgroup and renders exactly
                             as before. `<col>` widths are authoritative under
                             `table-layout: fixed`, where the filter row (not the header)
                             is the width-determining first row. -->
                        <template
                            v-if="fieldsHaveWidths && !$slots['table-colgroup']"
                            #table-colgroup
                        >
                            <col
                                v-for="field in fields"
                                :key="`col-${field.key}`"
                                :style="columnStyleFor(field)"
                            />
                        </template>

                        <!-- DXTable owns `thead-top` (its filter row lives there), so a
                             consumer's own thead-top content is COMPOSED above it rather
                             than being dropped: a grouped column-header banner or a pinned
                             totals row sits above the headers where it belongs (#120). -->
                        <template v-if="hasFilters || $slots['thead-top']" #thead-top="theadScope">
                            <!--
                              @slot A row rendered ABOVE the column headers — a grouped-column banner (a `<th colspan>` spanning several columns), or a pinned totals row. Renders above DXTable's own filter row. Give it `<tr>`s.
                              @binding {object} columns The number of columns in the table.
                              @binding {object} fields The table's fields.
                            -->
                            <slot name="thead-top" v-bind="theadScope" />

                            <tr v-if="hasFilters" class="filter-row">
                                <th v-for="field in fields" :key="`filter-${field.key}`" class="p-2">
                                    <!-- Text Filter -->
                                    <DFormInput
                                        v-if="field.filter === 'text'"
                                        :model-value="effectiveFilters[filterKeyFor(field)] || ''"
                                        :placeholder="field.filterPlaceholder || `Search ${field.label || field.key}...`"
                                        size="sm"
                                        @update:model-value="handleFilterChange(filterKeyFor(field), $event as string)"
                                    />

                                    <!-- Multi-value Select Filter (#51): several values at once; the filters entry is an array -->
                                    <DAutocomplete
                                        v-else-if="field.filter === 'select' && field.filterMultiple"
                                        :model-value="multiFilterValueFor(field)"
                                        :options="getFieldFilterOptions(field)"
                                        :placeholder="field.filterPlaceholder || filterAllLabelFor(field)"
                                        size="sm"
                                        multiple
                                        open-on-focus
                                        @update:model-value="handleMultiSelectFilterChange(field, $event)"
                                    />

                                    <!-- Select Filter: typeahead — browse the full list on focus, or type to narrow; clear (✕) resets to "no filter" -->
                                    <DAutocomplete
                                        v-else-if="field.filter === 'select'"
                                        :model-value="(effectiveFilters[filterKeyFor(field)] as string) || ''"
                                        :options="getFieldFilterOptions(field)"
                                        :placeholder="field.filterPlaceholder || filterAllLabelFor(field)"
                                        size="sm"
                                        open-on-focus
                                        @update:model-value="handleSelectFilterChange(field, $event)"
                                    />

                                    <!-- Number Filter -->
                                    <DFormInput
                                        v-else-if="field.filter === 'number'"
                                        :model-value="effectiveFilters[filterKeyFor(field)] || ''"
                                        :placeholder="field.filterPlaceholder || `Filter ${field.label || field.key}...`"
                                        type="number"
                                        size="sm"
                                        @update:model-value="handleFilterChange(filterKeyFor(field), $event as string)"
                                    />

                                    <!-- Date Filter -->
                                    <DFormInput
                                        v-else-if="field.filter === 'date'"
                                        :model-value="effectiveFilters[filterKeyFor(field)] || ''"
                                        type="date"
                                        size="sm"
                                        @update:model-value="handleFilterChange(filterKeyFor(field), $event as string)"
                                    />

                                    <!-- No filter for this column -->
                                    <div v-else></div>
                                </th>
                            </tr>
                        </template>

                        <!-- Custom headers for all fields -->
                        <template v-for="field in fields" :key="`head-${field.key}`" #[`head(${field.key})`]="{ label }">
                            <div class="d-flex align-items-center justify-content-between gap-2">
                                <div class="flex-grow-1">
                                    <div class="fw-semibold">{{ headerLabel(field, label) }}</div>
                                    <small v-if="field.hint" class="text-muted d-block" style="font-weight: normal;">{{ field.hint }}</small>
                                </div>

                                <!-- ADDITIVE per-column header content (#99), rendered
                                     INSIDE DXTable's own header cell rather than as a
                                     `head(<key>)` override — an override would silently
                                     drop the sort indicator and the field hint, which is
                                     exactly why `head(...)` is not forwarded (see
                                     `isTableSlot`). Placed after the label block and
                                     BEFORE the sort indicator so a period total sits at
                                     the top-right of the text area without displacing the
                                     sort arrows, and lands in the same place whether or
                                     not the column happens to be sortable. The wrapper is
                                     only emitted when the slot exists, so a table without
                                     one renders exactly as before. -->
                                <div
                                    v-if="$slots[`head-end(${field.key})`]"
                                    class="dx-head-end flex-shrink-0 text-end"
                                >
                                    <!--
                                      @slot head-end(<fieldKey>) Additive content at the end of a column's own header — a period total above a numeric column, a small badge — keeping DXTable's sort indicator and field hint. Not a `head()` override.
                                      @binding {object} field The column's field definition.
                                      @binding {string} label The column's resolved header label.
                                    -->
                                    <slot
                                        :name="`head-end(${field.key})`"
                                        :field="field"
                                        :label="headerLabel(field, label)"
                                    />
                                </div>

                                <div v-if="field.sortable" class="sort-indicator text-muted flex-shrink-0" style="font-size: 0.75rem; line-height: 1.1; display: flex; flex-direction: column; align-items: center;">
                                    <span :style="{ opacity: getFieldSortState(field.key) === 'asc' ? 1 : 0.3 }">▲</span>
                                    <span :style="{ opacity: getFieldSortState(field.key) === 'desc' ? 1 : 0.3 }">▼</span>
                                </div>
                            </div>
                        </template>

                        <!-- A dotted field key (`paid_by.card`) renders as an EMPTY cell in
                             bootstrap-vue-next, in every payload shape, so DXTable resolves
                             those columns itself (#121). A consumer's own cell(<key>) slot
                             wins — `dottedCellFields` excludes it, and the forwarding below
                             would otherwise declare the same slot name twice. -->
                        <template
                            v-for="field in dottedCellFields($slots)"
                            :key="`dotted-cell-${field.key}`"
                            #[`cell(${field.key})`]="{ item }"
                        >{{ fieldValueOf(item, field.key) }}</template>

                        <!-- Forward every slot the inner table understands: cell(<key>),
                             foot(<key>), custom-foot, empty, empty-filtered, row-expansion,
                             table-busy/caption/colgroup, thead-sub, top-row, bottom-row.
                             See `isTableSlot` for the two DXTable renders itself. -->
                        <template
                            v-for="name in forwardableSlotNames($slots)"
                            :key="name"
                            #[name]="slotProps"
                        >
                            <!--
                              @slot Any slot the underlying table supports, forwarded with its scope: `cell(<fieldKey>)` for a cell, `foot(<fieldKey>)` for a footer cell (needs `footClone`), `empty` for the no-rows message, `row-expansion` for expandable row detail, plus `custom-foot`, `top-row`, `bottom-row`, `thead-sub` and the `table-*` slots.
                            -->
                            <slot :name="name" v-bind="slotProps" />
                        </template>
                    </DTable>

                    <!-- Pagination + per-page footer, rendered ONCE for all three
                         data modes (#123). `activePagination` picks the mode's
                         PaginationData; `handleActivePageChange` routes the page
                         event to the right per-mode handler. Previously three
                         byte-identical copies, one per mode. -->
                    <DXTablePagination
                        v-if="activePagination"
                        :pagination="activePagination"
                        :per-page="effectivePerPage"
                        :per-page-options="perPageOptions"
                        :show-pagination="showPagination"
                        :show-per-page-selector="shouldShowPerPageSelector"
                        :show-count="showCount"
                        :singular-item-name="singularItemName"
                        :plural-item-name="pluralItemName"
                        :has-active-filters="hasActiveFilters"
                        @page-change="handleActivePageChange"
                        @per-page-change="handlePerPageChange"
                    />
                </DXTableShell>
            </DCol>
        </DRow>

        <!-- Edit/create modal (only when editFields provided). The consumer's
             edit-value / edit-span / tab-* slots are forwarded through to it
             generically; it maps them onto DXForm and provides the row context
             + a close handle (#129). -->
        <DXTableEditorModal
            v-if="editFields && editFields.length > 0"
            v-model:show="showEditModal"
            v-model:active-tab="activeTabIndex"
            :title="computedModalTitle"
            :size="editModalSize"
            :loading="editLoading"
            :form="editForm"
            :form-instance-key="editFormInstanceKey"
            :fields="editFields"
            :tabs="editTabs"
            :item="selectedItem"
            :is-create-mode="isCreateMode"
            :pending-action="pendingAction"
            :delete-url="deleteUrl"
            :layout="editLayout"
            :label-cols="editLabelCols"
            :card="editCard"
            :item-name="itemName"
            :save-text="saveText"
            :create-text="createText"
            :delete-text="deleteText"
            @save="handleEditSave"
            @cancel="handleEditCancel"
            @delete="handleDelete"
        >
            <!--
              @slot edit-value(<fieldKey>) / edit-span(<fieldKey>) /
              tab-content|tab-before|tab-after(<tabKey>) — forwarded to the edit
              modal (see DXTableEditorModal for their bindings).
            -->
            <template
                v-for="name in editModalSlotNames($slots)"
                :key="name"
                #[name]="slotProps"
            >
                <slot :name="name" v-bind="slotProps" />
            </template>
        </DXTableEditorModal>
    </DContainer>
</template>

<script setup lang="ts" generic="T = any">
import { computed, getCurrentInstance, ref, watch } from "vue";
import { router } from "@inertiajs/vue3";
import { api } from "../../utils/api";
import pluralize from "pluralize";
import { useResourceEditor } from "../../composables/useResourceEditor";
import { getByPath } from "../../utils/objectPath";
import type { FieldDefinition, LabelCols } from "../../types";
import DContainer from "../base/DContainer.vue";
import DRow from "../base/DRow.vue";
import DCol from "../base/DCol.vue";
import DXTableShell from "./DXTableShell.vue";
import DSpinner from "../base/DSpinner.vue";
import DTable from "../base/DTable.vue";
import DFormInput from "../base/DFormInput.vue";
import DAutocomplete from "../base/DAutocomplete.vue";
import DButton from "../base/DButton.vue";
import DXTablePagination from "./DXTablePagination.vue";
import DXTableEditorModal from "./DXTableEditorModal.vue";
export type FilterType = 'text' | 'select' | 'number' | 'date' | false;

export interface FilterOption {
    value: string;
    text: string;
}

/**
 * Adapts the built-in `apiUrl` provider's request/response to a backend whose
 * convention differs from dfl's (spatie query-builder params, an envelope
 * without the `{data, pagination}` shape). The sanctioned replacement for the
 * axios-interceptor bridges #132 removed the route for: `request` maps the
 * outgoing params (its return is what goes on the wire); `response` maps the
 * body back, receiving the ORIGINAL dfl-shape params (`page`, `perPage`, …)
 * so it can synthesize paginator metadata a foreign envelope lacks.
 */
export interface DXTableApiAdapter {
    request?: (params: Record<string, any>) => Record<string, any>;
    response?: (
        body: any,
        context: { params: Record<string, any> },
    ) => { data: any[]; pagination?: PaginationData; filterValues?: Record<string, string[]> };
}

export interface TableField {
    key: string;
    label?: string;

    /**
     * The key this column's filter is sent under, when it differs from the
     * column's own key (default: `key`). Lets a *display* column filter on a
     * different server param — e.g. a "Customer" column rendering a name but
     * filtering on `customer_id` — instead of forcing the column to be named
     * after the server's filter param and the human-facing value into a
     * `#cell` slot.
     */
    filterKey?: string;

    /**
     * For a `select` filter: allow SEVERAL values at once (#51). The filter
     * renders as a multi-select typeahead, the filters map holds an ARRAY of
     * the chosen option values, and the query string carries Laravel bracket
     * notation (`filters[status][]=active&filters[status][]=pending`).
     * Client-side, a row matches when its value equals ANY chosen value. An
     * empty selection means "no filter". The "All …" reset row is omitted in
     * this mode (removing the chips/✕ is the way back); `filterNullText`
     * stays available as a choosable value.
     */
    filterMultiple?: boolean;

    /**
     * For a `select` filter: adds an option meaning "has no value", e.g.
     * `filterNullText: "Unassigned"` on an assignee column. Selecting it sends
     * `filterNullValue` (default `"null"`) as the filter value; client-side, it
     * matches rows whose value is null, undefined or empty.
     */
    filterNullText?: string;

    /** The value sent when the `filterNullText` option is chosen. Default `"null"`. */
    filterNullValue?: string;

    /**
     * Text of the "clear this filter" option at the top of a `select` filter's
     * list (default: the filter's placeholder, e.g. "All statuses"). The list
     * otherwise offers no way back to *unfiltered* once a value is picked —
     * only the ✕, which isn't discoverable from inside the open dropdown.
     */
    filterAllText?: string;
    sortable?: boolean;
    hint?: string;
    filter?: FilterType;
    filterOptions?: FilterOption[];
    filterPlaceholder?: string;

    /**
     * For a `select` filter on a **client-side** table: derive the dropdown's
     * options from the distinct values present in the loaded rows. Defaults to
     * `true` — with no `filterOptions` and no server `filterValues` the
     * alternative is an empty dropdown, which can only ever be a bug.
     *
     * Set `false` to opt out (e.g. a column whose raw values are opaque ids you
     * would rather label yourself via `filterOptions`).
     *
     * Explicit `filterOptions` and server-supplied `filterValues` still WIN, in
     * that order. Provider/API and Inertia modes ignore this flag: they only
     * ever hold one page of rows, so there is no complete value set to derive
     * from (see `getFieldFilterOptions`).
     */
    deriveFilterOptions?: boolean;

    /**
     * Fixed width for this column, applied via a `<colgroup>` `<col>`. A number
     * is treated as pixels (`200` → `200px`); a string is used verbatim
     * (`"20%"`, `"12rem"`). Pair with the table-level `fixedLayout` prop so the
     * width is authoritative and the column stops resizing to fit its content —
     * without `fixedLayout` a wider cell can still stretch the column (#156).
     */
    width?: string | number;

    /**
     * Minimum width for this column, applied via the same `<col>` as `width`.
     * A number is pixels; a string is used verbatim.
     */
    minWidth?: string | number;
    [key: string]: any;
}

export interface PaginationData {
    current_page: number;
    per_page: number;
    total: number;
    from: number;
    to: number;
    last_page?: number;
    total_unfiltered?: number;
}

export interface BTableSortBy {
    key: string;
    order?: 'asc' | 'desc';
}

export interface BTableProviderContext {
    sortBy?: BTableSortBy[];
    filter?: string;
    currentPage: number;
    perPage: number;
}

export type BTableProvider<T = any> = (
    context: Readonly<BTableProviderContext>
) => Promise<T[] | undefined> | T[] | undefined;

export interface EditTab {
    /** Unique key for this tab */
    key: string;

    /**
     * Display label (optional, auto-derived from key if omitted). May be a
     * function of the model (the edited row merged with the live form data),
     * e.g. `label: (item) => \`Products (${item.products_count ?? 0})\``.
     */
    label?: string | ((item: any) => string);

    /** Field keys to display in this tab (from editFields) */
    fieldKeys: string[];

    /** Conditional display (optional) */
    when?: boolean | ((item: any) => boolean);

    /** Lazy load tab content (optional, default false) */
    lazy?: boolean;
}

/**
 * Discriminated data-source descriptor (#130). The additive, type-safe
 * replacement for the legacy `items` / `provider` / `apiUrl` / `inertiaUrl` /
 * `clientSide` prop matrix, in which every prop was independently optional and
 * the mode was inferred by precedence — so invalid combinations compiled and
 * some were silently ignored.
 *
 * Pass ONE `source`: the mode is explicit and its required companion prop is
 * enforced by the compiler (`{ mode: 'provider' }` without a `provider` won't
 * type-check). The legacy props still work and take over when `source` is
 * omitted; a future major removes them with a codemod (#130 Phase 3).
 *
 * `apiAdapter` (transport translation) and `pagination` (server-supplied page
 * metadata) stay sibling props — they're orthogonal to which mode is active.
 */
export type DXTableSource<TItem = any> =
    | { mode: 'client'; items: TItem[] }
    | { mode: 'provider'; provider: BTableProvider<TItem> }
    | { mode: 'api'; url: string }
    | { mode: 'inertia'; items: TItem[]; url?: string };

export interface Props<TItem = any> {
    /** Table title */
    title?: string;

    /** Name for item (singular) - automatically pluralized (e.g., "product" → "products") */
    itemName?: string;

    /** Table data items (Inertia mode) */
    items?: TItem[];

    /** Provider function for API mode (alternative to items/apiUrl) */
    provider?: BTableProvider<TItem>;

    /** API endpoint URL for auto-provider mode (alternative to provider function) */
    apiUrl?: string;

    /** Adapts the built-in provider's request params / response body to a
     *  backend convention that differs from dfl's (see DXTableApiAdapter). */
    apiAdapter?: DXTableApiAdapter;

    /**
     * Discriminated data-source (#130) — the type-safe alternative to the
     * legacy `items` / `provider` / `apiUrl` / `inertiaUrl` / `clientSide`
     * props. When set it WINS over those props; when omitted, the legacy props
     * apply unchanged. See `DXTableSource`.
     */
    source?: DXTableSource<TItem>;

    /** Table field definitions */
    fields: TableField[];

    /** Sort configuration (v-model support) */
    sortBy?: BTableSortBy[];

    /** Filter values (v-model support) - key is field key, value is the filter
     *  string, or an ARRAY of values for a `filterMultiple` column (#51). */
    filters?: Record<string, string | string[]>;

    /** Dynamic filter options from server - key is field key, value is array of values */
    filterValues?: Record<string, string[]>;

    /** Inertia route URL (if provided, handles navigation automatically) */
    inertiaUrl?: string;

    /** Loading/busy state (v-model support) */
    busy?: boolean;

    /** Loading state (deprecated, use busy instead) */
    loading?: boolean;

    /** Loading text */
    loadingText?: string;

    /** Error message */
    error?: string | null;

    /** Pagination data (Inertia mode) */
    pagination?: PaginationData;

    /** Show pagination controls */
    showPagination?: boolean;

    /** Show per-page selector */
    showPerPageSelector?: boolean;

    /**
     * Show the footer's item-count caption ("N items." / "X to Y out of Z
     * items."). Defaults to `true`. Set `false` to suppress just the caption,
     * independent of the pager — a page ported from a plain `<b-table>` that
     * hides the pager with `:show-pagination="false"` would otherwise gain a
     * caption it never had (#127).
     */
    showCount?: boolean;

    /** Per-page options for selector */
    perPageOptions?: number[];

    /** Current page (for provider mode) */
    currentPage?: number;

    /**
     * Items per page. With a `v-model:per-page` it is controlled state; a bare
     * `:per-page="20"` is the INITIAL page size (see the initial-value vs
     * controlled note above). When passed explicitly it takes PRECEDENCE over any
     * per-page preference persisted in localStorage — `:per-page="20"` always
     * starts at 20, never a size the user once picked on another table (#124).
     * Omit it to let a stored preference (URL-keyed tables only) or the default
     * apply.
     */
    perPage?: number;

    /** Striped (banded) rows. Off by default — banding adds little on short
     *  tables and can read as noise; opt in with `:striped="true"`. */
    striped?: boolean;

    /** Hover effect on rows */
    hover?: boolean;

    /** Responsive table */
    responsive?: boolean;

    /** Fluid container */
    fluid?: boolean;

    /** Container CSS class */
    containerClass?: string;

    /** Column size (Bootstrap grid) */
    columnSize?: string | number;

    /**
     * Wrap the table in a `DCard`. Defaults to `true`. Set `false` for a plain,
     * borderless variant — the same header, filter row, table and pagination
     * rendered directly on the page background (no card border/shadow), for
     * data-heavy admin index pages that read as busy inside a card.
     */
    card?: boolean;

    // Edit Modal Props
    /**
     * Form field definitions for edit modal (if provided, enables edit on row
     * click). `import type` is erased at compile time, so this creates no
     * runtime import cycle (#131).
     */
    editFields?: FieldDefinition[];

    /** Tab definitions for organizing edit modal content */
    editTabs?: EditTab[];

    /** Edit modal title (can be function for dynamic titles) */
    editModalTitle?: string | ((item: any) => string);

    /** Edit modal size */
    editModalSize?: 'sm' | 'md' | 'lg' | 'xl';

    /**
     * Field layout for the edit/create modal's form, forwarded to its `DXForm`
     * ("vertical" = label above input, "horizontal" = label left). Defaults to
     * **"horizontal"** to match the Omni Tend form convention (a raw modal form
     * previously fell back to DXForm's vertical default, which looked out of
     * place next to horizontal page forms). Pass `"vertical"` to opt out.
     */
    editLayout?: 'vertical' | 'horizontal';

    /**
     * Label column width for the edit modal's horizontal layout, forwarded to
     * `DXForm`'s `labelCols` (a single width or a per-breakpoint object). Only
     * meaningful when `editLayout` is "horizontal".
     */
    editLabelCols?: LabelCols;

    /**
     * Wrap the edit/create modal's form in a bordered card. Off by default (the
     * modal body already provides a boundary); opt in for a more contained,
     * panelled look around a tabbed edit form.
     */
    editCard?: boolean;

    /** Override the modal's Save button label (default: "Save {item}"). */
    saveText?: string;

    /** Override the modal's Create button label (default: "Create {item}"). */
    createText?: string;

    /** Override the modal's Delete button label (default: "Delete {item}"). */
    deleteText?: string;

    /** API endpoint pattern for updates (e.g., "/api/products/:id") */
    editUrl?: string;

    /**
     * API endpoint pattern to fetch the FULL record for the edit modal
     * (e.g., "/api/products/:id"). When set, opening a row seeds the form from
     * this fetch (shown with a loading state) instead of the thin list row —
     * use when the list payload omits fields the edit form needs (notes, nested
     * relations, repeater rows, …). The response is unwrapped from `data.data`
     * (Laravel API Resource) or used as-is.
     */
    showUrl?: string;

    /** API endpoint pattern for deletions (e.g., "/api/products/:id") */
    deleteUrl?: string;

    /**
     * Guard run when Delete is clicked, before the confirm dialog and request.
     * Return a message for a non-deletable item to show it immediately (as a
     * toast) and skip both the confirm and the delete request; return
     * `null`/`undefined` to proceed with the normal confirm + delete. Lets you
     * short-circuit a doomed delete (e.g. a record with dependents that the
     * server would reject) with an immediate, specific reason.
     */
    deleteGuard?: (item: TItem) => string | null | undefined;

    /** API endpoint for creating new items (e.g., "/api/products") — enables "New" button */
    createUrl?: string;

    /**
     * Render the built-in "New {item}" button in the card header (default
     * `true` whenever `createUrl` is set). Set `false` to drive the create
     * modal from your own trigger elsewhere — e.g. a button in the dashboard
     * navbar's actions slot calling the exposed `openCreate()`. With no
     * `title` and no `header` slot, the header is then dropped entirely
     * rather than left empty.
     */
    showCreateButton?: boolean;

    /**
     * Render a `<tfoot>` mirroring the header row, so `#foot(<key>)` slots can
     * hold per-column totals that line up under their data (#99). Without it
     * there is no footer to put them in. For a fully custom footer, use the
     * `custom-foot` slot instead.
     */
    footClone?: boolean;

    /**
     * Show a message row when there are no rows (default `true`). An empty
     * table body is indistinguishable from a broken one, so the message is on
     * by default. Override the wording with `emptyText`, or the whole row with
     * the `empty` slot.
     */
    showEmpty?: boolean;

    /**
     * Message shown when there are no rows. Defaults to "No {items} found", or
     * "No {items} match your filters" when a column filter is active.
     */
    emptyText?: string;

    /**
     * Rows currently expanded, as a `v-model`. Pair with the `row-expansion`
     * slot to render detail content under a row (#112) instead of forcing every
     * per-row detail into a modal.
     */
    expandedItems?: TItem[];

    /**
     * Class(es) applied to each row's `<tr>` — a string, or a function of the
     * row. Use for conditional row styling (a variant, a muted/disabled look)
     * without reaching into the table's internal DOM from global CSS.
     */
    rowClass?: string | ((item: TItem, index: number) => string | string[] | Record<string, boolean>);

    /**
     * Whether a given row is actionable. Only relevant when rows are clickable
     * (an `editFields` modal or a `row-clicked` listener). A row this returns
     * `false` for gets no pointer cursor, no hover highlight, and does not fire
     * `row-clicked` or open the edit modal — so a row that isn't clickable
     * doesn't *look* clickable, and a click on it can't quietly do something.
     */
    rowClickable?: (item: TItem, index: number) => boolean;

    /** Enable client-side filtering, sorting, and pagination on items array */
    clientSide?: boolean;

    /**
     * Apply `table-layout: fixed` to the underlying table. Off by default, so
     * existing tables keep their content-sized columns. When on, column widths
     * stop depending on cell content, so they no longer reshuffle when a filter
     * narrows the rows — the table stays put as you filter (#156). Combine with
     * per-field `width`/`minWidth` to control the proportions; columns with no
     * declared width share the remaining space equally.
     */
    fixedLayout?: boolean;
}

const props = withDefaults(defineProps<Props<T>>(), {
    itemName: "item",
    loading: false,
    busy: false,
    loadingText: "Loading...",
    error: null,
    pagination: () => ({
        current_page: 1,
        per_page: 15,
        total: 0,
        from: 0,
        to: 0,
    }),
    showPagination: true,
    showPerPageSelector: true,
    showCount: true,
    perPageOptions: () => [10, 20, 50, 100],
    currentPage: 1,
    // perPage: 10,  // Don't set default - let internalPerPage handle it
    striped: false,
    hover: true,
    responsive: true,
    fluid: false,
    containerClass: "py-5",
    columnSize: "12",
    card: true,
    editModalSize: "lg",
    editLayout: "horizontal",
    editCard: false,
    showCreateButton: true,
    footClone: false,
    showEmpty: true,
    fixedLayout: false,
});

const emit = defineEmits<{
    /** Emitted when the user navigates to a different page (all modes). Payload is the new 1-based page number. */
    pageChange: [page: number];
    /** Emitted (Inertia mode) when the sort column or direction changes, with the active field key and order. */
    sortChange: [sort: { key: string; order: 'asc' | 'desc' }];
    /** Emitted when the inline column filter values change (debounced for server modes, immediate for client-side). Payload is the full filter map. */
    filterChange: [filters: Record<string, string | string[]>];
    /** Emitted when the per-page selector value changes. Payload is the new page size. */
    perPageChange: [perPage: number];
    /** Emitted when a table row is clicked, with the row item, its index, and the click event. */
    rowClicked: [item: T, index: number, event: MouseEvent];
    /** Emitted after a new item is successfully created via `createUrl`, with the created item and the raw response. */
    rowCreated: [item: any, response: any];
    /** Emitted when a create request fails, with the validation errors or error object. */
    createError: [error: any];
    /** Emitted after a row is successfully updated (or, with no `editUrl`, when the modal is saved), with the item and the response/form data. */
    rowUpdated: [item: T, response: any];
    /** Emitted when an update request fails, with the edited item and the error. */
    editError: [item: T, error: any];
    /** Emitted after a row is successfully deleted via `deleteUrl`, with the deleted item and the response. */
    rowDeleted: [item: T, response: any];
    /** Emitted when a delete request fails, with the item and the error. */
    deleteError: [item: T, error: any];
    /** `v-model:sortBy` update, emitted with the normalized single-column sort array when sorting changes. */
    'update:sortBy': [sortBy: BTableSortBy[]];
    /** `v-model:expandedItems` update, emitted with the rows currently expanded. */
    'update:expandedItems': [items: T[]];
    /** `v-model:filters` update, emitted with the new filter map when a column filter changes. */
    'update:filters': [filters: Record<string, string | string[]>];
    /** `v-model:perPage` update, emitted with the new page size when the per-page selector changes. */
    'update:perPage': [perPage: number];
    /** `v-model:busy` update, forwarded from the underlying table's provider loading state (provider mode). */
    'update:busy': [busy: boolean];
}>();

// Effective data-source values (#130). Prefer an explicit `source` prop, else
// fall back to the legacy `items`/`provider`/`apiUrl`/`inertiaUrl`/`clientSide`
// props. Every read below (mode detection, provider, client-side pipeline,
// inertia navigation) goes through these, so both APIs drive identical logic.
const resolvedClientSide = computed(() =>
    props.source ? props.source.mode === 'client' : props.clientSide === true,
);
const resolvedItems = computed<T[] | undefined>(() => {
    if (props.source) {
        return props.source.mode === 'client' || props.source.mode === 'inertia'
            ? props.source.items
            : undefined;
    }
    return props.items;
});
const resolvedProvider = computed<BTableProvider<T> | undefined>(() =>
    props.source
        ? props.source.mode === 'provider'
            ? props.source.provider
            : undefined
        : props.provider,
);
const resolvedApiUrl = computed<string | undefined>(() =>
    props.source
        ? props.source.mode === 'api'
            ? props.source.url
            : undefined
        : props.apiUrl,
);
const resolvedInertiaUrl = computed<string | undefined>(() =>
    props.source
        ? props.source.mode === 'inertia'
            ? props.source.url
            : undefined
        : props.inertiaUrl,
);

// Mode detection
const isProviderMode = computed(() => !resolvedClientSide.value && (!!resolvedProvider.value || !!resolvedApiUrl.value));
const isInertiaMode = computed(() => !resolvedClientSide.value && !resolvedProvider.value && !resolvedApiUrl.value && !!resolvedItems.value);
const isClientSideMode = computed(() => resolvedClientSide.value && !!resolvedItems.value);
const hasInertiaUrl = computed(() => !!resolvedInertiaUrl.value);

// The active data-source mode, folded into the table's `:key` so a runtime
// mode switch (e.g. `source` provider → client) REMOUNTS the DTable. bvn's
// BTable caches its provider-fetched items internally and doesn't cleanly adopt
// a fresh `:items` binding when the provider is removed — without a remount the
// table shows "No items found" after switching to client/inertia mode. Stable
// for a table that never changes mode, so it adds no spurious remounts.
const activeMode = computed(() =>
    isClientSideMode.value
        ? 'client'
        : isInertiaMode.value
          ? 'inertia'
          : isProviderMode.value
            ? 'provider'
            : 'empty',
);

// Warn about invalid LEGACY prop combinations (a `source` prop makes these
// impossible at the type level, so it's exempt). #130: `clientSide + provider`
// was previously uncovered by this guard.
if (
    !props.source &&
    props.clientSide &&
    (props.provider || props.apiUrl || props.inertiaUrl)
) {
    console.warn('[DXTable] clientSide mode ignores provider, apiUrl and inertiaUrl props. Data is processed locally from items.');
}

// Computed for effective busy state (provider mode uses 'busy', inertia uses 'loading')
const effectiveBusy = computed(() => isProviderMode.value ? props.busy : props.loading);

/*
 * `perPage`, `sortBy` and `filters` are dual-purpose: with a `v-model` they are
 * CONTROLLED state; without one they read as an INITIAL value.
 *
 * DXTable used to treat any passed value as controlled, so `:per-page="50"` —
 * the natural way to say "start with 50 per page" — rendered a working-looking
 * per-page selector that did nothing: the user picked 10, the select showed 10,
 * and the table kept rendering 50 (#110). The control responded, nothing
 * errored, and the table quietly ignored it.
 *
 * A prop is only controlled if the consumer is listening for its update, so
 * that is what we check. It has to come off the raw vnode props: Vue strips
 * DECLARED emit listeners out of `$attrs`, so `useAttrs()` can't see them.
 * Listener presence doesn't meaningfully change over a component's life, so
 * this is resolved once at setup rather than per render.
 */
const instance = getCurrentInstance();

const hasListener = (event: string): boolean => {
    const vnodeProps = instance?.vnode.props ?? {};
    const toHandlerKey = (name: string) => `on${name.charAt(0).toUpperCase()}${name.slice(1)}`;
    // `v-model:per-page` / `@row-clicked` compile to camelCase handler keys, but
    // a hand-written hyphenated listener stays hyphenated — accept either.
    const hyphenated = event.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);
    return toHandlerKey(event) in vnodeProps || toHandlerKey(hyphenated) in vnodeProps;
};

const isControlled = {
    perPage: hasListener('update:perPage'),
    sortBy: hasListener('update:sortBy'),
    filters: hasListener('update:filters'),
};

/*
 * Rows are interactive when clicking one does something: the built-in edit
 * modal (`editFields`) opens, or the consumer is listening for `row-clicked`.
 * The cursor and hover affordance follow from that — DXTable already knows,
 * so consumers shouldn't have to reach into `:deep(tbody tr)` to say it (#107).
 * The listener case was the gap: only `editFields` used to count.
 */
const rowsAreInteractive = computed(
    () => (props.editFields?.length ?? 0) > 0 || hasListener('rowClicked'),
);

/**
 * A row is actionable when the table is interactive AND the consumer's
 * `rowClickable` predicate (if any) says so — a row-clicked table can have rows
 * that aren't navigable (#115).
 */
const isRowActionable = (item: T, index: number): boolean =>
    rowsAreInteractive.value && (props.rowClickable?.(item, index) ?? true);

/**
 * The `<tr>` class, composed from the consumer's `rowClass` and our own
 * actionable marker. The pointer/hover affordance hangs off the marker class
 * rather than a blanket `tbody tr` rule, so a non-actionable row simply doesn't
 * get it — which is what let consumers drop their global
 * `tbody tr:has(.marker)` CSS hack.
 */
const composeRowClass = (item: T, index: number) => {
    const consumerClass =
        typeof props.rowClass === 'function' ? props.rowClass(item, index) : props.rowClass;

    const classes: any[] = [];
    if (consumerClass) classes.push(consumerClass);
    if (isRowActionable(item, index)) classes.push('dx-row-actionable');
    return classes;
};

// Internal sortBy state, seeded from the prop when it's an initial value.
const internalSortBy = ref<BTableSortBy[]>(props.sortBy ? [...props.sortBy] : []);

const effectiveSortBy = computed(() =>
    isControlled.sortBy && props.sortBy !== undefined ? props.sortBy : internalSortBy.value,
);

// Internal filters state, seeded from the prop when it's an initial value.
const internalFilters = ref<Record<string, string | string[]>>({ ...(props.filters ?? {}) });

const effectiveFilters = computed(() =>
    isControlled.filters && props.filters !== undefined ? props.filters : internalFilters.value,
);

// Computed: check if any field has filtering enabled
const hasFilters = computed(() => props.fields.some(field => field.filter !== false && field.filter !== undefined));

// Whether a filter map entry actually filters anything: a non-blank string,
// or a non-empty array for a `filterMultiple` column (#51).
const isActiveFilterValue = (value: string | string[] | undefined): boolean =>
    Array.isArray(value) ? value.length > 0 : value !== undefined && value !== null && value.trim() !== '';

// Computed: check if any filters are currently active
const hasActiveFilters = computed(() => {
    const filters = effectiveFilters.value;
    return Object.keys(filters).some(key => isActiveFilterValue(filters[key]));
});

// API mode pagination metadata (extracted from responses)
const apiPaginationMeta = ref<PaginationData | null>(null);

/**
 * Pagination shown in provider mode.
 *
 * Only the built-in `apiUrl` provider can populate `apiPaginationMeta` — it's
 * the one that knows to read `response.data.pagination`. A CUSTOM provider
 * returns rows and nothing else, so the pager simply never rendered: a table
 * with no pagination and no warning, which is why a page needing custom request
 * shaping quietly lost its pager (#106). A custom provider now takes its
 * pagination from the `pagination` prop, and says so when it's missing.
 */
// `pagination` carries a default from withDefaults, so props alone can't tell
// whether the consumer actually passed one — ask the vnode. (Gating on
// `total > 0` instead would treat a legitimately empty page as "no pagination".)
const paginationWasProvided = 'pagination' in (instance?.vnode.props ?? {});

const providerPagination = computed<PaginationData | null>(() => {
    if (apiPaginationMeta.value) return apiPaginationMeta.value;
    if (resolvedProvider.value && paginationWasProvided && props.pagination) {
        return props.pagination;
    }
    return null;
});

/*
 * Loud, once, rather than a silently pager-less table — but only AFTER the
 * provider has actually run, and judged on `providerPagination` (not the raw
 * apiPaginationMeta). Warning at setup would fire on every consumer whose
 * `pagination` prop arrives with the response rather than before it.
 */
const providerHasRun = ref(false);
let warnedAboutProviderPagination = false;
watch(
    () => [resolvedProvider.value, props.showPagination, providerPagination.value, providerHasRun.value] as const,
    ([provider, showPagination, pagination, hasRun]) => {
        if (warnedAboutProviderPagination || !hasRun) return;
        if (provider && showPagination && !pagination) {
            warnedAboutProviderPagination = true;
            // eslint-disable-next-line no-console
            console.warn(
                '[DXTable] A custom `provider` cannot report its own pagination, so no pager will render. ' +
                    'Pass the page metadata via the `pagination` prop, or set `:show-pagination="false"` to hide the pager deliberately.',
            );
        }
    },
);

// ============================================
// Client-Side Mode: Filtering, Sorting, Pagination
// ============================================

// Client-side current page
const clientSideCurrentPage = ref(1);

// Client-side filtered items
const clientSideFilteredItems = computed<T[]>(() => {
    if (!isClientSideMode.value || !resolvedItems.value) return [];

    const filters = effectiveFilters.value;
    const filterKeys = Object.keys(filters).filter(key => isActiveFilterValue(filters[key]));

    if (filterKeys.length === 0) {
        return resolvedItems.value;
    }

    return resolvedItems.value.filter(item => {
        return filterKeys.every(key => {
            // Resolve by the FILTER key, which may differ from the column's key.
            const field = props.fields.find(f => filterKeyFor(f) === key);
            const itemValue = clientSideFilterValueOf(item, field, key);

            const matchesCandidate = (candidate: string): boolean => {
                // The "no value" option (e.g. Unassigned) is the one filter that
                // MATCHES an absent value rather than failing on it.
                if (field?.filterNullText && candidate === filterNullValueFor(field)) {
                    return itemValue === null || itemValue === undefined || itemValue === '';
                }

                if (itemValue === null || itemValue === undefined) {
                    return false;
                }

                const filterValue = candidate.trim().toLowerCase();

                switch (field?.filter) {
                    case 'text':
                        // Case-insensitive contains search
                        return String(itemValue).toLowerCase().includes(filterValue);

                    case 'select':
                        // Exact match
                        return String(itemValue) === candidate;

                    case 'number':
                        // Exact numeric match
                        return Number(itemValue) === Number(candidate);

                    case 'date':
                        // Exact date match
                        return String(itemValue) === candidate;

                    default:
                        // Default: case-insensitive contains
                        return String(itemValue).toLowerCase().includes(filterValue);
                }
            };

            // A `filterMultiple` column holds an ARRAY of values; the row
            // matches when it matches ANY of them (#51). A scalar filter is
            // the one-candidate case of the same rule.
            const raw = filters[key];
            return (Array.isArray(raw) ? raw : [raw]).some(matchesCandidate);
        });
    });
});

// Client-side sorted items
const clientSideSortedItems = computed<T[]>(() => {
    if (!isClientSideMode.value) return [];

    const items = [...clientSideFilteredItems.value];
    const sortBy = effectiveSortBy.value;

    if (!sortBy || sortBy.length === 0 || !sortBy[0].key) {
        return items;
    }

    const { key, order } = sortBy[0];
    const direction = order === 'desc' ? -1 : 1;

    return items.sort((a, b) => {
        // Dot-path aware, so `paid_by.card` sorts a nested payload (#121).
        const aVal = fieldValueOf(a, key);
        const bVal = fieldValueOf(b, key);

        // Handle null/undefined
        const aEmpty = aVal === null || aVal === undefined;
        const bEmpty = bVal === null || bVal === undefined;
        if (aEmpty && bEmpty) return 0;
        if (aEmpty) return direction;
        if (bEmpty) return -direction;

        // Numeric comparison
        if (typeof aVal === 'number' && typeof bVal === 'number') {
            return (aVal - bVal) * direction;
        }

        // String comparison (case-insensitive)
        return String(aVal).localeCompare(String(bVal), undefined, { sensitivity: 'base' }) * direction;
    });
});

// API mode filter values (extracted from responses)
const apiFilterValues = ref<Record<string, string[]>>({});

/*
 * Resolving a field's value from a row, dot-path aware (#121).
 *
 * A key containing a dot (`paid_by.card`) was unusable. Two layers disagreed:
 * bootstrap-vue-next's `mapItem` UN-flattens any item key containing a dot
 * (`{'paid_by.card': v}` becomes `{paid_by: {card: v}}`) and then its cell reads
 * `item['paid_by.card']` FLAT and gets undefined — so bvn renders a dotted key
 * as an empty cell in BOTH payload shapes. Meanwhile our own client-side sort
 * and filter also read flat, which a NESTED payload (what Laravel serialises for
 * a relation) never satisfies. Consumers worked around it by flattening every
 * nested key to an `_x` alias in each client-side port.
 *
 * LITERAL key first, then dot-path. That single order covers every shape:
 * an ordinary key (`name`), a dots-flat payload (the literal `paid_by.card`
 * key), and a nested payload (walk `paid_by` -> `card`). It also means bvn's
 * un-flattening is harmless rather than hostile — mapItem normalises flat to
 * nested, and the path read finds it either way.
 */
const fieldValueOf = (item: unknown, key: string): any => {
    if (item === null || item === undefined) return undefined;
    if (Object.prototype.hasOwnProperty.call(item, key)) {
        return (item as Record<string, any>)[key];
    }
    return getByPath(item as Record<string, any>, key);
};

/*
 * Whether a row carries a value for `key` at all — presence, not truthiness.
 * Mirrors the `key in item` check this replaced, extended to dot paths.
 */
const hasFieldValue = (item: unknown, key: string): boolean => {
    if (item === null || item === undefined) return false;
    if (Object.prototype.hasOwnProperty.call(item, key)) return true;
    return getByPath(item as Record<string, any>, key) !== undefined;
};

/*
 * The value a client-side filter compares against, for one row and one column.
 *
 * `filterKey` names the param the SERVER filters on; a local row may not carry
 * it at all (a `customer_name` row filtered on `customer_id`). Read the filter
 * key when the row has it, otherwise fall back to the column's own value —
 * which is also the one the user can actually see and type against. Both
 * lookups are dot-path aware, so a nested payload filters (#121).
 *
 * Extracted so the client-side row filter and the DERIVED select options (see
 * `derivedFilterOptions`) resolve values through exactly the same rule — a
 * derived option must never be a value the filter then fails to match.
 */
const clientSideFilterValueOf = (
    item: unknown,
    field: TableField | undefined,
    filterKey: string,
): any =>
    field && hasFieldValue(item, filterKey)
        ? fieldValueOf(item, filterKey)
        : fieldValueOf(item, field?.key ?? filterKey);

/*
 * Dotted-key columns DXTable must render itself, because bvn renders them empty
 * (see `fieldValueOf`). A consumer's own `cell(<key>)` slot always wins — it is
 * forwarded separately, and declaring the same slot name twice would clobber it.
 *
 * A FUNCTION, not a computed, for the same reason as `forwardableSlotNames`:
 * `useSlots()` returns an object Vue mutates in place with nothing to track, so
 * a computed over its keys is captured on first render and never updates (#114).
 */
const dottedCellFields = (slots: Record<string, unknown>): TableField[] =>
    props.fields.filter((field) => field.key.includes('.') && !slots[`cell(${field.key})`]);

/*
 * Per-column widths (#156). A field's `width`/`minWidth` is applied through a
 * `<colgroup>` `<col>`, NOT the header `<th>`: with `table-layout: fixed` the
 * column widths are taken from the FIRST row of cells, and DXTable's inline
 * filter row (`thead-top`) is that first row — so a width on the header `<th>`
 * would be ignored whenever filters are present. A `<col>` width is
 * authoritative regardless of row order, in both fixed and auto layout.
 */
const sizeToCss = (value: string | number): string =>
    typeof value === 'number' ? `${value}px` : value;

const hasDeclaredWidth = (field: TableField): boolean =>
    (field.width !== undefined && field.width !== null) ||
    (field.minWidth !== undefined && field.minWidth !== null);

const columnStyleFor = (field: TableField): Record<string, string> | undefined => {
    const style: Record<string, string> = {};
    if (field.width !== undefined && field.width !== null) style.width = sizeToCss(field.width);
    if (field.minWidth !== undefined && field.minWidth !== null) {
        style.minWidth = sizeToCss(field.minWidth);
    }
    return Object.keys(style).length > 0 ? style : undefined;
};

// Only inject a `<colgroup>` when a column actually declares a width — otherwise
// the table renders exactly as before (no colgroup at all), preserving the
// content-sized default byte-for-byte.
const fieldsHaveWidths = computed(() => props.fields.some(hasDeclaredWidth));

// Computed: Get effective filter options for a field
// The key a column's filter is SENT under, which is not always the column's own
// key: a display column can filter on a different server param via `filterKey`.
const filterKeyFor = (field: TableField): string => field.filterKey ?? field.key;

// The value that means "has no value" for a select filter (#106).
const filterNullValueFor = (field: TableField): string => field.filterNullValue ?? 'null';

// The filter's placeholder, and the label of its "no filter" option — the same
// words, so picking the top option visibly returns the field to its resting state.
// See getFieldFilterOptions: an empty-string option value makes bvn render no
// options at all, so "no filter" needs a value that isn't empty.
const FILTER_ALL_VALUE = '__dx_filter_all__';

const handleSelectFilterChange = (field: TableField, value: unknown) => {
    const selected = (value ?? '') as string;
    handleFilterChange(filterKeyFor(field), selected === FILTER_ALL_VALUE ? '' : selected);
};

// Multi-value select filter (#51): the autocomplete's array model maps
// straight onto the filters entry; an emptied selection removes the entry.
const multiFilterValueFor = (field: TableField): string[] => {
    const value = effectiveFilters.value[filterKeyFor(field)];
    if (Array.isArray(value)) return value;
    return isActiveFilterValue(value) ? [String(value)] : [];
};

const handleMultiSelectFilterChange = (field: TableField, value: unknown) => {
    const selected = (Array.isArray(value) ? value : []).map(String);
    handleFilterChange(filterKeyFor(field), selected);
};

const filterAllLabelFor = (field: TableField): string =>
    field.filterAllText ?? field.filterPlaceholder ?? `All ${field.label || field.key}`;

/**
 * Column header text. An explicitly empty `label` means an EMPTY header — an
 * actions column headed `actions` (lowercase, as-keyed) is a leak, not a
 * default. Only fall back when no label was declared at all.
 */
const headerLabel = (field: TableField, slotLabel?: string): string =>
    field.label !== undefined ? field.label : (slotLabel || field.key);

/**
 * A select filter option's LABEL, honouring the column's own value→label
 * formatting so the dropdown reads the way the column does (a `formatter`
 * turning `19.99` into `$19.99`). The option's `value` stays RAW — that is what
 * the client-side filter compares against (`String(itemValue) === candidate`),
 * so formatting must never leak into it.
 *
 * `formatter` is bootstrap-vue-next's field formatter, `(value, key, item)`.
 */
const formattedFilterLabel = (field: TableField, value: any, item: unknown): string | null => {
    if (typeof field.formatter !== 'function') return null;
    const formatted = field.formatter(value, field.key, item);
    if (formatted === null || formatted === undefined) return null;
    return String(formatted);
};

/**
 * Client-side auto-derived `filter: "select"` options, keyed by field key.
 *
 * Without this a client-side select column with no `filterOptions` and no
 * server `filterValues` rendered an EMPTY dropdown — dead UI that can only be a
 * bug — so this is on by default (opt out per column with
 * `deriveFilterOptions: false`).
 *
 * It derives from `resolvedItems` (the FULL loaded row set) and deliberately
 * NOT from `clientSideFilteredItems` or `clientSidePaginatedItems`:
 *  - filtered set → picking a value would collapse the dropdown to that one
 *    value, and the user could never get back to any other one;
 *  - current page → the offered values would silently change as you page.
 * Being a computed over `props.fields` + `resolvedItems` only, it is also
 * structurally incapable of depending on the active filters — the cache is the
 * guard, not just the comment.
 */
const derivedFilterOptions = computed<Record<string, FilterOption[]>>(() => {
    // Only client-side mode has the complete row set. Provider/API and Inertia
    // hold one page, so they take their options from the server instead.
    if (!isClientSideMode.value) return {};

    const rows = resolvedItems.value;
    if (!rows || rows.length === 0) return {};

    const optionsByFieldKey: Record<string, FilterOption[]> = {};

    for (const field of props.fields) {
        if (field.filter !== 'select') continue;
        if (field.deriveFilterOptions === false) continue;
        // Explicit options win outright (see `getFieldFilterOptions`), so don't
        // spend a pass over every row producing a list nothing will read.
        if (field.filterOptions && field.filterOptions.length > 0) continue;

        const filterKey = filterKeyFor(field);

        // Distinct values keyed by their STRING form, because that is exactly
        // what the client-side select filter compares — so `1` and `"1"` are one
        // option, and every option offered is one the filter can match. The
        // first row carrying a value is kept alongside it, as the `item`
        // argument the column's formatter expects.
        const firstRowByValue = new Map<string, { rawValue: any; item: unknown }>();

        for (const item of rows) {
            const value = clientSideFilterValueOf(item, field, filterKey);
            // null / undefined / '' are skipped deliberately: "has no value" is
            // already a first-class, LABELLED option via `filterNullText`, and
            // an unlabelled blank row in the list would be unusable.
            if (value === null || value === undefined || value === '') continue;
            const stringValue = String(value);
            if (!firstRowByValue.has(stringValue)) {
                firstRowByValue.set(stringValue, { rawValue: value, item });
            }
        }

        const entries = [...firstRowByValue.entries()];

        // Stable, human ordering: numeric when both values are numbers,
        // otherwise a locale compare — the same rule the client-side sort uses,
        // with `numeric: true` so "Item 2" precedes "Item 10".
        entries.sort(([leftText, left], [rightText, right]) =>
            typeof left.rawValue === 'number' && typeof right.rawValue === 'number'
                ? left.rawValue - right.rawValue
                : leftText.localeCompare(rightText, undefined, { numeric: true, sensitivity: 'base' }),
        );

        optionsByFieldKey[field.key] = entries.map(([stringValue, { rawValue, item }]) => ({
            value: stringValue,
            text: formattedFilterLabel(field, rawValue, item) ?? stringValue,
        }));
    }

    return optionsByFieldKey;
});

const getFieldFilterOptions = (field: TableField): FilterOption[] => {
    const options: FilterOption[] = [];

    // The way back to *unfiltered*. Without it the dropdown lists only the
    // values, so once a filter is picked the only way to clear it is the ✕ —
    // which isn't discoverable from inside the open list.
    //
    // It carries a SENTINEL, not `''`. bvn drops the ENTIRE option list if any
    // option's value is an empty string — not just that entry, the whole list —
    // so the obvious encoding of "no filter" silently empties the dropdown.
    // `handleSelectFilterChange` translates it back to `''`, which is already
    // how the filter map represents unset.
    //
    // A `filterMultiple` column omits it (#51): "no filter" inside a
    // multi-select reads as a selectable value, and clearing is already
    // discoverable there — remove the chips, or the ✕.
    if (!field.filterMultiple) {
        options.push({ value: FILTER_ALL_VALUE, text: filterAllLabelFor(field) });
    }

    // An "Unassigned"-style option, so a select filter can express "has no value"
    // — a different thing from "no filter" above.
    if (field.filterNullText) {
        options.push({ value: filterNullValueFor(field), text: field.filterNullText });
    }

    // If field has static filterOptions, use those
    if (field.filterOptions && field.filterOptions.length > 0) {
        return [...options, ...field.filterOptions];
    }

    // Otherwise, check for server-provided values (keyed by the filter key)
    const serverValues =
        props.filterValues?.[filterKeyFor(field)] ?? apiFilterValues.value[filterKeyFor(field)];

    if (serverValues && serverValues.length > 0) {
        return [...options, ...serverValues.map(value => ({ value, text: value }))];
    }

    // Last resort, CLIENT-SIDE only: the distinct values present in the loaded
    // rows. Precedence is deliberate — explicit `filterOptions`, then the
    // server's `filterValues`, then what the data itself says. See
    // `derivedFilterOptions` for why it derives from the unfiltered row set.
    const derived = derivedFilterOptions.value[field.key];
    if (derived && derived.length > 0) {
        return [...options, ...derived];
    }

    // No values to choose from — don't offer a lone "All x" that filters nothing.
    return [];
};

// LocalStorage key for the per-page preference. Only tables identified by a URL
// (inertiaUrl / apiUrl) persist their preference: a keyless client-side table
// has no stable identity across reloads, and every such table would otherwise
// share the literal `table` key and clobber each other's stored value (#124).
// Returns null when there is nothing stable to key on — every read and write
// guards on that, so a keyless table simply doesn't persist.
const perPageStorageKey = computed<string | null>(() => {
    const url = resolvedInertiaUrl.value || resolvedApiUrl.value;
    if (!url) return null;
    return `dxtable-perpage-${url.replace(/\//g, '-')}`;
});

// Whether the consumer EXPLICITLY passed `perPage`. A defaulted/omitted prop is
// indistinguishable via `props`, so this reads the raw vnode props — the same
// technique as `hasListener` above (Vue keeps passed props on the vnode).
const wasPerPagePassed = ((): boolean => {
    const vnodeProps = instance?.vnode.props ?? {};
    return 'perPage' in vnodeProps || 'per-page' in vnodeProps;
})();

// Load perPage from localStorage or use default
const getInitialPerPage = (): number => {
    // An explicitly-passed `perPage` wins over any stored preference (#124):
    // `:per-page="20"` means "start at 20" (since #110) and must not be silently
    // overridden by a size the user once picked on a different table.
    if (wasPerPagePassed && props.perPage !== undefined) {
        return props.perPage;
    }

    if (typeof window === 'undefined') return props.perPage || 10;

    const storageKey = perPageStorageKey.value;
    if (storageKey !== null) {
        try {
            const saved = localStorage.getItem(storageKey);
            if (saved !== null) {
                const parsed = parseInt(saved, 10);
                // Validate it's in the allowed options
                if (props.perPageOptions.includes(parsed)) {
                    return parsed;
                }
            }
        } catch (error) {
            console.error('Error loading perPage from localStorage:', error);
        }
    }

    return props.perPage || 10;
};

// Internal perPage state
const internalPerPage = ref<number>(getInitialPerPage());

// Watch pagination.per_page and sync with internalPerPage (after Inertia navigation)
watch(() => props.pagination?.per_page, (newPerPage) => {
    if (newPerPage && newPerPage !== internalPerPage.value) {
        internalPerPage.value = newPerPage;
        // Also update localStorage to stay in sync (only for URL-keyed tables).
        const storageKey = perPageStorageKey.value;
        if (typeof window !== 'undefined' && storageKey !== null) {
            try {
                localStorage.setItem(storageKey, newPerPage.toString());
            } catch (error) {
                console.error('Error saving perPage from watcher:', error);
            }
        }
    }
});

// Watch for external filter changes (when filters prop is controlled by parent).
// Watches the SERIALISED map, not the object: a deep watch hands the same
// object reference as both new and old value when a consumer mutates in place
// (`filters.status.push(...)` on a multi-value array), so an old==new JSON
// guard ate exactly the changes it was meant to detect. A string source only
// fires when the content genuinely changed, and stringifying inside the getter
// makes every nested key a reactive dependency.
watch(() => JSON.stringify(props.filters ?? null), () => {
    // Only when the consumer CONTROLS filters. Uncontrolled, the prop is just a
    // seed: `effectiveFilters` stays internal, so refreshing on a later prop
    // change would fetch with filters the table isn't actually showing (#110).
    if (!isControlled.filters || props.filters === undefined) return;

    // Refresh data for the new filters
    if (isProviderMode.value) {
        refresh();
    } else if (hasInertiaUrl.value && isInertiaMode.value && router) {
        // Inertia mode - trigger navigation with new filters
        router.get(
            resolvedInertiaUrl.value!,
            {
                page: 1, // Reset to first page when filters change
                filters: props.filters,
                perPage: effectivePerPage.value,
                ...sortParams(effectiveSortBy.value),
            },
            { preserveState: true }
        );
    }
});

// Watch apiUrl changes to reset filter cache and refetch. The api-url isn't part
// of BTable's provider context, so an api-url-only change doesn't re-invoke the
// provider on its own — without this the table keeps showing the previous url's
// rows until some other trigger (sort, per-page, create/edit/delete) fires.
watch(() => resolvedApiUrl.value, (newUrl, oldUrl) => {
    // `newUrl` must be truthy: an api-url → provider transition drops the url to
    // `undefined` while still satisfying `isProviderMode` via the new provider.
    // Without this guard both this watcher and the provider watcher below run
    // their clear+refresh on that transition (bvn coalesces the two refreshes
    // into one fetch, so it isn't an observable double-fetch — but the redundant
    // work is avoidable). The provider watcher owns the url-removal transition;
    // this one only fires for an actual new url.
    if (newUrl && newUrl !== oldUrl && isProviderMode.value) {
        // Clear cached filter values and pagination when API endpoint changes.
        // The next provider call will request fresh filter values.
        apiFilterValues.value = {};
        apiPaginationMeta.value = null;
        apiError.value = null;
        // A url change is a fresh dataset — go back to page 1. If we were past
        // page 1, resetting the page re-invokes the provider on its own (so the
        // out-of-range page can't linger); if we were already on page 1 the prop
        // doesn't change, so refresh() forces the refetch. Exactly one fetch
        // either way.
        const wasOnFirstPage = apiCurrentPage.value === 1;
        apiCurrentPage.value = 1;
        if (wasOnFirstPage) {
            refresh();
        }
    }
});

// A `provider` swap (`:provider` or `source.provider` reassigned to a new
// function) must refetch, exactly as an `apiUrl` swap does above. `effectiveProvider`'s
// identity is deliberately STABLE (#82) so BTable doesn't refetch on its own
// when the underlying provider changes — so, like the apiUrl watcher, force it.
// Only fires for an actual provider function (apiUrl mode is covered above), and
// `watch` skips the initial value, so no double-fetch on mount.
watch(() => resolvedProvider.value, (newProvider, oldProvider) => {
    if (newProvider !== oldProvider && !!newProvider) {
        apiFilterValues.value = {};
        apiPaginationMeta.value = null;
        apiError.value = null;
        const wasOnFirstPage = apiCurrentPage.value === 1;
        apiCurrentPage.value = 1;
        if (wasOnFirstPage) {
            refresh();
        }
    }
});

// Computed effective perPage (use external if provided, otherwise internal)
const effectivePerPage = computed(() => {
    // Only when the consumer is actually driving it (v-model). A bare
    // `:per-page="50"` is an initial value — see `isControlled` (#110).
    if (isControlled.perPage && props.perPage !== undefined) {
        return props.perPage;
    }

    // For Inertia mode, prefer pagination.per_page (actual server value)
    if (isInertiaMode.value && props.pagination?.per_page) {
        return props.pagination.per_page;
    }

    // For API mode, use internal state (which gets updated immediately on change)
    // Don't use providerPagination.per_page here because it's from the previous request
    // and causes the select to flicker when user changes it
    return internalPerPage.value;
});

// ============================================
// Client-Side Mode: Pagination (requires effectivePerPage)
// ============================================

/*
 * The page the client-side view actually renders (#118).
 *
 * `clientSideCurrentPage` is only reset on a filter or per-page change, so when
 * the `items` prop SHRINKS — a consumer refetching a narrower dataset — it can
 * point past the end of the new set. The pagination metadata below already
 * clamped for display, but the slice used the raw value, so the pager said
 * "page 2 of 2" while the table sliced page 6 and rendered zero rows. Both read
 * from this now, so the view and its pager can't disagree.
 */
const clientSideLastPage = computed(() =>
    Math.max(1, Math.ceil(clientSideFilteredItems.value.length / effectivePerPage.value)),
);

const clientSidePage = computed(() =>
    Math.min(Math.max(1, clientSideCurrentPage.value), clientSideLastPage.value),
);

// Write the clamp back, so the NEXT interaction starts from a real page rather
// than a stale one. Clamping to the last page (not resetting to 1) keeps the
// user near where they were.
watch(clientSideLastPage, (lastPage) => {
    if (clientSideCurrentPage.value > lastPage) clientSideCurrentPage.value = lastPage;
});

// Client-side paginated items (final output)
const clientSidePaginatedItems = computed<T[]>(() => {
    if (!isClientSideMode.value) return [];

    const perPage = effectivePerPage.value;
    const start = (clientSidePage.value - 1) * perPage;
    const end = start + perPage;

    return clientSideSortedItems.value.slice(start, end);
});

// Client-side pagination metadata
const clientSidePagination = computed<PaginationData>(() => {
    const total = clientSideFilteredItems.value.length;
    const totalUnfiltered = resolvedItems.value?.length || 0;
    const perPage = effectivePerPage.value;
    const lastPage = clientSideLastPage.value;

    // Same clamped page the slice uses — see `clientSidePage` (#118).
    const validPage = clientSidePage.value;

    const from = total > 0 ? (validPage - 1) * perPage + 1 : 0;
    const to = Math.min(validPage * perPage, total);

    return {
        current_page: validPage,
        per_page: perPage,
        total,
        total_unfiltered: totalUnfiltered !== total ? totalUnfiltered : undefined,
        from,
        to,
        last_page: lastPage,
    };
});

// Reset to page 1 when filters change in client-side mode
watch(effectiveFilters, () => {
    if (isClientSideMode.value) {
        clientSideCurrentPage.value = 1;
    }
}, { deep: true });

// Reset to page 1 when perPage changes in client-side mode
watch(effectivePerPage, () => {
    if (isClientSideMode.value) {
        clientSideCurrentPage.value = 1;
    }
});

// Handle client-side page change
const handleClientSidePageChange = (page: number) => {
    clientSideCurrentPage.value = page;
    emit('pageChange', page);
};

// Computed: determine if per-page selector should be shown
// Hide it when total items is less than the smallest page size option
const shouldShowPerPageSelector = computed(() => {
    if (!props.showPerPageSelector) return false;

    const smallestOption = Math.min(...props.perPageOptions);
    const total = isClientSideMode.value
        ? clientSidePagination.value?.total || 0
        : isInertiaMode.value
            ? props.pagination?.total || 0
            // Same source as the pager itself — reading apiPaginationMeta here
            // hid the selector for a custom provider whose pagination comes
            // from the `pagination` prop, while the page buttons still showed.
            : providerPagination.value?.total || 0;

    return total >= smallestOption;
});

// Detect which fields need server filter values.
//
// Client-side derived options (`derivedFilterOptions`) deliberately do NOT
// shrink this list: it is only ever read by `internalProvider`, i.e. API mode,
// and `isProviderMode` requires `!resolvedClientSide` — the two modes are
// mutually exclusive, so a client-side derived column can never appear here.
const fieldsNeedingFilterValues = computed(() => {
    return props.fields
        .filter(field => field.filter === 'select' && (!field.filterOptions || field.filterOptions.length === 0))
        .map(field => filterKeyFor(field));
});

// Error state for API mode
const apiError = ref<string | null>(null);

/**
 * The active sort, or `null` when there is none.
 *
 * The header sort cycles asc → desc → *unsorted*, and in that third state
 * BTable reports the column with no `order`. There is deliberately no fallback
 * column here: sorting by a magic `created_at` when the user has asked for no
 * sort means requesting a column the consumer never declared, which a strict
 * endpoint (e.g. spatie's QueryBuilder, where an undeclared sort is a 400)
 * rejects outright. No sort selected means no sort sent — the server applies
 * its own default ordering. Pass `sortBy` to give the table an initial sort.
 */
const activeSort = (sortBy: readonly BTableSortBy[] | undefined) => {
    const sort = sortBy?.[0];
    if (!sort?.key || !sort.order) return null;
    return { key: sort.key, order: sort.order };
};

// Sort params for a request — an empty object when nothing is sorted.
const sortParams = (sortBy: readonly BTableSortBy[] | undefined) => {
    const sort = activeSort(sortBy);
    return sort ? { sortBy: sort.key, sortOrder: sort.order } : {};
};

// Internal provider function when apiUrl is provided. It deliberately does NOT
// catch: `effectiveProvider` wraps every provider (including a consumer's own)
// in one error handler, so no provider can fail silently.
const internalProvider: BTableProvider<T> = async (context: Readonly<BTableProviderContext>) => {
    if (!resolvedApiUrl.value) return [];

    const params: any = {
        page: context.currentPage,
        perPage: effectivePerPage.value,
        filters: effectiveFilters.value,
        ...sortParams(context.sortBy),
    };

    // Request filter values on initial load
    if (context.currentPage === 1 && fieldsNeedingFilterValues.value.length > 0 && Object.keys(apiFilterValues.value).length === 0) {
        params.filterValues = fieldsNeedingFilterValues.value;
    }

    // Adapt the outgoing params to the backend's convention (e.g. spatie
    // query-builder's `sort=-name` / `filter[key]`). This is the sanctioned
    // replacement for the axios request interceptors #132 removed the route
    // for — the adapter's return IS the wire params.
    const wireParams = props.apiAdapter?.request
        ? props.apiAdapter.request(params)
        : params;

    const response = await api.get<any>(resolvedApiUrl.value, wireParams);

    // Adapt a foreign response envelope back into the dfl shape. Gets the
    // ORIGINAL dfl-shape params (page/perPage/…) for context, since a foreign
    // envelope often lacks paginator metadata the adapter must synthesize.
    let body = props.apiAdapter?.response
        ? props.apiAdapter.response(response.data, { params })
        : response.data;

    // A backend that ignores the pagination convention and returns a bare
    // array of rows used to render as a SILENTLY EMPTY table (data present,
    // nothing shown). Degrade to visible rows with no pager metadata instead.
    if (Array.isArray(body)) {
        body = { data: body };
    }

    // Extract and store pagination metadata for display
    if (body.pagination) {
        apiPaginationMeta.value = body.pagination;
    }

    // Extract and store filter values
    if (body.filterValues) {
        apiFilterValues.value = { ...apiFilterValues.value, ...body.filterValues };
    }

    return body.data;
};

/**
 * Wraps whichever provider is in play — the built-in `apiUrl` one or a
 * consumer's own `provider` — so a rejected fetch surfaces an error instead of
 * rendering as zero rows. A failed query and a genuinely empty result look
 * identical otherwise, which is how a broken table passes review and then shows
 * a blank page to a user. A consumer's provider used to be the silent case: the
 * error handling lived inside the internal one, so it never covered them.
 */
// Monotonic generation for provider calls. When a provider is swapped (or a
// refetch supersedes an in-flight call), a still-pending older call that later
// REJECTS must not publish its error over the newer call's rows — bvn already
// discards a superseded call's rows, but `apiError` isn't otherwise guarded.
let providerGeneration = 0;

const wrappedProvider: BTableProvider<T> = async (context: Readonly<BTableProviderContext>) => {
    const provider = resolvedProvider.value || (resolvedApiUrl.value ? internalProvider : undefined);
    if (!provider) return [];

    const generation = ++providerGeneration;
    apiError.value = null;
    try {
        return await provider(context);
    } catch (error: any) {
        // Superseded by a newer provider call — its result/error owns the table
        // now, so drop this stale rejection silently.
        if (generation !== providerGeneration) return [];
        // eslint-disable-next-line no-console
        console.error('DXTable: the data provider failed', error);
        // `error.message` covers the internal provider's ApiError; the
        // `response.data` branch covers a consumer's own axios-based provider.
        apiError.value =
            error?.response?.data?.message ||
            error?.message ||
            'Failed to load data. Please try again.';
        return [];
    } finally {
        providerHasRun.value = true;
    }
};

// `wrappedProvider` is resolved fresh on each call, so this computed's IDENTITY
// must not change when `apiUrl` does — BTable refetches when the provider
// function changes, which would double every request that the explicit apiUrl
// watcher already refetches (#82).
const effectiveProvider = computed<BTableProvider<T> | undefined>(() =>
    resolvedProvider.value || resolvedApiUrl.value ? wrappedProvider : undefined,
);

const handlePageChange = (page: number) => {
    // If inertiaUrl provided, handle navigation automatically
    if (hasInertiaUrl.value && isInertiaMode.value && router) {
        router.get(
            resolvedInertiaUrl.value!,
            {
                page,
                filters: effectiveFilters.value,
                perPage: effectivePerPage.value,
                ...sortParams(effectiveSortBy.value),
            },
            { preserveState: true }
        );
    }

    // Always emit event for backward compatibility
    emit("pageChange", page);
};

// API mode page change - update BTable's internal current page
const apiCurrentPage = ref(1);

const handleApiPageChange = (page: number) => {
    apiCurrentPage.value = page;
    // BTable should automatically call provider when currentPage prop changes
};

/*
 * The per-mode props for the ONE inner `<DTable>` (#123). DXTable used to carry
 * three near-identical `<DTable>` blocks — provider / client-side / inertia —
 * differing only in these few bindings, so every table fix had to be written
 * three times and could silently miss a mode. This reproduces each old block's
 * bindings EXACTLY (a faithful collapse, not a behaviour change):
 *
 * - provider: BTable drives its own pagination, so it needs `provider`,
 *   `currentPage` and `perPage`; `busy` is the raw prop (two-way with BTable's
 *   provider loading via `@update:busy`).
 * - client-side: rows are pre-sliced by `clientSidePaginatedItems`, and local
 *   sorting is off (we sort in `clientSideSortedItems`).
 * - inertia: server-paginated `items`, local sorting off, `busy` is
 *   `effectiveBusy` (the `loading` prop in this mode).
 *
 * A key absent from the returned object is simply not bound, which is what the
 * original blocks did (e.g. non-provider modes never set `provider`/`currentPage`,
 * so BTable falls back to `items` and its own page defaults).
 */
const tableModeBindings = computed<Record<string, unknown>>(() => {
    if (isProviderMode.value) {
        return {
            provider: effectiveProvider.value,
            currentPage: apiCurrentPage.value,
            perPage: effectivePerPage.value,
            busy: props.busy,
        };
    }
    if (isClientSideMode.value) {
        return { items: clientSidePaginatedItems.value, noLocalSorting: true };
    }
    // inertia
    return { items: resolvedItems.value, noLocalSorting: true, busy: effectiveBusy.value };
});

/*
 * The pagination metadata the single footer renders, by mode (#123). Null means
 * no footer: only provider mode has that case (a custom provider with no
 * `pagination` prop). Client-side always has a computed object; inertia's
 * `pagination` prop carries a default object, so both always render a footer —
 * matching the three original per-mode `v-if`s exactly.
 */
const activePagination = computed<PaginationData | null>(() => {
    if (isClientSideMode.value) return clientSidePagination.value;
    if (isInertiaMode.value) return props.pagination;
    if (isProviderMode.value) return providerPagination.value;
    return null;
});

// Route the footer's page-change to the right per-mode handler.
const handleActivePageChange = (page: number) => {
    if (isClientSideMode.value) return handleClientSidePageChange(page);
    if (isProviderMode.value) return handleApiPageChange(page);
    return handlePageChange(page); // inertia
};

const handleSortChange = (sortBy: BTableSortBy[]) => {
    // ENFORCE single-column sorting: keep only the last clicked column
    // BTable may send multiple columns despite multisort: false
    let normalizedSortBy = sortBy;
    if (sortBy && sortBy.length > 1) {
        // Find the column with an order (most recently clicked)
        const withOrder = sortBy.filter(s => s.order);
        if (withOrder.length > 0) {
            // Use the last one with an order
            normalizedSortBy = [withOrder[withOrder.length - 1]];
        } else {
            // Just use the last item
            normalizedSortBy = [sortBy[sortBy.length - 1]];
        }
    }

    // Write internal state unless the consumer controls it with v-model.
    if (!isControlled.sortBy) {
        internalSortBy.value = normalizedSortBy;
    }

    // Emit v-model update with normalized value
    emit('update:sortBy', normalizedSortBy);

    // Handle Inertia navigation automatically if URL provided
    if (hasInertiaUrl.value && isInertiaMode.value && router) {
        // The cleared state has a key but no order — `sortParams` sends nothing
        // for it, rather than inventing an ascending sort the user didn't ask for.
        router.get(
            resolvedInertiaUrl.value!,
            {
                page: props.pagination?.current_page || 1,
                filters: effectiveFilters.value,
                perPage: effectivePerPage.value,
                ...sortParams(normalizedSortBy),
            },
            { preserveState: true },
        );
    }

    // Emit simplified sortChange event for backward compatibility. Its payload
    // can only express an ACTIVE sort, so the cleared state emits nothing here —
    // listen to `update:sortBy` (which carries the empty array) to observe it.
    const sort = activeSort(normalizedSortBy);
    if (isInertiaMode.value && sort) {
        emit('sortChange', sort);
    }
};

const handleBusyChange = (busy: boolean) => {
    emit('update:busy', busy);
};

// Debounce timer for filter changes
let filterDebounceTimer: ReturnType<typeof setTimeout> | null = null;

// DFormSelect's model can be null/array (it mirrors BVN's BFormSelect), but the
// per-page selector only ever emits a numeric-string scalar; narrow defensively.
const handlePerPageChange = (newPerPage: number | string | null | (number | string)[]) => {
    const rawPerPage = Array.isArray(newPerPage) ? newPerPage[0] : newPerPage;
    if (rawPerPage === null || rawPerPage === undefined) {
        return;
    }
    const perPageNum = typeof rawPerPage === 'string' ? parseInt(rawPerPage, 10) : rawPerPage;

    // Write internal state unless the consumer controls it with v-model.
    if (!isControlled.perPage) {
        internalPerPage.value = perPageNum;
    }

    // Save to localStorage (only for URL-keyed tables — see perPageStorageKey).
    const storageKey = perPageStorageKey.value;
    if (typeof window !== 'undefined' && storageKey !== null) {
        try {
            localStorage.setItem(storageKey, perPageNum.toString());
        } catch (error) {
            console.error('Error saving perPage to localStorage:', error);
        }
    }

    // Emit v-model update
    emit('update:perPage', perPageNum);

    // Handle navigation automatically
    if (hasInertiaUrl.value && isInertiaMode.value && router) {
        router.get(
            resolvedInertiaUrl.value!,
            {
                page: 1, // Reset to first page when changing perPage
                filters: effectiveFilters.value,
                perPage: perPageNum,
                ...sortParams(effectiveSortBy.value),
            },
            { preserveState: true }
        );
    }

    // For API mode, trigger provider refresh
    if (isProviderMode.value && tableRef.value) {
        refresh();
    }

    // Emit event for backward compatibility
    emit('perPageChange', perPageNum);
};

const handleFilterChange = (fieldKey: string, value: string | string[]) => {
    // Update filters
    const newFilters = { ...effectiveFilters.value, [fieldKey]: value };

    // Remove empty filters (a blank string, or an empty multi-value array)
    if (!isActiveFilterValue(value)) {
        delete newFilters[fieldKey];
    }

    // Write internal state unless the consumer controls it with v-model.
    if (!isControlled.filters) {
        internalFilters.value = newFilters;
    }

    // Emit v-model update
    emit('update:filters', newFilters);

    // Client-side mode: filtering happens reactively via computed properties
    // No server requests needed, just emit the event
    if (isClientSideMode.value) {
        emit('filterChange', newFilters);
        return;
    }

    // Debounce server requests for text inputs
    if (filterDebounceTimer) {
        clearTimeout(filterDebounceTimer);
    }

    filterDebounceTimer = setTimeout(() => {
        // Handle Inertia navigation automatically if URL provided
        if (hasInertiaUrl.value && isInertiaMode.value && router) {
            router.get(
                resolvedInertiaUrl.value!,
                {
                    page: 1, // Reset to first page when filtering
                    filters: newFilters,
                    perPage: effectivePerPage.value,
                    ...sortParams(effectiveSortBy.value),
                },
                { preserveState: true }
            );
        }

        // For API mode, provider will be called automatically by BTable
        // when we trigger a refresh
        if (isProviderMode.value && tableRef.value) {
            refresh();
        }

        // Emit filterChange event for backward compatibility
        emit('filterChange', newFilters);
    }, 300); // 300ms debounce
};

// Reference to the DTable component (for exposing refresh method)
const tableRef = ref<InstanceType<typeof DTable> | null>(null);

// Expose refresh method for both modes
const refresh = () => {
    // Provider/API mode: call refresh on BTable
    if (isProviderMode.value && tableRef.value && typeof (tableRef.value as any).refresh === 'function') {
        (tableRef.value as any).refresh();
    }
    // Inertia mode: reload current page to refresh data
    else if (isInertiaMode.value && resolvedInertiaUrl.value && router) {
        router.reload();
    }
};

/*
 * Slot forwarding to the inner table.
 *
 * DXTable used to forward only slots whose name started with `cell`, which is
 * why it had no footer/totals row (#99), no empty state (#111) and no
 * expandable rows (#112): BTable supports all three, but the slots never
 * reached it. Anything BTable understands is now forwarded, with two
 * deliberate exceptions that DXTable renders itself:
 *
 * - `head(<key>)` — DXTable draws its own column headers (sort indicators,
 *   field hints). Forwarding a consumer's would silently drop those.
 * - `thead-top`   — DXTable renders the inline filter row there.
 *
 * `head-end(<key>)` is DXTable's OWN additive header slot (#99) and is likewise
 * not forwarded: the inner table has no such slot, and the prefixes below are
 * matched with `startsWith`, so it must not begin with `cell(`/`foot(` either —
 * `head-end(` satisfies both. It is also excluded from `tableSlotSignature`
 * (which filters on `isTableSlot`), so adding one never remounts the table.
 */
const TABLE_SLOT_PREFIXES = ['cell(', 'foot('];
const TABLE_SLOT_NAMES = new Set([
    'custom-foot',
    'empty',
    'empty-filtered',
    'row-expansion',
    'table-busy',
    'table-caption',
    'table-colgroup',
    'thead-sub',
    'top-row',
    'bottom-row',
]);

const isTableSlot = (name: string) =>
    TABLE_SLOT_NAMES.has(name) || TABLE_SLOT_PREFIXES.some((prefix) => name.startsWith(prefix));

/*
 * The inner table is KEYED on the set of forwarded slot names (#114).
 *
 * bootstrap-vue-next's BTable captures its slot set at mount: a `cell(...)` slot
 * that comes into existence LATER — a consumer whose columns are data-driven and
 * only known once a fetch resolves — never reaches the cells, and the column
 * renders raw values as though no cell slot existed. Verified against raw BTable,
 * so it isn't something our forwarding chain drops.
 *
 * Nothing in the forwarding can fix that, so the inner table remounts when the
 * slot SET changes. Consumers were already remounting to work around it, but at
 * the DXTable level, which throws away per-page, filters, sort and page — all of
 * which live out here and now survive. The signature is names-only, so a slot's
 * CONTENT changing (the common case) doesn't remount anything.
 *
 * In provider mode a remount refetches; that only happens when the column set
 * itself changes, which is already a refetch in practice.
 */
/*
 * A FUNCTION, not a computed: `useSlots()` returns an object Vue mutates in
 * place with nothing to track, so a computed over its keys is captured on the
 * first render and never updates — which is what made late `cell(...)` slots
 * invisible (#114). Called from the template, it re-evaluates every render.
 *
 * It also has to EXCLUDE the slots DXTable renders itself: declaring `#thead-top`
 * here (even rendering nothing into it) would override DXTable's own thead-top
 * template, silently dropping the filter row and the consumer's banner (#120).
 */
const forwardableSlotNames = (slots: Record<string, unknown>): string[] =>
    Object.keys(slots).filter((name) => isTableSlot(name));

const tableSlotSignature = (slots: Record<string, unknown>): string => {
    // DXTable's OWN dotted-cell slots count too (#121). bvn captures its cell
    // slot set at mount (#114), so a dotted-key column that appears LATER —
    // data-driven columns resolved after a fetch — adds a `cell(...)` slot bvn
    // ignores, and the cell renders empty. Folding the dotted-cell field keys
    // into the signature remounts the inner table when that set changes, exactly
    // as it does for a consumer's late `cell(...)` slot.
    const consumerSlots = Object.keys(slots).filter(isTableSlot);
    const dottedCellSlots = dottedCellFields(slots).map((field) => `cell(${field.key})`);
    return [...consumerSlots, ...dottedCellSlots].sort().join('|');
};

/*
 * The template iterates `$slots` DIRECTLY rather than a computed over
 * `useSlots()`. It has to: `useSlots()` returns an object that Vue MUTATES in
 * place, with no reactive dependency to track — so a computed over its keys is
 * captured on first render and never recomputes. A consumer whose `cell(...)`
 * slots come into existence after a fetch resolves (data-driven columns) got
 * columns with raw values and no cell templates, and had to remount the whole
 * table to fix it (#114). Reading `$slots` inside the render function re-reads
 * the current slot set on every update.
 */

// Table-level features of the inner BTable, exposed verbatim and bound to all
// three data modes from one place.
const tablePassthroughProps = computed(() => ({
    footClone: props.footClone,
    showEmpty: props.showEmpty,
    emptyText:
        props.emptyText ??
        (hasActiveFilters.value
            ? `No ${pluralItemName.value} match your filters`
            : `No ${pluralItemName.value} found`),
    expandedItems: props.expandedItems,
}));
// Computed: Singular and plural item names
const singularItemName = computed(() => props.itemName);
const pluralItemName = computed(() => pluralize(props.itemName));

// The built-in "New {item}" button needs both a create endpoint and consent.
// Gating the header's own v-if on this (not on `createUrl`) means a table that
// only had a header to host the button loses the empty header too.
const showsCreateButton = computed(() => Boolean(props.createUrl) && props.showCreateButton);

// The create/edit/delete concern — modal state, form seeding, submission,
// toasts, and the edit-modal slot-key computeds — lives in a composable (#129).
// DXTable passes the editor props (structurally assignable), its `emit`, and the
// one seam back into the table: a `refresh` callback run after a successful op.
// The row→modal bridge stays in `handleRowClick` below (it emits `rowClicked`
// regardless of whether the modal opens).
const editor = useResourceEditor<T>(props, emit, {
    refresh,
    singularItemName,
});
const {
    showEditModal,
    editForm,
    editFormInstanceKey,
    activeTabIndex,
    selectedItem,
    isCreateMode,
    pendingAction,
    editLoading,
    computedModalTitle,
} = editor;

// Template-facing aliases so the modal buttons keep their historic names.
const handleCreateNew = editor.openCreate;
const handleEditSave = editor.save;
const handleEditCancel = editor.cancel;
const handleDelete = editor.remove;

// The consumer's edit-modal slots, forwarded verbatim to DXTableEditorModal
// (which maps them onto DXForm). A FUNCTION over `$slots`, not a computed, for
// the same reason as `forwardableSlotNames` — `useSlots()` is mutated in place
// with nothing to track, so a computed captures the first render's set (#114).
const EDIT_MODAL_SLOT_PREFIXES = [
    'edit-value(',
    'edit-span(',
    'tab-content(',
    'tab-before(',
    'tab-after(',
];
const editModalSlotNames = (slots: Record<string, unknown>): string[] =>
    Object.keys(slots).filter((name) =>
        EDIT_MODAL_SLOT_PREFIXES.some((prefix) => name.startsWith(prefix)),
    );

// Helper: Get current sort state for a field
const getFieldSortState = (fieldKey: string) => {
    const currentSort = effectiveSortBy.value.find(s => s.key === fieldKey);
    return currentSort?.order || null;
};

// Handle row click. Emits `rowClicked` regardless (the seam consumers listen
// on), then asks the editor to open — a no-op unless `editFields` are set.
const handleRowClick = (item: T, index: number, event: MouseEvent) => {
    // A row the consumer marked non-actionable doesn't look clickable, so it
    // must not BE clickable either — otherwise a click that looks dead quietly
    // navigates or opens the modal (#115).
    if (props.rowClickable && !props.rowClickable(item, index)) return;

    emit('rowClicked', item, index, event);
    editor.openEdit(item);
};

defineExpose({
    refresh,
    /**
     * Open the built-in create modal (same as clicking the default "New {item}"
     * button). Lets the create action live outside the table card — e.g. in a
     * page header or the dashboard navbar. No-op unless `editFields` are set.
     */
    openCreate: handleCreateNew,
});
</script>

<style scoped>
/* Rows that do something on click look like it. Hung off a marker class rather
   than a blanket `tbody tr` rule, so a row the consumer's `rowClickable` says is
   not actionable simply doesn't get the affordance (#107, #115). */
:deep(tbody tr.dx-row-actionable) {
    cursor: pointer;
}

:deep(tbody tr.dx-row-actionable:hover) {
    background-color: var(--bs-table-hover-bg);
}

/* Muted header titles (#157): in a data table the CONTENT is what matters —
   near-black bold headers compete with it. Grey (still bold) keeps the
   structure without the shout. Consumers re-louden via the token. */
:deep(thead th) {
    color: var(--dx-table-header-color, var(--bs-secondary-color));
}
</style>
