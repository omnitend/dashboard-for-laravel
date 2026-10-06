<template>
    <!--
      The wrapper is what gets measured, never the table: a table that is
      overflowing is WIDER than the space it has, so measuring it would never
      report "too narrow". The wrapper is also a horizontal scroll container
      (like Bootstrap's `.table-responsive`, which it replaces), which makes its
      own width the available width even inside a flex row.
    -->
    <div
        ref="containerRef"
        class="dx-stacking-table"
        :class="{ 'dx-stacking-table--stacked': isStacked }"
    >
        <!--
          @slot The consumer's own `<table>`, as the wrapper's direct child.
          Receives `stacked` for the rare markup that must differ per layout.
        -->
        <slot :stacked="isStacked" />
    </div>
</template>

<script setup lang="ts">
/**
 * DXStackingTable — a hand-built `<table>` that turns into one card per body
 * row when the space it has (not the window) falls below `stackBelow`.
 *
 * Built for editable tables inside forms and modals (an order's lines: name,
 * price input, quantity input, total), where inputs run off a phone's edge. The
 * consumer keeps writing ordinary table markup; this wrapper measures itself
 * with `useContainerWidth`, toggles `.dx-stacking-table--stacked`, and gives
 * every body and footer cell its column's header text as a label (written to
 * `data-dx-stack-label`, shown by theme.scss as the cell's `::before`). The
 * stacked styling is global theme CSS, because slot content cannot see a
 * component's scoped styles.
 *
 * Per-cell controls (all inert in the wide layout):
 * - `data-label="…"` on a `th` or a cell overrides the derived label.
 * - `.dx-stack-span` on a cell: no label, full card width (a card title).
 *   Cells spanning several columns (`colspan`) get no label and span anyway.
 * - `.dx-stack-hide` on a cell: not shown when stacked. Empty cells with no
 *   label (a footer's `&nbsp;` filler) are hidden automatically.
 * - `.dx-stack-continue` on a `tr`: joins the previous row's card (a note row
 *   under a line) instead of starting a new one.
 */
import { computed, onBeforeUnmount, onMounted } from "vue";
import { useContainerWidth } from "../../composables/useContainerWidth";

interface Props {
    /**
     * Stack when the wrapper's content width is below this many px. 576 is
     * Bootstrap's `sm` breakpoint, but measured on the container.
     */
    stackBelow?: number;
}

const props = withDefaults(defineProps<Props>(), {
    stackBelow: 576,
});

/** Attribute the derived label is written to (so a consumer `data-label` is never overwritten). */
const DERIVED_LABEL_ATTRIBUTE = "data-dx-stack-label";
/** Marks an empty cell that has no label, which the stacked layout hides. */
const EMPTY_CELL_ATTRIBUTE = "data-dx-stack-empty";
/** Header content that is not the column's visible name. */
const HIDDEN_HEADER_CONTENT =
    '.visually-hidden, .visually-hidden-focusable, [aria-hidden="true"]';

const { containerRef, isBelow } = useContainerWidth({
    threshold: () => props.stackBelow,
    // Same band as DXForm's auto layout, for the same reason: the stacked
    // layout is TALLER, so inside an `overflow:auto` ancestor it can add a
    // scrollbar and change its own container's width at the boundary. 24px is
    // wider than any scrollbar, so a crossing holds until the space genuinely
    // changes.
    hysteresis: 24,
});

/**
 * Stacked until measured, like DXForm's `layout="auto"` (which renders its
 * vertical layout before the first measurement and under SSR): a stacked table
 * is legible at any width, a wide one guessed wrongly overflows. In a browser
 * the first ResizeObserver delivery lands before the first paint, so a wide
 * container does not visibly flash the cards.
 */
const isStacked = computed<boolean>(() => isBelow.value);

/** The column's visible name: `data-label`, else its text minus hidden helpers. */
function headerCellLabel(headerCell: HTMLTableCellElement): string {
    const explicitLabel = headerCell.getAttribute("data-label");
    if (explicitLabel !== null) return explicitLabel.trim();

    let text = "";
    const walker = document.createTreeWalker(headerCell, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node !== null) {
        // Only hiding INSIDE the header cell counts; an ancestor of the whole
        // table being aria-hidden says nothing about this column's name.
        const hiddenWrapper =
            node.parentElement?.closest(HIDDEN_HEADER_CONTENT) ?? null;
        const isHidden =
            hiddenWrapper !== null &&
            hiddenWrapper !== headerCell &&
            headerCell.contains(hiddenWrapper);
        if (!isHidden) text += ` ${node.textContent ?? ""}`;
        node = walker.nextNode();
    }
    return text.replace(/\s+/g, " ").trim();
}

/**
 * The first column of every cell in a row group, accounting for cells from
 * earlier rows that reach down into a row (`rowspan`) as well as `colspan`:
 * the table's own grid, not each row's cell index.
 */
function cellStartColumns(
    rows: HTMLCollectionOf<HTMLTableRowElement>,
): Map<HTMLTableCellElement, number> {
    const startColumns = new Map<HTMLTableCellElement, number>();
    /** Columns taken in each row by a cell starting in an earlier row. */
    const occupiedByRow: Array<Set<number>> = Array.from(
        { length: rows.length },
        () => new Set<number>(),
    );
    Array.from(rows).forEach((row, rowIndex) => {
        const occupied = occupiedByRow[rowIndex];
        let column = 0;
        for (const cell of Array.from(row.cells)) {
            while (occupied.has(column)) column++;
            startColumns.set(cell, column);
            // rowspan="0" reaches to the end of the row group.
            const rowSpan =
                cell.rowSpan === 0 ? rows.length - rowIndex : cell.rowSpan;
            const lastRow = Math.min(rowIndex + rowSpan, rows.length);
            for (let spannedRow = rowIndex; spannedRow < lastRow; spannedRow++) {
                for (let offset = 0; offset < cell.colSpan; offset++) {
                    occupiedByRow[spannedRow].add(column + offset);
                }
            }
            column += cell.colSpan;
        }
    });
    return startColumns;
}

/**
 * One label per column: the LOWEST header cell over it, so a group heading
 * ("Pricing" over Price and Quantity) gives way to the names beneath it, and a
 * heading spanning every header row ("Product") names its own column.
 */
function columnLabels(table: HTMLTableElement): string[] {
    const headerRows = table.tHead?.rows;
    if (headerRows === undefined || headerRows.length === 0) return [];
    const labels: string[] = [];
    // Row order, so a lower row's cell overwrites the group heading above it.
    for (const [headerCell, startColumn] of cellStartColumns(headerRows)) {
        const label = headerCellLabel(headerCell);
        for (let offset = 0; offset < headerCell.colSpan; offset++) {
            labels[startColumn + offset] = label;
        }
    }
    return labels;
}

function setAttributeIfChanged(
    element: Element,
    name: string,
    value: string | null,
): void {
    if (value === null) {
        if (element.hasAttribute(name)) element.removeAttribute(name);
        return;
    }
    if (element.getAttribute(name) !== value) element.setAttribute(name, value);
}

function isBlank(cell: HTMLTableCellElement): boolean {
    // `trim()` also strips the `&nbsp;` a footer filler cell usually holds.
    return (
        cell.children.length === 0 && (cell.textContent ?? "").trim() === ""
    );
}

/** Label every body and footer cell from its column's header. */
function labelCells(): void {
    const table = containerRef.value?.querySelector<HTMLTableElement>(
        ":scope > table",
    );
    if (table === null || table === undefined) return;

    const labels = columnLabels(table);
    const rowGroups: HTMLTableSectionElement[] = [...Array.from(table.tBodies)];
    if (table.tFoot !== null) rowGroups.push(table.tFoot);

    for (const rowGroup of rowGroups) {
        for (const [cell, startColumn] of cellStartColumns(rowGroup.rows)) {
            // A cell spanning several columns belongs to none of them.
            const derivedLabel =
                cell.colSpan === 1 ? labels[startColumn] ?? "" : "";
            setAttributeIfChanged(
                cell,
                DERIVED_LABEL_ATTRIBUTE,
                derivedLabel === "" ? null : derivedLabel,
            );
            const hasLabel =
                derivedLabel !== "" || cell.hasAttribute("data-label");
            setAttributeIfChanged(
                cell,
                EMPTY_CELL_ATTRIBUTE,
                !hasLabel && isBlank(cell) ? "" : null,
            );
        }
    }
}

// Rows come and go (v-for), and header text can change: relabel on any change
// to the table's structure or text. Only the attributes labelling reads are
// watched, so our own `data-dx-stack-*` writes never re-trigger this.
let mutationObserver: MutationObserver | null = null;

/** Attributes whose change can alter a label or a cell's column. */
const STRUCTURE_ATTRIBUTES = ["data-label", "colspan", "rowspan"];
/**
 * Attributes that hide header helper text (HIDDEN_HEADER_CONTENT). They count
 * only inside a `thead`: a body cell's classes change all the time (a row's
 * state, a validation style) and say nothing about labels.
 */
const HEADER_VISIBILITY_ATTRIBUTES = ["class", "aria-hidden"];

function changesLabels(mutation: MutationRecord): boolean {
    if (mutation.type !== "attributes") return true;
    if (STRUCTURE_ATTRIBUTES.includes(mutation.attributeName ?? "")) return true;
    return (
        mutation.target instanceof Element &&
        mutation.target.closest("thead") !== null
    );
}

onMounted(() => {
    labelCells();
    if (typeof MutationObserver === "undefined" || containerRef.value === null) {
        return;
    }
    mutationObserver = new MutationObserver((mutations) => {
        if (mutations.some(changesLabels)) labelCells();
    });
    mutationObserver.observe(containerRef.value, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: [
            ...STRUCTURE_ATTRIBUTES,
            ...HEADER_VISIBILITY_ATTRIBUTES,
        ],
    });
});

onBeforeUnmount(() => {
    mutationObserver?.disconnect();
    mutationObserver = null;
});

defineExpose({ isStacked });
</script>
