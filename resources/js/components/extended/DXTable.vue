<template>
    <DContainer :fluid="fluid" :class="containerClass">
        <DRow class="justify-content-center">
            <DCol :md="columnSize">
                <DCard>
                    <template v-if="title || $slots.header" #header>
                        <slot name="header">
                            <div class="d-flex justify-content-between align-items-center">
                                <h4 class="mb-0">{{ title }}</h4>
                            </div>
                        </slot>
                    </template>

                    <div v-if="effectiveBusy && !isProviderMode" class="text-center py-5">
                        <DSpinner variant="primary" />
                        <p class="mt-2">{{ loadingText }}</p>
                    </div>

                    <div v-else-if="error || apiError" class="alert alert-danger">
                        {{ error || apiError }}
                    </div>

                    <!-- Provider Mode: Use BTable's provider pattern -->
                    <DTable
                        v-else-if="isProviderMode"
                        ref="tableRef"
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
                        @update:sort-by="handleSortChange"
                        @update:current-page="apiCurrentPage = $event"
                        @update:busy="handleBusyChange"
                        @row-clicked="handleRowClick"
                    >
                        <!-- Inline Filter Row -->
                        <template v-if="hasFilters" #thead-top>
                            <tr class="filter-row">
                                <th v-for="field in fields" :key="`filter-${field.key}`" class="p-2">
                                    <!-- Text Filter -->
                                    <DFormInput
                                        v-if="field.filter === 'text'"
                                        :model-value="effectiveFilters[field.key] || ''"
                                        :placeholder="field.filterPlaceholder || `Search ${field.label || field.key}...`"
                                        size="sm"
                                        @update:model-value="handleFilterChange(field.key, $event as string)"
                                    />

                                    <!-- Select Filter -->
                                    <DFormSelect
                                        v-else-if="field.filter === 'select'"
                                        :model-value="effectiveFilters[field.key] || ''"
                                        :options="[{ value: '', text: 'All' }, ...getFieldFilterOptions(field)]"
                                        size="sm"
                                        @update:model-value="handleFilterChange(field.key, $event as string)"
                                    />

                                    <!-- Number Filter -->
                                    <DFormInput
                                        v-else-if="field.filter === 'number'"
                                        :model-value="effectiveFilters[field.key] || ''"
                                        :placeholder="field.filterPlaceholder || `Filter ${field.label || field.key}...`"
                                        type="number"
                                        size="sm"
                                        @update:model-value="handleFilterChange(field.key, $event as string)"
                                    />

                                    <!-- Date Filter -->
                                    <DFormInput
                                        v-else-if="field.filter === 'date'"
                                        :model-value="effectiveFilters[field.key] || ''"
                                        type="date"
                                        size="sm"
                                        @update:model-value="handleFilterChange(field.key, $event as string)"
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
                                    <div class="fw-semibold">{{ label || field.key }}</div>
                                    <small v-if="field.hint" class="text-muted d-block" style="font-weight: normal;">{{ field.hint }}</small>
                                </div>
                                <div v-if="field.sortable" class="sort-indicator text-muted flex-shrink-0" style="font-size: 0.75rem; line-height: 1.1; display: flex; flex-direction: column; align-items: center;">
                                    <span :style="{ opacity: getFieldSortState(field.key) === 'asc' ? 1 : 0.3 }">▲</span>
                                    <span :style="{ opacity: getFieldSortState(field.key) === 'desc' ? 1 : 0.3 }">▼</span>
                                </div>
                            </div>
                        </template>

                        <!-- Pass through all cell slots -->
                        <template
                            v-for="(_, name) in $slots"
                            #[name]="slotProps"
                        >
                            <slot
                                v-if="typeof name === 'string' && name.startsWith('cell')"
                                :name="name"
                                v-bind="slotProps"
                            />
                        </template>
                    </DTable>

                    <!-- Client-Side Mode: Local filtering, sorting, pagination -->
                    <DTable
                        v-else-if="isClientSideMode"
                        :items="clientSidePaginatedItems"
                        :fields="fields"
                        :sort-by="effectiveSortBy"
                        :multisort="false"
                        :no-local-sorting="true"
                        :no-sortable-icon="true"
                        :striped="striped"
                        :hover="hover"
                        :responsive="responsive"
                        @update:sort-by="handleSortChange"
                        @row-clicked="handleRowClick"
                    >
                        <!-- Inline Filter Row -->
                        <template v-if="hasFilters" #thead-top>
                            <tr class="filter-row">
                                <th v-for="field in fields" :key="`filter-${field.key}`" class="p-2">
                                    <!-- Text Filter -->
                                    <DFormInput
                                        v-if="field.filter === 'text'"
                                        :model-value="effectiveFilters[field.key] || ''"
                                        :placeholder="field.filterPlaceholder || `Search ${field.label || field.key}...`"
                                        size="sm"
                                        @update:model-value="handleFilterChange(field.key, $event as string)"
                                    />

                                    <!-- Select Filter -->
                                    <DFormSelect
                                        v-else-if="field.filter === 'select'"
                                        :model-value="effectiveFilters[field.key] || ''"
                                        :options="[{ value: '', text: 'All' }, ...getFieldFilterOptions(field)]"
                                        size="sm"
                                        @update:model-value="handleFilterChange(field.key, $event as string)"
                                    />

                                    <!-- Number Filter -->
                                    <DFormInput
                                        v-else-if="field.filter === 'number'"
                                        :model-value="effectiveFilters[field.key] || ''"
                                        :placeholder="field.filterPlaceholder || `Filter ${field.label || field.key}...`"
                                        type="number"
                                        size="sm"
                                        @update:model-value="handleFilterChange(field.key, $event as string)"
                                    />

                                    <!-- Date Filter -->
                                    <DFormInput
                                        v-else-if="field.filter === 'date'"
                                        :model-value="effectiveFilters[field.key] || ''"
                                        type="date"
                                        size="sm"
                                        @update:model-value="handleFilterChange(field.key, $event as string)"
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
                                    <div class="fw-semibold">{{ label || field.key }}</div>
                                    <small v-if="field.hint" class="text-muted d-block" style="font-weight: normal;">{{ field.hint }}</small>
                                </div>
                                <div v-if="field.sortable" class="sort-indicator text-muted flex-shrink-0" style="font-size: 0.75rem; line-height: 1.1; display: flex; flex-direction: column; align-items: center;">
                                    <span :style="{ opacity: getFieldSortState(field.key) === 'asc' ? 1 : 0.3 }">▲</span>
                                    <span :style="{ opacity: getFieldSortState(field.key) === 'desc' ? 1 : 0.3 }">▼</span>
                                </div>
                            </div>
                        </template>

                        <!-- Pass through all cell slots -->
                        <template
                            v-for="(_, name) in $slots"
                            #[name]="slotProps"
                        >
                            <slot
                                v-if="typeof name === 'string' && name.startsWith('cell')"
                                :name="name"
                                v-bind="slotProps"
                            />
                        </template>
                    </DTable>

                    <!-- Inertia Mode: Use items prop -->
                    <DTable
                        v-else-if="isInertiaMode"
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
                        @update:sort-by="handleSortChange"
                        @row-clicked="handleRowClick"
                    >
                        <!-- Inline Filter Row -->
                        <template v-if="hasFilters" #thead-top>
                            <tr class="filter-row">
                                <th v-for="field in fields" :key="`filter-${field.key}`" class="p-2">
                                    <!-- Text Filter -->
                                    <DFormInput
                                        v-if="field.filter === 'text'"
                                        :model-value="effectiveFilters[field.key] || ''"
                                        :placeholder="field.filterPlaceholder || `Search ${field.label || field.key}...`"
                                        size="sm"
                                        @update:model-value="handleFilterChange(field.key, $event as string)"
                                    />

                                    <!-- Select Filter -->
                                    <DFormSelect
                                        v-else-if="field.filter === 'select'"
                                        :model-value="effectiveFilters[field.key] || ''"
                                        :options="[{ value: '', text: 'All' }, ...getFieldFilterOptions(field)]"
                                        size="sm"
                                        @update:model-value="handleFilterChange(field.key, $event as string)"
                                    />

                                    <!-- Number Filter -->
                                    <DFormInput
                                        v-else-if="field.filter === 'number'"
                                        :model-value="effectiveFilters[field.key] || ''"
                                        :placeholder="field.filterPlaceholder || `Filter ${field.label || field.key}...`"
                                        type="number"
                                        size="sm"
                                        @update:model-value="handleFilterChange(field.key, $event as string)"
                                    />

                                    <!-- Date Filter -->
                                    <DFormInput
                                        v-else-if="field.filter === 'date'"
                                        :model-value="effectiveFilters[field.key] || ''"
                                        type="date"
                                        size="sm"
                                        @update:model-value="handleFilterChange(field.key, $event as string)"
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
                                    <div class="fw-semibold">{{ label || field.key }}</div>
                                    <small v-if="field.hint" class="text-muted d-block" style="font-weight: normal;">{{ field.hint }}</small>
                                </div>
                                <div v-if="field.sortable" class="sort-indicator text-muted flex-shrink-0" style="font-size: 0.75rem; line-height: 1.1; display: flex; flex-direction: column; align-items: center;">
                                    <span :style="{ opacity: getFieldSortState(field.key) === 'asc' ? 1 : 0.3 }">▲</span>
                                    <span :style="{ opacity: getFieldSortState(field.key) === 'desc' ? 1 : 0.3 }">▼</span>
                                </div>
                            </div>
                        </template>

                        <!-- Pass through all cell slots -->
                        <template
                            v-for="(_, name) in $slots"
                            #[name]="slotProps"
                        >
                            <slot
                                v-if="typeof name === 'string' && name.startsWith('cell')"
                                :name="name"
                                v-bind="slotProps"
                            />
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
                            <div v-if="clientSidePagination.total >= Math.min(...perPageOptions)" class="d-flex align-items-center gap-2">
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
                    <div v-if="isProviderMode && apiPaginationMeta" class="mt-3">
                        <!-- Top row: Pagination and Per-page selector -->
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <!-- Pagination controls (only when multiple pages) -->
                            <DPagination
                                v-if="showPagination && apiPaginationMeta.total > apiPaginationMeta.per_page"
                                :model-value="apiPaginationMeta.current_page"
                                :total-rows="apiPaginationMeta.total"
                                :per-page="apiPaginationMeta.per_page"
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
                                <template v-if="apiPaginationMeta.total > apiPaginationMeta.per_page">
                                    {{ apiPaginationMeta.from }} to {{ apiPaginationMeta.to }} out of {{ apiPaginationMeta.total }} {{ apiPaginationMeta.total === 1 ? singularItemName : pluralItemName }}.
                                </template>
                                <template v-else-if="apiPaginationMeta.total === 1">
                                    {{ apiPaginationMeta.total }} {{ singularItemName }}.
                                </template>
                                <template v-else>
                                    {{ apiPaginationMeta.total }} {{ pluralItemName }}.
                                </template>
                            </div>
                            <div v-if="hasActiveFilters && apiPaginationMeta.total_unfiltered">
                                <small>Filtered from {{ apiPaginationMeta.total_unfiltered }} {{ apiPaginationMeta.total_unfiltered === 1 ? singularItemName : pluralItemName }}.</small>
                            </div>
                        </div>
                    </div>
                </DCard>
            </DCol>
        </DRow>

        <!-- Edit Modal (if editFields provided) -->
        <DModal
            v-if="editFields && editFields.length > 0"
            v-model="showEditModal"
            :title="computedModalTitle"
            :size="editModalSize"
        >
            <!-- Tabbed view (if editTabs provided) -->
            <template v-if="editTabs && editTabs.length > 0 && editForm">
                <DTabs v-model="activeTabIndex">
                    <DTab
                        v-for="(tab, index) in visibleTabs"
                        :key="tab.key"
                        :title="tab.label || tab.key"
                        :lazy="tab.lazy"
                        :active="index === 0"
                    >
                        <!-- Custom tab content slot -->
                        <slot
                            v-if="$slots[`tab-content(${tab.key})`]"
                            :name="`tab-content(${tab.key})`"
                            :item="selectedItem"
                            :tab="tab"
                        />

                        <!-- Default: render fields for this tab -->
                        <div v-else class="p-3">
                            <!-- Before slot -->
                            <slot :name="`tab-before(${tab.key})`" :item="selectedItem" :tab="tab" />

                            <!-- Form fields for this tab -->
                            <template v-for="fieldKey in tab.fieldKeys" :key="fieldKey">
                                <div v-if="getField(fieldKey).span" class="mb-3">
                                    <!-- Full-width span field -->
                                    <slot
                                        :name="`edit-span(${fieldKey})`"
                                        :item="selectedItem"
                                        :value="editForm.data[fieldKey]"
                                        :update="(v: any) => editForm.data[fieldKey] = v"
                                        :close="handleEditCancel"
                                    />
                                </div>
                                <!-- Checkbox (no label wrapper needed) -->
                                <div v-else-if="getField(fieldKey).type === 'checkbox'" class="mb-3">
                                    <!-- Custom value slot -->
                                    <slot
                                        v-if="$slots[`edit-value(${fieldKey})`]"
                                        :name="`edit-value(${fieldKey})`"
                                        :item="selectedItem"
                                        :value="editForm.data[fieldKey]"
                                        :update="(v: any) => editForm.data[fieldKey] = v"
                                        :field="getField(fieldKey)"
                                    />
                                    <DFormCheckbox
                                        v-else
                                        v-model="editForm.data[fieldKey]"
                                    >
                                        {{ getField(fieldKey).label || fieldKey }}
                                    </DFormCheckbox>
                                </div>
                                <!-- Other field types with label -->
                                <DFormGroup
                                    v-else
                                    :label="getField(fieldKey).label || fieldKey"
                                    class="mb-3"
                                >
                                    <!-- Custom value slot -->
                                    <slot
                                        v-if="$slots[`edit-value(${fieldKey})`]"
                                        :name="`edit-value(${fieldKey})`"
                                        :item="selectedItem"
                                        :value="editForm.data[fieldKey]"
                                        :update="(v: any) => editForm.data[fieldKey] = v"
                                        :field="getField(fieldKey)"
                                    />
                                    <DFormTextarea
                                        v-else-if="getField(fieldKey).type === 'textarea'"
                                        v-model="editForm.data[fieldKey]"
                                        :required="getField(fieldKey).required"
                                        :rows="getField(fieldKey).rows || 3"
                                        :state="editForm.getState(fieldKey)"
                                        @input="editForm.clearError(fieldKey)"
                                    />
                                    <DFormInput
                                        v-else
                                        v-model="editForm.data[fieldKey]"
                                        :type="getField(fieldKey).type || 'text'"
                                        :required="getField(fieldKey).required"
                                        :state="editForm.getState(fieldKey)"
                                        @input="editForm.clearError(fieldKey)"
                                    />
                                    <!-- Validation error -->
                                    <DFormInvalidFeedback v-if="editForm.hasError(fieldKey)">
                                        {{ editForm.getError(fieldKey) }}
                                    </DFormInvalidFeedback>
                                </DFormGroup>
                            </template>

                            <!-- After slot -->
                            <slot :name="`tab-after(${tab.key})`" :item="selectedItem" :tab="tab" />
                        </div>
                    </DTab>
                </DTabs>
            </template>

            <!-- Fallback: no tabs, render flat form (current behavior) -->
            <DXBasicForm
                v-else-if="editForm"
                :form="editForm"
                :fields="editFields"
                :show-submit="false"
                @submit="handleEditSave"
            />

            <template #footer>
                <div class="d-flex justify-content-between w-100">
                    <div>
                        <DButton
                            v-if="deleteUrl"
                            variant="danger"
                            :disabled="editForm?.processing"
                            @click="handleDelete"
                        >
                            {{ editForm?.processing ? 'Deleting...' : 'Delete' }}
                        </DButton>
                    </div>
                    <div class="d-flex gap-2">
                        <DButton variant="secondary" @click="handleEditCancel">
                            Cancel
                        </DButton>
                        <DButton
                            variant="primary"
                            :disabled="editForm?.processing"
                            @click="handleEditSave"
                        >
                            {{ editForm?.processing ? 'Saving...' : 'Save Changes' }}
                        </DButton>
                    </div>
                </div>
            </template>
        </DModal>
    </DContainer>
