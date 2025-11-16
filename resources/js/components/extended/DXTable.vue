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

                    <div v-else-if="error" class="alert alert-danger">
                        {{ error }}
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
                        v-else
                        :items="items"
                        :fields="fields"
                        :sort-by="effectiveSortBy"
                        :multisort="false"
                        :no-local-sorting="true"
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

                    <!-- Pagination and Controls (Inertia mode) -->
                    <div
                        v-if="isInertiaMode && pagination"
                        class="d-flex justify-content-between align-items-center mt-3"
                    >
                        <div class="d-flex align-items-center gap-2">
                            <!-- Info text -->
                            <span class="text-muted">
                                <template v-if="pagination.total > pagination.per_page">
                                    Showing {{ pagination.from }} to {{ pagination.to }} of {{ pagination.total }} {{ itemName }}
                                </template>
                                <template v-else>
                                    Showing all {{ pagination.total }} {{ itemName }}
                                </template>
                            </span>

                            <!-- Per-page selector (always shown) -->
                            <div v-if="showPerPageSelector" class="d-flex align-items-center gap-2 ms-3">
                                <label for="perPageSelect" class="text-muted mb-0 small">Show:</label>
                                <DFormSelect
                                    id="perPageSelect"
                                    :model-value="effectivePerPage"
                                    :options="perPageOptions.map(n => ({ value: n, text: n.toString() }))"
                                    size="sm"
                                    style="width: 80px;"
                                    @update:model-value="handlePerPageChange"
                                />
                            </div>
                        </div>

                        <!-- Pagination controls (only when multiple pages) -->
                        <DPagination
                            v-if="showPagination && pagination.total > pagination.per_page"
                            :model-value="pagination.current_page"
                            :total-rows="pagination.total"
                            :per-page="pagination.per_page"
                            @update:model-value="handlePageChange"
                        />
                    </div>

                    <!-- Pagination and Controls (API mode) -->
                    <div
                        v-if="isProviderMode && apiPaginationMeta"
                        class="d-flex justify-content-between align-items-center mt-3"
                    >
                        <div class="d-flex align-items-center gap-2">
                            <!-- Info text -->
                            <span class="text-muted">
                                <template v-if="apiPaginationMeta.total > apiPaginationMeta.per_page">
                                    Showing {{ apiPaginationMeta.from }} to {{ apiPaginationMeta.to }} of {{ apiPaginationMeta.total }} {{ itemName }}
                                </template>
                                <template v-else>
                                    Showing all {{ apiPaginationMeta.total }} {{ itemName }}
                                </template>
                            </span>

                            <!-- Per-page selector (always shown) -->
                            <div v-if="showPerPageSelector" class="d-flex align-items-center gap-2 ms-3">
                                <label for="perPageSelectApi" class="text-muted mb-0 small">Show:</label>
                                <DFormSelect
                                    id="perPageSelectApi"
                                    :model-value="effectivePerPage"
                                    :options="perPageOptions.map(n => ({ value: n, text: n.toString() }))"
                                    size="sm"
                                    style="width: 80px;"
                                    @update:model-value="handlePerPageChange"
                                />
                            </div>
                        </div>

                        <!-- Pagination controls (only when multiple pages) -->
                        <DPagination
                            v-if="showPagination && apiPaginationMeta.total > apiPaginationMeta.per_page"
                            :model-value="apiPaginationMeta.current_page"
                            :total-rows="apiPaginationMeta.total"
                            :per-page="apiPaginationMeta.per_page"
                            @update:model-value="handleApiPageChange"
                        />
                    </div>
                </DCard>
            </DCol>
        </DRow>

        <!-- Edit Modal (if editFields provided) -->
        <DModal
            v-if="editFields && editFields.length > 0"
            v-model="showEditModal"
            :title="editModalTitle || `Edit ${itemName.slice(0, -1)}`"
            :size="editModalSize"
        >
            <DXBasicForm
                v-if="editForm"
                :form="editForm"
                :fields="editFields"
                submit-text="Save Changes"
                @submit="handleEditSave"
            />

            <template #footer>
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
            </template>
        </DModal>
    </DContainer>
</template>

<script setup lang="ts" generic="T = any">
import { computed, ref, watch } from "vue";
import { router } from "@inertiajs/vue3";
import axios from "axios";
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

export interface Props<TItem = any> {
    /** Table title */
    title?: string;

    /** Name for items (plural) - used in pagination text (e.g., "products", "customers") */
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

    /** Edit modal title (default: "Edit {itemName}") */
    editModalTitle?: string;

    /** Edit modal size */
    editModalSize?: 'sm' | 'md' | 'lg' | 'xl';

