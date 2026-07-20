# #155 — richer DXTable pagination (custard-style windowed pager)

## Motivation

James prefers custard's pagination to DXTable's. Investigated: custard is **not
a custom algorithm** — its pages render Laravel's paginator link collection
(`webhooks.links`) as styled `DButton`s (`v-html="link.label"`, active→primary,
else→outline-secondary, disabled when no url). Laravel's paginator does the
windowing (leading + ellipsis + window + ellipsis + trailing + Previous/Next).

DXTable uses bvn `BPagination` (via `DPagination`) with default `‹ ›` arrows and
few numbers — sparser and less clear.

James's asks (from the screenshots):
1. More page buttons.
2. Clearer **« Previous** / **Next »** (text, not arrows).
3. Show the **last page number** (e.g. 45), not `>`.
4. When mid-list, still show leading pages **1 2** (and trailing **44 45**).

## Decision

Build a **custom windowed pager** in `DXTablePagination` (client-computed, so it
works in all three DXTable modes — provider / client-side / inertia — not just
inertia's server `links`). Match custard's shape exactly.

## Algorithm (client-side, from `current_page` + `last_page`)

`last_page = ceil(total / per_page)`. Build the visible item list:

- Always show a **boundary** of the first 2 and last 2 pages: `1,2` and
  `last-1,last`.
- Show a **window** around current: `current-3 … current+3`.
- Union + clamp to `[1, last]`, sort unique.
- Walk the sorted pages; where the gap to the previous shown page is `> 1`,
  insert an **ellipsis** item (non-interactive).
- If `last_page` is small enough that everything fits (≤ ~7), show all, no
  ellipsis.

Constants: `BOUNDARY = 2`, `AROUND = 3` (tuneable). This reproduces:
- page 2 / 45 → `1 [2] 3 4 5 … 44 45` (window merges with leading; ellipsis only
  before trailing).
- page 11 / 45 → `1 2 … 8 9 10 [11] 12 13 14 … 44 45`.

## Rendering

- Row: `« Previous` | page items | `Next »`, wrapped so it can scroll / wrap on
  narrow widths (mobile — the current pager already stacks; keep it usable).
- Buttons are `DButton size="sm"`:
  - active page → `variant="primary"` (navy — matches custard's active).
  - other pages / Previous / Next → `variant="outline-secondary"`.
  - Previous disabled on page 1; Next disabled on last page.
  - ellipsis → a non-button muted `…` (not clickable, not in the tab order).
- Emit `page-change` with the target page (unchanged contract).

Replaces the `<DPagination>` (bvn `BPagination`) usage in `DXTablePagination`.
`DPagination`/`DPagination.vue` stays exported (consumers may use it directly);
we just stop using it for the table's own pager.

## Mobile

The custard look is desktop-oriented (James: "especially on desktop"). On narrow
widths, keep it usable — either a compact variant (Previous / current-of-last /
Next) or horizontal-scroll the button row. Decide during build + screenshot;
default to letting the row wrap/scroll rather than a separate mobile pager unless
it looks bad.

## Tests

- The window algorithm as a pure computed: assert the item sequence for
  representative cases (page 2/45, 11/45, 45/45, 3/5 all-shown, 1/1 no pager).
  Test the ACTUAL sequence (numbers + ellipsis positions), not just "renders".
- Previous disabled on first page, Next disabled on last.
- Clicking a page emits `page-change` with that number.
- Verified red against the pre-change component where applicable.

## Visual

Screenshot the DXTable docs page (or a wide table) at a middle page to confirm it
matches custard's `1 2 … window … 44 45  « Previous / Next »` shape, plus a
narrow-width capture.

## Scope / sequencing

Follow-up to the v0.31.0 release (do NOT rebuild dist until 0.31.0 is published).
Ships as 0.32.0 (a new pagination style — visible change; default-on to adopt the
better look, per James "we should adopt it"). Relates to #155.

## Outcome
_(filled on completion)_
