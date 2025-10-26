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

                    <div v-if="loading" class="text-center py-5">
                        <DSpinner variant="primary" />
                        <p class="mt-2">{{ loadingText }}</p>
                    </div>

                    <div v-else-if="error" class="alert alert-danger">
                        {{ error }}
                    </div>

                    <DTable
                        v-else
                        :items="items"
                        :fields="fields"
                        :striped="striped"
                        :hover="hover"
                        :responsive="responsive"
                        :busy="loading"
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

                    <div
                        v-if="showPagination && pagination.total > pagination.perPage"
                        class="d-flex justify-content-between align-items-center mt-3"
                    >
                        <div class="text-muted">
                            Showing {{ pagination.from }} to {{ pagination.to }} of
                            {{ pagination.total }} entries
                        </div>
                        <DPagination
                            v-model="pagination.currentPage"
                            :total-rows="pagination.total"
                            :per-page="pagination.perPage"
                            @update:model-value="handlePageChange"
                        />
                    </div>
                </DCard>
            </DCol>
        </DRow>
    </DContainer>
</template>

<script setup lang="ts" generic="T = any">
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
    currentPage: number;
    perPage: number;
    total: number;
    from: number;
    to: number;
}

export interface Props<TItem = any> {
    /** Table title */
    title?: string;

    /** Table data items */
    items: TItem[];

    /** Table field definitions */
    fields: TableField[];

    /** Loading state */
    loading?: boolean;

    /** Loading text */
    loadingText?: string;

    /** Error message */
    error?: string | null;

    /** Pagination data */
    pagination?: PaginationData;

    /** Show pagination controls */
    showPagination?: boolean;

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

withDefaults(defineProps<Props<T>>(), {
    loading: false,
    loadingText: "Loading...",
    error: null,
    pagination: () => ({
        currentPage: 1,
        perPage: 15,
        total: 0,
        from: 0,
        to: 0,
    }),
    showPagination: true,
    striped: true,
    hover: true,
    responsive: true,
    fluid: false,
    containerClass: "py-5",
    columnSize: "12",
});

const emit = defineEmits<{
    pageChange: [page: number];
}>();

const handlePageChange = (page: number) => {
    emit("pageChange", page);
};
</script>