</template>

<script setup lang="ts" generic="T = any">
import { computed, ref, watch } from "vue";
import { router } from "@inertiajs/vue3";
import axios from "axios";
import pluralize from "pluralize";
import { useToast } from "../../composables/useToast";
import DContainer from "../base/DContainer.vue";
import DRow from "../base/DRow.vue";
import DCol from "../base/DCol.vue";
import DCard from "../base/DCard.vue";
import DSpinner from "../base/DSpinner.vue";
import DTable from "../base/DTable.vue";
import DPagination from "../base/DPagination.vue";
import DFormInput from "../base/DFormInput.vue";
import DFormSelect from "../base/DFormSelect.vue";
import DModal from "../base/DModal.vue";
import DButton from "../base/DButton.vue";
import DTabs from "../base/DTabs.vue";
import DTab from "../base/DTab.vue";
import DFormGroup from "../base/DFormGroup.vue";
import DFormTextarea from "../base/DFormTextarea.vue";
import DFormCheckbox from "../base/DFormCheckbox.vue";
import DFormInvalidFeedback from "../base/DFormInvalidFeedback.vue";
import DXBasicForm from "./DXBasicForm.vue";
export type FilterType = 'text' | 'select' | 'number' | 'date' | false;

export interface FilterOption {
    value: string;
    text: string;
}

