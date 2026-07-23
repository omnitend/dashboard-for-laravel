# DXTable — stacked-card mode on narrow containers

Status: PROPOSED 2026-07-23. Origin: the deferred DXTable half of
`plans/2026-07-21-container-responsive-layout.md`. The `useContainerWidth`
primitive it needs shipped in v0.35.0; nothing blocks the build now except the
UX decisions this plan exists to settle.

## Problem

A `<table>` has a minimum sensible width — eight columns don't fit a phone-width
strip. DXTable's only current answer to "container too narrow" is `responsive`,
which wraps the table in a horizontal-scroll container. That works but reads
poorly on mobile: the user scrolls sideways to read one row, loses the row's
identity when the first column scrolls off, and can't scan.

The standard mobile answer is **stacked cards**: below a width threshold, stop
rendering a table and render each row as a small card of `label: value` pairs,
one card per record. The column headers become the labels inside each card.
Legacy hand-rolled exactly this (the consuming app's line-item table → stacked
cards below 576px). This folds it into the library.

```text
Wide (table)                          Narrow (stacked cards)
┌────┬────────┬────────┬────────┐     ┌──────────────────────┐
│ ID │ Name   │ Email  │ Status │     │ Name    Jane Doe     │
├────┼────────┼────────┼────────┤     │ Email   jane@x.com   │
│ 1  │ Jane   │ jane@  │ Active │     │ Status  Active       │
└────┴────────┴────────┴────────┘     └──────────────────────┘
```

## Existing seams this builds on

- **`useContainerWidth`** (`resources/js/composables/useContainerWidth.ts`) —
  `{ containerRef, width, hasMeasured, isBelow, isNarrowerThan, stop }`, with a
  hysteresis band. Attach `containerRef` to **`DXTableShell`'s root**, NOT the
  `<DTable>`: the shell owns the available width; the table can overflow it, so
  measuring the table would measure the wrong thing (per the deferral note).
- **`hasMeasured`** gates first paint: don't render the table, measure, then
  re-render as cards (a visible flash). Hold until width is known.
- **Per-cell slot forwarding** — DXTable already forwards `cell(<key>)` slots to
  the inner table so consumers customise cell rendering. The card render MUST
  drive off the same `fields` + slot machinery, so a consumer's `cell(status)`
  renders identically inside a card row. This is the highest-risk seam: a
  separate card code path that ignores slots silently breaks every custom cell.
- **Row interactivity** — `rowsAreInteractive` / `isRowActionable` /
  `composeRowClass` (`.dx-row-actionable`) / `handleRowClick` (emits `rowClicked`
  and bridges to `editor.openEdit`). A card must be the click target in card
  mode, preserving both.
- **`DXTablePagination`** sits outside the table region and is unaffected.

## Proposed API

- **`stackedBelow?: number`** on DXTable — a container-width threshold in px,
  **off by default** (`undefined` = never stack, byte-identical to today).
  Opt-in because turning a table into cards is a real layout choice, unlike the
  pager's auto-collapse (#162) where collapsing is always an improvement.
- Card mode engages when `hasMeasured && width < stackedBelow` (with the
  composable's hysteresis).

## Decisions to settle (the reason this is a plan, not a ticket)

### D1 — filters in card mode
The filter row IS a table `<tr>` today (the `#thead-top` template). With no table
header there is nowhere for it to live. Options:
- **(a)** Render the filters as a stacked filter bar ABOVE the cards (each column
  filter as a labelled field). Most faithful; more work.
- **(b)** Drop filters in card mode (a narrow phone rarely filters a facet grid).
- **(c)** A single "Filters" disclosure that expands the same controls.
**Recommendation: (a)** for parity, but (b) is a legitimate v1 if filters on a
card list turn out unused — cheaper and shippable first.

### D2 — sort in card mode
No header means no click-to-sort target. Options:
- **(a)** A "Sort by ▾" select above the cards, listing sortable columns × asc/desc.
- **(b)** Drop sort in card mode.
**Recommendation: (a)** — reuses the existing sort state/handlers, just a
different control. Small.

### D3 — row click / edit
`handleRowClick` is wired to `<tr>` clicks. In card mode the **card** becomes the
click target, still emitting `rowClicked` and opening the edit modal, and still
gated by `rowClickable` (an actionable card gets the pointer cursor + hover, a
non-actionable one doesn't — the `.dx-row-actionable` equivalent on the card).
No decision needed beyond confirming this; flagged so it isn't dropped.

### D4 — column visibility in a card
Eight columns as eight card rows may be too tall. Options:
- **(a)** Show every field as a card row (simplest; can be tall).
- **(b)** A per-field opt-out, e.g. `TableField.hideInCard?: boolean`, so a column
  can be suppressed from the card (an id column, a redundant field).
- **(c)** A per-field "title" role — one field renders as the card's heading
  (bold, no label) and the rest as `label: value` rows.
**Recommendation: (b) + (c)** — a `hideInCard` flag and a `cardTitle?: boolean`
(or reuse the first visible column as the heading). Both additive to `TableField`.

### D5 — the card chrome itself
Reuse `DCard`? A bordered card per row is heavy for a long list. Options:
- **(a)** A light bordered/striped block per row (not full `DCard` chrome).
- **(b)** Full `DCard` per row.
**Recommendation: (a)** — a `.dx-table-card-row` block styled in theme.scss,
respecting the same striped/hover treatment the table has. Keeps the list scannable.

## Risk / test notes

- **The cell-slot seam is the thing to get right and to guard.** Render a table
  with a custom `cell(<key>)` slot, force card mode (drive the container below
  `stackedBelow`), and assert the slot content renders inside the card row
  identically to the table cell. This is the DOM-verified property; a
  `querySelector` that finds the card proves nothing.
- **Row-click reachability** — in card mode assert clicking the CARD emits
  `rowClicked` and opens the modal, and that a non-actionable card does not (the
  reachability-not-presence rule).
- **First-paint** — assert no table renders before `hasMeasured` (no flash).
- **Off by default** — a table with no `stackedBelow` renders byte-identically at
  every width. Guard it.
- **Watch every new test fail against the unfixed component first.**

## Sequencing

1. Settle D1–D5 (this plan + a short review).
2. Build: the `stackedBelow` prop + observer on `DXTableShell`, the card render
   reusing cell-slot forwarding, card-mode click target, and (per D1/D2) the
   filter/sort controls. Card chrome in theme.scss.
3. Retire the consuming app's hand-rolled stacked-card CSS on adoption.

This is a genuine new render mode inside the façade, not a CSS tweak — bigger and
riskier than any single item in the last two batches. Build it as its own focused
pass once D1–D5 are decided, not a blind fan-out.
