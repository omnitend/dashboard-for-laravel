<!--
  @component
  Internal pagination + per-page footer for `DXTable`. Renders the pager, the
  per-page selector, and the "X to Y out of Z items" info line (with the
  "Filtered from N" note when a column filter is active).

  Extracted because `DXTable` used to carry three byte-identical copies of this
  footer — one per data mode (client-side / inertia / provider) — that differed
  only in which `PaginationData` object and page-change handler they used, so
  every footer fix had to be written three times (#123). `DXTable` now derives
  the active pagination + handler and renders this once.

  It owns its own `:deep(.pagination …)` styling (rather than leaving it in
  `DXTable`), because a scoped `:deep()` in `DXTable` would not reach the pager
  once it lives in a child component — the scope-id doesn't cross the boundary.
  Anchoring the rules on this component's own `.dx-table-pagination` root (a
  plain element it owns) gives the scope-id a deterministic host.
-->
<template>
    <div class="dx-table-pagination mt-3">
        <!-- Top row: Pagination and Per-page selector -->
        <div class="d-flex justify-content-between align-items-center mb-2">
            <!-- Pagination controls (only when multiple pages) -->
            <DPagination
                v-if="showPagination && pagination.total > pagination.per_page"
                :model-value="pagination.current_page"
                :total-rows="pagination.total"
                :per-page="pagination.per_page"
                size="sm"
                @update:model-value="emit('page-change', $event as number)"
            />
            <div v-else></div>

            <!-- Per-page selector -->
            <div v-if="showPerPageSelector" class="d-flex align-items-center gap-2">
                <label for="perPageSelect" class="mb-0 small text-muted">Per page</label>
                <DFormSelect
                    id="perPageSelect"
                    :model-value="perPage"
                    :options="perPageOptions.map(n => ({ value: n, text: n.toString() }))"
                    size="sm"
                    style="width: 85px;"
                    @update:model-value="emit('per-page-change', $event)"
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
</template>

<script setup lang="ts">
import DPagination from "../base/DPagination.vue";
import DFormSelect from "../base/DFormSelect.vue";
import type { PaginationData } from "./DXTable.vue";

interface Props {
    /** The active pagination metadata (client-side / inertia / provider). */
    pagination: PaginationData;
    /** The effective page size, shown in the selector. */
    perPage: number;
    /** Page sizes offered by the selector. */
    perPageOptions: number[];
    /** Whether to render the pager (still hidden when there is only one page). */
    showPagination: boolean;
    /** Whether to render the per-page selector. */
    showPerPageSelector: boolean;
    /** Singular item noun for the info line (e.g. "product"). */
    singularItemName: string;
    /** Plural item noun for the info line (e.g. "products"). */
    pluralItemName: string;
    /** Whether a column filter is active — gates the "Filtered from N" note. */
    hasActiveFilters: boolean;
}

defineProps<Props>();

const emit = defineEmits<{
    /** The user picked a page. Payload is the new 1-based page number. */
    'page-change': [page: number];
    /**
     * The per-page selector changed. Payload is the raw DFormSelect model value
     * (the parent's `handlePerPageChange` narrows it — DFormSelect mirrors BVN's
     * model, which can be a scalar, null, or array).
     */
    'per-page-change': [value: number | string | null | (number | string)[]];
}>();
</script>

<style scoped>
/* Pagination button sizing to match form controls. Anchored on this component's
   own `.dx-table-pagination` root so the scope-id has a plain-element host — a
   `:deep()` rule that targeted the pager from DXTable would not reach it once
   the pager lives here (the scope-id doesn't cross the component boundary). */
.dx-table-pagination :deep(.pagination) {
    margin-bottom: 0;
}

.dx-table-pagination :deep(.pagination-sm .page-link) {
    min-width: 2.25rem;
    height: auto;
}

/* Make disabled pagination buttons more subtle */
.dx-table-pagination :deep(.pagination .page-item.disabled .page-link) {
    background-color: transparent;
    border-color: transparent;
    opacity: 0.3;
}
</style>
