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
                    <div v-if="error || apiError" class="alert alert-danger">
                        {{ error || apiError }}
                    </div>

                    <div v-if="effectiveBusy && !isProviderMode" class="text-center py-5">
                        <DSpinner variant="primary" />
                        <p class="mt-2">{{ loadingText }}</p>
                    </div>

                    <!-- Provider Mode: Use BTable's provider pattern -->
                    <DTable
                        v-else-if="isProviderMode"
                        ref="tableRef"
                        :key="tableSlotSignature($slots)"
                        :provider="effectiveProvider"
                        :fields="fields"
                        :sort-by="effectiveSortBy"
                        :per-page="effectivePerPage"
                        :current-page="apiCurrentPage"
                        :multisort="false"
                        :no-sortable-icon="true"
                        :striped="striped"
                        :hover="hover"
                        :responsive="responsive"
                        :busy="busy"
                        :tbody-tr-class="composeRowClass"
                        v-bind="tablePassthroughProps"
                        @update:sort-by="handleSortChange"
                        @update:expanded-items="emit('update:expandedItems', $event)"
                        @update:current-page="apiCurrentPage = $event"
                        @update:busy="handleBusyChange"
                        @row-clicked="handleRowClick"
                    >
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

                                    <!-- Select Filter: typeahead — browse the full list on focus, or type to narrow; clear (✕) resets to "no filter" -->
                                    <DAutocomplete
                                        v-else-if="field.filter === 'select'"
                                        :model-value="effectiveFilters[filterKeyFor(field)] || ''"
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
                                <div v-if="field.sortable" class="sort-indicator text-muted flex-shrink-0" style="font-size: 0.75rem; line-height: 1.1; display: flex; flex-direction: column; align-items: center;">
                                    <span :style="{ opacity: getFieldSortState(field.key) === 'asc' ? 1 : 0.3 }">▲</span>
                                    <span :style="{ opacity: getFieldSortState(field.key) === 'desc' ? 1 : 0.3 }">▼</span>
                                </div>
                            </div>
                        </template>

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

                    <!-- Client-Side Mode: Local filtering, sorting, pagination -->
                    <DTable
                        v-else-if="isClientSideMode"
                        :key="tableSlotSignature($slots)"
                        :items="clientSidePaginatedItems"
                        :fields="fields"
                        :sort-by="effectiveSortBy"
                        :multisort="false"
                        :no-local-sorting="true"
                        :no-sortable-icon="true"
                        :striped="striped"
                        :hover="hover"
                        :responsive="responsive"
                        :tbody-tr-class="composeRowClass"
                        v-bind="tablePassthroughProps"
                        @update:sort-by="handleSortChange"
                        @update:expanded-items="emit('update:expandedItems', $event)"
                        @row-clicked="handleRowClick"
                    >
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

                                    <!-- Select Filter: typeahead — browse the full list on focus, or type to narrow; clear (✕) resets to "no filter" -->
                                    <DAutocomplete
                                        v-else-if="field.filter === 'select'"
                                        :model-value="effectiveFilters[filterKeyFor(field)] || ''"
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
                                <div v-if="field.sortable" class="sort-indicator text-muted flex-shrink-0" style="font-size: 0.75rem; line-height: 1.1; display: flex; flex-direction: column; align-items: center;">
                                    <span :style="{ opacity: getFieldSortState(field.key) === 'asc' ? 1 : 0.3 }">▲</span>
                                    <span :style="{ opacity: getFieldSortState(field.key) === 'desc' ? 1 : 0.3 }">▼</span>
                                </div>
                            </div>
                        </template>

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

                    <!-- Inertia Mode: Use items prop -->
                    <DTable
                        v-else-if="isInertiaMode"
                        :key="tableSlotSignature($slots)"
                        :items="items"
                        :fields="fields"
                        :sort-by="effectiveSortBy"
                        :multisort="false"
                        :no-local-sorting="true"
                        :no-sortable-icon="true"
                        :striped="striped"
                        :hover="hover"
                        :responsive="responsive"
                        :busy="effectiveBusy"
                        :tbody-tr-class="composeRowClass"
                        v-bind="tablePassthroughProps"
                        @update:sort-by="handleSortChange"
                        @update:expanded-items="emit('update:expandedItems', $event)"
                        @row-clicked="handleRowClick"
                    >
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

                                    <!-- Select Filter: typeahead — browse the full list on focus, or type to narrow; clear (✕) resets to "no filter" -->
                                    <DAutocomplete
                                        v-else-if="field.filter === 'select'"
                                        :model-value="effectiveFilters[filterKeyFor(field)] || ''"
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
                                <div v-if="field.sortable" class="sort-indicator text-muted flex-shrink-0" style="font-size: 0.75rem; line-height: 1.1; display: flex; flex-direction: column; align-items: center;">
                                    <span :style="{ opacity: getFieldSortState(field.key) === 'asc' ? 1 : 0.3 }">▲</span>
                                    <span :style="{ opacity: getFieldSortState(field.key) === 'desc' ? 1 : 0.3 }">▼</span>
                                </div>
                            </div>
                        </template>

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

                    <!-- Pagination and Controls (Client-Side mode) -->
                    <div v-if="isClientSideMode" class="mt-3">
                        <!-- Top row: Pagination and Per-page selector -->
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <!-- Pagination controls (only when multiple pages) -->
                            <DPagination
                                v-if="showPagination && clientSidePagination.total > clientSidePagination.per_page"
                                :model-value="clientSidePagination.current_page"
                                :total-rows="clientSidePagination.total"
                                :per-page="clientSidePagination.per_page"
                                size="sm"
                                @update:model-value="handleClientSidePageChange"
                            />
                            <div v-else></div>

                            <!-- Per-page selector -->
                            <div v-if="shouldShowPerPageSelector" class="d-flex align-items-center gap-2">
                                <label for="perPageSelectClientSide" class="mb-0 small text-muted">Per page</label>
                                <DFormSelect
                                    id="perPageSelectClientSide"
                                    :model-value="effectivePerPage"
                                    :options="perPageOptions.map(n => ({ value: n, text: n.toString() }))"
                                    size="sm"
                                    style="width: 85px;"
                                    @update:model-value="handlePerPageChange"
                                />
                            </div>
                        </div>

                        <!-- Bottom row: Info text -->
                        <div class="small text-muted">
                            <div>
                                <template v-if="clientSidePagination.total > clientSidePagination.per_page">
                                    {{ clientSidePagination.from }} to {{ clientSidePagination.to }} out of {{ clientSidePagination.total }} {{ clientSidePagination.total === 1 ? singularItemName : pluralItemName }}.
                                </template>
                                <template v-else-if="clientSidePagination.total === 1">
                                    {{ clientSidePagination.total }} {{ singularItemName }}.
                                </template>
                                <template v-else>
                                    {{ clientSidePagination.total }} {{ pluralItemName }}.
                                </template>
                            </div>
                            <div v-if="hasActiveFilters && clientSidePagination.total_unfiltered">
                                <small>Filtered from {{ clientSidePagination.total_unfiltered }} {{ clientSidePagination.total_unfiltered === 1 ? singularItemName : pluralItemName }}.</small>
                            </div>
                        </div>
                    </div>

                    <!-- Pagination and Controls (Inertia mode) -->
                    <div v-if="isInertiaMode && pagination" class="mt-3">
                        <!-- Top row: Pagination and Per-page selector -->
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <!-- Pagination controls (only when multiple pages) -->
                            <DPagination
                                v-if="showPagination && pagination.total > pagination.per_page"
                                :model-value="pagination.current_page"
                                :total-rows="pagination.total"
                                :per-page="pagination.per_page"
                                size="sm"
                                @update:model-value="handlePageChange"
                            />
                            <div v-else></div>

                            <!-- Per-page selector -->
                            <div v-if="shouldShowPerPageSelector" class="d-flex align-items-center gap-2">
                                <label for="perPageSelect" class="mb-0 small text-muted">Per page</label>
                                <DFormSelect
                                    id="perPageSelect"
                                    :model-value="effectivePerPage"
                                    :options="perPageOptions.map(n => ({ value: n, text: n.toString() }))"
                                    size="sm"
                                    style="width: 85px;"
                                    @update:model-value="handlePerPageChange"
                                />
                            </div>
                        </div>

                        <!-- Bottom row: Info text -->
                        <div class="small text-muted">
                            <div>
                                <template v-if="pagination.total > pagination.per_page">
                                    {{ pagination.from }} to {{ pagination.to }} out of {{ pagination.total }} {{ pagination.total === 1 ? singularItemName : pluralItemName }}.
                                </template>
                                <template v-else-if="pagination.total === 1">
                                    {{ pagination.total }} {{ singularItemName }}.
                                </template>
                                <template v-else>
                                    {{ pagination.total }} {{ pluralItemName }}.
                                </template>
                            </div>
                            <div v-if="hasActiveFilters && pagination.total_unfiltered">
                                <small>Filtered from {{ pagination.total_unfiltered }} {{ pagination.total_unfiltered === 1 ? singularItemName : pluralItemName }}.</small>
                            </div>
                        </div>
                    </div>

                    <!-- Pagination and Controls (API mode) -->
                    <div v-if="isProviderMode && providerPagination" class="mt-3">
                        <!-- Top row: Pagination and Per-page selector -->
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <!-- Pagination controls (only when multiple pages) -->
                            <DPagination
                                v-if="showPagination && providerPagination.total > providerPagination.per_page"
                                :model-value="providerPagination.current_page"
                                :total-rows="providerPagination.total"
                                :per-page="providerPagination.per_page"
                                size="sm"
                                @update:model-value="handleApiPageChange"
                            />
                            <div v-else></div>

                            <!-- Per-page selector -->
                            <div v-if="shouldShowPerPageSelector" class="d-flex align-items-center gap-2">
                                <label for="perPageSelectApi" class="mb-0 small text-muted">Per page</label>
                                <DFormSelect
                                    id="perPageSelectApi"
                                    :model-value="effectivePerPage"
                                    :options="perPageOptions.map(n => ({ value: n, text: n.toString() }))"
                                    size="sm"
                                    style="width: 85px;"
                                    @update:model-value="handlePerPageChange"
                                />
                            </div>
                        </div>

                        <!-- Bottom row: Info text -->
                        <div class="small text-muted">
                            <div>
                                <template v-if="providerPagination.total > providerPagination.per_page">
                                    {{ providerPagination.from }} to {{ providerPagination.to }} out of {{ providerPagination.total }} {{ providerPagination.total === 1 ? singularItemName : pluralItemName }}.
                                </template>
                                <template v-else-if="providerPagination.total === 1">
                                    {{ providerPagination.total }} {{ singularItemName }}.
                                </template>
                                <template v-else>
                                    {{ providerPagination.total }} {{ pluralItemName }}.
                                </template>
                            </div>
                            <div v-if="hasActiveFilters && providerPagination.total_unfiltered">
                                <small>Filtered from {{ providerPagination.total_unfiltered }} {{ providerPagination.total_unfiltered === 1 ? singularItemName : pluralItemName }}.</small>
                            </div>
                        </div>
                    </div>
                </DXTableShell>
            </DCol>
        </DRow>

        <!-- Edit Modal (if editFields provided) -->
        <DModal
            v-if="editFields && editFields.length > 0"
            v-model="showEditModal"
            :title="computedModalTitle"
            :size="editModalSize"
        >
            <!-- Loading the full record for edit (showUrl fetch) -->
            <div
                v-if="editLoading"
                class="dx-edit-loading d-flex align-items-center gap-2 text-muted mb-3"
            >
                <DSpinner small />
                <span>Loading…</span>
            </div>

            <!-- Edit/create form (tabbed when editTabs provided, flat otherwise).

                 Keyed per modal open: the form OBJECT is created once and then
                 reseeded in place for each row, so without a key Vue reuses the
                 same DXField instances across records — and any per-field UI
                 state rides along with them. That leaked a revealed password
                 from one row into the next. The key gives each record a fresh
                 field subtree; the data still lives in `editForm`, so nothing
                 is lost by remounting. -->
            <DXForm
                v-if="editForm"
                :key="editFormInstanceKey"
                v-model:active-tab="activeTabIndex"
                :form="editForm"
                :fields="editFields"
                :tabs="editTabs"
                :context="selectedItem ?? undefined"
                :show-submit="false"
                @submit="handleEditSave"
            >
                <!-- Forward DXTable's edit-value(key) → DXForm value(key) -->
                <template
                    v-for="key in editValueSlotKeys"
                    :key="`ev-${key}`"
                    #[`value(${key})`]="sp"
                >
                    <!--
                      @slot Custom input for field `<key>` in the edit/create modal, forwarded to DXForm. Name it `edit-value(<fieldKey>)`.
                      @binding {object} item The row being edited (null in create mode).
                      @binding {any} value The current field value.
                      @binding {Function} update Call with a new value to update the field.
                      @binding {object} field The field definition.
                    -->
                    <slot
                        :name="`edit-value(${key})`"
                        :item="selectedItem"
                        :value="sp.value"
                        :update="sp.update"
                        :field="sp.field"
                    />
                </template>

                <!-- Forward edit-span(key) → span(key) -->
                <template
                    v-for="key in editSpanSlotKeys"
                    :key="`es-${key}`"
                    #[`span(${key})`]="sp"
                >
                    <!--
                      @slot Full-width custom content for field `<key>` in the edit/create modal, forwarded to DXForm's span slot. Name it `edit-span(<fieldKey>)`.
                      @binding {object} item The row being edited (null in create mode).
                      @binding {any} value The current field value.
                      @binding {Function} update Call with a new value to update the field.
                      @binding {Function} close Call to close the edit modal.
                    -->
                    <slot
                        :name="`edit-span(${key})`"
                        :item="selectedItem"
                        :value="sp.value"
                        :update="sp.update"
                        :close="handleEditCancel"
                    />
                </template>

                <!-- Forward tab-content / tab-before / tab-after slots -->
                <template
                    v-for="key in tabContentSlotKeys"
                    :key="`tc-${key}`"
                    #[`tab-content(${key})`]="sp"
                >
                    <!--
                      @slot Replaces the auto-rendered fields of edit-modal tab `<key>` with custom content. Name it `tab-content(<tabKey>)`.
                      @binding {object} item The row being edited (null in create mode).
                      @binding {object} tab The tab definition.
                    -->
                    <slot :name="`tab-content(${key})`" :item="selectedItem" :tab="sp.tab" />
                </template>
                <template
                    v-for="key in tabBeforeSlotKeys"
                    :key="`tb-${key}`"
                    #[`tab-before(${key})`]="sp"
                >
                    <!--
                      @slot Custom content rendered before the fields of edit-modal tab `<key>`. Name it `tab-before(<tabKey>)`.
                      @binding {object} item The row being edited (null in create mode).
                      @binding {object} tab The tab definition.
                    -->
                    <slot :name="`tab-before(${key})`" :item="selectedItem" :tab="sp.tab" />
                </template>
                <template
                    v-for="key in tabAfterSlotKeys"
                    :key="`taf-${key}`"
                    #[`tab-after(${key})`]="sp"
                >
                    <!--
                      @slot Custom content rendered after the fields of edit-modal tab `<key>`. Name it `tab-after(<tabKey>)`.
                      @binding {object} item The row being edited (null in create mode).
                      @binding {object} tab The tab definition.
                    -->
                    <slot :name="`tab-after(${key})`" :item="selectedItem" :tab="sp.tab" />
                </template>
            </DXForm>

            <template #footer>
                <div class="d-flex justify-content-between w-100">
                    <div>
                        <DButton
                            v-if="deleteUrl && !isCreateMode"
                            variant="danger"
                            :loading="pendingAction === 'delete'"
                            loading-text="Deleting..."
                            :disabled="editForm?.processing || editLoading"
                            @click="handleDelete"
                        >
                            Delete
                        </DButton>
                    </div>
                    <div class="d-flex gap-2">
                        <DButton variant="secondary" @click="handleEditCancel">
                            Cancel
                        </DButton>
                        <DButton
                            variant="primary"
                            :loading="pendingAction === 'save'"
                            :loading-text="isCreateMode ? 'Creating...' : 'Saving...'"
                            :disabled="editForm?.processing || editLoading"
                            @click="handleEditSave"
                        >
                            {{ isCreateMode ? 'Create' : 'Save Changes' }}
                        </DButton>
                    </div>
                </div>
            </template>
        </DModal>
    </DContainer>
