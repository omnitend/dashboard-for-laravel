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
        <div class="dx-pager-row d-flex justify-content-between align-items-center gap-2 mb-2">
            <!-- Windowed pager (#155): «Previous / leading / … / window / … /
                 trailing / Next». Client-computed from current + last page, so it
                 works in every DXTable mode. Only shown when >1 page. -->
            <nav
                v-if="showPagination && pagination.total > pagination.per_page"
                class="dx-pager d-flex flex-wrap align-items-center gap-1"
                aria-label="Pagination"
            >
                <DButton
                    variant="outline-secondary"
                    size="sm"
                    :disabled="!canPrev"
                    @click="goToPage(currentPage - 1)"
                >&laquo; Previous</DButton>

                <template v-for="(item, index) in pageItems" :key="item.type === 'page' ? `p${item.page}` : `e${index}`">
                    <DButton
                        v-if="item.type === 'page'"
                        size="sm"
                        :variant="item.active ? 'primary' : 'outline-secondary'"
                        :aria-current="item.active ? 'page' : undefined"
                        @click="goToPage(item.page)"
                    >{{ item.page }}</DButton>
                    <span v-else class="dx-pager-ellipsis" aria-hidden="true">&hellip;</span>
                </template>

                <DButton
                    variant="outline-secondary"
                    size="sm"
                    :disabled="!canNext"
                    @click="goToPage(currentPage + 1)"
                >Next &raquo;</DButton>
            </nav>
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

        <!-- Bottom row: Info text (the item-count caption). Suppressed by
             `showCount` independent of the pager (#127). -->
        <div v-if="showCount" class="small text-muted">
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
import { computed } from "vue";
import DButton from "../base/DButton.vue";
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
    /** Whether to render the item-count caption (the "X out of Z items" line). */
    showCount: boolean;
    /** Singular item noun for the info line (e.g. "product"). */
    singularItemName: string;
    /** Plural item noun for the info line (e.g. "products"). */
    pluralItemName: string;
    /** Whether a column filter is active — gates the "Filtered from N" note. */
    hasActiveFilters: boolean;
}

const props = defineProps<Props>();

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

// Windowed pager (#155). Always show the first/last BOUNDARY pages and a window
// of AROUND pages each side of the current page; fill gaps with an ellipsis,
// except a single-page gap which shows the page itself (an ellipsis hiding one
// page is silly). Client-computed from current + last page so it works in every
// DXTable mode (provider / client-side / inertia) — not just where a server
// `links` array exists. Reproduces custard's `1 2 … 8 9 10 [11] 12 13 14 … 44 45`.
const BOUNDARY = 2;
const AROUND = 3;

type PageItem = { type: "page"; page: number; active: boolean } | { type: "ellipsis" };

const currentPage = computed(() => props.pagination.current_page);
const lastPage = computed(() =>
  Math.max(1, Math.ceil(props.pagination.total / props.pagination.per_page)),
);

const pageItems = computed<PageItem[]>(() => {
  const last = lastPage.value;
  const current = currentPage.value;

  const shown = new Set<number>();
  // Leading + trailing boundary pages (1,2 … last-1,last).
  for (let page = 1; page <= Math.min(BOUNDARY, last); page += 1) shown.add(page);
  for (let page = Math.max(1, last - BOUNDARY + 1); page <= last; page += 1) shown.add(page);
  // A window around the current page. When it clamps at an edge, push the other
  // edge out by the shortfall so the row stays a full width near the start/end
  // (a fuller run of numbers, like the house pager) instead of going sparse.
  let windowLow = current - AROUND;
  let windowHigh = current + AROUND;
  const shortfall = 2 * AROUND + 1 - (Math.min(last, windowHigh) - Math.max(1, windowLow) + 1);
  if (shortfall > 0 && windowLow < 1) windowHigh += shortfall;
  else if (shortfall > 0 && windowHigh > last) windowLow -= shortfall;
  for (let page = Math.max(1, windowLow); page <= Math.min(last, windowHigh); page += 1) {
    shown.add(page);
  }

  const sorted = [...shown].sort((a, b) => a - b);
  const items: PageItem[] = [];
  let previous = 0;
  for (const page of sorted) {
    if (page - previous === 2) {
      // Exactly one page missing — show it rather than an ellipsis.
      items.push({ type: "page", page: previous + 1, active: previous + 1 === current });
    } else if (page - previous > 2) {
      items.push({ type: "ellipsis" });
    }
    items.push({ type: "page", page, active: page === current });
    previous = page;
  }
  return items;
});

const canPrev = computed(() => currentPage.value > 1);
const canNext = computed(() => currentPage.value < lastPage.value);

const goToPage = (page: number) => {
  if (page < 1 || page > lastPage.value || page === currentPage.value) return;
  emit("page-change", page);
};
</script>

<style scoped>
/*
  In `DXTable`'s card mode the card is rendered `no-body` so the table can sit
  flush against the card border, which makes this footer a direct child of
  `.card` — it no longer inherits any `.card-body` padding. Re-instate the inset
  the card body used to give it, so the pager lines up with the padded card
  header above it and keeps a bottom margin inside the (clipped) card.

  Top padding is deliberately 0: the `mt-3` on the root already separates the
  footer from the table above. `.dx-table-card` is DXTableShell's element and
  needs no scope id — a scoped selector only stamps its LAST compound selector,
  which here is this component's own root.
*/
.dx-table-card > .dx-table-pagination {
    padding: 0 var(--bs-card-spacer-x) var(--bs-card-spacer-y);
}

/* Windowed pager (#155). The buttons are DButtons; give the numbered ones a
   consistent min-width so they read as an even row of keys (like the house
   custard pager), and let the whole row wrap on narrow widths rather than
   overflow. `:deep(.btn)` is anchored on the plain `.dx-pager` host, so the
   scope-id has a deterministic element to attach to. */
.dx-pager :deep(.btn) {
    min-width: 2.5rem;
}

/* Previous / Next carry text, so they shouldn't be forced square. */
.dx-pager :deep(.btn):first-child,
.dx-pager :deep(.btn):last-child {
    min-width: auto;
}

.dx-pager-ellipsis {
    display: inline-flex;
    align-items: flex-end;
    padding: 0 0.15rem;
    color: var(--bs-secondary-color);
    user-select: none;
}

/* On narrow screens the row can get long; allow it to scroll horizontally as a
   fallback so it never blows out the table width. */
.dx-pager-row {
    flex-wrap: wrap;
}
</style>
