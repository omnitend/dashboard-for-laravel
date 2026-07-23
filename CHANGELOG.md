# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.38.0] - 2026-07-23

### Added

- **`DXSwitch size="sm"`** — a compact box (~31px vs the default ~35px input
  height) for dense rows that repeat the switch per item, e.g. a per-line
  visibility toggle in a modal. Omit for the standard size, which matches the
  input height so a switch lines up with fields beside it.

### Fixed

- **Check/radio/switch boxes are optically centred against their labels.**
  Bootstrap's `0.25em` top margin is mathematically right for a 1em box in a
  1.5em line box, but Poppins seats its glyphs low in the line box, so the box
  read visibly high beside the text. `.form-check-input` now uses a `0.325em`
  top margin (judged against a rendered Poppins filmstrip, not the maths). A top
  margin aligns to the first line, so a multi-line label keeps the box on line
  one. `DXSwitch` is unaffected — it flex-centres its own box.

## [0.37.0] - 2026-07-23

### Breaking

- **`DButton`'s default `variant` is now `secondary`, not `primary` (B15).** Under
  the soft-first system `primary` is the single emphatic action per screen, so a
  variant-less `<DButton>` should not be emphatic. Every button in this library
  already declares its variant explicitly, so nothing here changes; the break is
  only for consumers who relied on the implicit primary. **Declare
  `variant="primary"` where you mean the emphatic action.** `DDropdown` is
  unaffected (bvn already defaults its toggle to secondary).

### Added

- **`DXTable` `primary-key` prop (B16).** Forwarded to the inner table so rows are
  keyed by a field's value instead of by index (bvn's default). Index keys
  mis-associate *stateful* cell components when a row is inserted or removed
  mid-interaction — a debounced edit in one row could save against the wrong
  record after a concurrent delete above it. Set `primary-key` on any table whose
  rows carry per-row state. No change without it.
- **`DXTable` `filter: "select-native"` (S3b).** An opt-in column filter that
  renders a plain native `<select>` instead of the autocomplete, for facets where
  OS-native behaviour and a full-height option list beat the typeahead. It reuses
  the same option sourcing (including client-side derivation and the "no value"
  option) and value semantics as `filter: "select"` — only the control differs.
  Single-select only.

### Changed

- **Dropdown carets use the bootstrap-icons chevron (B14).** Bootstrap's CSS
  border-triangle read crude against the theme; replaced with an optically-centred
  chevron glyph. Uses the icon font the theme already ships — no new dependency.
