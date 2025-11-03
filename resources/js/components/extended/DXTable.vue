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
                        :per-page="perPage"
                        :multisort="false"
                        :striped="striped"
                        :hover="hover"
                        :responsive="responsive"
                        :busy="busy"
                        @update:sort-by="handleSortChange"
                        @update:busy="handleBusyChange"
                    >
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
                    >
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

                    <!-- Pagination (Inertia mode only) -->
                    <div
                        v-if="isInertiaMode && showPagination && pagination && pagination.total > pagination.per_page"
                        class="d-flex justify-content-between align-items-center mt-3"
                    >
                        <div class="text-muted">
                            Showing {{ pagination.from }} to {{ pagination.to }} of
                            {{ pagination.total }} entries
                        </div>
                        <DPagination
                            :model-value="pagination.current_page"
                            :total-rows="pagination.total"
                            :per-page="pagination.per_page"
                            @update:model-value="handlePageChange"
                        />
                    </div>
                </DCard>
            </DCol>
        </DRow>
    </DContainer>
</template>

<script setup lang="ts" generic="T = any">
import { computed, ref } from "vue";
import { router } from "@inertiajs/vue3";
import axios from "axios";
import DContainer from "../base/DContainer.vue";
import DRow from "../base/DRow.vue";
import DCol from "../base/DCol.vue";
import DCard from "../base/DCard.vue";
import DSpinner from "../base/DSpinner.vue";
import DTable from "../base/DTable.vue";
import DPagination from "../base/DPagination.vue";
export interface TableField {
    key: string;
    label?: string;
    sortable?: boolean;
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

    /** Current page (for provider mode) */
    currentPage?: number;

    /** Items per page (for provider mode) */
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
}

const props = withDefaults(defineProps<Props<T>>(), {
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
    currentPage: 1,
    perPage: 10,
    striped: true,
    hover: true,
    responsive: true,
    fluid: false,
    containerClass: "py-5",
    columnSize: "12",
});

const emit = defineEmits<{
    pageChange: [page: number];
    sortChange: [sort: { key: string; order: 'asc' | 'desc' }];
    'update:sortBy': [sortBy: BTableSortBy[]];
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

// Internal provider function when apiUrl is provided
const internalProvider: BTableProvider<T> = async (context: Readonly<BTableProviderContext>) => {
    if (!props.apiUrl) return [];

    try {
        const sort = context.sortBy && context.sortBy.length > 0
            ? context.sortBy[0]
            : { key: 'created_at', order: 'desc' };

        const response = await axios.get(props.apiUrl, {
            params: {
                page: context.currentPage,
                perPage: context.perPage,
                sortBy: sort.key,
                sortOrder: sort.order || 'desc',
            },
        });

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
            },
            { preserveState: true }
        );
    }

    // Always emit event for backward compatibility
    emit("pageChange", page);
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

// Reference to the DTable component (for exposing refresh method)
const tableRef = ref<InstanceType<typeof DTable> | null>(null);

// Expose refresh method for provider mode
const refresh = () => {
    if (tableRef.value && typeof (tableRef.value as any).refresh === 'function') {
        (tableRef.value as any).refresh();
    }
};

defineExpose({
    refresh,
});
</script>
