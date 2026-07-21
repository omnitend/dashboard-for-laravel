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

  In a row too narrow for the full windowed pager, the number strip collapses to
  a "current / last" status with Previous/Next either side (#162). The decision
  is CONTAINER-driven, not viewport-driven — see `compactThreshold`.
-->
<template>
    <div class="dx-table-pagination mt-3">
        <!-- Top row: Pagination and Per-page selector.
             `containerRef` measures THIS row (the space the pager actually
             competes for with the per-page selector) rather than the window —
             a table narrowed by a sidebar or a modal is cramped even on a wide
             viewport, which no media query can see. See `useContainerWidth`. -->
        <div
            ref="containerRef"
            class="dx-pager-row d-flex justify-content-between align-items-center gap-2 mb-2"
        >
            <!-- Windowed pager (#155): «Previous / leading / … / window / … /
                 trailing / Next». Client-computed from current + last page, so it
                 works in every DXTable mode. Only shown when >1 page.
                 In a row too narrow to lay the whole thing out, the number
                 window collapses to a "current / last" status (#162) — see
                 `isCompact`. -->
            <nav
                v-if="showPagination && pagination.total > pagination.per_page"
                class="dx-pager d-flex flex-wrap align-items-center gap-1"
                :class="{ 'dx-pager--compact': isCompact }"
                aria-label="Pagination"
            >
                <DButton
                    variant="outline-secondary"
                    size="sm"
                    :disabled="!canPrev"
                    @click="goToPage(currentPage - 1)"
                >&laquo; Previous</DButton>

                <!-- Compact: one status in place of the whole number window.
                     With no page buttons there is no `aria-current` to carry
                     "you are here", so the position becomes a live `status`
                     region — it is announced when paging changes it, which the
                     numbered pager achieved through focus moving to the newly
                     active button. The terse "11 / 45" is for the eye only
                     (a screen reader would say "eleven slash forty-five"); the
                     announced text is the visually-hidden long form. -->
                <span
                    v-if="isCompact"
                    class="dx-pager-status small"
                    role="status"
                    aria-live="polite"
                >
                    <span class="visually-hidden">Page {{ currentPage }} of {{ lastPage }}</span>
                    <span aria-hidden="true">{{ currentPage }} / {{ lastPage }}</span>
                </span>

                <template
                    v-for="(item, index) in visiblePageItems"
                    :key="item.type === 'page' ? `p${item.page}` : `e${index}`"
                >
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
import { useContainerWidth } from "../../composables/useContainerWidth";
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

    /**
     * Upper bound (px) on the pager ROW width at which the number window may
     * collapse to the compact "current / last" status (#162). At or above it
     * the full windowed pager always renders, whatever the page count.
     *
     * Default **576** — Bootstrap's `sm` breakpoint, i.e. the width the rest of
     * the design system already treats as phone-sized. Its job is to GUARANTEE
     * that a desktop-width table is never quietly downgraded: a 45-page window
     * that doesn't quite fit at 800px should wrap (today's behaviour), not lose
     * its numbers.
     *
     * Below it, compact engages only when the full pager genuinely would not
     * fit on one line (see `fullPagerWidth`) — so a three-page pager still
     * shows `1 2 3` on a phone, where "2 / 3" would be strictly worse.
     *
     * Measured on the ROW, not the viewport, so a table squeezed by a sidebar
     * or inside a modal collapses even though the window is wide.
     */
    compactThreshold?: number;
}

const props = withDefaults(defineProps<Props>(), {
    compactThreshold: 576,
});

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
// `links` array exists. Reproduces the house style: `1 2 … 8 9 10 [11] 12 13 14 … 44 45`.
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

// Compact pager (#162). Container-driven, not viewport-driven — see the
// `compactThreshold` prop.
//
// Approximate intrinsic widths of the pager's parts, in rem, mirroring this
// component's own CSS and button labels: a page key is `min-width: 2.5rem`, the
// row is `gap-1` (0.25rem), the ellipsis is a glyph plus 0.15rem side padding,
// and "« Previous" + "Next »" together come to about 10rem at `.btn-sm`.
// Deliberately an ESTIMATE, not a measurement: being wrong by a few px only
// shifts the collapse by one page key, which is cosmetic — whereas measuring
// the rendered strip would mean measuring the very thing this decision
// removes, i.e. a feedback loop.
const PAGE_KEY_REM = 2.5;
const ITEM_GAP_REM = 0.25;
const ELLIPSIS_REM = 1;
const PREV_NEXT_REM = 10;

/** px per rem, so a consumer scaling the root font size is tracked. */
function rootFontSizePx(): number {
  // Only ever reached in a browser (see `isCompact`), but stay SSR-safe.
  if (typeof document === "undefined") return 16;
  const size = Number.parseFloat(
    getComputedStyle(document.documentElement).fontSize,
  );
  return Number.isFinite(size) && size > 0 ? size : 16;
}

/** Width the row needs to lay the full windowed pager out on ONE line. */
const fullPagerWidth = computed(() => {
  const remPx = rootFontSizePx();
  let widthRem = PREV_NEXT_REM;
  for (const item of pageItems.value) {
    widthRem +=
      (item.type === "page" ? PAGE_KEY_REM : ELLIPSIS_REM) + ITEM_GAP_REM;
  }
  return widthRem * remPx;
});

const { containerRef, hasMeasured, isBelow } = useContainerWidth({
  // Compact means "narrower than the breakpoint AND too narrow for the full
  // pager", which is exactly `width < min(threshold, needed)` — expressing it
  // as one threshold rather than two conditions keeps the hysteresis below
  // applied to the WHOLE decision instead of just half of it. A getter, so
  // both a reactive `compactThreshold` and a changing page count re-evaluate
  // instead of latching the mount-time value.
  threshold: () => Math.min(props.compactThreshold, fullPagerWidth.value),
  // The compact row is SHORTER than the wrapped full pager, so an ancestor with
  // `overflow:auto` can lose its vertical scrollbar when we collapse, widening
  // this row by ~15-17px, back over the threshold, and it flips forever. A band
  // wider than any scrollbar makes the crossing one-way.
  hysteresis: 24,
});

/**
 * Gated on `hasMeasured` so an UNMEASURED render (the first frame, and every
 * SSR render, where there is no `ResizeObserver`) is byte-identical to the
 * pre-#162 full pager. `initialWidth` defaults to 0, i.e. "assume narrowest",
 * which would otherwise make every desktop render start compact and flip.
 */
const isCompact = computed(() => hasMeasured.value && isBelow.value);

/** Empty in compact mode — the status replaces the whole number window. */
const visiblePageItems = computed<PageItem[]>(() =>
  isCompact.value ? [] : pageItems.value,
);

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
   consistent min-width so they read as an even row of keys (the house pager
   style), and let the whole row wrap on narrow widths rather than
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

/* Compact pager status (#162): "11 / 45" standing in for the number window.
   A plain element this component owns, so it needs no `:deep()`. It is not a
   button — deliberately, since there is nothing to click — so it is styled to
   read as a label rather than a disabled key. */
.dx-pager--compact .dx-pager-status {
    padding: 0 0.35rem;
    color: var(--bs-secondary-color);
    white-space: nowrap;
    user-select: none;
}

/* Nothing can wrap in compact mode — the row is three items wide by design, and
   a wrap here would defeat the whole point of collapsing it. */
.dx-pager--compact {
    flex-wrap: nowrap;
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
