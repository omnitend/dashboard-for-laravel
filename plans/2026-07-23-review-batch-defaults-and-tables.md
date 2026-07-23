# Review batch — button/table defaults, header polish, filter UX (B14–B17+)

Status: OPEN. Origin: greendragon app-next cutover review, 2026-07-22/23
(findings PO5/PO18, B14–B17, S5b, PL1, PL4/S3b in
`greendragon-omnitend/plans/2026-07-19-next-review-log.md`).

Eight small, mostly independent asks. Each lists the greendragon interim to
retire once shipped. The theme ones follow the same pattern as
`2026-07-21-tabs-toast-badge-polish.md` (theme.scss + a source-compiled guard
test).

---

## 1. B15 — DButton's DEFAULT variant should be `secondary`, not `primary`

**Problem.** A variant-less `<d-button>` renders the solid-navy primary. Under
the house rule (primary = THE one emphatic action per page/modal), a default
should not produce emphasis — yet every mechanically-ported button silently
became emphatic. The greendragon purchase-order page had ~50 solid-navy
buttons from this alone (quantity steppers, per-row Add buttons); a sweep
found 24 more variant-less sites across 14 pages.

**Ask.** Default `DButton` (and the `DDropdown` toggle/split button) variant →
`secondary`. Per the dfl defaults policy (greendragon-trialled values become
defaults). Breaking for consumers relying on the implicit primary — release
notes should say "declare `variant="primary"` where you mean it".

**Downstream:** greendragon has already made every button's variant explicit,
so the change is non-breaking there and retires nothing — it prevents the
class recurring in every future page.

## 2. B16 — DXTable should forward `primary-key` to the inner BTable

**Problem.** bvn's BTable keys client-side rows by INDEX unless `primaryKey`
is set, and DXTable doesn't forward it (no `$attrs` spread onto `<DTable>`;
the mode bindings don't include it). Index keys mis-associate per-row STATEFUL
cell components when a row is inserted/removed mid-interaction — concretely:
the purchase-order quantity input holds a 400ms debounced edit; a concurrent
websocket delete of a row above re-keys the instance to the NEXT line, and the
pending edit would save against the wrong purchase-order product.

**Ask.** A `primary-key` prop on DXTable, forwarded to the inner table (all
three modes).

**Downstream interim:** `ot-purchase-order-product-quantity-input` pins each
debounced edit to the line id it was typed on and drops stale ones (covered by
a fake-timers test). Worth keeping as defence in depth even after this ships.

## 3. B14 — dropdown caret: chevron glyph, optically centred (PO5)

**Problem.** Bootstrap's `.dropdown-toggle::after` CSS border-triangle sits
high against Poppins' line box and reads crude next to the rest of the theme.

**Ask.** Replace it in the theme with the bootstrap-icons chevron, optically
centred, with breathing room from the label. The greendragon interim's values,
which James signed off after one padding iteration:

```css
.dropdown-toggle::after {
  border: none;
  font-family: "bootstrap-icons";
  content: "\F282"; /* bi-chevron-down */
  font-size: 0.75em;
  line-height: 1;
  vertical-align: 0.05em;
  margin-left: 0.4em;
}
.dropup .dropdown-toggle::after {
  border: none;
  content: "\F286"; /* bi-chevron-up */
}
```

Note dfl doesn't currently ship bootstrap-icons — either take the dependency
(greendragon already loads it) or inline the chevron as a data-URI mask.

**Downstream interim:** the same rules in greendragon shell.css.

## 4. B17 — header labels shouldn't drop when a column has no sort icons (RC3)

**Problem.** Bootstrap's `thead { vertical-align: bottom }` floors a
non-sortable column's label while sortable neighbours' taller sort-icon stacks
hold their text higher — one header row, mixed baselines ("Linked transaction"
sat visibly lower than "Amount"/"Created" on the receipts index). Vertical
alignment must not depend on the presence of sort indicators.

**Ask.** Theme: `thead { vertical-align: middle }` (or centre the label
within DXTable's header flex row so the fix is structural rather than
alignment-sensitive).

**Downstream interim:** shell.css `.table > thead { vertical-align: middle }`.

## 5. S5b — `--dx-table-header-color` default should be LIGHTER

**Problem.** #157 muted DXTable headers to `--bs-secondary-color`
(`rgba(33,37,41,.75)`), but that still reads near-black next to legacy
omnitend's light slate headers. James: "the table headers need to be even
lighter."

**Ask.** Lighten the default — greendragon settled on legacy's
`$text-secondary` **`#7c8293`** (signed off on the receipts/products pages).
Keep it on the existing `--dx-table-header-color` token so consumers can still
re-louden.

**Downstream interim:** shell.css `:root { --dx-table-header-color: #7c8293 }`.

## 6. PO18 — theme `$input-padding-y-sm` to match `$btn-padding-y-sm`

**Problem.** The theme sets `$btn-padding-y-sm: 0.5rem` but leaves
`$input-padding-y-sm` at Bootstrap's `0.25rem`, and Bootstrap sizes
`.input-group-sm` children (inputs AND buttons) with the INPUT sm padding — so
any sm input-group sits 8px shorter than sm buttons beside it (the
purchase-order quantity stepper vs the status button group).

**Ask.** Theme `$input-padding-y-sm: 0.5rem` (and check the md/lg pairs for
the same skew) so sm controls share one height by construction.

**Downstream interim:** `ot-purchase-order-product-quantity-input` equalises
padding locally.

## 7. PL1 — DXTable text/number filter inputs get a search glyph

**Problem.** The filter row's text inputs are bare; legacy lt-table's filter
inputs carried a magnifier, which reads as "this searches" at a glance.

**Ask.** Ship the magnifier in the theme for `.filter-row` DFormInput text and
number filters (background-image data-URI + padding-left; the autocomplete
select-filters have their own affordances and get none).

**Downstream interim:** shell.css `.filter-row > th > input.form-control`
with a bootstrap-icons "search" data-URI at `#7c8293`, `padding-left: 1.9rem`,
`background-size: 0.85em`.

## 8. S3b/PL4 — select-filter (DAutocomplete) UX vs a native select

**Problem.** James on the products category filter: the dropdown "doesn't
drop all the way to the bottom of the page like our old select did", the
caret affordance is unclear, and — the sharp end — **"if we can't get the UX
as good as a regular select, we should just use a regular select."** bvn's
`.b-autocomplete-content` caps at 300px, showing ~7 of ~30 categories behind
an inner scrollbar.

**Asks**, in order of appetite:
1. Default the menu max-height to viewport-relative (greendragon interim:
   `min(70vh, 42rem)` — James reviewing; adopt whatever survives).
2. A clearer closed-state affordance (the toggle's caret reads ambiguous next
   to a native select's).
3. Consider an opt-in `filter: "select-native"` (or a DXTable-level flag)
   rendering a plain `<select>` for consumers who want OS-native behaviour —
   the fallback if the autocomplete can't be brought to parity. Relates to the
   original S3 reservation about BAutocomplete filters (#138 era).

**Downstream interim:** shell.css `.b-autocomplete-content { max-height:
min(70vh, 42rem) }`.
