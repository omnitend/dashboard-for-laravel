# Review batch — button/table defaults, header polish, filter UX (B14–B17+)

Status: OPEN. Origin: greendragon app-next cutover review, 2026-07-22/23
(findings PO5/PO18, B14–B17, S5b, PL1, PL4/S3b in
`greendragon-omnitend/plans/2026-07-19-next-review-log.md`).

Eight small, mostly independent asks. Each lists the greendragon interim to
retire once shipped. The theme ones follow the same pattern as
`2026-07-21-tabs-toast-badge-polish.md` (theme.scss + a source-compiled guard
test).

---

## 1. B15 — DButton's DEFAULT variant should be `secondary`, not `primary` — DONE

**Status: DONE** (2026-07-23). `DButton`'s `withDefaults` default changed
`variant: "primary"` → `"secondary"` (JSDoc `@default` updated). `DDropdown`
needed no change — it sets no variant default and forwards `$attrs` to
`BDropdown`, whose own default is already `secondary`. All dfl-internal
`<DButton>` sites already declare a variant explicitly (verified across
DXTable, DXForm, DXTableEditorModal, DXField, DXRepeater, DXRepeaterCards,
DXTablePagination, DXDashboardNavbar), so no dfl component changes visually.
Guarded by `tests/components/DButton-default-variant.test.ts` (watched fail
against the old `primary` default first). Docs: `DButton.mdx` documents the
new default.

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

## 2. B16 — DXTable should forward `primary-key` to the inner BTable — DONE

Shipped: a `primaryKey?: string` prop on DXTable, forwarded to the inner
`<DTable>` via `tablePassthroughProps` (mode-independent, so it applies in
provider / client-side / inertia alike). DTable already spreads `$attrs` onto
BTable, so no change was needed there. Non-breaking (omit → index keys as
before). Guarded by `tests/components/DXTable-PrimaryKey.test.ts`, which proves
the stateful-cell mis-association is gone (a marked input stays bound to its
record when a row above is spliced out) — with a companion test documenting the
index-key bug the prop fixes.

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

**Status: DONE** (theme lane, 2026-07-23). `.dropdown-toggle::after` in theme.scss
now uses the bootstrap-icons chevron (`\F282` / `\F286` for `.dropup`), metrics
tunable via `$dx-dropdown-caret-*`. The font is already shipped (theme imports
`bootstrap-icons/font/bootstrap-icons`; #77 extraction bundles the woff2) — no
new dependency, no data-URI. Guard: `tests/components/theme-review-batch.test.ts`.

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

**Status: DONE** (theme lane, 2026-07-23). Theme: `.table > thead {
vertical-align: middle }` (cells inherit it via the UA `td,th{vertical-align:
inherit}` default, the same mechanism Bootstrap's `bottom` relies on). Guarded by
a geometric label-centreline test, not a proxy.

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

**Status: DONE** (theme lane, 2026-07-23). Token set to `#7c8293` (~3.6:1 on
white — above the 3:1 large/bold bar the semibold header text sits at, below the
4.5:1 body bar; James's explicit call). Third adjustment to this token (#157
muted it to `--bs-secondary-color`; now lighter). Still the same token, so
consumers can re-louden.

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

**Status: DONE** (theme lane, 2026-07-23). Set `$input-padding-y-sm: 0.5rem`
AND `$input-padding-y-lg: 0.75rem`. **md/lg finding:** lg had the SAME class of
bug (undocumented Bootstrap-default `0.5rem` input vs the theme's explicit
`0.75rem` button → ~4px short in an `.input-group-lg`) so it was fixed too. The
BASE md `$input-padding-y: 0.375rem` is DELIBERATELY more compact than
`$btn-padding-y: 0.625rem` (documented: "0.625rem read oversized"), so it was
LEFT as-is — changing it would make every standalone input chunkier. Only the
sized variants leak input padding onto grouped buttons, so only those are
equalised. (Residual: a default-size `.input-group` still sizes grouped buttons
to the compact md input padding — an accepted consequence of the deliberate
compact-input choice.)

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

**Status: DONE** (theme lane, 2026-07-23). `.filter-row > th > input.form-control
:not([type="date"])` gets a bootstrap-icons "search" SVG data-URI
(`background-image`, tinted `#7c8293`) + `padding-left: 1.9rem`. A
`background-image` (not `::before`, which an `<input>` can't host). Direct-child
selector naturally excludes the select filter's nested DAutocomplete input;
`:not([type="date"])` excludes the date filter. Test asserts the glyph is present
on text/number, absent on date, the nested input, and ordinary form inputs.

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
1. **DONE** (theme lane, 2026-07-23). `.b-autocomplete-content { max-height:
   min(70vh, 42rem) }` in theme.scss, overriding bvn's 300px cap. Guarded (both
   the compiled rule and a computed-style override of the 300px default).
2. A clearer closed-state affordance (the toggle's caret reads ambiguous next
   to a native select's).
3. Consider an opt-in `filter: "select-native"` (or a DXTable-level flag)
   rendering a plain `<select>` for consumers who want OS-native behaviour —
   the fallback if the autocomplete can't be brought to parity. Relates to the
   original S3 reservation about BAutocomplete filters (#138 era). — **DONE.**
   Added `'select-native'` to `FilterType`; a column with `filter:
   "select-native"` renders `DFormSelect` (native `<select>`) in the filter row.
   It reuses the SAME plumbing as `filter: "select"` — `getFieldFilterOptions`
   (incl. derived options + `filterNullText`), `handleSelectFilterChange`, the
   client-side exact-match arm, and server `filterValues` derivation — so it
   behaves identically bar the control. Sentinel: `handleSelectFilterChange`
   already translates `FILTER_ALL_VALUE`→`''` on the way out (write side); the
   read-side mirror `nativeSelectFilterValue` maps "no filter"→`FILTER_ALL_VALUE`
   so the "All …" option shows selected (a native `<select>` desyncs from the
   model when the bound value matches no option). Single-select only —
   `filterMultiple` is ignored (still renders one `<select>` and keeps the "All"
   reset). Guarded by `tests/components/DXTable-SelectNativeFilter.test.ts`.
   Items 1 (menu max-height) and 2 (caret) are handled/deferred in other lanes.

**Downstream interim:** shell.css `.b-autocomplete-content { max-height:
min(70vh, 42rem) }`.