- **`DXTable` header titles default to a lighter grey (S5b).** The muted header
  colour (`--dx-table-header-color`, #157) moves from `--bs-secondary-color` to a
  lighter slate. Still on the same token, so re-louden by overriding it.
- **`DXTable` text and number filter inputs carry a search glyph (PL1)** — a
  magnifier affordance so the filter row reads as searchable at a glance.
- **The autocomplete filter menu drops further down the viewport (S3b).**
  `.b-autocomplete-content` max-height is now `min(70vh, 42rem)` instead of bvn's
  300px, so a long facet list shows far more before scrolling.

### Fixed

- **Table header labels no longer sit on mixed baselines (B17).** A non-sortable
  column's label was floored by `thead { vertical-align: bottom }` while sortable
  neighbours' taller sort-icon stacks held their text higher. Headers now align on
  the middle.
- **Small and large input-groups match the button height beside them (PO18).**
  `$input-padding-y-sm` / `$input-padding-y-lg` were inherited from Bootstrap and
  sat shorter than the theme's sized buttons, so an sm/lg input-group was a few px
  short of an adjacent sm/lg button. (The default-size compact input is
  deliberate and unchanged.)

## [0.36.0] - 2026-07-21

### Fixed

- **Charts now follow a colour-mode change while mounted (#161).** Palette
  colours were copied into the Chart.js data inside a computed whose only
  dependencies were component props — a `data-bs-theme` flip changes a DOM
  attribute and a computed CSS value, neither of which is a reactive dependency,
  so an already-mounted chart kept the old palette until a prop changed or it
  remounted. A single ref-counted `MutationObserver` (SSR-guarded, torn down with
  its effect scope) now drives a repaint.
- **Charts resolve the palette from their own colour-mode scope (#161).**
  Resolution always read `document.documentElement`, so a chart inside a nested
  `data-bs-theme` container (a dark card on a light page, or the reverse) got the
  root's palette. It now reads from the chart's own container. `theme.scss` also
  declares the palette under `[data-bs-theme="light"]`, without which a light
  scope nested under a dark root would inherit the dark values.
- **Card-mode `DXTable` no longer clips the whole card (#166).** Rendering the
  table flush required clipping to the card radius, which also cut off any
  non-teleported positioned content in a slot. The clipping now applies to the
  flush table region alone, so the card itself no longer clips. `.table-responsive`
  needs no `overflow` of its own — Bootstrap's `overflow-x: auto` already makes it
  a clipping context, and adding `overflow: hidden` there would kill horizontal
  scrolling. A `:responsive="false"` table wider than its card once again
  overflows visibly rather than being silently cut off; that mode opts out of a
  scroll container by definition.
  - **Residual, unchanged by this:** `.table-responsive` is a scroll container, so
    an overlay in a `cell(<key>)` slot is bounded by it either way. Teleport it.

### Changed

- **The `DXTable` pager collapses to `« Previous · 11 / 45 · Next »` when its row
  is too narrow for the full window (#162).** The decision is container-driven,
  not viewport-driven — a table squeezed by a sidebar is cramped at any viewport
  width. It is also page-count aware: a pager that already fits is left alone, so
  a three-page pager on a phone keeps its numbers rather than becoming a worse
  `2 / 3`. Compact mode announces position through a polite live region, since
  there is no page button to carry `aria-current`.

### Internal

- The scoped `:deep()` coverage guard now parses per style block and strips
  comments (#167). It previously matched greedily from the first `<style scoped>`
  to any `:deep(` later in the file, flagging mentions in comments and in
  non-scoped blocks. Also hardened against a `scoped` substring inside a quoted
  attribute value and against an unterminated `<style>` block silently opting out.

## [0.35.0] - 2026-07-21

### Added

- **Container-driven form layout — `DXForm layout="auto"`.** Renders horizontal
  while the form's own container is wide enough and stacks to vertical below
  `layout-threshold` (default `640`px). This is a *container* query, not a media
  query: a form narrowed by a sidebar or a modal stacks even when the viewport is
  wide, which a Bootstrap breakpoint cannot see. `layout="horizontal"` keeps its
  unconditional meaning and `vertical` stays the default, so no existing form
  changes. `DXTable`'s `edit-layout` accepts `"auto"` too, for the modal case.
- **`useContainerWidth` composable** (exported) — the `ResizeObserver` primitive
  behind the above: `{ containerRef, width, hasMeasured, isBelow,
  isNarrowerThan(px), stop }`, with a `hysteresis` band so a layout that changes
  its own container width (a stacked form is taller → an ancestor gains a
  scrollbar → the container narrows) cannot oscillate at the threshold. SSR-safe:
  with no `ResizeObserver` it reports width `0`, i.e. "assume narrowest".
- **`DXTable` `#head-end(<fieldKey>)` slot** — additive content at the end of a
  column's own header (a period total above a numeric column, a small badge),
  scoped `{ field, label }`. Unlike a `head()` override it *keeps* DXTable's sort
  indicator and field hint. Not forwarded to the inner table.

### Changed

- **`DXTable` derives client-side `filter: "select"` options from the loaded
  rows.** A client-side select column with no `filterOptions` and no server
  `filterValues` previously rendered an **empty dropdown**; it now offers the
  distinct values present in the data. Options are derived from the full loaded
  row set (never the filtered or paginated set, which would let a chosen value
  collapse the list to itself). Explicit `filterOptions` and server
  `filterValues` still win, in that order. Provider/API and Inertia modes are
  unchanged — they hold one page, so there is nothing complete to derive from.
  Opt out per column with `deriveFilterOptions: false`.
- **Card-mode `DXTable` renders the table flush to the card border.** The table
  was inset 24px by `.card-body`, leaving a white gutter between the striped rows
  and the border. `DXTableShell` now uses `DCard no-body` and clips the card, so
  rows reach the edge while the header and pagination keep their padding.
  `:card="false"` is unchanged. **Because the card now clips (`overflow:
  hidden`), slot content that positions itself outside the card and does not
  teleport is cut off at the edge.** Library components are unaffected —
  `DDropdown` teleports to `<body>`, and the column-filter menus position
  themselves `fixed` — so this only affects a hand-rolled `position: absolute`
  overlay in a `cell(<key>)` or `#header` slot. Teleport it, or use
  `:card="false"`. Narrowing the clip to the table region is tracked as #166.
- **`.nav-tabs` inactive links are muted** rather than the saturated link-blue —
  chrome recedes, content leads, matching the muted table headers. The active tab
  is unchanged. Re-louden per tab set by overriding `--bs-nav-link-color`.
- **Soft `.text-bg-*` and `.progress-bar.bg-*` overrides no longer inflate
  specificity.** They matched at `0,2,0 !important`, so a consumer's
  single-class `!important` rule lost and a custom-coloured badge had to escalate
  to a repeated-class selector. Both now use `:where()` — identical matching at
  `0,1,0`, so a normal consumer override wins.

### Fixed

- **Header-less toasts are no longer misaligned.** A toast with a `body` and no
  `title` left the message hugging the top while the close button sat centred
  (measured 8.5px out), because the body kept the reduced top padding meant for
  sitting under a `.toast-header`, and bvn's close button uses an `auto` margin
  that outranks `align-items`. Header-less toasts now centre their row and use
  symmetric padding; the with-header case is untouched.

### Docs

- `DBadge`: documented that **`:variant="null"` emits no `text-bg-*` class**, for
  a badge whose colour is entirely custom. This already worked — `undefined` does
  *not* (Vue applies the prop default) — and is now guarded by a test.

## [0.34.0] - 2026-07-21

### Added

- **`DXTable` edit/create-modal form controls.** New props forwarded to the
  modal's `DXForm`: `edit-layout` (`"vertical"` | `"horizontal"`, **defaults to
  `"horizontal"`** — see Changed), `edit-label-cols` (label width for the
  horizontal layout), and `edit-card` (opt-in bordered card around the modal
  form, off by default). Also `save-text` / `create-text` / `delete-text` to
  override the modal's action-button labels.
- **Strict, discriminated field types (#131)** — `FieldDef` (a union keyed on
  `type`) and its per-type members (`CurrencyFieldDef`, `SwitchFieldDef`,
  `RepeaterFieldDef`, …) are exported alongside the existing permissive
  `FieldDefinition`. Each variant permits only its own options, so an invalid
  field config (`currencySymbol` on a checkbox, `options` on a text input) is a
  compile error at the call site. **Opt-in and non-breaking**: `FieldDefinition`
  stays canonical; adopt `FieldDef` where you want the checking. A future major
  makes the union canonical with a codemod.
- **`DXTable` discriminated `source` prop (#130)** — a type-safe alternative to
  the `items` / `provider` / `apiUrl` / `inertiaUrl` / `clientSide` matrix:
  `:source="{ mode: 'provider', provider }"` (or `'client'` / `'api'` /
  `'inertia'`), where the mode's required companion is enforced by the compiler.
  **Non-breaking**: the legacy props still work and apply when `source` is
  omitted. `apiAdapter`/`pagination` stay sibling props. The invalid-combo
  runtime warning now also covers `clientSide + provider`.
- **Exported form-schema helpers (#134)** — `resolveFieldDefault`,
  `defaultValueForType`, `cloneDefault`, `resolvePredicate`, `isFieldVisible`,
  `isSubmittableField` are now public, for consumers building custom form
  renderers on the same rules DXForm/DXTable use.
- **`DXTableApiAdapter` and `DXTableSource` are now exported** from the package
  root (previously the adapter type was internal).

### Changed

- **`DXTable`'s edit/create modal now defaults to a HORIZONTAL form layout**
  (label-left), matching the Omni Tend form convention — previously it fell back
  to `DXForm`'s vertical default, which read as out of place. Pass
  `edit-layout="vertical"` to restore the old look.
- **`DXTable`'s edit/create-modal buttons are now item-named.** "Save Changes" /
  "Create" / "Delete" become "Save {item}" / "Create {item}" / "Delete {item}"
  (e.g. "Save Customer"), using `item-name` (title-cased; falls back to "Item").
  Override any of them with `save-text` / `create-text` / `delete-text`.
- **`DXTable`'s `editFields` is now typed `FieldDefinition[]` (was `any[]`)
  (#131).** A minor type-tightening: if you passed a separately-declared,
  un-annotated field array (where TypeScript infers `type` as `string`), your
  build may now error — annotate it `const fields: FieldDefinition[] = [...]`
  or `[...] satisfies FieldDefinition[]`. Inline literals and already-annotated
  arrays are unaffected. The tightening also surfaces mistyped field `type`s.
- **`DXBarChart` / `DXLineChart` props are now strictly typed (#135).** Their
  `datasets` / `options` props changed from `any[]` / `Record<string, any>` to
  Chart.js's `ChartDataset<'bar'|'line'>[]` / `ChartOptions<'bar'|'line'>`. If a
  build newly errors, adjust a loosely-typed dataset/options object to match
  Chart.js's types (or cast at the call site). Runtime behaviour is unchanged.
- **Create/edit-modal seeding is now type-aware (#134).** `DXTable`'s
  create/edit modal previously seeded every field lacking an explicit `default`
  with `""`; it now uses the same rule as `defineForm`/`DXRepeater` — a
  `checkbox-group`/`switch-list`/`repeater` seeds `[]`, a `number`/`currency`/
  `percentage` seeds `0`, a `checkbox`/`switch` seeds `false`. This fixes an
  array-shape mismatch for un-defaulted array fields and makes all seeding sites
  agree. If you relied on an un-defaulted array field starting as `""` in the
  edit modal, set an explicit `default`.

### Fixed

- **`DXTable` handles a runtime data-source mode switch.** Switching `source`
  (or the legacy props) between provider/api and client/inertia at runtime now
  remounts the table (the active mode is part of its key), so the new rows
  appear instead of bvn's cached "No items found" from the previous provider.
- **A superseded provider's late failure no longer shows a stale error.** If a
  provider is swapped and the old, still-pending call rejects after the new one
  rendered, its error is dropped (generation token) instead of appearing over
  the new rows.
- **`DXTable` refetches when its `provider` function is swapped** (`:provider`
  or `source.provider` reassigned). Previously only an `apiUrl` change forced a
  refetch — the provider binding's identity is deliberately stable (#82), so a
  new provider function kept showing the old rows until some other trigger
  (sort, page, per-page, CRUD) fired. Now a provider swap resets to page 1 and
  refetches, exactly as an `apiUrl` swap does.

### Internal

- **Refactors with no consumer-visible behaviour change:** `DXField`
  decomposed into a `DXFieldShell` + `DXNumericField`/`DXChoiceField` controls +
  a `useAsyncOptions` composable (1183→896 lines); `DXRepeater`'s duplicated
  cards markup extracted into `DXRepeaterCards`; `DXBarChart`/`DXLineChart`
  share a `useThemedChart` composable with Chart.js generic types; form-schema
  defaulting/visibility deduplicated into `utils/formSchema.ts`; the docs
  metadata pipeline consolidated onto one `vue-docgen-api` manifest (#136) —
  which also fixes raw bvn aliases (`DTab`, `DCarousel`) being missing from
  `llms.txt` / `api-reference.json`.

## [0.33.1] - 2026-07-20

### Added

- **`DXTable` `api-adapter` prop** — translate the built-in `api-url`
  provider's request params and response body to a backend whose convention
  differs from dfl's (e.g. spatie query-builder's `sort=-name`, or an envelope
  without `{data, pagination}`), while keeping the provider's error handling
  and pager. `request(params)` returns the wire params; `response(body,
  { params })` returns the dfl shape, with the original dfl params available
  to synthesize paginator metadata. This is the sanctioned replacement for
  the **axios request/response interceptor bridges** that stopped applying in
  0.33.0 when DXTable moved off axios (#132) — if your provider tables came up
  empty on 0.33.0 against a previously-working backend, this is almost
  certainly why, and the adapter is the fix.

### Fixed

- **A bare-array provider response renders its rows** (with no pager) instead
  of a silently empty table — a backend that ignores the pagination
  convention and returns all rows as a JSON array now degrades visibly.

## [0.33.0] - 2026-07-20

### Changed

- **Progress-bar fills use each variant's vivid solid, not the dark emphasis
  shade** (#154). `.progress-bar.bg-success` is now the switch-ON lime
  (`#84cc16`, was the dark olive `#4d7c0f`) and `.bg-warning` the bright amber
  (`#f59e0b`, was `#b45309`) — so a success bar, badge, and switch read as one
  green family. `danger`/`info` fills are unchanged (their solid *is* their
  emphasis), and the variant-less default bar stays the brand navy. **Visible
  change** on any coloured progress bar.
- **Sidebar nav is denser, with natural-case group headers** (#95). Group
  headers drop the all-caps treatment (now natural case at `0.875rem`), group
  spacing tightens (`0.25rem` between groups, `2rem` header rows), and nav
  links use `0.3rem` vertical padding — the values Omni Tend's cutover work
  settled on. **Visible change** for every `DXDashboardSidebar`; apps that
  overrode these with `!important` can delete those overrides.
- **`DXTable` header titles are muted grey by default** (#157) — still bold,
  but no longer competing with the table's content. Retheme via the new
  `--dx-table-header-color` token (set it to `var(--bs-body-color)` to
  restore the old near-black).

### Added

- **`DXTable` multi-value column filters** (#51) — `filterMultiple: true` on a
  `filter: 'select'` field renders a multi-select typeahead so a column can
  filter on several values at once (status in *active, pending*). The
  `filters` map entry (and the `v-model:filters` payload) becomes an **array**
  for such columns; provider and Inertia modes send Laravel bracket notation
  (`filters[status][]=active&filters[status][]=pending`), and client-side mode
  matches a row when its value equals **any** chosen value (`filterNullText`'s
  "has no value" option works inside the array too). An emptied selection
  removes the filter. **TypeScript note (source-breaking for typed
  consumers):** the `filters` prop, `v-model:filters` payload and
  `filterChange` emit widened from `Record<string, string>` to
  `Record<string, string | string[]>` — a ref/handler typed with the old
  shape needs its annotation widened, even on tables with no multi filters.
  Mutating a controlled filter array **in place** now correctly triggers a
  provider/Inertia refresh (the old change-detection compared an object
  against itself and missed it).
- **`switch-list` field type** (#160) — a list of labelled boolean toggle rows
  (allergens, feature flags, notification opt-ins) as config, not markup. Each
  option renders a real form-grid row (label in the label column, compact
  track switch in the content column, divider between rows), so the list can't
  drift from the form's grid the way hand-rolled `#span` markup does. The
  model is an **array of the on rows' option values** — identical to
  `checkbox-group` — and `optionsLoader` async options work as on selects.
  `switchVariant: 'neutral'` opts the rows out of the green/red valence
  (usually right for lists); per-row extras (a notes input) render via the new
  `#switch-list-item(<key>)` scoped slot (`{ option, on }`), and an option
  with `disabled: true` renders a non-interactive row. Also: `defineForm` now
  seeds `checkbox-group` (and `switch-list`) defaults as `[]` — previously an
  unseeded `checkbox-group` defaulted to `""`, the wrong shape for an array
  model — and `FormFieldDefinition.default` is now **optional** in TypeScript
  (the runtime fallback existed but the type demanded a value, so typed
  consumers could never use it).
- **`DXCurrencyInput`** (#152) — the money input leaf: `£`-prefixed numeric
  input with the blur-padded display from #69, a model that is always a plain
  number or `null` (clearing emits `null`, never `NaN`/`""`), and a
  **`minorUnits` mode** (#116) that edits an integer-pence model as pounds
  (display = value / 10^decimals, emit = `round(input × 10^decimals)`, so
  float artefacts like `19.99 × 100` never reach your data). `DXField`'s
  `currency` type now renders this leaf — same behaviour, plus the new
  `minorUnits: true` field option — and it's exported for standalone use
  (inline table corrections, filters). Note: an emptied `currency` field now
  writes `null` to the form model (it previously left `""`). Minor-unit
  rounding is decimal-safe at half-unit boundaries (`1.005` → `101`, where a
  bare float round drops to `100`) and rounds halves **away from zero**
  symmetrically; a hostile `decimals` prop is clamped to a supported integer
  range instead of throwing.
- **Dark-surface chart palette** (#145). Under `data-bs-theme="dark"` the
  theme remaps `--dx-chart-1..8` to lighter same-hue steps validated for the
  dark body (`#212529`): every step ≥ 5.6:1 contrast (the light palette dipped
  to ~2.7:1 there), hue order preserved (it encodes the CVD separation), min
  adjacent CVD ΔE 15.1 — validated with the same OKLab/protan/deutan method
  as the light set. Charts follow the theme automatically; no JS change.

### Removed

- **axios is no longer a peer dependency** (#132) — the main entry no longer
  imports it at all, so a consumer without axios installed builds cleanly (the
  same class of failure the `/charts` split fixed for chart.js in #142). The
  only two axios call sites — `DXTable`'s built-in `api-url` provider and the
  edit modal's `show-url` fetch — now go through the library's own fetch-based
  `api` client (already used by `useForm` for every form submission). You can
  remove `axios` from your dependencies if nothing else uses it.

  **Behaviour notes for the two GETs:** the query string is unchanged (same
  Laravel bracket notation, e.g. `filters[status]=active`); requests now also
  carry `Accept: application/json` and `X-Requested-With` (the same headers
  every form submission already sent — note the latter is a non-simple CORS
  header, so a **cross-origin** `api-url`/`show-url` endpoint must answer a
  preflight, as was already true for the library's POSTs). If you relied on
  **axios interceptors** (auth header, base URL) decorating these requests,
  move that to the exported `api` client —
  `api.setDefaultHeader('Authorization', …)` / `api.setBaseURL(…)` — which
  also covers all form submissions. Failed fetches surface `ApiError`
  status-specific messages (e.g. "Unauthenticated. Please log in.") instead of
  raw axios error text. Guarded by `tests/bundle/chart-optional-peer.test.ts`
  (no entry may reference axios).

### Fixed

- **`api.get` now merges params into a URL that already has a query string**
  (`/api/things?scope=live` + `{page: 2}` → `…?scope=live&page=2`). It used to
  blindly append a second `?`, corrupting the query so the server dropped the
  params — axios handled this, so it would have regressed `apiUrl` values
  carrying their own query string. Caught by Codex review; guarded at the
  fetch level in `tests/utils/api-get.test.ts`.
- **The `api` client no longer sends `Content-Type` or `X-CSRF-TOKEN` on
  GET/HEAD.** A bodyless request has nothing for `Content-Type` to describe
  and no CSRF exposure, and both are non-simple CORS headers that forced a
  needless preflight on cross-origin GETs. POST/PUT/PATCH/DELETE are
  unchanged.

## [0.32.0] - 2026-07-20

### Changed

- **`DXTable` pagination is now a windowed pager** (#155) — clearer **« Previous**
  / **Next »** text buttons (not `‹ ›` arrows), the **first/last page numbers**
  always shown, and a wider run of pages with ellipses:
  `1 2 … 8 9 10 [11] 12 13 14 … 44 45`. Adopts the house style. The
  window is computed client-side from the current/last page, so it works in every
  DXTable mode (provider / client-side / inertia), and the row wraps on narrow
  widths. The active page is the brand primary; the rest are outline buttons.

## [0.31.0] - 2026-07-20

### Changed

- **`danger` buttons are now SOFT; `primary` is the only bold solid button.** The
  soft-first doctrine tightens to one loud action per screen (the brand primary);
  a `.btn-danger` / "Delete" now reads as a soft **light-red** tint with dark-red
  text rather than a solid red fill. As part of this, `danger`'s soft tint moves
  from an off-hue plum (`#f5dff1`/`#59194a`) to a same-hue light red
  (`#f8d4d4`/`#7a1a1a`) — so danger badges, alerts, toasts, the soft button, and
  the switch OFF are all one red. Outline-danger / `.text-danger` / links keep
  the `#dc2626` emphasis red. **Visible change** for any `danger` button or
  soft-danger surface.

- **Switches default to green-on / light-red-off** (#158). An active switch
  reads `success` green when ON and light red when OFF out of the box (house
  style), a reversal of the old primary-on default. The bare `.form-switch`
  (`DFormCheckbox switch`) colours the toggle track; **`DXSwitch` (and `DXField`
  `type:'switch'`) is the "filled box"** — the whole control fills green / light
  red and the pill stays a neutral grey affordance, matching the house control.
  Pair `textWhenTrue`/`textWhenFalse` so the label names each state too.
  Semantically-mixed switches ("contains alcohol", an allergen toggle, "hidden on
  web shop") opt out: `DXSwitch on-variant="neutral"` / a `switchVariant:
  'neutral'` field option / the `.switch-neutral` class on a bare `.form-switch`
  restore primary-on / grey-off.

- **Soft `.text-bg-*` is the default on any element, not just `.badge`.** The
  soft-first tint now applies to any `.text-bg-<variant>` element (an
  `.input-group-text`, chip, or small status bar), so a stock indicator matches a
  "current" badge's soft green without hardcoding. Previously only `.badge` was
  softened; every other `.text-bg-success` stayed Bootstrap's solid dark green.
  `.toast` keeps its own fainter mix. `.bg-*` / progress bars are unchanged (a
  fill must stay readable — that's tracked separately in #154).

### Added

- **`--dx-<variant>-soft-bg` / `-soft-text` / `-solid-bg` / `-emphasis` CSS
  variables** published on `:root` from the `$dx-variants` map, so components and
  consumers can reference the exact soft-first tints on any element (Bootstrap's
  own `--bs-*-bg-subtle` are a greyer family that doesn't match the soft badge).
  Also `--dx-switch-on-*` / `--dx-switch-off-*` / `--dx-switch-pill` for
  retheming the filled switch.

## [0.30.0] - 2026-07-20

### Added

- **`DXForm` wraps tabbed content in a card panel by default** (#159) — a tabbed
  form's tab content used to float on the bare page with no panel beneath the
  tab strip, reading as unfinished. It now renders inside a card panel (the
  standard Bootstrap card-with-tabs look) via a new `card-tabs` prop that
  defaults `true`. Set `:card-tabs="false"` for bare tabs (e.g. inside a modal
  that already provides a boundary — the DXTable edit modal does this). Flat
  (non-tabbed) forms are unaffected.

- **`DXTable` gains a `fixed-layout` prop + per-field `width`/`min-width`**
  (#156) — filtering a table used to reshuffle every column width because
  columns were content-sized, so the table "jumped" as rows narrowed.
  `:fixed-layout="true"` applies `table-layout: fixed` so widths stop depending
  on cell content; a field's `width`/`minWidth` is honoured via an injected
  `<colgroup>` (authoritative even with the inline filter row present). Off by
  default — existing tables are unchanged.

- **`DAutocomplete` gains a `null-option` prop** (#138) — an opt-in, pinned,
  never-filtered, selectable "no selection" row whose value is `null`. `true`
  labels it **None**; a string sets a custom label. Selecting it sets the model
  to `null` (the clear ✕ hides, the placeholder shows). A consumer
  `filterFunction` composes rather than being replaced — the null option stays
  pinned and the filter runs on the rest. This completes the searchable
  single-select spec from #138: consumers can drop the house
  `ot-searchable-select` and its two-tab-stop interaction.

- **`DXTable` gains a `show-count` prop** (#127) — defaults `true`; set `false`
  to suppress just the footer's "N items." caption, independent of the pager. A
  page ported from a plain `<b-table>` that hides the pager with
  `:show-pagination="false"` would otherwise gain a caption it never had.

### Fixed

- **`DAutocomplete` value identity confirmed and guarded** (#153, closed as
  fixed-upstream). The long-standing belief that it stringifies option values
  through the DOM — the biggest reason the house `ot-searchable-select` was
  built — does **not** reproduce on the bundled bvn: a numeric `value`
  round-trips as a number, no `String()`/`Number()` dance. Pinned with a test in
  both directions (numeric and the string path DXTable filters depend on) so a
  future bvn bump that regresses value identity fails loudly. Consumers carrying
  the workaround can remove it.

- **`useForm` no longer corrupts state on overlapping submissions** (#133). Two
  in-flight submissions shared one `processing` flag (the first to finish
  re-enabled the button while the second ran) and each success scheduled an
  untracked timer (an earlier success could clear `recentlySuccessful` a later
  one had just set). `processing` now clears only when the last request
  completes, and a single tracked timer resets `recentlySuccessful`.

- **`DXTable`: an explicit `per-page` prop now wins over the stored preference**
  (#124). A `:per-page="20"` ("start at 20" since #110) was silently overridden
  by whatever page size the user last picked — often on an unrelated table,
  because keyless client-side tables all shared the literal `table` localStorage
  key. An explicitly-passed `per-page` now takes precedence, and keyless tables
  no longer persist (so they can't collide).

- **`DFormSelect`: object-valued options confirmed to round-trip** (#128, closed
  as not-a-bug). `BFormSelect` uses Vue's native `vModelSelect` (`_value` + deep
  equality), so selecting an object option emits the object and an object model
  selects the right option — the `[object Object]` DOM attribute is inert.
  Guarded both directions; consumers can drop native-`<select>` workarounds.

## [0.29.0] - 2026-07-19

### Added

- **`checkbox-group` field type + `DFormCheckboxGroup` component** (#148) — a
  "pick any of N" multi-checkbox from an `options` array; the model is an array
  of the checked values. Previously consumers hand-rolled the multi-checkbox in a
  custom `#value(<key>)` slot. Use `type: 'checkbox-group'` in a DXForm field (or
  `<DFormCheckboxGroup :options>` directly); default the field to `[]`.

### Changed

- **Chart components moved to a `/charts` subpath entry** (#142) so `chart.js`
  and `vue-chartjs` are genuinely optional peers. Previously the main bundle
  imported them statically, so a chart-free consumer's `vite build` failed
  resolving the "optional" peers. **Breaking for chart users** — one-line import
  change:

  ```diff
  - import { DXBarChart } from '@omnitend/dashboard-for-laravel';
  + import { DXBarChart } from '@omnitend/dashboard-for-laravel/charts';
  ```

  Install `chart.js` + `vue-chartjs` and import the components from
  `@omnitend/dashboard-for-laravel/charts`. Consumers who render no charts now
  build without either package installed. The main package's output format is
  unchanged (a separate build emits `dist/charts.*`); the `.dx-chart` container
  style is now global in the main stylesheet, so `/charts` ships no CSS.

- **`DAlert` is visible by default** (#144). bvn's `BAlert` defaults
  `modelValue` to `false`, so a bare static `<DAlert variant="info">…</DAlert>`
  rendered nothing — a recurring footgun. The wrapper now defaults it to `true`;
  every call site passing `v-model`/`:model-value` is unaffected, only the
  bare-static case (always a bug) changes. Same `boolean | number` type, so it's
  source-compatible. Recorded as DIVERGENCES.md #6. `DToast` is intentionally
  left hidden-by-default (toasts are shown imperatively via `useToast()`).

### Fixed

- **`useForm` `transform` no longer risks mutating form state** (#150). The
  per-submit `transform(data)` hook now receives a *copy* of the form data, so a
  transform that assembles the payload by mutating what it receives can't corrupt
  `form.data` (and its validation bindings). Documented with a worked example in
  the forms guide — reshape the payload with `transform`, not by mutating
  `form.data` in a validation guard.

- **Toast tints now track the soft-first palette** (#143). They were derived
  from the base *emphasis* colours, so success/warning read greyer and danger
  sat in the wrong hue (a pink, not the soft plum). Sourced from each variant's
  `soft-bg` in `$dx-variants` now, so editing a `soft-bg` moves toasts too.

- **CI Tests workflow is green again** (was red for weeks). Two dev-tooling
  causes, no runtime impact: (1) the `pretest*` hooks ran `vite build` without
  the icon-font extract step, so tests ran against an inlined stylesheet the #77
  guard forbids — factored into a shared `build:lib`; (2) a benign
  bootstrap-vue-next teardown error surfaced as an unhandled rejection and made
  vitest exit non-zero on an otherwise-green suite (#126) — swallowed narrowly
  in the test setup.

## [0.28.0] - 2026-07-18

### Fixed
- **Docs: in-content links and images now carry the `/dashboard-for-laravel`
  base prefix** (#146). Root-relative links and images authored in markdown/MDX
  content (`[Style guide](/showcase)`, `![logo](/logo.png)`) were emitted
  without Astro's `base`, so they 404'd on GitHub Pages — local previews masked
  it because they can be browsed from the base path. A rehype plugin now
  prefixes `<a href>` and `<img src>` at build time, guarded by a check that
  fails the docs build if any un-prefixed root-relative URL survives.

### Changed
- **`DXTable` internals decomposed behind an unchanged façade** (#123, #129).
  **No public API change** — every prop, event, slot and exposed method is
  identical, so consumers need do nothing. The ~2600-line god-component is now
  ~1740 lines composing four internal pieces: a single `<DTable>` render for all
  three data modes (previously three near-identical copies), a
  `DXTablePagination` footer (previously three copies), a `useResourceEditor`
  composable (the create/edit/delete/modal logic), and a `DXTableEditorModal`
  component. Purely structural; noted here for anyone bisecting a regression to
  this range.
- **Charts now use a dedicated data-viz palette** (`--dx-chart-1`…`--dx-chart-8`)
  instead of reading the semantic `--bs-*` colours (#141). The v0.27.0 colour
  system made the base `success`/`warning` colours dark AA "emphasis" shades,
  which rendered muted chart series — and status colours shouldn't double as
  series colours anyway. The new palette is eight vivid hues in a fixed order
  derived to maximise adjacent-series colour-vision-deficiency separation
  (min adjacent ΔE 13.8 under protan/deutan simulation; every hue ≥ 3:1 contrast
  on white). Charts with datasets that omit colours will change appearance;
  datasets with explicit colours are unaffected. Retheme by overriding the
  `--dx-chart-*` CSS variables. Note the palette cycles after **8** distinct
  colours (previously 10), so charts with 9–10 uncoloured categories now repeat
  colours — set explicit colours (or fold the tail into "Other") for >8 series.

## [0.27.0] - 2026-07-18

### Changed
- **New semantic colour system — the Omni Tend brand, soft-first.** The biggest
  visual change the library has shipped: every consumer's buttons, badges,
  alerts, and links change appearance (no API change). Emphasis now comes from
  weight and place, not loud fills.
  - **Primary is the Omni Tend brand** — a dark navy `#151e2d` fill with
    light-brand text, replacing the indigo. It's the one bold, emphatic button.
  - **Soft-first buttons:** only `primary` and `danger` are solid fills;
    `secondary`/`success`/`warning`/`info` buttons are soft tints (light same-hue
    background, dark same-hue label). Tertiary actions use a `link`-variant
    **ghost** (body colour, no underline). Solid-button labels are a same-hue
    tint, not pure black/white (danger keeps white).
  - **Badges, alerts, toasts, status** all use the soft tint per variant.
  - **Outline buttons** use a per-variant "emphasis" shade so success/warning
    outlines read as green/amber instead of a muddy near-black.
  - **Links** are info-blue `#2563eb` (independent of the near-black brand), and
    the sidebar/`$dark` aligns to the brand navy.
  - Every colour pair is WCAG AA verified. Driven from one `$dx-variants` Sass
    map in `theme.scss`; see `plans/2026-07-18-semantic-colour-system.md`.
  - **Migration note:** if you used `success` to mean "save/confirm" on buttons,
    move that to `primary` and let green mean an actual positive *outcome* (e.g.
    a "Saved" toast). Consumers overriding `--bs-primary` / brand colours in
    their own CSS should re-check against the new navy.

### Added
- **`DXTable`: dot-path field keys (`key: 'paid_by.card'`) are now first-class**
  (#121). A field key containing a dot was unusable, because two layers
  disagreed: bootstrap-vue-next's `mapItem` un-flattens any item key containing a
  dot (`{'paid_by.card': v}` → `{paid_by: {card: v}}`) and then reads
  `item['paid_by.card']` **flat** — so bvn renders a dotted key as an **empty
  cell in both payload shapes**, breaking even the one it looks designed for.
  Meanwhile `DXTable`'s own client-side sort and filter also read flat, which a
  *nested* payload (what Laravel serialises for a relation) never satisfies. The
  result was that every client-side port hand-rolled a "flatten nested keys to
  `_x` aliases" step.

  `DXTable` now resolves a field's value itself — **literal key first, then dot
  path** — for cells, client-side sorting and client-side filtering. That one
  order covers an ordinary key, a dots-flat payload, and a nested payload, and it
  turns bvn's un-flattening from hostile into harmless. A missing or null link
  along the path renders an empty cell instead of throwing. A consumer's own
  `#cell()` slot still wins, including for a dotted column that only appears after
  mount (data-driven columns). In server modes the value renders and the dotted
  key is sent as-is for the server to whitelist. Consumers can delete the alias
  workaround.

### Fixed
- **`DXTable` create modal: a `null` field default is no longer coerced to `''`**
  (#122). 0.26.0 taught the *edit* paths to seed on presence rather than
  nullishness (#117), but the *create* path still ran `field.default ?? ''`, so
  the two disagreed about the same field and **a field could not express a null
  default on create**. A select whose "none" option is `value: null` — which is
  what the column stores, and what the edit modal now correctly seeds and matches
  — seeded `''` on create, matched no option, and rendered blank. Both paths now
  seed by presence (`'default' in field`), so `default: null` seeds `null`.
- **`defineForm`: a `null` field default is no longer coerced to the type
  default** (#125). The initial-data seed ran `field.default ?? getDefaultValueForType(type)`,
  the same nullishness bug as #122 in a different composable — `default: null`
  on a select became `''`, matching no option when the "none" option is
  `value: null`. It now seeds on definedness (`field.default !== undefined`), so
  `null` survives while an absent (or explicitly `undefined`) default still falls
  back to the type default. This matches `DXRepeater`'s rule, so all seeding
  sites agree.
- **`DXTable` Inertia mode: changing a filter no longer resets the selected page
  size.** The Inertia request was assembled in five places, and the debounced
  filter-change navigation was the one that omitted `perPage` — so a user who
  picked a non-default page size and then typed in a column filter silently lost
  it, and Laravel fell back to its default size. The filter navigation now sends
  `perPage` like the other four. (Found in a whole-repo review.)
- **`HasTableFilters`: the allowed per-page list now matches the Vue table and is
  configurable.** The PHP helper hard-coded `[10, 25, 50, 100]` and silently reset
  anything else to 10, while the Vue `DXTable` offers `[10, 20, 50, 100]` by
  default — so selecting **20** against the supplied helper reset to 10, and **25**
  was never offered. The default now aligns to `[10, 20, 50, 100]`, and a
  controller can override the `$allowedPerPage` property to match a customised
  `perPageOptions`. Adds the first PHP test suite (Testbench). (Found in a
  whole-repo review.)

## [0.26.0] - 2026-07-13

### Added
- **`DXTable` `rowClass` and `rowClickable`** (#115). `rowClass` (a string, or a
  function of the row) applies classes to each `<tr>`, so conditional row styling
  no longer means reaching into the table's internal DOM from global CSS — a
  consumer was resorting to `tbody tr:has(.marker) { cursor: default }`, which
  couples to our markup and can collide across pages.

  `rowClickable` marks a row non-actionable: it gets no pointer cursor, no hover
  highlight, and **does not fire `row-clicked` or open the edit modal**. A row
  that doesn't look clickable mustn't *be* clickable, or a click that looks dead
  quietly navigates. The clickable affordance now hangs off a marker class rather
  than a blanket `tbody tr` rule, which is what makes the per-row opt-out possible.

### Changed
- **The icon webfont ships as a real file instead of being inlined — `style.css`
  drops from ~191 KB to ~53 KB gzip** (#77, −72%). The Bootstrap Icons woff2 was
  embedded in the stylesheet as a base64 data URI, and **the font alone was 137 KB
  of the 191 KB** — 72% of the CSS, carried by every consumer whether or not they
  ever rendered a glyph. Base64-inlining a woff2 is pathological: it's already
  Brotli-compressed, base64 inflates it by a third, and gzip recovers none of it.
  (Vite always inlines CSS assets in library mode; `assetsInlineLimit` is ignored
  there, so this is done post-build.)

  The font is now fetched **only when a `.bi-*` glyph actually renders**, so an
  app that never uses `DButton`'s `icon` prop pays nothing for it. No API change,
  and nothing to do in consuming apps: a bundler resolves the relative `url()`
  out of `node_modules`, a plain `<link>` resolves it next to the stylesheet. The
  2078 `.bi-*` glyph classes stay — they cost ~14 KB gzip for the whole set, so
  they were never the problem.

### Fixed
- **The first tab is activated on mount again** (#119). No pane got `active`/`show`:
  the tab nav rendered and **every body was invisible** until the user clicked a
  tab. Two consumer pages had already papered over it with an explicit `active`
  on the first tab.

  Cause: `BTabs` picks the tab to activate by scanning its slot vnodes for the
  `BTab` component type, and our `DTab` wrapper hid it. Bisected —
  `BTabs`+`BTab` and `DTabs`+`BTab` both work, `BTabs`+`DTab` does not — so
  **`DTab` is now a raw re-export of `BTab`**, the same exception `DCarouselSlide`
  already carries. `DTabs` stays a wrapper. The API is identical (`DTab` was a
  pure passthrough), so nothing changes for consumers beyond it working.
  Recorded in [DIVERGENCES.md](./DIVERGENCES.md).
- **A consumer's `thead-top` is composed above the filter row instead of being
  dropped** (#120). DXTable renders its inline filter row in `thead-top`, so a
  consumer's own content there was silently discarded: a grouped column-header
  banner (a `<th colspan>` spanning several columns) had nowhere to go, and a
  pinned totals row had to settle for `top-row` — the first *body* row, below the
  header. Both now render, banner above filter row.

- **`#cell` slots created after the first render now reach their cells** (#114).
  A consumer whose columns are data-driven — known only once a fetch resolves —
  got columns that rendered raw values, as though no cell slot existed. The cause
  is upstream: **bootstrap-vue-next's `BTable` captures its slot set at mount**
  (verified against raw `BTable`, so it isn't our forwarding dropping it), and no
  amount of forwarding can fix that. The inner table is now keyed on the set of
  forwarded slot names, so it remounts when the column set changes.

  Consumers were already remounting to work around this — but at the `DXTable`
  level, which throws away per-page, filters, sort and page. Those all live
  outside the inner table and now survive. The key is names-only, so a slot's
  *content* changing (the common case) doesn't remount anything.

- **The edit modal no longer writes fields the user can't see** (#117). It seeded
  every field with `row[key] ?? default ?? ''` and submitted the lot — *including*
  fields their `when:` predicate currently hides. Editing an amount-type discount
  whose hidden `discount_percentage` was null silently wrote the field's default
  (`10`): the user changed the name, and an invisible column gained a value they
  never chose. Any consumer combining `default` with `when` on the same field was
  exposed.

  Two fixes, because there were two ways in. Fields hidden by `when` at submit
  time are now **omitted from the payload**, so the stored value is left alone.
  And seeding decides on **presence, not nullishness** — `row[key] ?? default`
  can't tell "the row has no such key" from "the row's value *is* null", so an
  explicitly-null column was being overwritten by the default. A row that
  genuinely lacks the key still gets it.
- **A client-side table no longer renders blank when its data shrinks** (#118).
  `clientSideCurrentPage` was only reset on filter/per-page changes, so a
  shrinking `items` prop (a report refetching a narrower date range) left it
  pointing past the end. The pagination metadata clamped for *display* but the
  **slice used the raw page**, so the pager read "page 2 of 2" while the table
  sliced page 6 and rendered zero rows on data that plainly had rows. Both now
  read one clamped value, and the page is clamped to the **last valid page**
  rather than reset to the first, so the user stays near where they were.

## [0.25.0] - 2026-07-11

### Added
- **A select column filter now offers a way back to unfiltered** (#106 follow-up).
  The dropdown listed only the values, so once a filter was picked the only way
  to clear it was the ✕ — which isn't discoverable from inside the open list. The
  list now leads with an "All {column}" option (wording follows the filter's
  placeholder; override with `filterAllText`).

  It carries a sentinel value, not `''`: **bvn drops the entire option list if any
  option's value is an empty string** — not just that entry, all of them — so the
  obvious encoding of "no filter" silently empties the dropdown. Pinned by a test.

### Changed
- **Default per-page options are now `[10, 20, 50, 100]`** (was `[10, 25, 50, 100]`).
  Consumers who want the old steps can pass them: `:per-page-options="[10, 25, 50, 100]"`.
  Note a per-page value persisted in localStorage is validated against this list,
  so a stored `25` is now ignored and the table falls back to its default.

### Fixed
- **The navbar's 64px budget has one owner, and breaking it is no longer silent**
  (#102). The bar lines up with the sidebar's fixed-height header only while its
  single-row content fits a budget that was arithmetic over magic numbers spread
  across two files, with nothing enforcing it.

  The numbers now derive from one source in `theme.scss`, and the budget is
  published as `--dx-navbar-content-height` so consumers can size slot content to
  it. **The budget was also wrong**: it's 47px, not the 48px the old comment
  claimed — `.dashboard-navbar` is border-box, so its 64px has to contain the bar
  *and* its own 1px `border-bottom`, and that uncounted pixel pushed the header to
  65px. The avatar toggle is now sized *from* the budget, so an oversized
  `user-icon` centres inside it instead of growing the bar.

  Slot content still can't be capped without clipping it, so when something on the
  bar's single row does blow the budget, the navbar now **says so** rather than
  quietly misaligning the shell. It measures whether the row actually wrapped
  rather than inferring it from a breakpoint, so a phone layout (where the bar is
  *meant* to grow) doesn't cry wolf.

- **The navbar's `md` breakpoint is now expressed once, not twice** (#101). The
  bar's responsive behaviour was split between Bootstrap utility classes
  (`d-none d-md-block`, `d-md-flex`), which resolve from `$grid-breakpoints`, and
  a hardcoded `@media (min-width: 768px)` in the component's scoped styles. A
  scoped media query is compiled at *our* build and baked into `dist/`, so a
  consumer who overrides `$grid-breakpoints` and compiles `theme.scss` from
  source moved the utilities and not the media query — leaving a band of viewport
  widths where the two disagreed (actions hidden while the layout had already
  gone inline). The layout rules now live in `theme.scss` and compile from
  `media-breakpoint-up(md)`, so both derive from the same variable in any build.
- **The navbar's user-menu trigger has an accessible name** (#113). Its name came
  from its content — just the avatar disc — so a screen reader announced the
  control as the user's initial ("J") rather than as a menu. It now carries a
  visually-hidden label (`userMenuLabel`, default "User menu"), and the avatar's
  initial is marked decorative.

  Deliberately *not* an `aria-label`: that **replaces** an element's content for
  assistive tech, which would have silenced the avatar's notification-badge text
  — the one thing in there actually worth announcing.
- **`DAutocomplete` no longer shows a clear (✕) when there is nothing to clear**
  (#108). bvn's `BAutocomplete` treats an **empty string** as a selection (its
  `hasSelection` excludes only `null`/`undefined`), so the ✕ rendered on an empty
  field. Very visible through `DXTable`, which uses the control for every
  `select` column filter: a freshly loaded table with four filters showed four ✕
  buttons before the user had touched anything, and each was an inert button in
  the tab order. An explicit `no-clear-button` still wins. Recorded in
  [DIVERGENCES.md](./DIVERGENCES.md).
- **`DAutocomplete`'s focus ring frames the whole control** (#108). The input and
  the dropdown chevron are siblings inside an `.input-group`, so Bootstrap's
  `.form-control:focus` ring wrapped the input only and stopped dead where the
  chevron began — the outline read as clipped rather than framing the control.
  The ring now moves to the group on `:focus-within`.

## [0.24.0] - 2026-07-11

### Added
- **Searchable select** (#105). New `searchable: true` option on a `select`
  field: type to filter a long option list, while the model still holds
  `option.value` (an id). A plain `select` is fine for ten options and unusable
  for hundreds, and the `autocomplete` type models the *typed text*, so it can't
  back a foreign key — picking "Tesco" gave you `"Tesco"`, not `37`. That gap
  cost high-frequency data-entry forms their type-to-filter. Works with
  `optionsLoader`: the control waits for the options rather than showing the raw
  id while they load.
- **`submit: false` field option** (#110). Marks a field **presentational** — a
  header, an alert, an explanatory block rendered via `span` — that lays the
  form out but holds no data. `DXTable`'s edit modal seeds its form from every
  `editFields` key, so a decorative field was POSTed alongside the real ones (an
  empty string, an empty array) purely because it was declared.

### Fixed
- **A custom `provider` gets the per-page selector, not just page buttons**
  (#106). The pager and the selector were reading different pagination sources.
- **`submit: false` is enforced at submit, not just at seeding** (#110). The
  modal still renders the field, so a control — or a `span` slot calling
  `update` — wrote the key straight back into the form data after seeding, and
  the whole of it was submitted. Non-submitting keys are now stripped on the way
  out.
- **A column can filter on a different key** (#106). The filter param was
  hard-wired to the column's own key, forcing columns to be named after the
  server's filter params (`customer_id`) and the human-facing value into a
  `#cell` slot. New `filterKey` field option: a "Customer" column can render a
  name and filter on `customer_id`. `filterKey` names the param the *server*
  filters on; client-side, a row that doesn't carry that key falls back to the
  column's own value.
- **A `select` filter can express "no value"** (#106). New `filterNullText`
  field option (e.g. `"Unassigned"` on an assignee column) adds an option that
  sends `filterNullValue` (default `"null"`); client-side it matches rows whose
  value is null, undefined or empty.
- **A custom `provider` no longer silently loses its pager** (#106). Only the
  built-in `apiUrl` provider knows to read `response.data.pagination`, so a
  custom one rendered a table with no pagination and no warning. A custom
  provider now takes its page metadata from the `pagination` prop — and warns
  when it's missing, rather than quietly dropping the pager.
- **`label: ""` renders an empty header** (#106). An explicitly empty label had
  the key leak through, so an actions column came out headed `actions`
  (lowercase, as-keyed). Only a field with *no* label declared falls back now.
- **Clickable rows now look clickable** (#107). A row that opens something on
  click showed the default text cursor, so there was no affordance that it did
  anything — consumers had to reach into the table's internals with
  `:deep(tbody tr) { cursor: pointer }`. DXTable already knows whether rows are
  interactive, so it now owns the cursor and hover affordance: rows get a
  pointer when `editFields` is set **or** a `row-clicked` listener is bound. The
  listener case was the gap; only `editFields` used to count.
- **A static `per-page` / `sort-by` / `filters` prop no longer disables the
  matching control** (#110). These props are dual-purpose: with a `v-model` they
  are *controlled state*; without one they read as an *initial value*. DXTable
  treated any passed value as controlled, so `:per-page="50"` — the natural way
  to say "start with 50 per page" — rendered a per-page selector that responded
  to clicks and changed nothing: the user picked 10, the select showed 10, and
  the table kept rendering 50. Same for `sort-by` (the header wouldn't sort) and
  `filters` (the filter row wouldn't filter).

  A prop is now controlled only when you're actually listening for its update,
  so `:per-page="50"` seeds the table and the selector works, while
  `v-model:per-page` stays fully controlled — including the parent's right to
  refuse a change.

## [0.23.0] - 2026-07-11

### Added
- **`DXUserAvatar` component** (#98). The navbar's circular avatar is now an
  exported component, and is the default content of `DXDashboardNavbar`'s
  `user-icon` slot. That slot is one consumers *decorate* (adding an unread
  dot) rather than replace — but the navbar's styles are scoped, so slot
  content compiled in the consumer's scope could never reuse them, and every
  override began by re-implementing the avatar's CSS, which then drifted from
  the theme. Rendering `DXUserAvatar` in the slot keeps an override to one line
  and on theme. It also supports the notification dot first-class (`badge`,
  `badgeVariant`, `badgeLabel`). The `.user-avatar` class is unchanged, so
  existing theme overrides keep working.
- **`DXDashboard` sidebar toggle API** (#97). The dashboard owns sidebar
  visibility but exposed no way to drive it, so consumers were reduced to
  synthesising a click on the navbar's hamburger
  (`document.querySelector('[aria-label="Toggle sidebar"]').click()`). It now
  exposes `toggleSidebar()` and `sidebarHidden` via a template ref, and binds
  both into every forwarded `sidebar-*` / `navbar-*` slot — so a close
  affordance in the sidebar's own brand row is a slot binding, not a DOM hack.
- **`DXTable` `showCreateButton` prop** (#96). `openCreate()` was already
  exposed for driving the create modal from your own trigger, but the built-in
  "New {item}" button rendered unconditionally whenever `createUrl` was set —
  so apps that host page actions elsewhere (e.g. the navbar actions slot) had
  to hide it with CSS, which also nuked any header content. Set
  `:show-create-button="false"` to drop it; with no `title` and no `header`
  slot the card header is then dropped entirely rather than left empty.
- **`DXField` `plaintext` field option** (#100). Displays the value as static
  text rather than a control (no border, no input box), for the values a
  profile/settings page shows but never lets you edit — where a `readonly`
  input still reads as "you could edit this, but can't". Accepts a function of
  the model, and implies read-only for every field type (control types with no
  native readonly state are disabled, as they already are for `readonly`).
  `readonly` itself is unchanged.

- **`DXTable` forwards every slot the inner table understands** (#99, #111,
  #112). It previously forwarded only slots whose name started with `cell`, so
  the footer, empty-state and row-expansion slots that the underlying table has
  always supported were silently dropped on the way in — one guard, three
  missing features:
  - **Totals row** (#99). New `footClone` prop renders a `<tfoot>` mirroring the
    header, and `#foot(<key>)` fills a column's footer cell, so a total sits
    under the data it totals rather than in a summary bar above the table. Use
    `#custom-foot` for a footer that isn't a per-column mirror.
  - **Expandable rows** (#112). New `v-model:expanded-items` plus a
    `row-expansion` slot open detail content under a row, instead of forcing
    every per-row detail into a modal.
  - Plus `top-row`, `bottom-row`, `thead-sub`, `table-caption`,
    `table-colgroup`, `table-busy` and `empty` / `empty-filtered`.

  Two table slots are deliberately **not** forwarded, because DXTable renders
  them itself: `head(<key>)` (it draws the column headers, with sort indicators
  and field hints) and `thead-top` (the inline filter row).

### Changed
- **Password fields now render a reveal (eye) toggle by default** (#100).
  `DXField`'s `type: "password"` previously rendered a bare masked input.
  Typing a long generated password blind into three boxes on a change-password
  form is exactly where the toggle earns its keep, so it is opt-out rather than
  opt-in: set `revealable: false` on the field for the old bare input.

- **`DXTable` now shows an empty-state message instead of a bare header** (#111).
  An empty result rendered a header row with nothing under it, which is
  indistinguishable from a broken table — especially given #109, where a failed
  fetch also rendered zero rows. It now reads "No {items} found", or "No {items}
  match your filters" when a column filter is active, pluralised from
  `itemName`. Override with `emptyText`, replace it with the `empty` slot, or
  turn it off with `:show-empty="false"`.
- **`DXTable` no longer sends a `created_at` sort when nothing is sorted**
  (#109). The header sort cycles asc → desc → *unsorted*, and in that third
  state — and on any initial load without a `sortBy` — the table fell back to
  requesting `sortBy=created_at&sortOrder=desc`: a column the consumer never
  declared and that isn't derived from `fields`. Against a strict endpoint
  (e.g. spatie's `QueryBuilder`, where an undeclared sort is a hard 400) a table
  that sorted fine both ways broke the moment the user clicked the header a
  third time. No sort selected now sends **no sort params at all**, and the
  server applies its own default ordering.

  **If you relied on the implicit newest-first default**, set it explicitly:
  `:sort-by="[{ key: 'created_at', order: 'desc' }]"`. This applies to the
  api-url, provider and Inertia modes alike. Relatedly, the `sortChange` event
  (Inertia mode) can only describe an *active* sort, so the cleared state no
  longer emits it with a fabricated `asc` — listen to `update:sortBy`, which
  carries the empty array, to observe the cleared state.

### Fixed
- **A failed `DXTable` fetch is now visible instead of looking like "no results"**
  (#109). A rejected request rendered zero rows and no error, which is
  indistinguishable from an empty dataset — so a broken query passed review and
  then showed a blank table to a user. Worse, the error handling lived *inside*
  the built-in `apiUrl` provider, so a consumer's own `provider` could fail with
  no trace at all. Every provider is now wrapped in one error handler, and the
  alert renders **above** the table rather than replacing it — a failed request
  is usually caused by the sort or a filter, and removing the table would take
  away the controls needed to undo it.
- **`DXTable`'s edit modal no longer leaks per-field UI state between records**
  (#100). The modal creates its form object once and reseeds it in place for
  each row, so Vue reused the same `DXField` instances across records and any
  per-field UI state rode along with them — revealing row A's password left row
  B's, and the create form's, showing in clear text. The form subtree is now
  keyed per open, giving each record fresh fields. The form data still lives in
  the table, so nothing is lost by remounting.
- **Test suite no longer runs every file twice** (#104). `playground/vendor/…`
  is a symlink back to the repo root, and vitest's default glob followed it, so
  every test file was collected twice (48 files / 606 tests for 24 / 303) —
  doubling local and CI test time. Collection is now scoped to `tests/`.

## [0.22.0] - 2026-07-11

### Added
- **`DXDashboardNavbar` `searchAlign` prop** (#92). The search slot wrapper was
  hardcoded `justify-content-center`, forcing apps that want the search flush
  after the hamburger/title to fight it with an `!important` override. New
  `searchAlign?: "start" | "center"` prop, forwarded from `DXDashboard`.

### Changed
- **The navbar search is now left-aligned by default** (#92). `searchAlign`
  defaults to `"start"` (the Omni Tend layout: search flush after the title,
  actions right-aligned before the user menu). Consumers relying on the old
  centred search must set `search-align="center"`.

### Removed
- **`DXDashboard` `logoutUrl` prop.** It was dead wiring: forwarded to
  `DXDashboardNavbar`, which has no such prop — nothing ever rendered a logout
  link from it (the attribute just fell through onto the navbar's `<header>`).
  Logout belongs to the consumer via the `user-menu-items` slot (pass a
  `DDropdownItem`), as the docs example already shows.

### Fixed
- **The navbar no longer overflows onto the page content on small screens**
  (#93). Two compounding bugs: theme.scss pinned `.dashboard-navbar` to a fixed
  64px `height` while the flex bar wrapped taller (below `md` the search row
  alone exceeds it), so wrapped content — and, with the themed button padding,
  even the desktop avatar dropdown — spilled over the bar's border onto the
  page; and the `actions` slot sat inside the nowrap user-menu cluster, so a
  group of buttons overflowed the viewport. Now: the header uses `min-height`
  (the bar grows to contain its rows), the actions region is a direct bar child
  that wraps to its own full-width row below `md` (its buttons wrap too), and
  the avatar dropdown toggle's padding is trimmed (to a ~46px tap target —
  still above the 44px WCAG guideline) so a standard single-row bar genuinely
  fits the 64px sidebar-aligned height. A new `actionsOnMobile?: "wrap" |
  "hide"` prop (on `DXDashboardNavbar`, forwarded from `DXDashboard`) chooses
  what the actions do below `md`: `"wrap"` (default) or `"hide"` for apps that
  relocate page actions into the page on phones — the wrapper itself hides, so
  no phantom row-gap. The user-menu cluster is also no longer rendered when
  empty (guest layouts: actions now sit flush right instead of one gap short).
  Note: the bar's single-row content budget is 48px — taller content (e.g.
  `btn-lg`, a tall custom `user-menu`) grows the bar past 64px and out of
  alignment with the sidebar header. Guarded by viewport-geometry regression
  tests.
- **`DXDashboard` no longer hardcodes its background colours.** The layout and
  content-panel backgrounds (`#f8f9fa` / `#fff`) are now `var(--bs-light)` /
  `var(--bs-white)` — identical rendering with stock Bootstrap, but they now
  follow a theme that overrides those variables.

## [0.21.0] - 2026-07-11

### Added
- **Rich content in the field-label info popover** (#91). `field.info` renders a
  hover/focus popover on the label, but its body was plain text — and the docs
  wrongly pointed at the `#info` slot for rich content (that slot is an
  always-visible block *below* the control). New `#info-popover(<key>)` slot on
  `DXForm` (and `#info-popover` on `DXField`, `#popover` on `DXFieldLabel`) lets
  the popover body carry lists, bold and paragraphs; the affordance appears from
  the slot alone. The `field.info` docblock is corrected.
- **`DXDashboard` `contentMaxWidth` prop** (#88). The default (non-`fluid`)
  content column was a *proportional* `col-xl-10` — ~2000px on a 2560px display,
  which defeats a reading width for forms/text. It now has a genuine `max-width`
  cap (default `1140px`, any CSS length), still centred; `fluid` remains the
  full-width opt-out. Replaces per-app CSS width workarounds.

### Fixed
- **`useForm`/`DXTable` delete no longer leaks the form payload into the fetch
  request options** (#87). `api.delete` was `(url, options)` while its siblings
  are `(url, data, options)`, so `useForm.submit`'s uniform call spread the whole
  model into the fetch `RequestInit` (a field named `headers`/`mode`/`body` could
  clobber the CSRF header → 419, or make `fetch` throw) and silently dropped the
  `{ signal }` argument, so deletes couldn't be aborted. `api.delete` now takes
  the consistent `(url, data, options)` signature and `useForm` deletes by URL
  (no body). No behaviour change for `DXTable` — delete stays bodyless, just the
  fragility and dropped signal fixed.
- **`DXField` `date`/`datetime`/`time` inputs now display Laravel timestamp
  formats** (#85). A native `<input type="date">`/`datetime-local`/`time` only
  accepts a strict format and renders **empty** for anything else, so a field
  seeded with a Laravel ISO-8601 (`…Z`) or `Y-m-d H:i:s` value (e.g. a `created_at`
  shown as "Requested") showed a blank placeholder. The displayed value is now
  reshaped to the input's format; the setter writes the input's native value back
  unchanged. This is a pure string reshape, not a timezone conversion — the stored
  wall-clock is shown as-is (convert before seeding if you need local time).

## [0.20.0] - 2026-07-10

### Added
- **`DXSwitch`** — a reusable "filled box" toggle switch (bordered box sized like
  a form control, label left, toggle right, colour-coded on-state). This is the
  same control `DXForm`/`DXField` render for a `type: 'switch'` field, now
  extracted so it can be dropped in standalone: `<DXSwitch v-model="x" label="…" />`.
  `DXField`'s switch branches consume it, so a form switch and a lone switch share
  one implementation and one look. Supports **contextual text** via
  `textWhenTrue`/`textWhenFalse` (the label reflects the state, e.g. "Product is
  current" ↔ "Product is not current"), plus a default slot scoped with `{ on }`
  for rich state-dependent content.

### Changed
- **Switch on-state colour: green → primary.** The `DXForm`/`DXField` `switch`
  field's filled box previously turned **success green** when on; it now uses
  **`--bs-primary`**, matching the base `DFormCheckbox` switch, checkboxes and
  radios so every boolean control shares one on-colour. Green is reserved for
  real success semantics. Visible change for existing consumers (e.g. an
  on-switch that read green now reads indigo); no API change.

## [0.19.2] - 2026-07-10

### Fixed
- **`DFormSelect`: round-trip a `null` option value.** A select option with
  `value: null` (a common "None"/"no selection" entry) didn't round-trip through
  BVN's `BFormSelect`: BVN renders each option's value as a plain HTML `value`
  attribute, so a `null` value is omitted and the browser falls back to using the
  option's *text* as its DOM value — a model bound to `null` then matched no
  option and the select rendered blank. Legacy Bootstrap-Vue (BS4) handled this;
  BVN does not. `DFormSelect` now maps a `null` option value (and a `null` model,
  scalar or array) to a private sentinel so BVN renders a real value attribute,
  while keeping the consumer's model and emitted value as `null`. Found during the
  Omni Tend settings cutover. See `DIVERGENCES.md` #5.
- **`DXTable`: refetch when `api-url` changes in provider mode.** Changing the
  bound `api-url` on a mounted table didn't trigger a refetch — the `api-url`
  isn't part of BTable's provider context, so the table kept showing the previous
  url's rows until some other trigger (sort, per-page, create/edit/delete) fired.
  The `apiUrl` watcher now resets to page 1 and refetches (exactly one fetch,
  no double-fetch race), which also fixes the secondary bug where a url change to
  a smaller result set left the user stranded on an out-of-range empty page.

## [0.19.1] - 2026-07-10

### Fixed
- **Checkbox/radio: restore the box↔label gap.** 0.19.0 enlarged the check/radio
  box by overriding `.form-check-input { width/height: 1.25rem }` directly but left
  Bootstrap's `$form-check-input-width` (and thus `.form-check`'s `padding-left` +
  the input's negative `margin-left`) at `1em`/`1.5em` — so the ~20px box filled
  the ~21px padding and the label sat ~1px from it (cramped/flush). Now driven
  through `$form-check-input-width: 1.25rem` + an explicit
  `$form-check-padding-start: … + 0.5rem`, so the padding/margin track the larger
  box and a real ~8px gap returns. Switches are unaffected (independent
  `$form-switch-*` variables).
- **`DAutocomplete`: soften the clear (✕) button.** The clear affordance renders
  as Bootstrap's `.btn-close` — a bold, filled ✕ that read as a heavy black mark
  against a light field, and was especially noisy with several autocompletes in a
  row (e.g. a `DXTable` column-filter row). It's now scaled down (via `font-size`,
  so the box and its SVG shrink together without clipping) and rested at a lower
  opacity, asserting only on hover/focus — matching the already-softened trigger
  chevron. Found during the Omni Tend cutover.

## [0.19.0] - 2026-07-09

### Changed
- **`DXForm`/`DXField` horizontal layout: hint moves into the label column and
  labels right-align.** In horizontal layout the field hint now renders beneath
  the label in the (right-aligned) label column, so a row reads
  "label + hint │ control" — a classic label-left settings form — instead of the
  hint sitting below the control. Vertical layout is unchanged (hint below the
  control). No other consumers relied on the previous horizontal hint placement.
- **`checkbox` and `switch` in horizontal layout no longer duplicate the row
  label.** The control's own inline label is kept for assistive tech but hidden
  visually, so the row label (in the label column) names the control and the
  right column holds just the control — lining up with text/select fields. A
  `switch` still shows visible inner text when it opts into contextual on/off
  text (`textWhenTrue`/`textWhenFalse`, e.g. "Product is current"); without it,
  the fallback-to-label text is hidden rather than shown twice. This supersedes
  the 0.18.1 `hideLabel`-in-horizontal behaviour for the common case (a bare
  checkbox/switch now aligns without needing `hideLabel`).
- **Theme: compact, higher-contrast forms and dashboard.** A pass to make the
  default form and dashboard look tighter and clearer:
  - `$input-padding-y` back to Bootstrap's `0.375rem` (was an oversized
    `0.625rem`), so text inputs and selects are more compact.
  - **Check/radio inputs now share the input border colour.** They defaulted
    their border to `$border-color` (Gray-200), not `$input-border-color`
    (Gray-300), so a bare checkbox looked faint beside the darker inputs.
    `$form-check-input-border` now uses `$input-border-color`.
  - **Bigger check/radio boxes** (`1.25rem`) — Bootstrap's `1em` default read
    small next to the inputs and made a fiddly touch target.
  - **Softer field labels.** `DXFieldLabel` renders in gray-700 rather than the
    near-black body colour, so the label leads the row without dominating it,
    while the (lighter, secondary-grey) hint recedes.
  - **Horizontal forms: compact rhythm + top-aligned rows.** `DXForm` tags its
    root `.dx-form--horizontal`; the theme gives horizontal forms tighter field
    spacing and top-aligns the label + control so a checkbox/switch sits on the
    label's first line rather than floating above it. Vertical forms unchanged.
  - **Dashboard: white content panel under a light grey top bar** (was a grey
    content area with a white navbar), for higher contrast between the content
    and the chrome. `DXDashboardNavbar` drops its `bg-white` class; the theme
    styles the bar, and `DXDashboard`'s content panel is white.

## [0.18.1] - 2026-07-09

### Fixed
- **`DXForm` horizontal layout: `field.hideLabel` is now honoured** (#78).
  Previously `DXForm` never forwarded `hideLabel` to the field, and the
  switch/checkbox/repeater branches always rendered the label (with
  `BFormGroup` still reserving an empty label column). Now a `hideLabel` field
  drops its label entirely and reserves no label column, so the control spans
  the full width — a `switch`/`checkbox`, which renders its own label inside
  the control, no longer shows the label twice, and that inner label lines up
  with sibling row labels. `hideLabel` is also now part of the public
  `FieldDefinition` type.
- **`DXForm` horizontal layout: a `switch` field's hint now renders below the
  control** (#79). The switch box was inline-level, so a following hint flowed
  inline to its right instead of onto its own line. It is now block-level
  (still shrink-to-fit), so the hint sits below the control like every other
  field type (also fixes the equivalent vertical-layout case).

## [0.18.0] - 2026-07-08

### Added
- **`DButton` `loading` / `loadingText` props with anti-flash timing** (#76).
  `:loading` disables the button immediately and shows a trailing spinner while
  an async action runs. The spinner is anti-flashed: it only appears once
  `loading` has held for `spinnerDelay` (default 500ms) — so sub-500ms actions
  never flicker one in — and stays for at least `minSpinnerTime` (default 100ms)
  once shown, so it never strobes. `loadingText` optionally swaps the label
  while the spinner is visible. Overrides bvn's native immediate loading; see
  `DIVERGENCES.md`.
- **`DButton` `icon` prop** (#76). A leading Bootstrap Icons glyph by name, e.g.
  `icon="save"` renders `<i class="bi bi-save">`. The Bootstrap Icons font (woff2
  only) now ships in the theme CSS, so `icon` works with no consumer setup.
  Diverges from bvn's boolean `icon`; see `DIVERGENCES.md`.
- **`DButton` `block` prop** (#76). Full-width button (the BS5 replacement for
  the dropped `.btn-block`).

### Changed
- **`DXForm` and `DXTable` submit / save / delete buttons now use `DButton`'s
  `loading` prop.** They previously hand-rolled the disabled + label-swap
  pattern; they now get the anti-flash spinner for free. Visible effect: these
  buttons show a spinner during in-flight actions, and the "Saving…/Deleting…"
  label swap is delayed by `spinnerDelay` (no flicker on instant actions).

## [0.17.0] - 2026-07-07

### Added
- **`DXForm` per-field slots: `field(<key>)`, `field-before(<key>)`,
  `field-after(<key>)`** (#67). Mirrors the existing
  `tab-before`/`tab-content`/`tab-after` pattern one level down: add content
  around a field (e.g. a quick-create button beneath a select) or fully
  replace its rendering, without a bespoke prop per use case. `field(<key>)`
  supersedes `field-before`/`field-after` for the same key, same as
  `tab-content` does for tabs.
- **`DXForm` `card` prop** (#65). Wraps the form in a `DCard` for a visual
  boundary, mirroring `DXTable`'s `card` prop. Off by default, since
  `DXForm` is commonly already embedded in a page card or modal. For tabbed
  forms, the tab nav renders as a BS5 `card-header-tabs` instead of
  double-wrapping.
- **`DXForm`/`DXField` horizontal layout: `layout: "horizontal"`,
  `labelCols`** (#66). Puts the label to the left of the input instead of
  above it, with a configurable label column width (mirrors `BFormGroup`'s
  `labelCols`/`labelCols*`). Overridable per-field via `field.layout` /
  `field.labelCols`; a field marked `span: true` always stays full-width,
  bypassing the column split.
- **`DXRepeater` compact `table` layout: `repeaterLayout: "table"`** (#68).
  Renders sub-fields as columns with one row per item — far more compact
  than the default `cards` layout for simple 2-3-field child rows. Column
  headers come from each sub-field's `label`; Remove is a trailing
  icon-button cell. `table` is a *preference*, not a guarantee: a
  `ResizeObserver` measures the repeater's own rendered width (not the
  viewport — the same viewport width can put a repeater in a wide
  standalone form or a narrow sidebar column) and falls back to `cards`
  whenever there isn't enough room for its columns to stay legible, scaling
  the required width to this repeater's own column count and types (a
  `currency`/`percentage` column gets extra budget for its affix).
- **`DXRepeater` `showRowIndex` option** (#68 follow-up). The cards layout's
  row header now shows only a Remove button by default; set
  `showRowIndex: true` to also show each row's 1-based position.
- **`DXField` `hideLabel` prop** (#68 follow-up). Skips the field's own
  label entirely (rather than rendering an empty one) — used by
  `DXRepeater`'s `table` layout, where a column header already names the
  field.

### Fixed
- **Bootstrap's `.input-group` no longer wraps its affix onto its own line
  in a narrow container** (#68 follow-up). `.input-group` defaults to
  `flex-wrap: wrap`; a currency/percentage field's `£`/`%` prefix could
  stack above the input instead of sitting beside it. Now forced to
  `flex-wrap: nowrap` globally.

## [0.16.4] - 2026-07-06

### Changed
- **`useToast()` now themes success/danger/warning/info toasts through
  `--bs-toast-*` CSS variables instead of overriding Bootstrap's `.text-bg-*`
  utility with `!important`** (#15). `useToast()` (exported from this
  library, wrapping Bootstrap Vue Next's) translates a themed `variant` into
  a `toast-{variant}` class instead of forwarding BVN's own `variant` prop;
  theme.scss drives colours through the CSS variables Bootstrap's own
  `.toast` rule already reads. Non-breaking: the public API
  (`create({ title, body, variant })`, `show(...)`) is unchanged and the
  default visual result is identical. An unrecognised variant (e.g.
  `primary`, `dark`, or none) still falls through to BVN's default
  `.text-bg-*` styling. Consumers calling `bootstrap-vue-next`'s `useToast()`
  directly (bypassing this library's export) are unaffected either way.

### Fixed
- **Audited the `:deep()` scoped-style trap (#53) across every current
  usage** (#58). Confirmed at the DOM level, against the built `dist`
  bundle — not a docs dev-build screenshot, which previously gave a false
  positive — that DAutocomplete, DXField's switch, DXTable's
  `tbody tr`/`.pagination`, DXStatCard, and DXDashboardSidebar's `.nav-link`
  all forward their scope-id correctly today; no other live bugs found.
  Added `tests/components/scoped-deep-styles.test.ts` as a permanent guard:
  it fails if a new scoped `:deep()` rule appears anywhere without a
  corresponding DOM-level assertion, and the DOM-level checks themselves read
  the scope-id straight out of `dist/style.css` so they don't need updating
  when unrelated style edits change the hash.

## [0.16.3] - 2026-07-06

### Fixed
- **`switch` field: compact box (matches sibling input width/height), single
  click target** (#64). The filled box always stretched to the full form
  width — unlike the plain `checkbox` type — visually dominating a form next
  to content-sized siblings, and its `justify-content: space-between` layout
  left a wide unclickable gap between the label and the toggle so only the
  small toggle itself reliably registered a click. It's also fixed a height
  mismatch: the box's `min-height` was hardcoded to Bootstrap's *default*
  input padding formula rather than this theme's actual `$input-padding-y`,
  so it rendered shorter than a real `.form-control`/`.form-select`. The box
  now sizes to its content (like `checkbox`), matches standard input height
  exactly via a new `--dx-input-height` theme variable (computed once from
  the real theme values, so it can't drift), and the dead click-zone is gone
  now that the box no longer force-stretches.
- **`currency` field now displays minor-unit precision** (#69). A value of
  `3.8` displayed as `3.8` rather than `3.80`. The input now formats its
  *displayed* text to the currency's decimal places (default 2; a new
  `field.decimals` option overrides it, e.g. `0` for a currency with no minor
  unit) on blur and on initial seed — the model stays a plain number
  throughout, and typing is never reformatted mid-edit.

## [0.16.2] - 2026-07-06

### Fixed
- **`form.touched` is now set for fields driven through `DXField`/`DXForm`**
  (#61). `useForm`'s `touched` map was only ever populated by the `field()`
  computed's setter, but `DXField` writes to `form.data` directly (including
  the nested/`keyPath` branch used by repeaters), so `form.touched` stayed
  `{}` forever for any form built from field definitions. Consumers building
  dirty-aware payloads (e.g. omitting untouched fields on a partial update)
  got a guard that never fired. `DXField` now marks the field's key (or full
  `keyPath` for nested/repeater fields) touched on every write.
- **`DXRepeater` supports upsert-children (`to_delete`-style) APIs** (#62).
  Removing a row always spliced it out of the array, so a backend that only
  deletes a persisted child row when it's submitted flagged (e.g. Laravel's
  `{ id, to_delete: true }` upsert pattern) never learned the row was
  removed — the row silently survived. A new `field.softDeleteKey` option
  flags a row with an `id` instead of splicing it; the row stays in
  `form.data` (so it's submitted) but is hidden from the UI and excluded
  from `minItems`/`maxItems` counts. Rows without an `id` (never persisted)
  are still spliced as before.

## [0.16.1] - 2026-07-05

### Fixed
- **`DAutocomplete` dropdown no longer clips long options** (#59). The popup
  (`.b-autocomplete-content`) only set a `max-height`, so it inherited the
  (often narrow) input width and cut off long option labels — e.g. a `DXTable`
  `select` filter in a narrow column. It now grows to `max-content` (at least
  the trigger width, capped at `min(90vw, 32rem)`). Shipped as a global theme
  rule rather than a scoped style because the popup can teleport out of the
  component, which would escape `:deep()`.

## [0.16.0] - 2026-07-05

### Added
- **`autocomplete` field type** for `DXField` / `DXForm` (#2). A free-text input
  with a `<datalist>` of suggestions rendered internally — takes `options` (same
  shape as `select`) or an async `optionsLoader`, and unlike `select` still
  accepts a value not present in the list (the consumer validates). For
  type-to-filter pickers over a fetched list (e.g. a git branch) without a
  hand-rolled datalist in the consuming page.

### Fixed
- **`DAutocomplete` chevron styling now actually applies in consumer builds**
  (#53). The 0.15.0 fix (#54) shipped its rules but they were inert: they were
  written as `scoped` `:deep()` styles on a component whose only template root
  was the `<BAutocomplete>` component, so the scope-id never landed on a real
  host element and `[data-v-x] .input-group` matched nothing once bundled by a
  consumer. `DAutocomplete` now wraps `BAutocomplete` in a real
  `.d-autocomplete` element, giving the scope-id a deterministic host — so the
  chevron sits inline (not wrapped below the input) and is softened via
  Bootstrap's `--bs-btn-*` variables. Every `DXTable` `select` filter is fixed.

## [0.15.0] - 2026-07-05

### Changed
- **`switch` fields now render as a full-width, colour-coded "filled box"**
  (#52) — the same height as a select/text input, with the label on the left and
  the toggle on the right. The box is neutral when off and a filled success green
  when on, so a boolean's state reads at a glance and switches line up with
  sibling fields in a form. Replaces the previous inline toggle styling; no API
  change (`type: 'switch'`, `textWhenTrue`/`textWhenFalse` unchanged).

### Fixed
- **`DAutocomplete` closed-state rendering** (#53, regression from #49). The
  trigger chevron wrapped onto its own line below the input (Bootstrap
  `.input-group` defaults to `flex-wrap: wrap` and the input wrapper takes full
  width) and rendered as a heavy dark `btn-secondary`. It now sits inline as a
  subtle, theme-coloured append. Fixes every `DXTable` `select` filter (and any
  other `DAutocomplete` usage) showing a detached dark chevron below the input.

## [0.14.0] - 2026-07-05

### Changed
- **`DXTable` `select` column filters now render as a `DAutocomplete`
  typeahead** (#49) instead of a native `<select>`. Click to browse the whole
  list (with a check on the current selection), or type to narrow — a strict
  superset of the old select. A clear (✕) button resets to "no filter" (the
  synthetic "All" option is gone; the placeholder reads `All {label}`). The
  public field API is unchanged (`filter: 'select'`, `filterOptions`), so this
  is non-breaking. Multi-value filtering is a planned follow-up.

### Added
- **`DXTable` `card` prop** (#47). Defaults to `true` (unchanged). Set
  `:card="false"` for a plain, borderless variant — the same header, filter row,
  table and pagination rendered directly on the page background (no card
  border/shadow), with a subtle rule under the header. For data-heavy admin
  index pages that read as busy inside a card. Everything else (data modes,
  filters, sorting, pagination, edit/create/delete) is unchanged.

### Fixed
- **`DXTable` no longer breaks a page that also statically imports `useForm`**
  (#42). `DXTable` used to lazy-load `useForm` via a dynamic `import()` to dodge
  a circular dependency that no longer exists (`useForm` → `api`, a leaf). That
  dynamic import made Rollup place `useForm` behind a dynamic-import chunk, so a
  consumer page doing `import { useForm } from '@omnitend/dashboard-for-laravel'`
  alongside a `DXTable` got a dangling, undefined `useForm` at runtime. `DXTable`
  now imports `useForm` statically; the edit/create modal seeds its form
  synchronously (also removing the interim modal-open token workaround). The
  previously-skipped `DXTable` edit-tabs tests are re-enabled.

## [0.13.1] - 2026-07-04

### Changed
- **`DXTable` no longer stripes rows by default.** Banded rows add little on
  short tables and can read as noise; `striped` now defaults to `false`. Opt
  back in with `:striped="true"` for dense tables.

## [0.13.0] - 2026-07-04

### Added
- **Chart components: `DXBarChart`, `DXLineChart`, `DXDoughnutChart`.** Thin,
  themed wrappers around Chart.js via `vue-chartjs` (both **optional** peer deps,
  externalized from the build). Pass `labels` + `datasets`; the Bootstrap palette
  is read from the live theme and dashboard defaults applied (no x gridlines,
  formatted value ticks/tooltips, legend auto-shown for multi-series). `options`
  deep-merges over the defaults.

### Fixed
- **`DXTable` `showUrl` edit flow** — Save/Delete are disabled (and the delete
  guard bails) while the full-record fetch is in flight, so the guard never runs
  against the thin list row; and the modal-open async `useForm` import is guarded
  so a slow first-open can't seed the form after a different row/create is opened.
- **`useForm` multipart** — also spoofs `_method` when a `transform` returns a
  `FormData` directly (a raw multipart PUT/PATCH isn't parsed by PHP).

## [0.12.0] - 2026-07-04

### Added
- **`DXStatCard`** — a KPI / stat tile: a big formatted value (`number` /
  `currency` / `percent`), title + subtitle, an auto-coloured up/down delta badge
  versus a comparison (`invertDelta` for down-is-good metrics), and `value` /
  `icon` / `trend` slots. Themed with Bootstrap variables.
- **`DXTable` `showUrl`** — opt-in fetch of the full record for the edit modal.
  When set, opening a row seeds the form from a `/…/:id` fetch (with a loading
  state) instead of the thin list row — for lists whose payload is slimmer than
  the edit form (notes, nested relations, repeater rows).
- **Automatic multipart file upload.** `useForm` now submits
  `multipart/form-data` when any field holds a `File`/`Blob` (nested
  objects/arrays flattened Laravel-style; booleans as `"1"`/`"0"`), spoofing
  `put`/`patch` as `POST` + `_method`. So `image`/`file` fields round-trip
  through `DXTable` create/edit with no extra config.

## [0.11.1] - 2026-07-04

### Fixed
- **`useForm` crashed on object/array field defaults from a reactive source.**
  Seeding data was deep-cloned with `structuredClone`, which throws
  `DataCloneError` on a Vue reactive Proxy — so a `repeater` (or any) field with
  `default: []` / `default: {}` inside a reactive `editFields` ref blanked the
  create/edit modal. The clone now runs `toRaw` first and falls back to a JSON
  clone, so object/array defaults work without the `Object.freeze` workaround.
- **`DXTable` per-page selector ignored `showPerPageSelector` in client-side
  mode.** A fixed top-N table (`clientSide` + pagination off) still rendered the
  "Per page" control. The client-side gate now honours the prop like the other
  modes.

## [0.11.0] - 2026-07-04

### Added
- **`DXDashboard` `fluid` / `contentClass` props.** `fluid` renders page content
  full-width and left-aligned instead of the default centred reading-width
  (`col-xl-10`) column — for data-heavy admin pages with wide tables.
  `contentClass` adds class(es) to the content container.
- **`DXTable` `openCreate()` method** (via `defineExpose`, alongside `refresh()`)
  so the create action can live outside the table card — a page header, the
  dashboard navbar actions slot, etc. — while still using the built-in create
  modal. No-op unless `editFields` are set.
- **`DXTable` `deleteGuard` prop.** A predicate run when Delete is clicked,
  before the confirm and request. Return a message for a non-deletable item to
  show it immediately (toast) and skip both the confirm and the doomed request;
  return `null`/`undefined` to proceed normally. The button stays visible
  (show-and-explain) rather than being hidden/disabled.

## [0.10.0] - 2026-07-04

### Added
- **Sidebar `footer` slot** on `DXDashboardSidebar` (forwarded from `DXDashboard`
  as `sidebar-footer`) for utility links pinned to the bottom of the rail, below
  the nav groups. The rail is now a flex column — fixed header, scrolling nav,
  pinned footer — and the slot receives the `collapsed` state. Adds an optional
  `key` to `NavigationGroup` for stable group open-state identity.

### Changed
- **Responsive navbar.** The centred `search` slot now drops to its own
  full-width row below the `md` breakpoint (the toggle / title / user-menu
  cluster stays on the first row), so the shell is usable on mobile out of the
  box. Public slots/props are unchanged.
- **Collapsible sidebar groups** now key their open/closed state by a stable id
  (`key`/`label`, not array index), so reordering the nav can't leak open-state
  to the wrong group; static group labels match the toggle header height when
  collapsible groups are on; closed group items stay out of the tab order even
  without `inert` support; and scroll re-centres after a group's expand settles.

### Fixed
- Sidebar nav could overflow the rail (flexbox `min-height: auto` trap); the
  scroll region now sets `min-height: 0`.

### Changed
- **Rich component API metadata for the docs MCP.** The auto-generated API
  manifest (consumed by the docs MCP server) previously carried only prop / slot
  / event *names* with blank descriptions. The extended (DX*) components are now
  annotated with `@slot` / `@binding` / `@component` docs and event JSDoc, so
  every extended component ships a description and fully documented slots and
  events. A generator fallback also surfaces each base `D*` wrapper's existing
  `@component` description. No runtime/API behaviour changes.

### Added
- **`actions` slot on `DXDashboardNavbar`** (forwarded from `DXDashboard` as
  `navbar-actions`) for page-level primary actions — e.g. a Create / New … button
  — rendered right-aligned next to the user menu, keeping them in the shell chrome
  rather than the page body. The slot receives `pageTitle` for context and only
  renders its wrapper when provided.

## [0.9.1] - 2026-07-04

### Added
- **Function-valued tab labels.** `FormTab.label` (used by `DXForm` tabs and
  `DXTable`'s `editTabs`) may now be a function of the model — the live form data
  merged with any `context` (e.g. the row `DXTable` is editing) — so a tab title
  can reflect the record, such as a related-records count
  `label: (model) => \`Products (${model.products_count ?? 0})\``. Static string
  labels are unchanged; the label resolves reactively.

## [0.9.0] - 2026-07-04

### Added
- **`switch` field type.** A labelled toggle with contextual on/off text
  (`textWhenTrue` / `textWhenFalse`) and an on-state (filled green) style,
  rendering Bootstrap Vue Next's switch. The bound value is normalised to a
  boolean, so the toggle position, the on-state style, and the contextual text
  always agree even when the model arrives as a non-boolean — a boolean column
  serialised as `1`, or a `"0"` / `"false"` string, all read correctly. Seeded
  as boolean `false` by `defineForm` and repeater rows.
- **Declarative `info` popover on field labels.** A `MaybeFn<string>` `info` on a
  field renders a small info affordance on the label that reveals help text in a
  popover on hover/focus, complementing `hint` (always-visible muted text below
  the field). Backed by the new `DXFieldLabel` component; the `#info` slot
  remains the escape hatch for rich content.
- **`asFraction` option for `percentage` fields.** When set, the field treats the
  underlying model value as a 0–1 fraction while showing/editing it as a 0–100
  percentage: the model keeps the fraction (e.g. `0.2`), the input shows `20`.
  Scaling rounds away binary-float artefacts (`0.2 * 100 = 20.000000000000004`).
  Off by default (the value is taken as a whole percentage). Use for values stored
  as ratios — VAT rates, discounts, etc.

### Fixed
- **DXTable delete button stuck "Deleting…" after Save.** The Save and Delete
  buttons in the edit modal both keyed off the shared `editForm.processing`
  flag, so saving drove the Delete button's loading label. Each button's label
  is now scoped to the action actually in flight.
- **`#hint` slot ignored on switch/checkbox/repeater fields** when no `hint`
  value was set. These now render a `#hint` slot like the standard field.

## [0.8.0] - 2026-07-04

### Added
- **Collapsible sidebar menu groups** on `DXDashboardSidebar` (and forwarded
  through `DXDashboard`). New props `collapsibleGroups` (default `false`) and
  `autoCollapseInactiveGroups` (default `true`) turn group headers into a
  single-open accordion — built for menus with many sections.
  - The active-route group opens on load and follows client-side navigation.
    Active matching is now ancestor-aware (longest path prefix) and ignores
    query string / hash, so a detail route like `/orders/123` still highlights
    and opens its `/orders` group. Root `/` matches only exactly.
  - Per-group `collapsible: false` keeps a group permanently expanded.
  - Collapse uses a CSS grid height transition with an opacity fade; the active
    group paints open on first render (no load flicker). Honours
    `prefers-reduced-motion`.
  - Collapsed groups are `inert`, removing their links (including custom `#link`
    slot content) from focus order and the accessibility tree. The `#link` slot
    gains an `isExpanded` prop.

### Changed
- **Quieter toast notifications.** Replaced Bootstrap Vue Next's saturated
  colour-block toasts with a calm, subtly-tinted surface (dark title, muted
  body), spacing between stacked toasts, and no auto-dismiss countdown bar.
  Theme-only (`theme.scss`); `useToast().create({ title, body, variant })` is
  unchanged.

## [0.7.1] - 2026-06-30

### Security
- **`@modelcontextprotocol/sdk`** bumped `^1.22.0` → `^1.29.0` (ships via the
  docs MCP server bin) — patches a ReDoS advisory.
- **`axios`** optional-peer floor raised `^1.6.0` → `^1.15.3` so consumers
  pull a range with the `mergeConfig` prototype-pollution / proxy fixes.
- Dev toolchain: `vitest` / `@vitest/browser` / `@vitest/browser-playwright`
  bumped `^4.0.3` → `^4.1.8` (clears 3 critical advisories) and `npm audit fix`
  applied for remaining in-range transitive patches.
- Remaining audit entries are the `astro` 5→7 major chain (astro + bundled
  esbuild + `@astrojs/mdx` / `@astrojs/vue`). These are dev-server-only
  advisories; the docs publish as a static GitHub Pages build with no SSR, so
  they don't reach a deployed surface. The two-major astro migration is left
  for separate, deliberate work.

### Fixed
- `package.json` `repository.url` normalised to `git+https://…` so `npm
  publish` no longer auto-corrects it on every release.
- Test suite imports `userEvent` from `vitest/browser` instead of the
  deprecated `@vitest/browser/context` (removed in the next vitest major).
  Test-only change; no runtime impact.

## [0.7.0] - 2026-06-30

### Added
- **`DFormOtp`** — wrapper around bvn's `BFormOtp`. A one-time-code / PIN
  input rendered as a row of single-character boxes (`v-model` is a
  `string[]`, one entry per box).
- **`DAutocomplete`** — wrapper around bvn's `BAutocomplete`. A text input
  with a filtered dropdown of suggestions (typeahead / combobox); supports
  `multiple` and a custom `filterFunction`.
- **`DAspect`** — wrapper around bvn's `BAspect`. Keeps its default-slot
  content at a fixed aspect ratio (e.g. `aspect="16:9"`).

  All three surface components that became available in the bootstrap-vue-next
  0.45 upgrade. Each ships with a docs page, live example, and render test.

## [0.6.0] - 2026-06-30

### Changed
- **Upgraded bootstrap-vue-next from 0.40.8 to 0.45.6** (still bundled).
  This crosses several pre-1.0 breaking releases; the affected wrappers
  were updated so this library's own API is unchanged:
  - Field `formatter` functions keep the historic `(value, key, item)`
    signature — `DTable` shields the single-object signature bvn 0.43
    introduced.
  - `DTable`'s `row-clicked` still emits `(item, index, event)`.
  - `DToaster` now renders bvn's unified `BOrchestrator` (bvn 0.44
    removed `BToastOrchestrator`).
  - `DButton` no longer defaults `size` to the removed `'md'` value.
- **Minimum Vue peer dependency raised to `^3.5.13`** (required by bvn 0.45).
- **Dropped Laravel 11 support** — `composer.json` now requires
  `laravel/framework ^12.0|^13.0` (dev: `orchestra/testbench ^10|^11`). The
  only resolvable Laravel 11 releases are blocked by Composer's
  security-advisory policy, so it can no longer be installed/tested.

### Fixed
- `DCarousel` / `DCarouselSlide` are now thin re-exports of the underlying
  bootstrap-vue-next components. bvn 0.45 collects carousel slides by
  scanning slot vnodes for the slide component type, which a wrapper
  component in between broke.

### Notes
- `DTable`'s `sort-by` is an array (`BTableSortBy[]`); the bare string form
  is no longer accepted by bvn. (`DXTable` already used the array form.)
- Standalone radios must live inside a `DFormRadioGroup` — radios bind to a
  group context in bvn 0.45.

## [0.5.0] - 2026-06-22

### Added
- `DXForm` is now the canonical form renderer. Drive it with field
  definitions and add an optional `tabs` prop for multi-tab editors;
  flat and tabbed forms share one engine. Supports conditional fields
  and tabs (`when(model)`), per-field slot overrides
  (`#value(<key>)` / `#span(<key>)` / `#info(<key>)` / `#hint(<key>)`),
  async select options (`optionsLoader`), nested repeaters, and
  automatic switching to the first tab containing a validation error.
  Accepts either a `useForm` or a `defineForm` instance.
- `DXField` — single-field renderer for every field type, with dot-path
  binding so it also drives nested repeater values.
- `DXRepeater` — repeatable nested sub-form (field array) primitive.
- `DFormRadioGroup` — base wrapper for Bootstrap Vue Next's
  `BFormRadioGroup`.
- New `FieldDefinition` field types: `datetime`, `currency`,
  `percentage`, `image`, `file`, `component`, and `repeater`. New
  options: `when`, `readonly`, function-valued `label`/`hint`, `span`,
  `optionsLoader` / `reloadOptionsOnChange`, and repeater sub-fields.
  Adds the `FormTab` type.

### Changed
- `DXTable`'s edit/create modal now renders `DXForm` internally (single
  source of truth). Its public props, slots, and events are unchanged.
- Fixed a latent `DXTable` bug: tab switching now binds the active tab
  index correctly (`v-model:index`), so the edit modal reliably switches
  to the tab containing a validation error.

### Deprecated
- `DXBasicForm` is deprecated in favour of `DXForm`. It is now a thin
  alias (a flat form is `DXForm` without a `tabs` prop) and remains a
  drop-in for existing usage. It will be removed in a future major.

### Fixed
- `DXForm`/`DXField` bind top-level field values by literal key, so a
  field key containing a dot (e.g. `user.email`) is not mistaken for a
  nested path.
- `setByPath` blocks prototype-polluting path segments (`__proto__`,
  `prototype`, `constructor`).

### Breaking (low-impact)
- The per-field custom-rendering slot changed from `#field(<key>)` to
  `#value(<key>)` (replaces the input control). `#span(<key>)`,
  `#info(<key>)`, and `#hint(<key>)` are also available. Forms that only
  pass `fields`/`form` (no per-field slots) are unaffected.

## [0.4.14] - 2026-04-29

### Added
- `DXBasicForm` now honours an optional `show?: () => boolean` predicate
  on each `FieldDefinition`. Fields whose predicate returns `false` are
  hidden from the rendered form. Useful for conditional fields that
  depend on other form values (e.g. a "Custom Domain" input only
  visible when the install type is Web Shop).
- `DXTable` gains a "create" mode. Pass a `createUrl` prop to render a
  "New {itemName}" button in the card header that opens the existing
  edit modal pre-filled from each field's `default`, then POSTs to
  `createUrl` on save. Emits new `rowCreated` and `createError` events;
  the delete button is hidden while creating.

## [0.4.7] - 2025-11-21

### Documentation
- Complete DXTable props table (31 props documented)
- All 13 events documented with parameters
- TableField interface documentation with hint property
- Field hints feature fully documented with examples
- Edit modals documentation with usage examples
- Delete functionality documentation with backend validation examples
- Complete API reference coverage

## [0.4.6] - 2025-11-21

### Added
- Improved pagination layout: pagination left, per-page selector right, info text below
- Smaller, more compact pagination buttons (size=sm)
- Filtered count display with total_unfiltered support
- Smart per-page selector (hides when not needed)
- Backend support for unfiltered totals in HasTableFilters trait

### Changed
- Better button sizing that matches select boxes
- Subtle disabled button styling (transparent with 0.3 opacity)
- Concise wording: "10 products" instead of "Showing all 10 products"
- Format: "X to Y out of Z products" instead of "Showing X to Y of Z"
- Per-page selector width increased to 85px (prevents text cropping)

### Fixed
- API mode per-page flickering bug
- Per-page selector shows actual server value (not localStorage)
- Proper singular/plural grammar (1 product vs 2 products)
- Filtered text on separate line for better readability

## [0.4.5] - 2025-11-20

### Added
- Server error messages now displayed in delete error toasts
- Extract and display error messages from 422 validation responses

### Changed
- Better user feedback with specific, actionable error messages
- Generic error message now shown only as fallback

### Playground
- Add validation to prevent deleting categories with products
- Example error: "Cannot delete X. This category has N associated products..."

## [0.4.4] - 2025-11-20

### Added
- Delete functionality for DXTable modals
- Delete button in modal footer (danger variant)
- Confirmation dialog before deletion
- Success/error toast notifications
- Auto-refresh table after deletion
- New deleteUrl prop (e.g., "/api/products/:id")
- New events: rowDeleted, deleteError

### Changed
- Remove duplicate Save Changes button from modal
- Add gap-2 spacing between Cancel and Save Changes buttons
- Better modal footer layout with flexbox (left/right alignment)

### Playground
- Add delete endpoints and controllers for Products and Categories
- Demonstrate delete functionality in both tables

## [0.4.3] - 2025-11-20

### Added
- Global mode toggle with localStorage persistence
- Toggle switch in navbar (API | Inertia)
- Icons in navigation demonstrating icon support
- Simple dashboard grid favicon

### Changed
- Simplified table implementations using conditional props
- Cleaner titles without instructional text

### Fixed
- Fix Vue template v-else error
- Categories page now supports both API and Inertia modes
- Mode persists across all pages and browser sessions

### Documentation
- Add icon usage examples to DXDashboard docs
- Show unplugin-icons setup instructions

## [0.4.2] - 2025-11-20

### Added
- Field hints: Add optional hint text below column headers
- Stacked triangle sort indicators for cleaner appearance
- Custom header rendering prevents text wrapping
- Formatter support demonstrated in playground

### Changed
- Sort indicators positioned to right, never wrap
- Subtle opacity changes for active/inactive sort directions
- Headers use flexbox layout for proper alignment

### Fixed
- Fix Inertia navigation when sort reset to unsorted state
- Third click on sorted column now properly refreshes data
- Triangle sort indicators have proper spacing
- Headers render consistently across all field types

### Playground
- Products page: Field hints and formatter demonstration
- Categories page: Field hints with edit-tabs

## [0.4.1] - 2025-11-20

### Fixed
- Fix tab index not resetting when reopening edit modal
- First tab now always selected when clicking a new row
- Prevents showing wrong tab (e.g., Products) by default

## [0.4.0] - 2025-11-15

### Added
- Initial stable release
- Complete component library with 55 base + 6 extended components
- Form system with useForm composable
- Data table with pagination and sorting
- Dashboard layout components
- Full TypeScript support

## [0.3.x] - Earlier Versions

Beta releases during initial development.

---

For the complete list of changes, see the [GitHub Releases](https://github.com/omnitend/dashboard-for-laravel/releases) page.