</template>

<script setup lang="ts" generic="T = any">
import { computed, getCurrentInstance, ref, watch, useSlots } from "vue";
import { router } from "@inertiajs/vue3";
import axios from "axios";
import pluralize from "pluralize";
import { useToast } from "../../composables/useToast";
import { useForm } from "../../composables/useForm";
import DContainer from "../base/DContainer.vue";
import DRow from "../base/DRow.vue";
import DCol from "../base/DCol.vue";
import DXTableShell from "./DXTableShell.vue";
import DSpinner from "../base/DSpinner.vue";
import DTable from "../base/DTable.vue";
import DPagination from "../base/DPagination.vue";
import DFormInput from "../base/DFormInput.vue";
import DFormSelect from "../base/DFormSelect.vue";
import DAutocomplete from "../base/DAutocomplete.vue";
import DModal from "../base/DModal.vue";
import DButton from "../base/DButton.vue";
import DXForm from "./DXForm.vue";
export type FilterType = 'text' | 'select' | 'number' | 'date' | false;

export interface FilterOption {
    value: string;
    text: string;
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

    /** Table field definitions */
    fields: TableField[];

    /** Sort configuration (v-model support) */
    sortBy?: BTableSortBy[];

    /** Filter values (v-model support) - key is field key, value is filter string */
    filters?: Record<string, string>;

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