    /** API endpoint pattern for updates (e.g., "/api/products/:id") */
    editUrl?: string;
}

const props = withDefaults(defineProps<Props<T>>(), {
    itemName: "items",
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
    'update:sortBy': [sortBy: BTableSortBy[]];
    'update:filters': [filters: Record<string, string>];
    'update:perPage': [perPage: number];
    'update:busy': [busy: boolean];
}>();

// Mode detection
const isProviderMode = computed(() => !!props.provider || !!props.apiUrl);
const isInertiaMode = computed(() => !props.provider && !props.apiUrl && !!props.items);
const hasInertiaUrl = computed(() => !!props.inertiaUrl);

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

// API mode pagination metadata (extracted from responses)
const apiPaginationMeta = ref<PaginationData | null>(null);

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

// Computed effective perPage (use external if provided, otherwise internal)
const effectivePerPage = computed(() => props.perPage !== undefined ? props.perPage : internalPerPage.value);

// Detect which fields need server filter values
const fieldsNeedingFilterValues = computed(() => {
    return props.fields
        .filter(field => field.filter === 'select' && (!field.filterOptions || field.filterOptions.length === 0))
        .map(field => field.key);
});

// Internal provider function when apiUrl is provided
const internalProvider: BTableProvider<T> = async (context: Readonly<BTableProviderContext>) => {
    if (!props.apiUrl) return [];

    try {
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
    } catch (error) {
        console.error('Failed to fetch data from API:', error);
        return [];
    }
};

// Computed effective provider (use external if provided, otherwise internal)
const effectiveProvider = computed(() => props.provider || (props.apiUrl ? internalProvider : undefined));

const handlePageChange = (page: number) => {
    // If inertiaUrl provided, handle navigation automatically
    if (hasInertiaUrl.value && isInertiaMode.value) {
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
    if (hasInertiaUrl.value && isInertiaMode.value && normalizedSortBy && normalizedSortBy.length > 0 && normalizedSortBy[0].key) {
        router.get(
            props.inertiaUrl!,
            {
                page: props.pagination?.current_page || 1,
                sortBy: normalizedSortBy[0].key,
                sortOrder: normalizedSortBy[0].order || 'asc',
                filters: effectiveFilters.value,
                perPage: effectivePerPage.value,
            },
            { preserveState: true }
        );
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
    if (hasInertiaUrl.value && isInertiaMode.value) {
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

    // Debounce server requests for text inputs
    if (filterDebounceTimer) {
        clearTimeout(filterDebounceTimer);
    }

    filterDebounceTimer = setTimeout(() => {
        // Handle Inertia navigation automatically if URL provided
        if (hasInertiaUrl.value && isInertiaMode.value) {
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
    // Inertia mode: reload current page with existing query params
    else if (isInertiaMode.value && props.inertiaUrl) {
        router.reload({ only: [props.inertiaUrl.split('/').pop() || 'data'] });
    }
};

// Edit Modal State
const showEditModal = ref(false);
const selectedItem = ref<T | null>(null);
const editForm = ref<any>(null);
const toast = useToast();

// Handle row click for editing
const handleRowClick = (item: T, index: number, event: MouseEvent) => {
    // Always emit rowClicked for custom handling
    emit('rowClicked', item, index, event);

    // If editFields provided, open edit modal
    if (props.editFields && props.editFields.length > 0) {
        selectedItem.value = item;

        // Initialize form with item data
        if (!editForm.value) {
            // Dynamically import useForm to avoid circular dependency
            import('../../composables/useForm').then(({ useForm }) => {
                const formData: Record<string, any> = {};
                props.editFields!.forEach(field => {
                    formData[field.key] = (item as any)[field.key] ?? field.default ?? '';
                });
                editForm.value = useForm(formData);
                showEditModal.value = true;
            });
        } else {
            // Update existing form
            props.editFields.forEach(field => {
                editForm.value.data[field.key] = (item as any)[field.key] ?? field.default ?? '';
            });
            editForm.value.clearErrors();
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
                    toast.show?.({
                        props: {
                            title: 'Success',
                            body: `${props.itemName.slice(0, -1)} updated successfully`,
                            variant: 'success',
                        }
                    });

                    emit('rowUpdated', selectedItem.value as T, data);
                    showEditModal.value = false;
                    selectedItem.value = null;

                    // Refresh table data to show updated values
                    refresh();
                },
                onError: (errors: any) => {
                    // Show error toast
                    toast.show?.({
                        props: {
                            title: 'Error',
                            body: 'Failed to update. Please check the form for errors.',
                            variant: 'danger',
                        }
                    });
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
    if (editForm.value) {
        editForm.value.clearErrors();
    }
};

defineExpose({
    refresh,
});
</script>