export interface TableField {
    key: string;
    label?: string;
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

    /** Display label (optional, auto-derived from key if omitted) */
    label?: string;

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

    /** Striped rows */
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

    /** API endpoint pattern for deletions (e.g., "/api/products/:id") */
    deleteUrl?: string;

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
    perPageOptions: () => [10, 25, 50, 100],
    currentPage: 1,
    // perPage: 10,  // Don't set default - let internalPerPage handle it
    striped: true,
    hover: true,
    responsive: true,
    fluid: false,
    containerClass: "py-5",
    columnSize: "12",
    editModalSize: "lg",
});

const emit = defineEmits<{
    pageChange: [page: number];
    sortChange: [sort: { key: string; order: 'asc' | 'desc' }];
    filterChange: [filters: Record<string, string>];
    perPageChange: [perPage: number];
    rowClicked: [item: T, index: number, event: MouseEvent];
    rowUpdated: [item: T, response: any];
    editError: [item: T, error: any];
    rowDeleted: [item: T, response: any];
    deleteError: [item: T, error: any];
    'update:sortBy': [sortBy: BTableSortBy[]];
    'update:filters': [filters: Record<string, string>];
    'update:perPage': [perPage: number];
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

// Internal sortBy state for auto modes
const internalSortBy = ref<BTableSortBy[]>([]);

// Computed effective sortBy (use external if provided, otherwise internal)
const effectiveSortBy = computed(() => props.sortBy !== undefined ? props.sortBy : internalSortBy.value);

// Internal filters state for auto modes
const internalFilters = ref<Record<string, string>>({});

// Computed effective filters (use external if provided, otherwise internal)
const effectiveFilters = computed(() => props.filters !== undefined ? props.filters : internalFilters.value);

// Computed: check if any field has filtering enabled
const hasFilters = computed(() => props.fields.some(field => field.filter !== false && field.filter !== undefined));

// Computed: check if any filters are currently active
const hasActiveFilters = computed(() => {
    const filters = effectiveFilters.value;
    return Object.keys(filters).some(key => filters[key] && filters[key].trim() !== '');
});

// API mode pagination metadata (extracted from responses)
const apiPaginationMeta = ref<PaginationData | null>(null);

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
            const field = props.fields.find(f => f.key === key);
            const itemValue = (item as any)[key];

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
const getFieldFilterOptions = (field: TableField): FilterOption[] => {
    // If field has static filterOptions, use those
    if (field.filterOptions && field.filterOptions.length > 0) {
        return field.filterOptions;
    }

    // Otherwise, check for server-provided values
    const serverValues = props.filterValues?.[field.key] || apiFilterValues.value[field.key];

    if (serverValues && serverValues.length > 0) {
        // Convert string array to FilterOption array
        return serverValues.map(value => ({ value, text: value }));
    }

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
    // Only trigger refresh if filters prop is being used (not internal state)
    if (props.filters === undefined) return;

    // Only refresh if filters actually changed
    if (JSON.stringify(newFilters) === JSON.stringify(oldFilters)) return;

    // Refresh data for the new filters
    if (isProviderMode.value) {
        refresh();
    } else if (hasInertiaUrl.value && isInertiaMode.value && router) {
        // Inertia mode - trigger navigation with new filters
        const currentSort = effectiveSortBy.value[0] || { key: 'created_at', order: 'desc' };
        router.get(
            props.inertiaUrl!,
            {
                page: 1, // Reset to first page when filters change
                sortBy: currentSort.key,
                sortOrder: currentSort.order,
                filters: newFilters,
                perPage: effectivePerPage.value,
            },
            { preserveState: true }
        );
    }
}, { deep: true });