    /** Per-page options for selector */
    perPageOptions?: number[];

    /** Current page (for provider mode) */
    currentPage?: number;

    /** Items per page (for provider mode, v-model support) */
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
    /** Form field definitions for edit modal (if provided, enables edit on row click) */
    editFields?: any[]; // FieldDefinition[] - using any to avoid circular import

    /** Tab definitions for organizing edit modal content */
    editTabs?: EditTab[];

    /** Edit modal title (can be function for dynamic titles) */
    editModalTitle?: string | ((item: any) => string);

    /** Edit modal size */
    editModalSize?: 'sm' | 'md' | 'lg' | 'xl';

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
    showCreateButton: true,
    footClone: false,
    showEmpty: true,
});

const emit = defineEmits<{
    /** Emitted when the user navigates to a different page (all modes). Payload is the new 1-based page number. */
    pageChange: [page: number];
    /** Emitted (Inertia mode) when the sort column or direction changes, with the active field key and order. */
    sortChange: [sort: { key: string; order: 'asc' | 'desc' }];
    /** Emitted when the inline column filter values change (debounced for server modes, immediate for client-side). Payload is the full filter map. */
    filterChange: [filters: Record<string, string>];
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
    'update:filters': [filters: Record<string, string>];
    /** `v-model:perPage` update, emitted with the new page size when the per-page selector changes. */
    'update:perPage': [perPage: number];
    /** `v-model:busy` update, forwarded from the underlying table's provider loading state (provider mode). */
    'update:busy': [busy: boolean];
}>();

