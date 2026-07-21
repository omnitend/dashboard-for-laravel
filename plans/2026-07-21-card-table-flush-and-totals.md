# DXTable — flush card-table + column-header / footer slots

Status: PROPOSED 2026-07-21. Origin: greendragon app-next cutover, `/next/sales`
review (findings SA6 + SA4). Two independent asks on `DXTable`, both about how a
data table sits inside a card and how legacy showed per-column chrome.

---

## Part A — card mode should render the table FLUSH (greendragon B13, SA6)

### Problem

With `:card="true"`, `DXTableShell` renders `<DCard>` with the table in the
default slot, so bootstrap-vue-next's `BCard` wraps it in a **`.card-body`** with
default padding (measured 24px / `--bs-card-spacer`). A striped table's rows then
sit **inset** from the card border, leaving a white gap between the stripes and
the border:

```text
.card                      (radius, border)
└─ .card-body   ← 24px padding  ← the white gap
   └─ .table-responsive  (margin-bottom 16px)
      └─ <table class="table-striped">   ← inset from the card edge
```

Legacy omnitend (and Bootstrap's own "tables in cards" guidance) render the table
**flush**: the `<table>` sits directly against the card edges (rows/stripes reach
the border), while the header/pagination keep their padding.

### Ask

In card mode, render the table flush to the card border while keeping the
title-row (`#header`) and pagination padded. Concretely: use `DCard no-body` and
lay out the header, the `.table-responsive`, and the pagination as siblings —
the table region flush, the chrome padded — and clip the card to its radius so
the flush table's top corners follow the border-radius:

```text
.card (overflow: hidden)
├─ .card-header  (padded)         ← #header slot, when present
├─ .table-responsive             ← FLUSH: no side/top padding
│   └─ <table>
└─ .dx-table-pagination (padded) ← keeps its own padding
```

Bootstrap already rounds a table that is a card's first child; matching that
(header absent → table is first, top corners rounded; header present → header
rounds the top) gives the legacy look with no consumer CSS.

### greendragon interim (retire on adoption)

`ot-sales.vue` scopes, on a wrapper around the table:

```css
.ot-sales__table-card :deep(.card) { overflow: hidden; }
.ot-sales__table-card :deep(.card-body) { padding: 0; }
.ot-sales__table-card :deep(.dx-table-pagination) { padding: 0.75rem 1rem; }
```

---

## Part B — per-column header + footer slots (#99) — **DONE**

Status: both halves shipped. Item 1 (`foot(<key>)` + `footClone`) landed earlier
with #99; item 2 (the additive header-end slot) landed 2026-07-21.

### Problem

`DXTable` draws its own column headers and has **no** per-column header slot and
**no** footer/totals row. Legacy's All Sales report put the **period total in the
Total column's header** (top-right, where the column title would be) AND in a
`foot(total)` row. With neither available, greendragon had to move the total to a
separate summary bar **above** the table — it reads as detached from the column
it totals, and there's nowhere to put a real table footer.

### Ask

1. A **`foot(<colKey>)`** slot (+ a `footClone` / `show-foot` toggle) that renders
   a `<tfoot>` row, so a consumer can put a column total under its column. This is
   the primary need.
   **SHIPPED** with #99 — `foot-clone` plus the forwarded `foot(<key>)` /
   `custom-foot` slots. Docs: DXTable.mdx → "Totals row".
2. Optionally, a way to render **custom content in a column's header** — either a
   `head(<colKey>)` slot, or (nicer for this case) a `headerTotal` / header-end
   affordance so a single value can sit at the top-right of a numeric column
   without losing the built-in sort indicator + field hint that `DXTable` draws
   there. (Only the *value* is needed in the header, not a replacement for the
   whole header — so an additive "header end slot" is preferable to a full
   `head()` override that would drop the sort/hint chrome.)

   **SHIPPED 2026-07-21** as the additive slot **`head-end(<colKey>)`**, scoped
   `{ field, label }`. Chosen over a `headerTotal` prop because a slot carries
   arbitrary content (a formatted total, a badge, a link) without DXTable
   growing a formatting API.

   - Rendered INSIDE DXTable's own `head(<key>)` template, after the label
     block and before the sort indicator — so the value sits at the top-right of
     the title area, the sort arrows stay on the far right, and the position is
     the same whether or not the column is sortable.
   - The wrapper (`.dx-head-end`) is only emitted when the slot exists, so a
     table without one renders exactly as before.
   - The name deliberately avoids the `cell(` / `foot(` prefixes matched by
     `isTableSlot`, so it is neither forwarded to the inner table nor folded
     into `tableSlotSignature` (adding one never remounts the table). Note that
     the *forwarding* half of that is a code-level invariant only — verified by
     experiment that forwarding it would be a silent no-op, since bvn ignores a
     slot name it doesn't know, so no test can go red on it.

   Tests: `tests/components/DXTable-HeaderEndSlot.test.ts` (6 cases). Docs:
   DXTable.mdx → "A value in a column's header (`head-end`)".

### Notes

- These are independent; Part A is higher-value and simpler. Part B's footer is
  the more broadly useful half (any numeric table wants column totals).
- greendragon's `ot-sales` `sumSaleLinesTotal` is computed page-side already, so
  it only needs a *slot to render into*, not aggregate support (that's a separate
  ask — see the select-filter-options spec's B3).