// Watch apiUrl changes to reset filter cache (prevents stale dropdown options)
watch(() => props.apiUrl, (newUrl, oldUrl) => {
    if (newUrl !== oldUrl && isProviderMode.value) {
        // Clear cached filter values and pagination when API endpoint changes
        apiFilterValues.value = {};
        apiPaginationMeta.value = null;
        apiError.value = null;
        // Next provider call will request fresh filter values
    }
});

// Computed effective perPage (use external if provided, otherwise internal)
const effectivePerPage = computed(() => {
    // If external perPage prop is provided, use it
    if (props.perPage !== undefined) {
        return props.perPage;
    }

    // For Inertia mode, prefer pagination.per_page (actual server value)
    if (isInertiaMode.value && props.pagination?.per_page) {
        return props.pagination.per_page;
    }

    // For API mode, use internal state (which gets updated immediately on change)
    // Don't use apiPaginationMeta.per_page here because it's from the previous request
    // and causes the select to flicker when user changes it
    return internalPerPage.value;
});

// ============================================
// Client-Side Mode: Pagination (requires effectivePerPage)
// ============================================

// Client-side paginated items (final output)
const clientSidePaginatedItems = computed<T[]>(() => {
    if (!isClientSideMode.value) return [];

    const perPage = effectivePerPage.value;
    const start = (clientSideCurrentPage.value - 1) * perPage;
    const end = start + perPage;

    return clientSideSortedItems.value.slice(start, end);
});