// Mode detection
const isProviderMode = computed(() => !props.clientSide && (!!props.provider || !!props.apiUrl));
const isInertiaMode = computed(() => !props.clientSide && !props.provider && !props.apiUrl && !!props.items);
const isClientSideMode = computed(() => props.clientSide === true && !!props.items);
const hasInertiaUrl = computed(() => !!props.inertiaUrl);

// Warn about invalid prop combinations in client-side mode
if (props.clientSide && (props.apiUrl || props.inertiaUrl)) {
    console.warn('[DXTable] clientSide mode ignores apiUrl and inertiaUrl props. Data is processed locally from items.');
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
const internalFilters = ref<Record<string, string>>({ ...(props.filters ?? {}) });

const effectiveFilters = computed(() =>
    isControlled.filters && props.filters !== undefined ? props.filters : internalFilters.value,
);

// Computed: check if any field has filtering enabled
const hasFilters = computed(() => props.fields.some(field => field.filter !== false && field.filter !== undefined));

// Computed: check if any filters are currently active
const hasActiveFilters = computed(() => {
    const filters = effectiveFilters.value;
    return Object.keys(filters).some(key => filters[key] && filters[key].trim() !== '');
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
    if (props.provider && paginationWasProvided && props.pagination) {
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
    () => [props.provider, props.showPagination, providerPagination.value, providerHasRun.value] as const,
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
    if (!isClientSideMode.value || !props.items) return [];

    const filters = effectiveFilters.value;
    const filterKeys = Object.keys(filters).filter(key => filters[key] && filters[key].trim() !== '');

    if (filterKeys.length === 0) {
        return props.items;
    }

    return props.items.filter(item => {
        return filterKeys.every(key => {
            const filterValue = filters[key].trim().toLowerCase();
            // Resolve by the FILTER key, which may differ from the column's key.
            const field = props.fields.find(f => filterKeyFor(f) === key);
            // `filterKey` names the param the SERVER filters on; a local row may
            // not carry it at all (a `customer_name` row filtered on
            // `customer_id`). Match on the filter key when the row has it,
            // otherwise fall back to the column's own value — which is also the
            // one the user can actually see and type against.
            const itemValue =
                field && key in (item as any)
                    ? (item as any)[key]
                    : (item as any)[field?.key ?? key];

            // The "no value" option (e.g. Unassigned) is the one filter that
            // MATCHES an absent value rather than failing on it.
            if (field?.filterNullText && filters[key] === filterNullValueFor(field)) {
                return itemValue === null || itemValue === undefined || itemValue === '';
            }

            if (itemValue === null || itemValue === undefined) {
                return false;
            }

            const filterType = field?.filter;

            switch (filterType) {
                case 'text':
                    // Case-insensitive contains search
                    return String(itemValue).toLowerCase().includes(filterValue);

                case 'select':
                    // Exact match
                    return String(itemValue) === filters[key];

                case 'number':
                    // Exact numeric match
                    return Number(itemValue) === Number(filters[key]);

                case 'date':
                    // Exact date match
                    return String(itemValue) === filters[key];

                default:
                    // Default: case-insensitive contains
                    return String(itemValue).toLowerCase().includes(filterValue);
            }
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
        const aVal = (a as any)[key];
        const bVal = (b as any)[key];

        // Handle null/undefined
        if (aVal == null && bVal == null) return 0;
        if (aVal == null) return direction;
        if (bVal == null) return -direction;

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

const filterAllLabelFor = (field: TableField): string =>
    field.filterAllText ?? field.filterPlaceholder ?? `All ${field.label || field.key}`;

/**
 * Column header text. An explicitly empty `label` means an EMPTY header — an
 * actions column headed `actions` (lowercase, as-keyed) is a leak, not a
 * default. Only fall back when no label was declared at all.
 */
const headerLabel = (field: TableField, slotLabel?: string): string =>
    field.label !== undefined ? field.label : (slotLabel || field.key);

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
    options.push({ value: FILTER_ALL_VALUE, text: filterAllLabelFor(field) });

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

    // No values to choose from — don't offer a lone "All x" that filters nothing.
    return [];
};

// LocalStorage key for perPage preference
const perPageStorageKey = computed(() => {
    const url = props.inertiaUrl || props.apiUrl || 'table';
    return `dxtable-perpage-${url.replace(/\//g, '-')}`;
});

// Load perPage from localStorage or use default
const getInitialPerPage = (): number => {
    if (typeof window === 'undefined') return props.perPage || 10;

    try {
        const saved = localStorage.getItem(perPageStorageKey.value);
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

    return props.perPage || 10;
};

// Internal perPage state
const internalPerPage = ref<number>(getInitialPerPage());

// Watch pagination.per_page and sync with internalPerPage (after Inertia navigation)
watch(() => props.pagination?.per_page, (newPerPage) => {
    if (newPerPage && newPerPage !== internalPerPage.value) {
        internalPerPage.value = newPerPage;
        // Also update localStorage to stay in sync
        if (typeof window !== 'undefined') {
            try {
                localStorage.setItem(perPageStorageKey.value, newPerPage.toString());
            } catch (error) {
                console.error('Error saving perPage from watcher:', error);
            }
        }
    }
});

// Watch for external filter changes (when filters prop is controlled by parent)
watch(() => props.filters, (newFilters, oldFilters) => {
    // Only when the consumer CONTROLS filters. Uncontrolled, the prop is just a
    // seed: `effectiveFilters` stays internal, so refreshing on a later prop
    // change would fetch with filters the table isn't actually showing (#110).
    if (!isControlled.filters || props.filters === undefined) return;

    // Only refresh if filters actually changed
    if (JSON.stringify(newFilters) === JSON.stringify(oldFilters)) return;

    // Refresh data for the new filters
    if (isProviderMode.value) {
        refresh();
    } else if (hasInertiaUrl.value && isInertiaMode.value && router) {
        // Inertia mode - trigger navigation with new filters
        router.get(
            props.inertiaUrl!,
            {
                page: 1, // Reset to first page when filters change
                filters: newFilters,
                perPage: effectivePerPage.value,
                ...sortParams(effectiveSortBy.value),
            },
            { preserveState: true }
        );
    }
}, { deep: true });

// Watch apiUrl changes to reset filter cache and refetch. The api-url isn't part
// of BTable's provider context, so an api-url-only change doesn't re-invoke the
// provider on its own — without this the table keeps showing the previous url's
// rows until some other trigger (sort, per-page, create/edit/delete) fires.
watch(() => props.apiUrl, (newUrl, oldUrl) => {
    if (newUrl !== oldUrl && isProviderMode.value) {
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
    const totalUnfiltered = props.items?.length || 0;
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

// Detect which fields need server filter values
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
    if (!props.apiUrl) return [];

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

    const response = await axios.get(props.apiUrl, { params });

    // Extract and store pagination metadata for display
    if (response.data.pagination) {
        apiPaginationMeta.value = response.data.pagination;
    }

    // Extract and store filter values
    if (response.data.filterValues) {
        apiFilterValues.value = { ...apiFilterValues.value, ...response.data.filterValues };
    }

    return response.data.data;
};

/**
 * Wraps whichever provider is in play — the built-in `apiUrl` one or a
 * consumer's own `provider` — so a rejected fetch surfaces an error instead of
 * rendering as zero rows. A failed query and a genuinely empty result look
 * identical otherwise, which is how a broken table passes review and then shows
 * a blank page to a user. A consumer's provider used to be the silent case: the
 * error handling lived inside the internal one, so it never covered them.
 */
const wrappedProvider: BTableProvider<T> = async (context: Readonly<BTableProviderContext>) => {
    const provider = props.provider || (props.apiUrl ? internalProvider : undefined);
    if (!provider) return [];

    apiError.value = null;
    try {
        return await provider(context);
    } catch (error: any) {
        // eslint-disable-next-line no-console
        console.error('DXTable: the data provider failed', error);
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
    props.provider || props.apiUrl ? wrappedProvider : undefined,
);

const handlePageChange = (page: number) => {
    // If inertiaUrl provided, handle navigation automatically
    if (hasInertiaUrl.value && isInertiaMode.value && router) {
        router.get(
            props.inertiaUrl!,
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
            props.inertiaUrl!,
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

    // Save to localStorage
    if (typeof window !== 'undefined') {
        try {
            localStorage.setItem(perPageStorageKey.value, perPageNum.toString());
        } catch (error) {
            console.error('Error saving perPage to localStorage:', error);
        }
    }

    // Emit v-model update
    emit('update:perPage', perPageNum);

    // Handle navigation automatically
    if (hasInertiaUrl.value && isInertiaMode.value && router) {
        router.get(
            props.inertiaUrl!,
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

const handleFilterChange = (fieldKey: string, value: string) => {
    // Update filters
    const newFilters = { ...effectiveFilters.value, [fieldKey]: value };

    // Remove empty filters
    if (!value || value.trim() === '') {
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
                props.inertiaUrl!,
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
    else if (isInertiaMode.value && props.inertiaUrl && router) {
        router.reload();
    }
};

// Edit Modal State
const showEditModal = ref(false);

// Bumped on every modal open (edit or create) to key the DXForm subtree, so
// each record gets fresh DXField instances. NOT bumped by the showUrl fetch,
// which reseeds the SAME record — remounting there would discard edits the
// user has already made while the fetch was in flight.
const editFormInstanceKey = ref(0);
const selectedItem = ref<T | null>(null);
const editForm = ref<any>(null);
const activeTabIndex = ref(0);
const isCreateMode = ref(false);

// Which modal action is in flight, so the Save and Delete buttons show their
// own loading label independently. `editForm.processing` is shared by every
// request the form makes, so it can't tell Save from Delete on its own.
const pendingAction = ref<'save' | 'delete' | null>(null);

// True while the edit modal is fetching the full record via `showUrl`.
const editLoading = ref(false);

// Monotonic token so a slow fetch for a previously-opened row can't overwrite
// the form after the user has since opened a different row.
let editFetchToken = 0;

// Toast (may not be available in test environment)
let createToast: ((obj: any) => any) | undefined;
try {
    const toast = useToast();
    createToast = toast.create;
} catch (e) {
    // BApp not available (test environment or missing setup)
    createToast = undefined;
}

// The edit/create form rendering is delegated to DXForm, which
// owns field/tab visibility, dynamic labels/hints, conditional fields,
// and auto-switching to the first tab with a validation error.

// Forward only the keyed edit slots the consumer actually provided, so
// DXForm doesn't mistake an always-present (but empty) wrapper for
// a real custom-value override.
/*
 * A field's own starting value, used to seed a CREATE form and as the fallback
 * when a row lacks the key (#122).
 *
 * `field.default ?? ''` can't express a NULL default: a select whose "none"
 * option is `value: null` — which is what the column stores — seeds '' instead,
 * matches no option, and renders blank. Presence, not nullishness, decides here
 * too, so the create and edit paths agree about the same field.
 */
const defaultValueFor = (field: any): any =>
    Object.prototype.hasOwnProperty.call(field, 'default') ? field.default : '';

/*
 * Seeding an EDIT form from a row (#117).
 *
 * `row[key] ?? field.default` is wrong: it can't tell "the row has no such key"
 * from "the row's value IS null", so an explicitly-null column gets overwritten
 * by the field's default — a value the user never saw, on a field they may not
 * even be able to see. Presence, not nullishness, decides.
 */
const seedValueFor = (field: any, row: T): any => {
    if (Object.prototype.hasOwnProperty.call(row as any, field.key)) {
        return (row as any)[field.key];
    }
    return defaultValueFor(field);
};

/*
 * Whether a field is currently VISIBLE, by the same rule DXForm renders by
 * (`when` + the legacy `show`), against the same model (context + live data).
 * Kept in step with DXForm.isFieldVisible.
 */
const editPredicateModel = computed(() => ({
    ...((selectedItem.value as any) ?? {}),
    ...(editForm.value?.data ?? {}),
}));

const isEditFieldVisible = (field: any): boolean => {
    const when = field.when;
    const whenOk =
        when === undefined
            ? true
            : typeof when === 'function'
              ? when(editPredicateModel.value)
              : when;
    const showOk = field.show ? field.show() : true;
    return whenOk && showOk;
};

// Fields whose value actually belongs in the payload. A presentational field
// (submit: false) renders but holds no data — see FieldDefinition.submit.
const submittableEditFields = computed(() =>
    (props.editFields ?? []).filter((field) => field.submit !== false),
);

// Enforced at SUBMIT, not just at seeding: the modal still renders every field,
// so a `submit: false` control — or a `span` slot calling `update` — can write
// its key back into the form data after seeding. Strip them on the way out.
const nonSubmittedFieldKeys = computed(
    () =>
        new Set(
            (props.editFields ?? [])
                .filter(
                    (field) =>
                        // Presentational: lays the form out, holds no data (#110).
                        field.submit === false ||
                        // Hidden by `when` at submit time (#117). Submitting a field
                        // the user cannot see is a silent write — and with `default`
                        // set it writes a value they never chose. Omitting the key
                        // leaves the stored value alone.
                        !isEditFieldVisible(field),
                )
                .map((field) => field.key),
        ),
);

const stripNonSubmittedFields = (data: Record<string, any>): Record<string, any> => {
    if (nonSubmittedFieldKeys.value.size === 0) return data;
    return Object.fromEntries(
        Object.entries(data).filter(([key]) => !nonSubmittedFieldKeys.value.has(key)),
    );
};

const tableSlots = useSlots();

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

const tableSlotSignature = (slots: Record<string, unknown>): string =>
    Object.keys(slots).filter(isTableSlot).sort().join('|');

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
const editFieldKeys = computed<string[]>(() =>
    (props.editFields ?? []).map((field: any) => field.key),
);
const tabKeys = computed<string[]>(() =>
    (props.editTabs ?? []).map((tab) => tab.key),
);
const editValueSlotKeys = computed(() =>
    editFieldKeys.value.filter((key) => !!tableSlots[`edit-value(${key})`]),
);
const editSpanSlotKeys = computed(() =>
    editFieldKeys.value.filter((key) => !!tableSlots[`edit-span(${key})`]),
);
const tabContentSlotKeys = computed(() =>
    tabKeys.value.filter((key) => !!tableSlots[`tab-content(${key})`]),
);
const tabBeforeSlotKeys = computed(() =>
    tabKeys.value.filter((key) => !!tableSlots[`tab-before(${key})`]),
);
const tabAfterSlotKeys = computed(() =>
    tabKeys.value.filter((key) => !!tableSlots[`tab-after(${key})`]),
);

// Computed: Singular and plural item names
const singularItemName = computed(() => props.itemName);
const pluralItemName = computed(() => pluralize(props.itemName));

// The built-in "New {item}" button needs both a create endpoint and consent.
// Gating the header's own v-if on this (not on `createUrl`) means a table that
// only had a header to host the button loses the empty header too.
const showsCreateButton = computed(() => Boolean(props.createUrl) && props.showCreateButton);

// Computed: Modal title (supports function)
const computedModalTitle = computed(() => {
    if (isCreateMode.value) {
        return `New ${singularItemName.value}`;
    }
    if (!selectedItem.value) {
        return `Edit ${singularItemName.value}`;
    }
    if (!props.editModalTitle) {
        return `Edit ${singularItemName.value}`;
    }
    return typeof props.editModalTitle === 'function'
        ? props.editModalTitle(selectedItem.value)
        : props.editModalTitle;
});

// Helper: Get current sort state for a field
const getFieldSortState = (fieldKey: string) => {
    const currentSort = effectiveSortBy.value.find(s => s.key === fieldKey);
    return currentSort?.order || null;
};

// Handle row click for editing
const handleRowClick = (item: T, index: number, event: MouseEvent) => {
    // A row the consumer marked non-actionable doesn't look clickable, so it
    // must not BE clickable either — otherwise a click that looks dead quietly
    // navigates or opens the modal (#115).
    if (props.rowClickable && !props.rowClickable(item, index)) return;

    // Always emit rowClicked for custom handling
    emit('rowClicked', item, index, event);

    // If editFields provided, open edit modal
    if (props.editFields && props.editFields.length > 0) {
        // Set selected item FIRST before any rendering
        isCreateMode.value = false;
        selectedItem.value = item;

        // Reset to first tab
        activeTabIndex.value = 0;

        // Initialize form with item data. `useForm` is statically imported, so
        // seeding is synchronous — no interleaving between successive row opens.
        if (!editForm.value) {
            const formData: Record<string, any> = {};
            // Presentational fields (submit: false) lay the form out; they hold
            // no data and must not be POSTed just because they were declared.
            submittableEditFields.value.forEach(field => {
                formData[field.key] = seedValueFor(field, item);
            });
            editForm.value = useForm(formData);
        } else {
            // Update existing form
            submittableEditFields.value.forEach(field => {
                editForm.value.data[field.key] = seedValueFor(field, item);
            });
            editForm.value.clearErrors();
        }

        // Open modal
        editFormInstanceKey.value++;
        showEditModal.value = true;

        // Optionally replace the row-seeded data with the full record.
        if (props.showUrl) void fetchFullRecordForEdit(item);
    }
};

// Fetch the full record for the edit modal and re-seed the form from it. The
// form is already showing row data; this fills in fields the list row omitted.
const fetchFullRecordForEdit = async (item: T) => {
    const itemId = (item as any).id;
    if (itemId === undefined || itemId === null) return;

    const token = ++editFetchToken;
    editLoading.value = true;
    try {
        const url = props.showUrl!.replace(':id', String(itemId));
        const response = await axios.get(url);
        // Superseded by a newer row-open — discard.
        if (token !== editFetchToken) return;

        const record = response.data?.data ?? response.data;
        if (record && editForm.value) {
            submittableEditFields.value.forEach(field => {
                if (Object.prototype.hasOwnProperty.call(record, field.key)) {
                    editForm.value.data[field.key] = record[field.key];
                }
            });
            // Widen selectedItem so predicates / the delete guard see full data.
            selectedItem.value = { ...(selectedItem.value as any), ...record };
        }
    } catch (error: any) {
        if (token !== editFetchToken) return;
        const message =
            error?.response?.data?.message ??
            error?.message ??
            'Failed to load the full record.';
        createToast?.({
            title: 'Error',
            body: message,
            variant: 'danger',
            modelValue: 5000,
        });
    } finally {
        if (token === editFetchToken) editLoading.value = false;
    }
};

// Handle "New" button click
const handleCreateNew = () => {
    if (!props.editFields || props.editFields.length === 0) return;

    isCreateMode.value = true;
    selectedItem.value = null;
    activeTabIndex.value = 0;

    // Supersede any in-flight row-open fetch so a slow showUrl fetch from an
    // earlier edit can't seed over this create.
    editFetchToken++;
    editLoading.value = false;

    if (!editForm.value) {
        const formData: Record<string, any> = {};
        submittableEditFields.value.forEach(field => {
            formData[field.key] = defaultValueFor(field);
        });
        editForm.value = useForm(formData);
    } else {
        // Reset existing form to defaults
        submittableEditFields.value.forEach(field => {
            editForm.value.data[field.key] = defaultValueFor(field);
        });
        editForm.value.clearErrors();
    }
    editFormInstanceKey.value++;
    showEditModal.value = true;
};

// Handle save from edit modal
const handleEditSave = async () => {
    if (!editForm.value) return;

    pendingAction.value = 'save';
    try {
        await performSave();
    } finally {
        pendingAction.value = null;
    }
};

const performSave = async () => {
    // Create mode: POST to createUrl
    if (isCreateMode.value && props.createUrl) {
        try {
            await editForm.value.post(props.createUrl, {
                transform: stripNonSubmittedFields,
                onSuccess: (data: any) => {
                    createToast?.({
                        title: 'Success',
                        body: `${singularItemName.value} created successfully`,
                        variant: 'success',
                        modelValue: 3000,
                    });

                    emit('rowCreated', data?.data ?? data, data);
                    showEditModal.value = false;
                    selectedItem.value = null;
                    isCreateMode.value = false;

                    refresh();
                },
                onError: (errors: any) => {
                    let errorMessage = 'Failed to create. Please check the form for errors.';
                    if (errors && typeof errors === 'object') {
                        const firstError = Object.values(errors).flat()[0];
                        if (typeof firstError === 'string') {
                            errorMessage = firstError;
                        }
                    }

                    createToast?.({
                        title: 'Error',
                        body: errorMessage,
                        variant: 'danger',
                        modelValue: 5000,
                    });

                    // DXForm switches to the first errored tab via its
                    // own watcher on editForm.errors.
                    emit('createError', errors);
                }
            });
        } catch (error) {
            emit('createError', error);
        }
        return;
    }

    // Edit mode: PUT to editUrl
    if (!selectedItem.value) return;

    try {
        // If editUrl provided, handle API call internally
        if (props.editUrl) {
            const itemId = (selectedItem.value as any).id;
            const url = props.editUrl.replace(':id', itemId);

            await editForm.value.put(url, {
                transform: stripNonSubmittedFields,
                onSuccess: (data: any) => {
                    // Show success toast
                    createToast?.({
                        title: 'Success',
                        body: `${singularItemName.value} updated successfully`,
                        variant: 'success',
                        modelValue: 3000, // Auto-dismiss after 3 seconds
                    });

                    emit('rowUpdated', selectedItem.value as T, data);
                    showEditModal.value = false;
                    selectedItem.value = null;

                    // Refresh table data to show updated values
                    refresh();
                },
                onError: (errors: any) => {
                    // Extract first error message for toast
                    let errorMessage = 'Failed to update. Please check the form for errors.';
                    if (errors && typeof errors === 'object') {
                        const firstError = Object.values(errors).flat()[0];
                        if (typeof firstError === 'string') {
                            errorMessage = firstError;
                        }
                    }

                    // Show error toast with specific message
                    createToast?.({
                        title: 'Error',
                        body: errorMessage,
                        variant: 'danger',
                        modelValue: 5000, // Auto-dismiss after 5 seconds
                    });

                    // DXForm switches to the first errored tab via its
                    // own watcher on editForm.errors.
                    emit('editError', selectedItem.value as T, errors);
                }
            });
        } else {
            // No editUrl - just emit event for custom handling
            emit('rowUpdated', selectedItem.value as T, editForm.value.data);
            showEditModal.value = false;
            selectedItem.value = null;
        }
    } catch (error) {
        emit('editError', selectedItem.value as T, error);
    }
};

// Handle edit modal close
const handleEditCancel = () => {
    showEditModal.value = false;
    selectedItem.value = null;
    isCreateMode.value = false;
    activeTabIndex.value = 0; // Reset tab for next time
    // Abandon any in-flight showUrl fetch so it can't seed a closed modal.
    editFetchToken++;
    editLoading.value = false;
    if (editForm.value) {
        editForm.value.clearErrors();
    }
};

// Handle delete from edit modal
const handleDelete = async () => {
    if (!editForm.value || !selectedItem.value || !props.deleteUrl) return;
    // Don't evaluate the guard until the full record has loaded (showUrl) — it
    // may depend on fields the thin list row doesn't carry.
    if (editLoading.value) return;

    // Delete guard: a non-null message means this item can't be deleted — show
    // it immediately and skip the confirm and the request entirely.
    const guardMessage = props.deleteGuard?.(selectedItem.value as T);
    if (guardMessage) {
        createToast?.({
            title: 'Cannot delete',
            body: guardMessage,
            variant: 'danger',
            modelValue: 5000,
        });
        return;
    }

    // Confirm deletion
    const itemName = (selectedItem.value as any).name || (selectedItem.value as any).title || singularItemName.value;
    const confirmed = window.confirm(`Are you sure you want to delete "${itemName}"? This action cannot be undone.`);

    if (!confirmed) return;

    pendingAction.value = 'delete';
    try {
        const itemId = (selectedItem.value as any).id;
        const url = props.deleteUrl.replace(':id', itemId);

        await editForm.value.delete(url, {
            onSuccess: (data: any) => {
                // Show success toast
                createToast?.({
                    title: 'Success',
                    body: `${singularItemName.value} deleted successfully`,
                    variant: 'success',
                    modelValue: 3000, // Auto-dismiss after 3 seconds
                });

                emit('rowDeleted', selectedItem.value as T, data);
                showEditModal.value = false;
                selectedItem.value = null;

                // Refresh table data to remove deleted item
                refresh();
            },
            onError: (error: any) => {
                // Extract error message from server response
                const errorData = error?.response?.data ?? error?.data ?? error;
                const errorMessage = errorData?.message ?? 'Failed to delete. Please try again.';

                // Show error toast with server message
                createToast?.({
                    title: 'Error',
                    body: errorMessage,
                    variant: 'danger',
                    modelValue: 5000, // Auto-dismiss after 5 seconds
                });

                emit('deleteError', selectedItem.value as T, error);
            }
        });
    } catch (error) {
        emit('deleteError', selectedItem.value as T, error);
    } finally {
        pendingAction.value = null;
    }
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

/* Improve pagination button sizing to match form controls */
:deep(.pagination) {
    margin-bottom: 0;
}

:deep(.pagination-sm .page-link) {
    min-width: 2.25rem;
    height: auto;
}

/* Make disabled pagination buttons more subtle */
:deep(.pagination .page-item.disabled .page-link) {
    background-color: transparent;
    border-color: transparent;
    opacity: 0.3;
}
</style>