// Client-side pagination metadata
const clientSidePagination = computed<PaginationData>(() => {
    const total = clientSideFilteredItems.value.length;
    const totalUnfiltered = props.items?.length || 0;
    const perPage = effectivePerPage.value;
    const currentPage = clientSideCurrentPage.value;
    const lastPage = Math.max(1, Math.ceil(total / perPage));

    // Ensure current page is valid
    const validPage = Math.min(Math.max(1, currentPage), lastPage);

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
    const total = isInertiaMode.value
        ? props.pagination?.total || 0
        : apiPaginationMeta.value?.total || 0;

    return total >= smallestOption;
});

// Detect which fields need server filter values
const fieldsNeedingFilterValues = computed(() => {
    return props.fields
        .filter(field => field.filter === 'select' && (!field.filterOptions || field.filterOptions.length === 0))
        .map(field => field.key);
});

// Error state for API mode
const apiError = ref<string | null>(null);

// Internal provider function when apiUrl is provided
const internalProvider: BTableProvider<T> = async (context: Readonly<BTableProviderContext>) => {
    if (!props.apiUrl) return [];

    try {
        // Clear previous error
        apiError.value = null;

        const sort = context.sortBy && context.sortBy.length > 0
            ? context.sortBy[0]
            : { key: 'created_at', order: 'desc' };

        // Build request parameters
        const params: any = {
            page: context.currentPage,
            perPage: effectivePerPage.value,
            sortBy: sort.key,
            sortOrder: sort.order || 'desc',
            filters: effectiveFilters.value,
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
    } catch (error: any) {
        console.error('Failed to fetch data from API:', error);

        // Surface error to user
        const errorMessage = error?.response?.data?.message
            || error?.message
            || 'Failed to load data. Please try again.';
        apiError.value = errorMessage;

        return [];
    }
};

// Computed effective provider (use external if provided, otherwise internal)
const effectiveProvider = computed(() => props.provider || (props.apiUrl ? internalProvider : undefined));

const handlePageChange = (page: number) => {
    // If inertiaUrl provided, handle navigation automatically
    if (hasInertiaUrl.value && isInertiaMode.value && router) {
        const currentSort = effectiveSortBy.value[0] || { key: 'created_at', order: 'desc' };
        router.get(
            props.inertiaUrl!,
            {
                page,
                sortBy: currentSort.key,
                sortOrder: currentSort.order,
                filters: effectiveFilters.value,
                perPage: effectivePerPage.value,
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

    // Update internal state if not using external sortBy
    if (props.sortBy === undefined) {
        internalSortBy.value = normalizedSortBy;
    }

    // Emit v-model update with normalized value
    emit('update:sortBy', normalizedSortBy);

    // Handle Inertia navigation automatically if URL provided
    if (hasInertiaUrl.value && isInertiaMode.value && router) {
        // Build params based on whether sort is active
        const params: any = {
            page: props.pagination?.current_page || 1,
            filters: effectiveFilters.value,
            perPage: effectivePerPage.value,
        };

        // Add sort params only if sorting is active
        if (normalizedSortBy && normalizedSortBy.length > 0 && normalizedSortBy[0].key) {
            params.sortBy = normalizedSortBy[0].key;
            params.sortOrder = normalizedSortBy[0].order || 'asc';
        }

        router.get(props.inertiaUrl!, params, { preserveState: true });
    }

    // Emit simplified sortChange event for backward compatibility
    if (isInertiaMode.value && normalizedSortBy && normalizedSortBy.length > 0 && normalizedSortBy[0].key) {
        emit('sortChange', {
            key: normalizedSortBy[0].key,
            order: normalizedSortBy[0].order || 'asc'
        });
    }
};

const handleBusyChange = (busy: boolean) => {
    emit('update:busy', busy);
};

// Debounce timer for filter changes
let filterDebounceTimer: ReturnType<typeof setTimeout> | null = null;

const handlePerPageChange = (newPerPage: number | string) => {
    const perPageNum = typeof newPerPage === 'string' ? parseInt(newPerPage, 10) : newPerPage;

    // Update internal state if not using external perPage
    if (props.perPage === undefined) {
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
        const currentSort = effectiveSortBy.value[0] || { key: 'created_at', order: 'desc' };
        router.get(
            props.inertiaUrl!,
            {
                page: 1, // Reset to first page when changing perPage
                sortBy: currentSort.key,
                sortOrder: currentSort.order,
                filters: effectiveFilters.value,
                perPage: perPageNum,
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

    // Update internal state if not using external filters
    if (props.filters === undefined) {
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
            const currentSort = effectiveSortBy.value[0] || { key: 'created_at', order: 'desc' };
            router.get(
                props.inertiaUrl!,
                {
                    page: 1, // Reset to first page when filtering
                    sortBy: currentSort.key,
                    sortOrder: currentSort.order,
                    filters: newFilters,
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
const selectedItem = ref<T | null>(null);
const editForm = ref<any>(null);
const activeTabIndex = ref(0);

// Toast (may not be available in test environment)
let createToast: ((obj: any) => any) | undefined;
try {
    const toast = useToast();
    createToast = toast.create;
} catch (e) {
    // BApp not available (test environment or missing setup)
    createToast = undefined;
}

// Computed: Visible tabs (respects when condition)
const visibleTabs = computed(() => {
    if (!props.editTabs || props.editTabs.length === 0) return [];

    return props.editTabs.filter(tab => {
        if (tab.when === undefined) return true;
        return typeof tab.when === 'function'
            ? tab.when(selectedItem.value)
            : tab.when;
    });
});

// Helper: Get field by key
const getField = (key: string) => {
    return props.editFields?.find(f => f.key === key) || { key };
};

// Computed: Singular and plural item names
const singularItemName = computed(() => props.itemName);
const pluralItemName = computed(() => pluralize(props.itemName));

// Computed: Modal title (supports function)
const computedModalTitle = computed(() => {
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
    // Always emit rowClicked for custom handling
    emit('rowClicked', item, index, event);

    // If editFields provided, open edit modal
    if (props.editFields && props.editFields.length > 0) {
        // Set selected item FIRST before any rendering
        selectedItem.value = item;

        // Reset to first tab
        activeTabIndex.value = 0;

        // Initialize form with item data
        if (!editForm.value) {
            // Dynamically import useForm to avoid circular dependency
            import('../../composables/useForm').then(({ useForm }) => {
                const formData: Record<string, any> = {};
                props.editFields!.forEach(field => {
                    formData[field.key] = (item as any)[field.key] ?? field.default ?? '';
                });
                editForm.value = useForm(formData);

                // Open modal
                showEditModal.value = true;
            });
        } else {
            // Update existing form
            props.editFields.forEach(field => {
                editForm.value.data[field.key] = (item as any)[field.key] ?? field.default ?? '';
            });
            editForm.value.clearErrors();

            // Open modal
            showEditModal.value = true;
        }
    }
};

// Handle save from edit modal
const handleEditSave = async () => {
    if (!editForm.value || !selectedItem.value) return;

    try {
        // If editUrl provided, handle API call internally
        if (props.editUrl) {
            const itemId = (selectedItem.value as any).id;
            const url = props.editUrl.replace(':id', itemId);

            await editForm.value.put(url, {
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

                    // Switch to tab containing error field
                    if (props.editTabs && props.editTabs.length > 0) {
                        const errorKeys = Object.keys(errors);
                        const tabIndex = visibleTabs.value.findIndex(tab =>
                            tab.fieldKeys.some(key => errorKeys.includes(key))
                        );
                        if (tabIndex !== -1) {
                            activeTabIndex.value = tabIndex;
                        }
                    }

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
    activeTabIndex.value = 0; // Reset tab for next time
    if (editForm.value) {
        editForm.value.clearErrors();
    }
};

// Handle delete from edit modal
const handleDelete = async () => {
    if (!editForm.value || !selectedItem.value || !props.deleteUrl) return;

    // Confirm deletion
    const itemName = (selectedItem.value as any).name || (selectedItem.value as any).title || singularItemName.value;
    const confirmed = window.confirm(`Are you sure you want to delete "${itemName}"? This action cannot be undone.`);

    if (!confirmed) return;

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
    }
};

defineExpose({
    refresh,
});
</script>

<style scoped>
/* Add pointer cursor to table rows when editFields is enabled */
:deep(tbody tr) {
    cursor: v-bind('editFields && editFields.length > 0 ? "pointer" : "default"');
}

:deep(tbody tr:hover) {
    background-color: v-bind('editFields && editFields.length > 0 ? "var(--bs-table-hover-bg)" : "inherit"');
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
